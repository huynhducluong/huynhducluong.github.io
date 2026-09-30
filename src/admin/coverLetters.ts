import { requireAdminAccess } from "./auth";

const initialize = async (): Promise<void> => {
  if (!await requireAdminAccess()) return;
  window.location.replace(`${import.meta.env.BASE_URL}admin/?view=cover-letters`);
};

void initialize();
