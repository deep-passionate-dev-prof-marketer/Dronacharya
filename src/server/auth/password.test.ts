import { describe, expect, it } from "vitest";
import { hashPassword, passwordProblem, temporaryPassword, verifyPassword } from "./password";

describe("passwords", () => {
  it("hashes and verifies; wrong passwords and tampered hashes fail", async () => {
    const h = await hashPassword("correct horse battery");
    expect(h.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("correct horse battery", h)).toBe(true);
    expect(await verifyPassword("correct horse batterY", h)).toBe(false);
    const parts = h.split("$");
    const hash = Buffer.from(parts[5], "base64");
    hash[0] ^= 0xff;
    expect(await verifyPassword("correct horse battery", [...parts.slice(0, 5), hash.toString("base64")].join("$"))).toBe(false);
    expect(await verifyPassword("anything", null)).toBe(false);
    expect(await verifyPassword("anything", "plain-text")).toBe(false);
  });
  it("salts every hash", async () => {
    expect(await hashPassword("same password here")).not.toBe(await hashPassword("same password here"));
  });
  it("rejects weak passwords", () => {
    expect(passwordProblem("short")).toMatch(/10 characters/);
    expect(passwordProblem("password123")).toMatch(/easy/);
    expect(passwordProblem("aaaaaaaaaaaa")).toMatch(/easy/);
    expect(passwordProblem("sophia.chen2026!", { email: "sophia.chen@21k.school" })).toMatch(/email/);
    expect(passwordProblem("Sophia-likes-maths", { name: "Sophia Chen" })).toMatch(/name/);
    expect(passwordProblem("blue-river-kite-42")).toBeNull();
  });
  it("makes readable temporary passwords that pass the rules", () => {
    const t = temporaryPassword();
    expect(t).toMatch(/^[a-z2-9]{4}-[a-z2-9]{4}-[a-z2-9]{4}$/);
    expect(passwordProblem(t)).toBeNull();
  });
});
