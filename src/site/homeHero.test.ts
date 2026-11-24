import { describe, expect, it } from "vitest";
import homeCss from "../styles/home.css?raw";
import tokensCss from "../styles/tokens.css?raw";
import type { Profile } from "../types/career";
import { heroStack, renderHero, type HeroInput } from "./homeHero";

const profile: Profile = {
  name: { en: "Tom & <Jerry>", vi: "Tôm & <Jerry>" },
  professionalTitle: { en: "BIM Engineer", vi: "Kỹ sư BIM" },
  email: "a@b.c",
  phone: "1",
  location: { en: "Ho Chi Minh City", vi: "TP. Hồ Chí Minh" },
  summary: { en: "", vi: "" },
  photoPath: "assets/me.jpg",
};

const input = (overrides: Partial<HeroInput> = {}): HeroInput => ({
  language: "en",
  profile,
  eyebrow: "BIM",
  overviewLabel: "Overview",
  stack: ["Revit", "Dynamo"],
  actions: { projects: "#projects", cv: "/cv/", portfolio: "/portfolio/", contact: "mailto:a@b.c" },
  actionLabels: { projects: "View projects", cv: "View CV", portfolio: "Portfolio PDF", contact: "Contact me" },
  ...overrides,
});

describe("heroStack", () => {
  it("takes the four most common technologies, ties by first appearance, case-insensitive", () => {
    const stack = heroStack([
      ["Revit", "Dynamo", "Python"],
      ["revit", "Civil 3D", "Python"],
      ["Revit", "Navisworks", "Dynamo"],
    ]);
    expect(stack).toEqual(["Revit", "Dynamo", "Python", "Civil 3D"]);
  });
});

describe("renderHero", () => {
  it("renders the profile photo as an eager, sized, named image", () => {
    const html = renderHero(input());
    expect(html).toContain('fetchpriority="high"');
    expect(html).toContain('width="640" height="440"');
    expect(html).toContain("assets/me.jpg");
    expect(html).not.toContain('loading="lazy"');
    expect(html).not.toContain("hero__photo--empty");
  });

  it("falls back to a decorative HDL tile without a photo", () => {
    const html = renderHero(input({ profile: { ...profile, photoPath: "" } }));
    expect(html).toContain('class="hero__photo hero__photo--empty" aria-hidden="true">HDL');
    expect(html).not.toContain("<img");
  });

  it("escapes the name exactly once", () => {
    const html = renderHero(input());
    expect(html).toContain("Tom &amp; &lt;Jerry&gt;");
    expect(html).not.toContain("&amp;amp;");
    expect(html).not.toContain("<Jerry>");
  });

  it("uses English and Vietnamese labels and tagline", () => {
    const en = renderHero(input());
    expect(en).toContain("<dt>Based in</dt>");
    expect(en).toContain("<dt>Stack</dt>");
    expect(en).toContain("starting from the drawing.");
    const vi = renderHero(input({ language: "vi" }));
    expect(vi).toContain("<dt>Địa điểm</dt>");
    expect(vi).toContain("ngay từ bản vẽ.");
    expect(vi).not.toContain("<dt>Stack</dt>");
  });

  it("joins the stack with a middle dot and keeps the SHEET cell", () => {
    const html = renderHero(input());
    expect(html).toContain("Revit · Dynamo");
    expect(html).toContain("01 / 01");
  });
});

describe("home Blueprint CSS contract", () => {
  it("draws the 2 × 2 menu (≤ 900 px) as four bordered cells sharing their rules (ADR-038)", () => {
    const tablet = homeCss.slice(homeCss.indexOf("@media (max-width: 900px)"), homeCss.indexOf("@media (min-width: 651px)"));
    expect(tablet).toMatch(/\.site-nav__links a \{[^}]*justify-content: flex-start;[^}]*border: 1px solid var\(--color-primary\);[^}]*background: var\(--color-surface\)/);
    expect(tablet).toMatch(/\.site-nav__links \{[^}]*gap: 0;[^}]*padding: 0 1px 1px 0/);
    expect(tablet).toMatch(/\.site-nav__links li \{[^}]*margin: 0 -1px -1px 0/);
    // From 901 px the menu is one row again: no cell border there.
    expect(homeCss.slice(homeCss.indexOf("@media (min-width: 901px)"), homeCss.indexOf("@media (max-width: 650px)"))).not.toMatch(/\.site-nav__links a \{[^}]*border/);
    expect(tablet).not.toContain("!important");
  });

  it("declares the new tokens", () => {
    expect(tokensCss).toContain("--font-mono:");
    expect(tokensCss).toContain("--grid-size: 4rem");
    expect(tokensCss).toContain("--grid-alpha: 14%");
    expect(tokensCss).toContain("--space-24:");
  });

  it("draws one continuous grid on the page body and keeps sections transparent", () => {
    expect(homeCss).toMatch(/\.home-page \{[^}]*background-size: var\(--grid-size\) var\(--grid-size\)/);
    expect(homeCss).toContain("var(--grid-alpha)");
    expect(homeCss).toMatch(/\.home-page \.section--muted \{\s*background: color-mix\(in srgb, var\(--color-primary\) 5%, transparent\)/);
    expect(homeCss).not.toMatch(/\.home-page \.section \{[^}]*background/);
  });

  it("gives phone targets a 44px minimum and avoids !important", () => {
    expect(homeCss).toMatch(/\.site-nav__links a \{[^}]*min-height: 44px/);
    expect(homeCss).toMatch(/\.section-more \{[^}]*min-height: 44px/);
    expect(homeCss).toMatch(/\.site-footer__admin \{[^}]*min-height: 44px/);
    expect(homeCss).not.toContain("!important");
  });
});
