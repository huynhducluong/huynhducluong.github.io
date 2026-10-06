import { beforeEach, describe, expect, it } from "vitest";
import {
  clearAdminDirty,
  hasAnyAdminDirtyState,
  isAdminDirty,
  setAdminDirty,
  type AdminDirtyScope,
} from "./dirtyState";

const scopes: AdminDirtyScope[] = ["content", "homepage", "profile", "cv", "portfolio", "cover-letters"];

describe("shared Admin dirty state", () => {
  beforeEach(() => scopes.forEach(clearAdminDirty));

  it("tracks workspaces independently", () => {
    setAdminDirty("homepage", true);
    setAdminDirty("cv", true);
    expect(isAdminDirty("homepage")).toBe(true);
    expect(isAdminDirty("cv")).toBe(true);
    expect(isAdminDirty("portfolio")).toBe(false);
    expect(hasAnyAdminDirtyState()).toBe(true);
  });

  it("stays dirty until every changed workspace is cleared", () => {
    setAdminDirty("content", true);
    setAdminDirty("cover-letters", true);
    clearAdminDirty("content");
    expect(hasAnyAdminDirtyState()).toBe(true);
    setAdminDirty("cover-letters", false);
    expect(hasAnyAdminDirtyState()).toBe(false);
  });
});
