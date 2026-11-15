# GD3-03 — Credentials: layout chọn crop, bỏ "Print as" (N3b)

> **Trạng thái:** NHÁP (chờ người vận hành duyệt ADR-026, và GD3-02 gộp xong) · **Nhánh:** `gd3/03-credentials-layout-chon-crop` · **Ngày giao:** — · **Cỡ:** Lớn (~10–12 file: types, repository, renderer, validation, cropper, workspace, test) · **Người đang code:** dự kiến Claude — cửa sổ code (Codex dự kiến còn dưới 30 % sau GD3-02, bảng chọn người code)
> **Gộp (ADR-018):** **cần người vận hành duyệt** — đổi PDF Portfolio (crop nào được in).

## 1. Mục tiêu

Người vận hành không phải chọn "Print as" nữa (Sổ #5). Mỗi layout Credential tự dùng crop hợp với khung của nó; thiếu crop đúng hướng thì in crop còn lại và Recommendations nói rõ. Hộp Adjust crops nhắc kiểm số giấy tờ, ngày sinh trước khi công khai (E-008).

## 2. Căn cứ

- ADR-026 (`[ĐỀ XUẤT]` lúc soạn). **Chỉ giao khi ADR-026 là `[CHỐT]`**; khi đó Claude cập nhật mục "Căn cứ" dưới đây và sửa docs liên quan (ui-guidelines §8.4, admin-ui-guidelines §7.1 và §6.4 hàng bằng chứng Credential, architecture "Vòng đời media") **trước khi giao**, theo ADR-020.
- Code hiện tại: `src/types/credential.ts` (`CredentialPreviewProfile`, `CredentialPreview`, `CredentialSnapshot.preview`, `CredentialAsset.previewProfile`); `src/services/credentialRepository.ts` (`credentialPreview`, `credentialSnapshot`, `saveCredentialPreviewSettings`); `src/portfolio/renderPortfolioV2.ts` (`documentFrame`, dòng ~243); `src/shared/profileDocumentValidation.ts` (dòng ~152); `src/admin/projectCoverCropper.ts` (khối "Print as" dòng ~115, `printProfile`, `printed(...)`, `saveCredentialPreviewSettings(...)` dòng ~498); `src/admin/credentialWorkspace.ts` (dòng ~100, ~577, ~602); `src/portfolio/layouts.ts` (`credentialsLayoutOptions`).

## 3. Phạm vi (dự kiến, hoàn thiện khi giao)

**Làm:**

1. **Dữ liệu.** `CredentialSnapshot.previews?: Partial<Record<CredentialPreviewProfile, CredentialPreview>>` thay `preview`. `credentialSnapshot` lưu mọi crop đã lưu của file đang "Show in Portfolio". Module thuần mới `src/shared/credentialPreviews.ts`: `credentialPreviews(snapshot)` (đọc `previews`, hoặc **`preview` cũ** của release / draft đã lưu → `{ [preview.profile]: preview }`) và `pickCredentialPreview(snapshot, wanted)` trả `{ preview, exact }` (đúng hướng thì `exact: true`, không thì crop còn lại). Renderer, validation, workspace chỉ dùng hai hàm này.
2. **Layout khai báo hướng khung.** `credentialsLayoutDocumentProfile: Record<CredentialsLayout, CredentialPreviewProfile>` trong `layouts.ts` (hiện cả hai là `"landscape"`, khớp `.portfolio-document-frame { aspect-ratio: 4 / 3 }`); test đối chiếu bảng này với tỉ lệ khung đo được (như bảng `mediaSlots.ts` của Project).
3. **Renderer** `documentFrame(credential, layout)` dùng `pickCredentialPreview`.
4. **Validation.** Recommendation mới khi `exact` là false: `"<tên>" prints its Portrait crop in a Landscape frame; add a Landscape crop in Adjust crops to fill it.` (hướng thật thay vào; dùng layout đã resolve của credential qua `resolveCredentialLayout`). Recommendation "no evidence shown" giữ nguyên; kiểm cả `preview` cũ.
5. **Bỏ "Print as".** Xóa control, `printProfile`, `previewProfile` khỏi kiểu và UI; `saveCredentialPreviewSettings` chỉ ghi `show_in_portfolio` và `preview_rotation`. Mở hộp crop mặc định tab Landscape; thumbnail trong `credentialWorkspace` lấy crop Landscape, thiếu thì crop đầu tiên. Đánh dấu tab theo quy ước hộp crop Project / Tool (admin-ui §7.1), không còn nhãn "printed".
6. **E-008.** Dưới ô "Show in Portfolio" thêm một dòng ghi chú: "Check the crop for ID numbers and dates of birth before showing it."
7. **Không migration.** Cột `preview_profile` giữ nguyên trong DB, không còn đọc / ghi. Kiểm `supabase/migrations` xem cột có `not null` mà không có `default` không: nếu có, **dừng và báo** (cần migration, ADR-019).

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
