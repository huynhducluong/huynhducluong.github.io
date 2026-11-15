import { describe, expect, it } from "vitest";
import { safeYouTubeUrl } from "./youtube";

describe("safeYouTubeUrl", () => {
  it("normalizes valid watch and youtu.be URLs", () => {
    expect(safeYouTubeUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=3")).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    expect(safeYouTubeUrl("https://youtu.be/dQw4w9WgXcQ")).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  });
  it("returns null instead of throwing for empty, garbage and unsafe values", () => {
    for (const value of [undefined, null, "", "   ", "not a url", "javascript:alert(1)", "https://example.com/watch?v=dQw4w9WgXcQ"]) {
      expect(safeYouTubeUrl(value)).toBeNull();
    }
  });
});
