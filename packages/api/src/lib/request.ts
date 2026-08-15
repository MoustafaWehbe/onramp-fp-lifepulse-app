import type { Request } from "express";

/**
 * Reads a path parameter as a string.
 *
 * Express types a param as `string | string[]` because a route pattern can bind
 * the same name more than once. None of our routes do that, and every route
 * with a param runs a Zod `params` validator before its controller, so the
 * value is always a single string by the time it's read here.
 */
export function pathParam(req: Request, name: string): string {
  const value = req.params[name];
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}
