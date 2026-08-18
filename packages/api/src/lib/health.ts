import { getRedisConnection } from "@starter-kit/shared";
import { getDatabase } from "./db";

export type DependencyStatus = "up" | "down";

export interface HealthReport {
  status: "ok" | "degraded";
  timestamp: string;
  uptimeSeconds: number;
  checks: Record<string, { status: DependencyStatus; latencyMs: number; error?: string }>;
}

const CHECK_TIMEOUT_MS = 2_000;

/** A hung socket should fail the check, not hold the health endpoint open. */
async function withTimeout<T>(promise: Promise<T>): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`Timed out after ${CHECK_TIMEOUT_MS}ms`)),
      CHECK_TIMEOUT_MS,
    );
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

async function check(
  probe: () => Promise<unknown>,
): Promise<{ status: DependencyStatus; latencyMs: number; error?: string }> {
  const started = Date.now();
  try {
    await withTimeout(probe());
    return { status: "up", latencyMs: Date.now() - started };
  } catch (error) {
    return {
      status: "down",
      latencyMs: Date.now() - started,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function healthReport(): Promise<HealthReport> {
  const [postgres, redis] = await Promise.all([
    check(() => getDatabase().query("SELECT 1")),
    check(() => getRedisConnection().ping()),
  ]);

  const checks = { postgres, redis };
  const status = Object.values(checks).every((c) => c.status === "up")
    ? "ok"
    : "degraded";

  return {
    status,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    checks,
  };
}
