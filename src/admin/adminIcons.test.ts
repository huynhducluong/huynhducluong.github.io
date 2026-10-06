import { describe, expect, it } from "vitest";
import { adminNavIconNames, renderAdminNavIcon } from "./adminIcons";

describe("Admin navigation icons", () => {
  it("provides one dependency-free SVG for every navigation destination", () => {
    expect(adminNavIconNames).toHaveLength(9);
    const icons = adminNavIconNames.map((name) => renderAdminNavIcon(name));
    expect(new Set(icons).size).toBe(adminNavIconNames.length);
    icons.forEach((icon) => {
      expect(icon).toContain('<svg class="admin-nav__icon"');
      expect(icon).toContain('stroke="currentColor"');
      expect(icon).toContain('aria-hidden="true"');
      expect(icon).not.toContain("<img");
      expect(icon).not.toContain("href=");
    });
  });
});
