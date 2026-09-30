import { requireAdminAccess } from "./auth";

const initialize = async (): Promise<void> => {
  if (!await requireAdminAccess()) return;
  const id = new URLSearchParams(window.location.search).get("id");
  const target = new URL(`${import.meta.env.BASE_URL}admin/`, window.location.origin);
  target.searchParams.set("view", "cover-letters");
  if (id) target.searchParams.set("id", id);
  window.location.replace(target);
};

void initialize();
