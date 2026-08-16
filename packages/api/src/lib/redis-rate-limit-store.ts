import type { Store, Options, ClientRateLimitInfo } from "express-rate-limit";
import { getRedisConnection } from "@starter-kit/shared";

/**
 * express-rate-limit's default store keeps counters in process memory, so every
 * API instance enforces its own separate quota — with three replicas the real
 * limit is three times what's configured. This backs the counters with the
 * Redis connection the app already maintains, so the limit is shared.
 */
export class RedisRateLimitStore implements Store {
  private windowMs = 60_000;

  constructor(private readonly keyPrefix: string) {}

  init(options: Options): void {
    this.windowMs = options.windowMs;
  }

  private key(key: string): string {
    return `ratelimit:${this.keyPrefix}:${key}`;
  }

  async increment(key: string): Promise<ClientRateLimitInfo> {
    const redisKey = this.key(key);

    try {
      const results = await getRedisConnection()
        .multi()
        .incr(redisKey)
        .pttl(redisKey)
        .exec();

      const totalHits = Number(results?.[0]?.[1] ?? 1);
      let ttl = Number(results?.[1]?.[1] ?? -1);

      // A fresh counter (or one that somehow lost its TTL) starts the window.
      if (ttl < 0) {
        await getRedisConnection().pexpire(redisKey, this.windowMs);
        ttl = this.windowMs;
      }

      return { totalHits, resetTime: new Date(Date.now() + ttl) };
    } catch {
      // Fail open: a Redis outage shouldn't take the whole API down with it.
      return { totalHits: 1, resetTime: new Date(Date.now() + this.windowMs) };
    }
  }

  async decrement(key: string): Promise<void> {
    try {
      await getRedisConnection().decr(this.key(key));
    } catch {
      // Best effort — an uncounted request is harmless.
    }
  }

  async resetKey(key: string): Promise<void> {
    try {
      await getRedisConnection().del(this.key(key));
    } catch {
      // Best effort.
    }
  }
}
