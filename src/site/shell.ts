import { escapeHtml, localize } from "../shared/format";
import type { Profile } from "../types/career";
import type { WebsiteContent } from "../types/website";
import { resolveDocumentTheme } from "../themes/documentThemes";

const rootUrl = (path = ""): string =>
  `${import.meta.env.BASE_URL}${path.replace(/^\/+/, "")}`;

export const applyWebsiteTheme = (content: WebsiteContent): void => {
  const theme = resolveDocumentTheme(content.theme);
  document.documentElement.style.setProperty("--color-primary", theme.tokens.primary);
  document.documentElement.style.setProperty("--color-primary-dark", theme.tokens.primaryStrong);
  document.documentElement.style.setProperty("--color-primary-light", theme.tokens.surfaceMuted);
  document.documentElement.style.setProperty("--color-accent", theme.tokens.accent);
};

export const siteHeader = (profile: Profile, content: WebsiteContent, active?: string): string => `
  <a class="skip-link" href="#main-content">Skip to content</a>
  <header class="page-header">
    <div class="container page-header__inner">
      <a class="site-logo" href="${rootUrl()}" aria-label="${escapeHtml(profile.name)} home">HDL</a>
      <nav class="page-nav" aria-label="Primary navigation">
        <a ${active === "projects" ? 'aria-current="page"' : ""} href="${rootUrl("projects/")}">${escapeHtml(localize(content.navigation.projects, "en"))}</a>
        <a ${active === "tools" ? 'aria-current="page"' : ""} href="${rootUrl("tools/")}">${escapeHtml(localize(content.navigation.automation, "en"))}</a>
        <a href="${rootUrl("cv/")}">CV</a>
        <a href="${rootUrl("portfolio/")}">Portfolio PDF</a>
        <a class="page-nav__admin" href="${rootUrl("admin/")}">
          <span aria-hidden="true"></span>Admin
        </a>
      </nav>
    </div>
  </header>
`;

export const siteFooter = (profile: Profile, content: WebsiteContent): string => `
  <footer class="page-footer">
    <div class="container page-footer__inner">
      <p>© ${new Date().getFullYear()} ${escapeHtml(profile.name)} · ${escapeHtml(localize(content.footerText, "en"))}</p>
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
