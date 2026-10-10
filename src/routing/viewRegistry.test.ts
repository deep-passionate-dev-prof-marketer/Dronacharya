import { describe, expect, it } from "vitest";
import { canOpen, homeView, navSections, phoneTabs, viewLabel, VIEWS, viewsFor } from "./viewRegistry";

const ROLES = ["student", "instructor", "auditor", "sales_rep", "admin", "parent"];

describe("view registry", () => {
  it("has one entry per page with a unique name", () => {
    expect(new Set(VIEWS.map((v) => v.id)).size).toBe(VIEWS.length);
    expect(new Set(VIEWS.map((v) => v.label)).size).toBe(VIEWS.length);
  });

  it("every role lands on a page it can open", () => {
    for (const role of ROLES) expect(canOpen(role, homeView(role))).toBe(true);
    expect(homeView("auditor")).toBe("analytics");
  });

  it("phone tabs and navigation only offer pages the role can open", () => {
    for (const role of ROLES) {
      const tabs = phoneTabs(role);
      expect(tabs.length).toBeGreaterThan(0);
      expect(tabs.length).toBeLessThanOrEqual(4);
      for (const t of tabs) expect(canOpen(role, t.id)).toBe(true);
      const nav = navSections(role).flatMap((s) => s.views.map((v) => v.id));
      expect(new Set(nav)).toEqual(new Set(viewsFor(role).map((v) => v.id)));
    }
  });

  it("class analytics are for auditors and admins only", () => {
    expect(ROLES.filter((r) => canOpen(r, "analytics")).sort()).toEqual(["admin", "auditor"]);
  });

  it("parents only see family pages and class notes", () => {
    expect(viewsFor("parent").map((v) => v.id).sort()).toEqual(["notebook", "parent_home"]);
  });

  it("names a page by the role's job where it differs", () => {
    expect(viewLabel("classroom", "auditor")).toBe("Observe live class");
    expect(viewLabel("classroom", "instructor")).toBe("Live class");
  });
});
