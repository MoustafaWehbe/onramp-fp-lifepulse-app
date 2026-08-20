import { describe, expect, it } from "vitest";
import { COACH_ROUTES, homePathFor, isCoach } from "@/lib/roles";

describe("isCoach", () => {
  it("recognises a coach", () => {
    expect(isCoach("coach")).toBe(true);
  });

  it("treats everything else as not a coach", () => {
    expect(isCoach("user")).toBe(false);
    expect(isCoach(undefined)).toBe(false);
    // The admin role was removed; a stale token carrying it must not be
    // mistaken for a coach and handed the coach screens.
    expect(isCoach("admin")).toBe(false);
  });
});

describe("homePathFor", () => {
  it("sends a coach to their client work", () => {
    expect(homePathFor("coach")).toBe("/coaching");
  });

  it("sends everyone else to the habit dashboard", () => {
    expect(homePathFor("user")).toBe("/dashboard");
    expect(homePathFor(undefined)).toBe("/dashboard");
  });

  it("keeps a coach's landing page inside the coach app", () => {
    expect(COACH_ROUTES).toContain(homePathFor("coach"));
  });
});
