import { describe, expect, it } from "vitest";
import { buildPath, parsePath, LANG_TAG_RE } from "./appRoutes";

describe("role URLs", () => {
  it("builds the facilitator path with ISO-3 country, language tag, id, name and page", () => {
    const path = buildPath({ id: "tch-vance", name: "Dr. Evelyn Vance", role: "instructor", country: "IN", languageTag: "hi-IN" }, "classroom", "whiteboard");
    expect(path).toBe("/facilitator/IND/hi-IN/tch-vance/dr-evelyn-vance/live-stage/whiteboard");
    expect(parsePath(path)).toMatchObject({ role: "instructor", iso3: "IND", lang: "hi-IN", userId: "tch-vance", page: "classroom", feature: "whiteboard" });
  });

  it("never puts a student's name in the URL", () => {
    const path = buildPath({ id: "stu_x", name: "Sophia Chen", role: "student", studentCode: "10ABCDEFGH", country: "AE", languageTag: "ar-AE" }, "notebook");
    expect(path).toBe("/learner/ARE/ar-AE/10ABCDEFGH/notebook");
    expect(path.toLowerCase()).not.toContain("sophia");
    expect(parsePath(path)).toMatchObject({ role: "student", userId: "10ABCDEFGH", page: "notebook" });
  });

  it("validates language tags (2–22 chars, BCP-47 shape) and rejects junk paths", () => {
    expect(LANG_TAG_RE.test("en")).toBe(true);
    expect(LANG_TAG_RE.test("zh-Hant-TW")).toBe(true);
    expect(LANG_TAG_RE.test("x")).toBe(false);
    expect(parsePath("/facilitator/IN/hi-IN/tch-vance/x/live-stage")).toBeNull(); // ISO-2 not accepted in path
    expect(parsePath("/room/abc")).toBeNull();
    expect(parsePath("/admissions/ARE/en-AE/sales-1/rajesh-khanna/nope")).toBeNull();
  });
});
