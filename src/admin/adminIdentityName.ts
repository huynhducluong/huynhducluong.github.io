const storageKey = "hdl-admin-identity-name";

interface AdminIdentityNameStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const resolveStorage = (storage?: AdminIdentityNameStorage | null): AdminIdentityNameStorage | null => {
  if (storage !== undefined) return storage;
  if (typeof window === "undefined") return null;
  return window.localStorage;
};

export const readStoredAdminIdentityName = (storage?: AdminIdentityNameStorage | null): string => {
  try {
    return resolveStorage(storage)?.getItem(storageKey)?.trim() ?? "";
  } catch {
    return "";
  }
};

export const storeAdminIdentityName = (name: string, storage?: AdminIdentityNameStorage | null): string => {
  const normalized = name.trim();
  try {
    const target = resolveStorage(storage);
    if (!target) return "";
    if (normalized) target.setItem(storageKey, normalized);
    else target.removeItem(storageKey);
    return normalized;
  } catch {
    return "";
  }
};
