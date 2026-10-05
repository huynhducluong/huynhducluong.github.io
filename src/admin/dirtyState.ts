export type AdminDirtyScope = "content" | "homepage" | "profile" | "cv" | "portfolio" | "cover-letters";

const dirtyScopes = new Set<AdminDirtyScope>();
let beforeUnloadBound = false;

export const setAdminDirty = (scope: AdminDirtyScope, dirty: boolean): void => {
  if (dirty) dirtyScopes.add(scope);
  else dirtyScopes.delete(scope);
};

export const clearAdminDirty = (scope: AdminDirtyScope): void => {
  dirtyScopes.delete(scope);
};

export const isAdminDirty = (scope: AdminDirtyScope): boolean => dirtyScopes.has(scope);

export const hasAnyAdminDirtyState = (): boolean => dirtyScopes.size > 0;

export const bindAdminBeforeUnload = (): void => {
  if (beforeUnloadBound) return;
  beforeUnloadBound = true;
  window.addEventListener("beforeunload", (event) => {
    if (!hasAnyAdminDirtyState()) return;
    event.preventDefault();
    event.returnValue = "";
  });
};
