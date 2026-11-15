import { describe, expect, it } from "vitest";
import { credentialPreviews, pickCredentialPreview } from "./credentialPreviews";
import type { CredentialPreview } from "../types/credential";

const crop = (profile: "landscape" | "portrait"): CredentialPreview => ({ profile, storagePath: `${profile}.webp`, publicUrl: `https://example.com/${profile}.webp`, width: 100, height: 100 });

describe("credential previews", () => {
  it("reads previews, or the single preview of an older release", () => {
    expect(credentialPreviews(undefined)).toEqual({});
    expect(credentialPreviews({})).toEqual({});
    expect(credentialPreviews({ previews: { portrait: crop("portrait") } })).toEqual({ portrait: crop("portrait") });
    expect(credentialPreviews({ preview: crop("portrait") })).toEqual({ portrait: crop("portrait") });
  });

  it("picks the crop of the wanted orientation, else the other one, else nothing", () => {
    const both = { previews: { landscape: crop("landscape"), portrait: crop("portrait") } };
    expect(pickCredentialPreview(both, "portrait")).toEqual({ preview: crop("portrait"), exact: true });
    expect(pickCredentialPreview(both, "landscape")).toEqual({ preview: crop("landscape"), exact: true });
    expect(pickCredentialPreview({ previews: { portrait: crop("portrait") } }, "landscape")).toEqual({ preview: crop("portrait"), exact: false });
    expect(pickCredentialPreview({ preview: crop("landscape") }, "landscape")).toEqual({ preview: crop("landscape"), exact: true });
    expect(pickCredentialPreview({}, "landscape")).toBeUndefined();
  });
});
