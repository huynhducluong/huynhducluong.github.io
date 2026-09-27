import { profile } from "../data/profile";
import { escapeHtml } from "../shared/format";

const rootUrl = (path = ""): string =>
  `${import.meta.env.BASE_URL}${path.replace(/^\/+/, "")}`;

export const siteHeader = (active?: string): string => `
  <a class="skip-link" href="#main-content">Skip to content</a>
  <header class="page-header">
    <div class="container page-header__inner">
      <a class="site-logo" href="${rootUrl()}" aria-label="${escapeHtml(profile.name)} home">HDL</a>
      <nav class="page-nav" aria-label="Primary navigation">
        <a ${active === "projects" ? 'aria-current="page"' : ""} href="${rootUrl("projects/")}">Projects</a>
        <a ${active === "tools" ? 'aria-current="page"' : ""} href="${rootUrl("tools/")}">Tools</a>
        <a href="${rootUrl("cv/")}">CV</a>
        <a href="${rootUrl("portfolio/")}">Portfolio PDF</a>
      </nav>
    </div>
  </header>
`;

export const siteFooter = (): string => `
  <footer class="page-footer">
    <div class="container page-footer__inner">
      <p>© ${new Date().getFullYear()} ${escapeHtml(profile.name)}</p>
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
