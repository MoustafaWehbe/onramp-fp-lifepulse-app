import * as fs from "fs";
import * as path from "path";
import { repoBranch, repoDir, repoUrl } from "./config";

/**
 * Renders the first-boot bootstrap script.
 *
 * The script itself lives in ./scripts/bootstrap.sh rather than inline in a
 * template literal. The previous version mixed TypeScript `${...}` interpolation
 * and shell `${...}` expansion in one string, which only worked because every
 * shell variable happened to use the `$VAR` form or sat inside a quoted heredoc.
 * Any future edit using `${VAR}` shell syntax outside a quoted heredoc would have
 * been silently swallowed by the TypeScript template literal. Substituting
 * explicit @@TOKEN@@ placeholders removes that trap, and the shell script is a
 * real .sh file that shellcheck and editors understand.
 *
 * IMPORTANT: this is passed to aws.ec2.Instance, which sets
 * ignoreChanges:["userData"] — so changes here do NOT reach a running instance.
 * That is deliberate (it is what stops every edit from stopping/starting the
 * box). To re-bootstrap, replace the instance deliberately; the database lives on
 * a separate EBS volume and survives.
 */
export function buildUserData(): string {
  const template = fs.readFileSync(
    path.join(__dirname, "scripts", "bootstrap.sh"),
    "utf8",
  );

  const substitutions: Record<string, string> = {
    "@@REPO_URL@@": repoUrl,
    "@@REPO_BRANCH@@": repoBranch,
    "@@REPO_DIR@@": repoDir,
  };

  const rendered = Object.entries(substitutions).reduce(
    (acc, [token, value]) => acc.split(token).join(value),
    template,
  );

  const unresolved = rendered.match(/@@[A-Z_]+@@/g);
  if (unresolved) {
    throw new Error(
      `bootstrap.sh has unresolved placeholders: ${[...new Set(unresolved)].join(", ")}`,
    );
  }

  // EC2 caps user-data at 16 KiB before base64 encoding.
  const bytes = Buffer.byteLength(rendered, "utf8");
  if (bytes > 16 * 1024) {
    throw new Error(`user-data is ${bytes} bytes, over the 16 KiB EC2 limit`);
  }

  return rendered;
}
