import { describe, expect, it } from "vitest";
import { selectPreviewImagesToWait } from "./previewProtocol";

const img = (complete: boolean, loading: string, naturalWidth = 10) => ({ complete, loading, naturalWidth });

describe("selectPreviewImagesToWait", () => {
  it("bỏ qua ảnh lazy chưa hoàn tất", () => {
    expect(selectPreviewImagesToWait([img(false, "lazy")])).toEqual([]);
  });
  it("chờ ảnh eager chưa hoàn tất", () => {
    const eager = img(false, "eager");
    expect(selectPreviewImagesToWait([eager])).toEqual([eager]);
  });
  it("giữ ảnh đã hoàn tất để giải mã, kể cả lazy", () => {
    const done = img(true, "lazy");
    const doneEager = img(true, "eager");
    expect(selectPreviewImagesToWait([done, doneEager, img(false, "lazy")])).toEqual([done, doneEager]);
  });
  it("danh sách rỗng", () => {
    expect(selectPreviewImagesToWait([])).toEqual([]);
  });
});
