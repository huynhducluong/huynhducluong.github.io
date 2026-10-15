import { describe, expect, it } from "vitest";
import type { PortfolioMedia } from "../types/portfolio";
import {
  automationMediaRequirement,
  projectMediaRequirement,
  resolvePortfolioMedia,
} from "./mediaSlots";

const media = (id: string, kind: PortfolioMedia["kind"]): PortfolioMedia => ({
  id,
  kind,
  storagePath: `${id}.jpg`,
  alt: { en: id, vi: id },
  displayOrder: kind === "cover" ? 1 : 2,
});

describe("Portfolio media slots", () => {
  it("uses the cover and first different gallery image as safe defaults", () => {
    const images = [media("gallery-2", "gallery"), media("cover", "cover"), media("gallery-1", "gallery")];
    expect(resolvePortfolioMedia(images)).toEqual({
      primary: images[1],
      supporting: images[0],
    });
  });

  it("honors explicit assignments without allowing one image in both slots", () => {
    const images = [media("cover", "cover"), media("gallery-1", "gallery"), media("gallery-2", "gallery")];
    expect(resolvePortfolioMedia(images, { primaryMediaId: "gallery-2", supportingMediaId: "gallery-1" })).toEqual({
      primary: images[2],
      supporting: images[1],
    });
    expect(resolvePortfolioMedia(images.slice(0, 1), { primaryMediaId: "cover", supportingMediaId: "cover" })).toEqual({
      primary: images[0],
      supporting: undefined,
    });
  });

  it("defines reusable profiles independently from layout names", () => {
    expect(projectMediaRequirement("project.editorial")).toEqual({
      primary: "landscape",
      supporting: "wide",
      supportingRequired: true,
    });
    expect(automationMediaRequirement("automation.input-geometry")).toEqual({
      primary: "landscape",
      supporting: "wide",
      supportingRequired: true,
    });
    expect(automationMediaRequirement("automation.classic")).toEqual({});
  });
});
