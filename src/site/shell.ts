import { escapeHtml, localize, type Language } from "../shared/format";
import { websiteNavigationLabels } from "../data/websiteNavigation";
import type { Profile } from "../types/career";
import type { WebsiteContent } from "../types/website";
import { resolveDocumentTheme } from "../themes/documentThemes";

const rootUrl = (path = ""): string =>
  `${import.meta.env.BASE_URL}${path.replace(/^\/+/, "")}`;

const shellCopy = {
  en: {
    skip: "Skip to content",
    home: "home",
    navigation: "Primary navigation",
    portfolio: "Portfolio PDF",
    admin: "Admin",
  },
  vi: {
    skip: "Đi đến nội dung chính",
    home: "trang chủ",
    navigation: "Điều hướng chính",
    portfolio: "Portfolio PDF",
    admin: "Quản trị",
  },
} as const;

const localized = (value: Parameters<typeof localize>[0], language: Language): string =>
  localize(value, language) || localize(value, "en");

export const applyWebsiteTheme = (content: WebsiteContent): void => {
  const theme = resolveDocumentTheme(content.theme);
  document.documentElement.style.setProperty("--color-primary", theme.tokens.primary);
  document.documentElement.style.setProperty("--color-primary-dark", theme.tokens.primaryStrong);
  document.documentElement.style.setProperty("--color-primary-light", theme.tokens.surfaceMuted);
  document.documentElement.style.setProperty("--color-accent", theme.tokens.accent);
};

export const siteHeader = (profile: Profile, _content: WebsiteContent, active?: string, language: Language = "en"): string => {
  const text = shellCopy[language];
  return `
  <a class="skip-link" href="#main-content">${text.skip}</a>
  <header class="page-header">
    <div class="container page-header__inner">
      <a class="site-logo" href="${rootUrl()}" aria-label="${escapeHtml(profile.name)} ${text.home}">HDL</a>
      <nav class="page-nav" aria-label="${text.navigation}">
        <a ${active === "projects" ? 'aria-current="page"' : ""} href="${rootUrl("projects/")}">${localized(websiteNavigationLabels.projects, language)}</a>
        <a ${active === "tools" ? 'aria-current="page"' : ""} href="${rootUrl("tools/")}">${localized(websiteNavigationLabels.automation, language)}</a>
        <a href="${rootUrl("cv/")}">CV</a>
        <a href="${rootUrl("portfolio/")}">${text.portfolio}</a>
        <a class="page-nav__admin" href="${rootUrl("admin/")}">
          <span aria-hidden="true"></span>${text.admin}
        </a>
      </nav>
    </div>
  </header>
`;
};

export const siteFooter = (profile: Profile, content: WebsiteContent, language: Language = "en"): string => `
  <footer class="page-footer">
    <div class="container page-footer__inner">
      <p>© ${new Date().getFullYear()} ${escapeHtml(profile.name)} · ${localized(content.footerText, language)}</p>
      <a href="mailto:${escapeHtml(profile.email)}">${escapeHtml(profile.email)}</a>
    </div>
  </footer>
`;

export const projectUrl = (slug: string): string =>
  `${rootUrl("project/")}?id=${encodeURIComponent(slug)}`;

export const toolUrl = (slug: string): string =>
  `${rootUrl("tool/")}?id=${encodeURIComponent(slug)}`;

export const readSlug = (): string =>
  new URLSearchParams(window.location.search).get("id")?.trim() ?? "";
