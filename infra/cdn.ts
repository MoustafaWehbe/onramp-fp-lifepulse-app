import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

const S3_ORIGIN = "spa-s3";
const API_ORIGIN = "api-ec2";

export interface CdnArgs {
  /** Stable origin hostname for the API, i.e. the Elastic IP's public DNS name. */
  apiOriginDomain: pulumi.Input<string>;
  /** Sent to the origin as x-origin-secret so the API can reject direct hits. */
  originSecret: pulumi.Input<string>;
}

export interface Cdn {
  bucket: aws.s3.Bucket;
  distribution: aws.cloudfront.Distribution;
}

export function createCdn(args: CdnArgs): Cdn {
  // Private bucket. It is reachable only through CloudFront via OAC — never
  // directly, and never as a website endpoint.
  const bucket = new aws.s3.Bucket("lifepulse-spa", {
    tags: { Name: "lifepulse-spa" },
  });

  new aws.s3.BucketPublicAccessBlock("lifepulse-spa-block", {
    bucket: bucket.id,
    blockPublicAcls: true,
    blockPublicPolicy: true,
    ignorePublicAcls: true,
    restrictPublicBuckets: true,
  });

  const oac = new aws.cloudfront.OriginAccessControl("lifepulse-spa-oac", {
    description: "Lifepulse SPA bucket access",
    originAccessControlOriginType: "s3",
    signingBehavior: "always",
    signingProtocol: "sigv4",
  });

  /**
   * SPA deep-link routing.
   *
   * The obvious approach — customErrorResponses mapping 403/404 to /index.html
   * with status 200 — is WRONG here, and quietly so. customErrorResponses is a
   * *distribution-level* setting, not per-behavior, so it would also rewrite the
   * API's responses: every 401, 403 and 404 from Express would reach the browser
   * as an HTML page with status 200. axios would never enter its error branch,
   * and the SPA would try to JSON.parse HTML on every auth failure.
   *
   * A CloudFront Function attached to the default behavior only is safe, because
   * behavior matching happens before viewer-request functions run — so /api/*
   * never reaches this code. (Functions are free up to 2M invocations/month.)
   *
   * Note also that with OAC and no s3:ListBucket permission, a missing key
   * returns 403 rather than 404, which is what makes the error-mapping approach
   * so tempting in the first place.
   */
  const spaRewrite = new aws.cloudfront.Function("lifepulse-spa-rewrite", {
    runtime: "cloudfront-js-2.0",
    publish: true,
    comment: "Rewrite extensionless paths to /index.html for SPA routing",
    code: `function handler(event) {
  var request = event.request;
  var uri = request.uri;
  if (uri.charAt(uri.length - 1) === '/') {
    request.uri = uri + 'index.html';
  } else if (uri.lastIndexOf('.') <= uri.lastIndexOf('/')) {
    // No file extension in the last path segment -> a client-side route.
    request.uri = '/index.html';
  }
  return request;
}`,
  });

  // Looked up by name rather than hardcoding UUIDs.
  const cachingOptimized = aws.cloudfront.getCachePolicyOutput({
    name: "Managed-CachingOptimized",
  });
  const cachingDisabled = aws.cloudfront.getCachePolicyOutput({
    name: "Managed-CachingDisabled",
  });
  // AllViewer forwards cookies, Authorization and query strings — all three are
  // required for the JWT access/refresh flow. Deliberately NOT
  // AllViewerExceptHostHeader, which exists for API Gateway / Lambda URL origins.
  const allViewer = aws.cloudfront.getOriginRequestPolicyOutput({
    name: "Managed-AllViewer",
  });

  const apiBehavior = {
    targetOriginId: API_ORIGIN,
    viewerProtocolPolicy: "https-only",
    // Must be exactly [GET,HEAD], [GET,HEAD,OPTIONS], or all seven. The API has
    // POST/PUT/PATCH/DELETE routes, so all seven it is.
    allowedMethods: [
      "GET",
      "HEAD",
      "OPTIONS",
      "PUT",
      "POST",
      "PATCH",
      "DELETE",
    ],
    cachedMethods: ["GET", "HEAD"],
    compress: true,
    cachePolicyId: cachingDisabled.id,
    originRequestPolicyId: allViewer.id,
  };

  const distribution = new aws.cloudfront.Distribution("lifepulse-cdn", {
    enabled: true,
    comment: "Lifepulse SPA + API",
    defaultRootObject: "index.html",
    httpVersion: "http2and3",
    priceClass: "PriceClass_100",
    origins: [
      {
        originId: S3_ORIGIN,
        // The REGIONAL domain name, not the website endpoint — OAC does not work
        // with S3 website endpoints.
        domainName: bucket.bucketRegionalDomainName,
        originAccessControlId: oac.id,
      },
      {
        originId: API_ORIGIN,
        domainName: args.apiOriginDomain,
        customOriginConfig: {
          httpPort: 3000,
          // httpsPort and originSslProtocols are required by the provider schema
          // even when the protocol policy is http-only. Omitting them fails at
          // `pulumi up` with a confusing validation error.
          httpsPort: 443,
          originProtocolPolicy: "http-only",
          originSslProtocols: ["TLSv1.2"],
          originReadTimeout: 30,
          originKeepaliveTimeout: 5,
        },
        customHeaders: [
          { name: "x-origin-secret", value: args.originSecret },
        ],
      },
    ],
    defaultCacheBehavior: {
      targetOriginId: S3_ORIGIN,
      viewerProtocolPolicy: "redirect-to-https",
      allowedMethods: ["GET", "HEAD", "OPTIONS"],
      cachedMethods: ["GET", "HEAD", "OPTIONS"],
      compress: true,
      cachePolicyId: cachingOptimized.id,
      functionAssociations: [
        { eventType: "viewer-request", functionArn: spaRewrite.arn },
      ],
    },
    orderedCacheBehaviors: [
      { pathPattern: "/api/*", ...apiBehavior },
      // /health sits at the root, not under /api. Without its own behavior it
      // would fall through to the S3 origin and be rewritten to index.html.
      { pathPattern: "/health", ...apiBehavior },
    ],
    restrictions: {
      geoRestriction: { restrictionType: "none" },
    },
    viewerCertificate: {
      // The default *.cloudfront.net certificate. Free TLS, no domain required.
      cloudfrontDefaultCertificate: true,
    },
    tags: { Name: "lifepulse-cdn" },
  });

  // Grant CloudFront (and only this distribution) read access to the bucket.
  // No dependency cycle: the distribution does not depend on this policy.
  new aws.s3.BucketPolicy("lifepulse-spa-policy", {
    bucket: bucket.id,
    policy: pulumi
      .all([bucket.arn, distribution.arn])
      .apply(([bucketArn, distArn]) =>
        JSON.stringify({
          Version: "2012-10-17",
          Statement: [
            {
              Sid: "AllowCloudFrontServicePrincipalReadOnly",
              Effect: "Allow",
              Principal: { Service: "cloudfront.amazonaws.com" },
              Action: "s3:GetObject",
              Resource: `${bucketArn}/*`,
              Condition: { StringEquals: { "AWS:SourceArn": distArn } },
            },
          ],
        }),
      ),
  });

  return { bucket, distribution };
}
