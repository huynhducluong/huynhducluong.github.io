import { describe, expect, it } from "vitest";
import { portfolioProjectSeed } from "../data/portfolioSeed";
import { portfolioProjectStateText, renderPortfolioProjectRow } from "./portfolioProjectSelection";

const project = () => ({ ...structuredClone(portfolioProjectSeed[0]), status: "published" as const, includeInPortfolio: true, responsibilities: ["a", "b", "c", "d"].map((id) => ({ id, text: { en: `R ${id}`, vi: "" } })) });

describe("Portfolio project rows (§6.7)", () => {
  it("names the layout and warns when the choice is empty or longer than the layout prints", () => {
    expect(portfolioProjectStateText(true, "Balanced", 2, 4, 3)).toEqual({ text: "Balanced · 2 of 4 responsibilities", warning: false });
    expect(portfolioProjectStateText(true, "Balanced", 4, 4, 3)).toEqual({ text: "Balanced · prints the first 3 of 4 selected", warning: true });
    expect(portfolioProjectStateText(true, "Balanced", 0, 4, 3).warning).toBe(true);
    expect(portfolioProjectStateText(false, "Balanced", 2, 4, 3).text).toBe("Not in this Portfolio");
  });

  it("keeps the include switch, discloses the responsibilities and marks the group as rendered", () => {
    const html = renderPortfolioProjectRow({ project: project(), ready: true, layoutLabel: "Balanced", limit: 3, chosenIds: ["b", "d"] });
    expect(html).toMatch(/<input type="checkbox" name="portfolio_project" value="[^"]+" data-selection-primary data-portfolio-project-include checked data-selection-count-item>/);
    expect(html).toContain(`<input type="hidden" name="portfolio_responsibilities_${portfolioProjectSeed[0].id}" value="1">`);
    expect(html.match(/data-portfolio-project-responsibility checked/g)).toHaveLength(2);
    expect(html).toMatch(/aria-expanded="false" aria-controls="portfolio-project-options-[^"]+"/);
    expect(html).toContain("Balanced · 2 of 4 responsibilities");
  });

  it("offers every responsibility until the editor chooses, and hides the disclosure while the project is out", () => {
    const html = renderPortfolioProjectRow({ project: { ...project(), includeInPortfolio: false }, ready: true, layoutLabel: "Balanced", limit: 3, chosenIds: undefined });
    expect(html.match(/data-portfolio-project-responsibility checked/g)).toHaveLength(4);
    expect(html).toMatch(/data-portfolio-project-toggle hidden>/);
    expect(html).toContain("Not in this Portfolio");
  });
});
