import type { PublicationStatus } from "../types/portfolio";

export type ContentStatusFilter = "all" | PublicationStatus;

interface ContentStatusItem {
  status: PublicationStatus;
}

export const availableContentStatusFilters = (items: ContentStatusItem[]): ContentStatusFilter[] => {
  const filters: ContentStatusFilter[] = ["all", "draft", "published"];
  if (items.some((item) => item.status === "archived")) filters.push("archived");
  return filters;
};
