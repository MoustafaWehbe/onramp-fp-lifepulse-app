import type { Request, Response, NextFunction } from "express";

/**
 * Rejects requests that did not arrive through our CloudFront distribution.
 *
 * CloudFront attaches `x-origin-secret` to every request it forwards to this
 * origin (configured in infra/cdn.ts). The security group already restricts port
 * 3000 to CloudFront's published IP ranges, so this is defence in depth: it
 * covers the window where those ranges are shared with every other AWS customer's
 * distribution, which is to say anyone could point their own CloudFront at this
 * origin if they learned its hostname.
 *
 * Deliberately does NOT protect against interception — the CloudFront-to-origin
 * leg is plain HTTP. Encrypting it requires a domain we own plus a real
 * certificate on the instance. See infra/README.md.
 */
export function originGuard(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const expected = process.env.ORIGIN_SECRET;

  // Unset in local development, where the Vite dev server proxies straight to
  // this process and there is no CloudFront in front.
  if (!expected) {
    next();
    return;
  }

  // Exempt so the deploy script and any on-box debugging can reach it directly.
  if (req.path === "/health") {
    next();
    return;
  }

  if (req.get("x-origin-secret") !== expected) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  next();
}
