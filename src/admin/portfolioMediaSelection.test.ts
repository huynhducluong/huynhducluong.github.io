import { describe, expect, it } from "vitest";
import type { PortfolioMedia } from "../types/portfolio";
import { portfolioMediaRowState, renderPortfolioFeatureRow, renderPortfolioMediaRow } from "./portfolioMediaSelection";

const media = (id: string, kind: PortfolioMedia["kind"], displayOrder: number): PortfolioMedia => ({
  id, kind, displayOrder, storagePath: `https://example.com/${id}.jpg`, alt: { en: id, vi: id },
});
const images = [media("cover", "cover", 1), media("gallery", "gallery", 2)];
const row = (layout: string, kind: "project" | "tool" = "project", list = images): string =>
  renderPortfolioMediaRow({ kind, id: "item-1", name: "Duong Vanh Dai 3", images: list, assignment: undefined, layout, selected: true });
const field = (html: string, slot: "primary" | "supporting"): string =>
  html.slice(html.indexOf(`data-portfolio-media-field="${slot}"`), html.indexOf("</label>", html.indexOf(`data-portfolio-media-field="${slot}"`)));

describe("Portfolio media rows (§6.8)", () => {
  it("reuses the media-row anatomy: 4:3 preview of the primary visual, clipped title, form grid", () => {
    const html = row("project.technical");

    expect(html).toContain('class="admin-media-row admin-portfolio-media-row"');
    expect(html).toMatch(/<div class="admin-media-row__preview" data-portfolio-media-preview><img src="https:\/\/example\.com\/cover\.jpg"/);
    expect(html).toContain('class="admin-truncate admin-media-row__title" title="Duong Vanh Dai 3"');
    expect(html).toContain('class="admin-form-grid admin-media-row__fields"');
    expect(html).toContain('data-preview-url="https://example.com/gallery.jpg"');
  });

  it("puts the required mark right after the label text, never in a separate status slot", () => {
    const html = row("project.technical");

    expect(field(html, "primary")).toMatch(/<span class="admin-field-label">Primary visual<span data-portfolio-primary-required><span class="admin-required-mark"/);
    expect(field(html, "supporting")).toMatch(/<span class="admin-field-label">Supporting visual<span data-portfolio-supporting-required><span class="admin-required-mark"/);
    expect(html).not.toContain("Not used by layout<");
    expect(html).not.toContain("<small data-portfolio-");
  });

  it("swaps an unused field for a same-size static box with the reason", () => {
    const supporting = field(row("project.balanced"), "supporting");

    expect(supporting).toContain('<span class="admin-field-swap" data-static>');
    expect(supporting).toMatch(/data-portfolio-supporting-select disabled/);
    expect(supporting).toContain('<span class="admin-field-static" data-portfolio-supporting-static>Not used by this layout</span>');
    expect(supporting).toMatch(/data-portfolio-supporting-required hidden>/);
  });

  it("offers 'No supporting image' and hides the primary field's static box while it is used", () => {
    const html = row("project.technical");
    expect(field(html, "supporting")).toContain('<option value="">No supporting image</option>');
    expect(field(row("project.balanced"), "primary")).toContain("data-portfolio-primary-static hidden");
  });

  it("states the layout and its needs, and warns when Media has too few images", () => {
    expect(portfolioMediaRowState("project", "project.technical", 2)).toEqual({ layout: "Technical", requirement: "2 images · Wide + Wide", shortage: "" });
    expect(portfolioMediaRowState("project", "project.technical", 1).shortage).toBe("Only 1 image in Media");
    expect(portfolioMediaRowState("tool", "automation.classic", 0)).toEqual({ layout: "Classic Overview", requirement: "No image required", shortage: "" });
    expect(row("project.technical", "project", [images[0]])).toMatch(/class="is-warning" data-portfolio-media-shortage>Only 1 image in Media</);
  });

  it("shows a 'No image' preview instead of a broken image when Media is empty", () => {
    const html = row("project.balanced", "project", []);
    expect(html).not.toContain("<img");
    expect(html).toContain('<span class="admin-portfolio-media-row__empty">No image</span>');
  });
});

describe("Cover & closing image row (§6.8)", () => {
  const projects = [
    { id: "p1", name: "First", images, selected: true },
    { id: "p2", name: "Second", images: [media("other", "cover", 1)], selected: true },
    { id: "p3", name: "Not selected", images: [], selected: false },
  ];

  it("offers selected projects only and submits exactly one image select", () => {
    const html = renderPortfolioFeatureRow({ projects, assignments: {}, choice: { projectId: "p2", mediaId: "other" } });
    expect(html).toMatch(/<option value="p3" hidden disabled>/);
    expect(html.match(/name="portfolio_feature_media"/g)).toHaveLength(3);
    expect(html.match(/data-portfolio-feature-media="p\d" aria-label="[^"]+"(?! disabled)>/g)).toEqual(['data-portfolio-feature-media="p2" aria-label="Image from Second">']);
    expect(html).toContain('<option value="other" data-preview-url="https://example.com/other.jpg" selected>');
    expect(html).toContain("https://example.com/other.jpg");
  });

  it("labels the image field as a group, never a <label> wrapping several selects", () => {
    const html = renderPortfolioFeatureRow({ projects, assignments: {}, choice: undefined });
    expect(html).toContain('<div class="admin-portfolio-feature-image" role="group" aria-labelledby="portfolio-feature-image-label">');
    expect(html).toMatch(/<option value="" selected>First selected project<\/option>/);
  });
});
