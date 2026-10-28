import { describe, expect, it } from "vitest";
import portfolioCss from "../styles/portfolio-screen.css?raw";
import { countSafeAreaViolations, PORTFOLIO_PAGE_MM } from "./safeArea";

// A page drawn at 4 px per millimetre.
const page = { top: 0, bottom: 840 };
const mm = (value: number): number => value * 4;

describe("Portfolio safe area", () => {
  it("accepts content between the header and footer bands", () => {
    expect(countSafeAreaViolations(page, [{ top: mm(23), bottom: mm(190) }], true)).toBe(0);
  });

  it("flags content that runs into the footer band", () => {
    expect(countSafeAreaViolations(page, [{ top: mm(180), bottom: mm(203) }], true)).toBe(1);
  });

  it("flags content under the header only on pages with chrome", () => {
    const item = [{ top: mm(8), bottom: mm(20) }];
    expect(countSafeAreaViolations(page, item, true)).toBe(1);
    expect(countSafeAreaViolations(page, item, false)).toBe(0);
  });

  it("ignores elements that are not rendered", () => {
    expect(countSafeAreaViolations(page, [{ top: 0, bottom: 0 }], true)).toBe(0);
  });

  it("matches the header and footer tokens in the stylesheet", () => {
    expect(portfolioCss).toContain(`--pf-header: ${PORTFOLIO_PAGE_MM.header}mm;`);
    expect(portfolioCss).toContain(`--pf-footer: ${PORTFOLIO_PAGE_MM.footer}mm;`);
  });
});
