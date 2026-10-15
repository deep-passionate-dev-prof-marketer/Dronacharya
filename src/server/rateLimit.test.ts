import { describe, expect, it } from "vitest";
import { createLimiter } from "./rateLimit";

describe("createLimiter", () => {
  it("allows up to the limit, then refuses until reset", () => {
    const l = createLimiter(2, 60_000);
    expect([l.hit("a"), l.hit("a"), l.hit("a")]).toEqual([true, true, false]);
    expect(l.hit("b")).toBe(true);
    l.reset("a");
    expect(l.hit("a")).toBe(true);
  });

  it("full() counts only what was hit, so failures alone can use up the allowance", () => {
    const l = createLimiter(3, 60_000);
    expect(l.full("ip")).toBe(false);
    l.hit("ip");
    l.hit("ip");
    expect(l.full("ip")).toBe(false);
    l.hit("ip");
    expect(l.full("ip")).toBe(true);
    expect(l.retryAfter("ip")).toBe(0); // at the limit, not past it
  });
});
