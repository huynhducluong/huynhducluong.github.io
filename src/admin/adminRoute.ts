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

export const readAdminRoute = (): AdminRouteState => {
  const params = new URL(window.location.href).searchParams;
  return {
    view: params.get("view"),
    item: params.get("item") ?? params.get("document") ?? params.get("id"),
    tab: params.get("tab"),
  };
};

export const updateAdminRoute = (
  patch: AdminRoutePatch,
  mode: "replace" | "push" = "replace",
): void => {
  const url = new URL(window.location.href);
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
  const target = `${url.pathname}${url.search}${url.hash}`;
  if (mode === "push") window.history.pushState({}, "", target);
  else window.history.replaceState({}, "", target);
};
