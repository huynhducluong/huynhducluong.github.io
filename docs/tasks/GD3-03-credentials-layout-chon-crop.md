# GD3-03 — Credentials: layout chọn crop, bỏ "Print as" (N3b)

> **Trạng thái:** GIAO CODE · **Nhánh:** `gd3/03-credentials-layout-chon-crop` (`git fetch; git switch -c gd3/03-credentials-layout-chon-crop origin/main`) · **Ngày giao:** 2026-11-15 · **Cỡ:** Lớn (~10–12 file: types, repository, renderer, validation, cropper, workspace, test) · **Người đang code:** Claude — cửa sổ code (Codex còn 27 %, cỡ Lớn → bảng chọn người code)
> **Gộp (ADR-018):** **cần người vận hành duyệt** — đổi PDF Portfolio (crop nào được in).

## 1. Mục tiêu

Người vận hành không phải chọn "Print as" nữa (Sổ #5). Mỗi layout Credential tự dùng crop hợp với khung của nó; thiếu crop đúng hướng thì in crop còn lại và Recommendations nói rõ. Hộp Adjust crops nhắc kiểm số giấy tờ, ngày sinh trước khi công khai (E-008).

## 2. Căn cứ

- ADR-026 `[CHỐT]`. Quy tắc đã sửa sẵn (đọc đúng các đoạn này): `docs/ui-guidelines.md` §8.4 gạch "Bằng chứng Credential chỉ in khi được cho hiển thị"; `docs/admin-ui-guidelines.md` §6.4 gạch "Hàng bằng chứng Credential" và §7.1 quy tắc 13 (bỏ "Print as", dòng nhắc E-008); `docs/architecture.md` đoạn Professional Credential (`previews`); `docs/admin-operations.md` mục "Preview bằng chứng Credential" (`preview_profile`).
- Sổ: W-05, E-008, UI-11; mẫu tab / trạng thái hộp crop: admin-ui §7.1.
- Code hiện tại: `src/types/credential.ts` (`CredentialPreviewProfile`, `CredentialPreview`, `CredentialSnapshot.preview`, `CredentialAsset.previewProfile`); `src/services/credentialRepository.ts` (`credentialPreview`, `credentialSnapshot`, `saveCredentialPreviewSettings`); `src/portfolio/renderPortfolioV2.ts` (`documentFrame`, dòng ~243); `src/shared/profileDocumentValidation.ts` (dòng ~152); `src/admin/projectCoverCropper.ts` (khối "Print as" dòng ~115, `printProfile`, `printed(...)`, `saveCredentialPreviewSettings(...)` dòng ~498); `src/admin/credentialWorkspace.ts` (dòng ~100, ~577, ~602); `src/portfolio/layouts.ts` (`credentialsLayoutOptions`).

## 3. Phạm vi (dự kiến, hoàn thiện khi giao)

**Làm:**

1. **Dữ liệu.** `CredentialSnapshot.previews?: Partial<Record<CredentialPreviewProfile, CredentialPreview>>` thay `preview`. `credentialSnapshot` lưu mọi crop đã lưu của file đang "Show in Portfolio". Module thuần mới `src/shared/credentialPreviews.ts`: `credentialPreviews(snapshot)` (đọc `previews`, hoặc **`preview` cũ** của release / draft đã lưu → `{ [preview.profile]: preview }`) và `pickCredentialPreview(snapshot, wanted)` trả `{ preview, exact }` (đúng hướng thì `exact: true`, không thì crop còn lại). Renderer, validation, workspace chỉ dùng hai hàm này.
2. **Layout khai báo hướng khung.** `credentialsLayoutDocumentProfile: Record<CredentialsLayout, CredentialPreviewProfile>` trong `layouts.ts` (hiện cả hai là `"landscape"`, khớp `.portfolio-document-frame { aspect-ratio: 4 / 3 }`); test đối chiếu bảng này với tỉ lệ khung đo được (như bảng `mediaSlots.ts` của Project).
3. **Renderer** `documentFrame(credential, layout)` dùng `pickCredentialPreview`.
4. **Validation.** Recommendation mới khi `exact` là false: `"<tên>" prints its Portrait crop in a Landscape frame; add a Landscape crop in Adjust crops to fill it.` (hướng thật thay vào; dùng layout đã resolve của credential qua `resolveCredentialLayout`). Recommendation "no evidence shown" giữ nguyên; kiểm cả `preview` cũ.
5. **Bỏ "Print as".** Xóa control, `printProfile`, `previewProfile` khỏi kiểu và UI; `saveCredentialPreviewSettings` chỉ ghi `show_in_portfolio` và `preview_rotation`. Mở hộp crop mặc định tab Landscape; thumbnail trong `credentialWorkspace` lấy crop Landscape, thiếu thì crop đầu tiên. Đánh dấu tab theo quy ước hộp crop Project / Tool (admin-ui §7.1), không còn nhãn "printed".
6. **E-008.** Dưới ô "Show in Portfolio" thêm một dòng ghi chú: "Check the crop for ID numbers and dates of birth before showing it."
7. **Không migration** (Claude đã kiểm: `preview_profile` là `not null default 'landscape'` trong `202611010002_credential_portfolio_previews.sql`). Cột giữ nguyên trong DB, app không còn đọc / ghi; không sửa migration cũ.

8. **Tùy chọn (ghi nhận review GD3-02):** lề trắng quanh crop Landscape chưa đều (trên / dưới 3,3 mm, trái / phải 4,4 mm vì khung 4:3 đã gồm phần đệm). Chỉ làm nếu cách sửa đơn giản, **không đổi kích thước ngoài của khung** và không làm Dual tràn (đo bằng `tools/portfolio-credentials-check.mjs`, All PASS); phức tạp thì bỏ qua và ghi vào mục 5.

**Không làm:** layout Credential Portrait mới; công cụ che vùng (redact); đổi bucket / bảng crop.

**Test bắt buộc:** release cũ chỉ có `preview` vẫn render đúng; có cả hai crop thì chọn đúng hướng theo layout; chỉ có Portrait thì vào khung Landscape có recommendation; không crop thì placeholder; EN + VI; `tools/portfolio-credentials-check.mjs` All PASS (kể cả ca Portrait trong khung Landscape: thêm ca vào công cụ nếu cần, ngoài phạm vi người code nếu `tools/` cấm — báo Claude).

## 4. Tiêu chí nghiệm thu

- [ ] Các test ở mục 3 đạt; `npm run verify:admin` đạt một lần ở cuối; không dependency mới.
- [ ] Hộp Adjust crops: không còn "Print as"; có dòng nhắc E-008; chụp ở ba màn hình mục tiêu.
- [ ] Release Portfolio đã publish (dạng `preview` cũ) vẫn hiển thị y như trước khi gộp.

## 5. Báo cáo của người code

- Đã xong bước:
- Người code: · token trước / sau:
- Nhánh, commit cuối:
- File đã đổi (ghi rõ file dùng chung):
- `verify:admin`:
- Ghi chú vận hành cho docs:
- Chỗ làm khác đề bài và lý do:
- Câu hỏi:

## 6. Review của Claude

- Ngày, commit đã review:
- **Phải sửa:**
- **Nên sửa:**
- **Cần người vận hành chốt:**
- Kết luận:
