import { describe, expect, it } from "vitest";
import { moderate } from "./socialHub";

describe("campus feed moderation", () => {
  it("allows ordinary posts, maths and long numbers", () => {
    expect(moderate("How do I solve x^2 - 5x + 6 = 0?")).toBeNull();
    expect(moderate("Pi to ten digits is 3.1415926535 and 2^40 = 1099511627776")).toBeNull();
    expect(moderate("Smoke test question 1760259999999")).toBeNull();
    expect(moderate("Study group on Saturday 10-12 in room 204")).toBeNull();
  });
  it("refuses phone numbers and emails", () => {
    expect(moderate("call me on +91 98765 43210")).not.toBeNull();
    expect(moderate("my number is 987-654-3210")).not.toBeNull();
    expect(moderate("text 98765 43210")).not.toBeNull();
    expect(moderate("(022) 2345 6789")).not.toBeNull();
    expect(moderate("mail me at kid@example.com")).not.toBeNull();
  });
  it("refuses inappropriate words", () => {
    expect(moderate("this is nsfw")).not.toBeNull();
    expect(moderate("You should kys")).not.toBeNull();
  });
});
