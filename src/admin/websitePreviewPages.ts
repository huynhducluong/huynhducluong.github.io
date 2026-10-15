import type { WebsiteRuntimeData } from "../types/website";
import type { AdminPreviewControlOption } from "./ui";

export type WebsitePreviewPage = "homepage" | "projects" | "tools" | `project:${string}` | `tool:${string}`;

const isAvailableOnWebsite = (item: { status: string; websiteVisible?: boolean }): boolean =>
  item.status === "published" && item.websiteVisible !== false;

export const websitePreviewPageOptions = (runtime: WebsiteRuntimeData): AdminPreviewControlOption[] => [
  { label: "Homepage", value: "homepage" },
  { label: "Projects", value: "projects" },
  { label: "Automation", value: "tools" },
  ...runtime.projects
    .filter(isAvailableOnWebsite)
    .map((item) => ({
      label: `Project · ${item.name.en || item.slug}`,
      value: `project:${item.id}`,
      group: "Projects on website",
    })),
  ...runtime.tools
    .filter(isAvailableOnWebsite)
    .map((item) => ({
      label: `Tool · ${item.name || item.slug}`,
      value: `tool:${item.id}`,
      group: "Automation tools on website",
    })),
];

export const normalizeWebsitePreviewPage = (
  page: WebsitePreviewPage,
  runtime: WebsiteRuntimeData,
): WebsitePreviewPage => {
  if (page.startsWith("project:")) {
    const id = page.slice("project:".length);
    return runtime.projects.some((item) => item.id === id && isAvailableOnWebsite(item)) ? page : "projects";
  }
  if (page.startsWith("tool:")) {
    const id = page.slice("tool:".length);
    return runtime.tools.some((item) => item.id === id && isAvailableOnWebsite(item)) ? page : "tools";
  }
  return page;
};
