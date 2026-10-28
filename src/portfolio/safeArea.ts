/** Fixed A4 landscape page chrome, in millimetres; mirrors the --pf-* tokens in portfolio-screen.css. */
export const PORTFOLIO_PAGE_MM = { height: 210, header: 15, footer: 12 } as const;

export interface PortfolioBox {
  top: number;
  bottom: number;
}

const TOLERANCE_MM = 0.5;

/**
 * Counts content boxes that enter the header or footer band. Pages without chrome
 * (cover, full-colour closings) only reserve the bottom band for the page number.
 */
export const countSafeAreaViolations = (page: PortfolioBox, items: readonly PortfolioBox[], hasChrome: boolean): number => {
  const mm = (page.bottom - page.top) / PORTFOLIO_PAGE_MM.height;
  const safeTop = page.top + (hasChrome ? PORTFOLIO_PAGE_MM.header : 0) * mm - TOLERANCE_MM * mm;
  const safeBottom = page.bottom - PORTFOLIO_PAGE_MM.footer * mm + TOLERANCE_MM * mm;
  return items.filter((item) => item.bottom > item.top && (item.top < safeTop || item.bottom > safeBottom)).length;
};

const CONTENT_SELECTOR = "h1, h2, h3, p, li, figure, address, small, strong, a, span";

/** Elements inside [data-pf-bleed] (full-height images and rails) may run under the chrome by design. */
const contentBoxes = (page: HTMLElement): PortfolioBox[] => [...page.querySelectorAll<HTMLElement>(CONTENT_SELECTOR)]
  .filter((element) => !element.closest(".portfolio-page-header, .portfolio-page-footer, .portfolio-page-number, [data-pf-bleed]"))
  .map((element) => element.getBoundingClientRect());

export const findPortfolioLayoutIssues = (root: ParentNode): string[] => [...root.querySelectorAll<HTMLElement>(".portfolio-page")]
  .flatMap((page, index) => {
    const pageBox = page.getBoundingClientRect();
    if (!pageBox.height) return [];
    const crossesPage = page.scrollHeight > page.clientHeight + 1 || page.scrollWidth > page.clientWidth + 1;
    const crossesChrome = countSafeAreaViolations(pageBox, contentBoxes(page), Boolean(page.querySelector(".portfolio-page-footer"))) > 0;
    return crossesPage || crossesChrome
      ? [`Page ${index + 1} (${page.dataset.portfolioLayout ?? "layout"}): content runs into the page header, footer or edge.`]
      : [];
  });
