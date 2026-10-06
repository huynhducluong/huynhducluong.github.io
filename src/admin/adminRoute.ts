export interface AdminRouteState {
  view: string | null;
  item: string | null;
  tab: string | null;
}

export interface AdminRoutePatch {
  view?: string | null;
  item?: string | null;
  tab?: string | null;
}

export const parseAdminRoute = (source: string | URL): AdminRouteState => {
  const params = new URL(source).searchParams;
  return {
    view: params.get("view"),
    item: params.get("item") ?? params.get("document") ?? params.get("id"),
    tab: params.get("tab"),
  };
};

export const readAdminRoute = (): AdminRouteState => {
  return parseAdminRoute(window.location.href);
};

export const buildAdminRoute = (source: string | URL, patch: AdminRoutePatch): string => {
  const url = new URL(source);
  const update = (key: "view" | "item" | "tab", value: string | null | undefined): void => {
    if (value === undefined) return;
    if (value) url.searchParams.set(key, value);
    else url.searchParams.delete(key);
  };
  update("view", patch.view);
  update("item", patch.item);
  update("tab", patch.tab);
  url.searchParams.delete("id");
  url.searchParams.delete("document");
  return `${url.pathname}${url.search}${url.hash}`;
};

export const updateAdminRoute = (
  patch: AdminRoutePatch,
  mode: "replace" | "push" = "replace",
): void => {
  const target = buildAdminRoute(window.location.href, patch);
  if (mode === "push") window.history.pushState({}, "", target);
  else window.history.replaceState({}, "", target);
};
