import { describe, expect, it } from "vitest";
import { renderPendingMediaRow, renderSavedMediaRow, type SavedMediaRowInput } from "./mediaRows";

const saved = (overrides: Partial<SavedMediaRowInput> = {}): string => renderSavedMediaRow({
  id: "media-1",
  previewUrl: "https://example.test/a.webp",
  kind: "gallery",
  alt: { en: "Bridge Deck Generator", vi: "" },
  caption: null,
  typeLabel: "JPEG",
  sizeLabel: "0.44 MB",
  index: 1,
  firstGalleryIndex: 1,
  total: 3,
  customCropCount: 0,
  dirty: false,
  ...overrides,
});
const pending = (kind: "cover" | "gallery" = "gallery"): string => renderPendingMediaRow({
  id: "pending-1",
  previewUrl: "blob:preview",
  fileName: "Screenshot_20261025-180435_Prep.jpg",
  typeLabel: "JPEG",
  sizeLabel: "0.44 MB",
  kind,
  values: { altEn: "Bridge Deck Generator", altVi: "", captionEn: "", captionVi: "" },
  index: 0,
  total: 2,
});
const fieldsOf = (html: string): string => html.slice(html.indexOf('class="admin-form-grid admin-media-row__fields"'), html.indexOf("</article>"));

describe("Media rows (§6.5)", () => {
  it.each([["saved", saved()], ["pending", pending()]])("keeps the %s row's bilingual fields as EN | VI pairs on the form grid", (_label, html) => {
    const fields = fieldsOf(html);
    const order = ["alt-en", "alt-vi", "caption-en", "caption-vi"].map((key) => fields.indexOf(`-${key}`));

    // Two columns, filled in order: Alt EN | Alt VI on row one, Caption EN | Caption VI on row two.
    expect(order.every((position) => position > 0)).toBe(true);
    expect(order).toEqual([...order].sort((left, right) => left - right));
    expect(fields.match(/<label>/g)).toHaveLength(4);
    // Nothing that is not a bilingual pair sits inside that grid.
    expect(fields).not.toMatch(/<select|data-pending-kind|admin-segmented/);
  });

  it("shows the role once, as a segmented Cover | Gallery choice on pending rows", () => {
    const html = pending("cover");

    expect(html).toMatch(/role="radiogroup"[\s\S]*value="cover" checked data-pending-kind/);
    expect(html).not.toContain("admin-media-badge");
    expect(fieldsOf(html)).toContain('aria-required="true" data-pending-alt-en');
    expect(html).toContain('title="Screenshot_20261025-180435_Prep.jpg"');
    expect(html).toContain("Not uploaded yet");
  });

  it("keeps destructive and rare actions of a saved image in More", () => {
    const html = saved();
    const actions = html.slice(html.indexOf("admin-media-row__actions"), html.indexOf("admin-form-grid"));
    const menu = actions.slice(actions.indexOf("<details"), actions.indexOf("</details>"));

    expect(menu).toContain("data-media-delete");
    expect(menu).toContain("data-media-cover");
    expect(menu).toContain("data-media-download");
    expect(actions.replace(menu, "")).not.toMatch(/data-media-(delete|cover|download)/);
    expect(actions).toContain("data-media-crops");
  });

  it("shows Unsaved and Save only while the row has edits", () => {
    expect(saved()).toMatch(/data-media-unsaved hidden[\s\S]*data-media-save hidden/);
    expect(saved({ dirty: true })).not.toMatch(/data-media-(unsaved|save) hidden/);
  });

  it("uses the shared arrow icons and no move buttons on the cover", () => {
    expect(saved()).toMatch(/data-media-move="up" disabled[^>]*><svg/);
    expect(saved({ kind: "cover", index: 0 })).not.toContain("data-media-move");
    expect(saved({ kind: "cover", index: 0 })).not.toContain("data-media-cover");
  });
});
