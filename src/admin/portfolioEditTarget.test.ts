import { describe, expect, it } from "vitest";
import { EDIT_MARKERS_STORAGE_KEY, readEditMarkersPreference, renderEditMarkersToggle, writeEditMarkersPreference } from "./portfolioEditTarget";

const memory = (): Pick<Storage, "getItem" | "setItem"> & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return { data, getItem: (key) => data.get(key) ?? null, setItem: (key, value) => { data.set(key, value); } };
};
const blocked: Pick<Storage, "getItem" | "setItem"> = {
  getItem: () => { throw new Error("blocked"); },
  setItem: () => { throw new Error("blocked"); },
};

describe("Edit markers preference", () => {
  it("is off by default and remembers a choice", () => {
    const storage = memory();
    expect(readEditMarkersPreference(storage)).toBe(false);
    writeEditMarkersPreference(true, storage);
    expect(storage.data.get(EDIT_MARKERS_STORAGE_KEY)).toBe("1");
    expect(readEditMarkersPreference(storage)).toBe(true);
    writeEditMarkersPreference(false, storage);
    expect(readEditMarkersPreference(storage)).toBe(false);
  });
  it("still works when storage is missing or throws", () => {
    expect(readEditMarkersPreference(null)).toBe(false);
    expect(readEditMarkersPreference(blocked)).toBe(false);
    expect(() => writeEditMarkersPreference(true, blocked)).not.toThrow();
    expect(() => writeEditMarkersPreference(true, null)).not.toThrow();
  });
});

describe("Edit markers toggle", () => {
  it("is a pressed-state button labelled Edit markers, off by default", () => {
    const off = renderEditMarkersToggle(false);
    expect(off).toContain('aria-pressed="false"');
    expect(off).toContain(">Edit markers<");
    expect(off).not.toContain("is-active");
    const on = renderEditMarkersToggle(true);
    expect(on).toContain('aria-pressed="true"');
    expect(on).toContain("is-active");
  });
});
