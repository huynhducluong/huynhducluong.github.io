import { describe, expect, it } from "vitest";
import { readStoredAdminIdentityName, storeAdminIdentityName } from "./adminIdentityName";

const memoryStorage = () => {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
};

describe("Admin identity name storage", () => {
  it("stores and reads the normalized identity name", () => {
    const storage = memoryStorage();

    expect(storeAdminIdentityName("  Huynh Duc Luong  ", storage)).toBe("Huynh Duc Luong");
    expect(readStoredAdminIdentityName(storage)).toBe("Huynh Duc Luong");
  });

  it("treats a whitespace-only name as empty", () => {
    const storage = memoryStorage();
    storeAdminIdentityName("Huynh Duc Luong", storage);

    expect(storeAdminIdentityName("   ", storage)).toBe("");
    expect(readStoredAdminIdentityName(storage)).toBe("");
  });

  it("returns an empty name when storage is missing or throws", () => {
    const readFailure = {
      ...memoryStorage(),
      getItem: () => { throw new Error("read failed"); },
    };
    const writeFailure = {
      ...memoryStorage(),
      setItem: () => { throw new Error("write failed"); },
    };

    expect(readStoredAdminIdentityName(null)).toBe("");
    expect(readStoredAdminIdentityName(readFailure)).toBe("");
    expect(storeAdminIdentityName("Huynh Duc Luong", null)).toBe("");
    expect(storeAdminIdentityName("Huynh Duc Luong", writeFailure)).toBe("");
  });
});
