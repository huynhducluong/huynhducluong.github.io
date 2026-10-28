import { describe, expect, it } from "vitest";
import { readAdminHeaderDensity, renderAdminHeaderDensityToggle } from "./headerDensity";

describe("Admin header density", () => {
  it("falls back to the comfortable header when storage is unavailable", () => {
    expect(readAdminHeaderDensity()).toBe("comfortable");
  });

  it("renders an accessible toggle whose pressed state matches the density", () => {
    const comfortable = renderAdminHeaderDensityToggle("comfortable");
    const compact = renderAdminHeaderDensityToggle("compact");

    expect(comfortable).toContain('aria-pressed="false"');
    expect(comfortable).toContain('aria-label="Compact document header"');
    expect(comfortable).toContain('title="Compact document header"');
    expect(compact).toContain('aria-pressed="true"');
    expect(compact).toContain('aria-label="Compact document header"');
    expect(compact).toContain('title="Expand document header"');
  });
});
