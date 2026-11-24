# GD3-23 — Admin › Appearance: "Lấy màu từ logo" (nhóm N20)

> **Trạng thái:** GIAO CODE (làm **sau** GD3-22, một thư mục làm việc) · **Nhánh:** `gd3/23-admin-mau-tu-logo` từ `main` · **Ngày giao:** 2026-11-24 · **Cỡ:** Vừa (~5 file) · **Người đang code:** Claude — cửa sổ code (hoặc Codex)
> **Gộp (ADR-018):** chỉ Admin, không migration, không đổi giao diện công khai hay PDF **hiện có** (chỉ thêm khả năng chọn màu) → Claude tự gộp được nếu review sạch.

## 1. Mục tiêu

[ADR-040](../../decisions/ADR-REGISTER.md) (Sổ #34, W-33): trong Appearance của CV, Portfolio, Cover Letter (và nơi khác dùng `renderDocumentThemeFields`) thêm nút **"Lấy màu từ logo"**: chọn ảnh logo công ty ứng tuyển, gợi ý 2 – 3 cặp **Primary / Accent**, bấm một cặp thì chuyển preset sang **Custom** và điền hai màu. Màu lưu theo từng tài liệu như hiện nay; UI / tài liệu vẫn đạt tương phản 4,5 : 1.

## 2. Căn cứ

- `src/themes/documentThemes.ts` (`buildDocumentThemeTokens`, `resolveDocumentTheme`, `getContrastRatio`, `DOCUMENT_TEXT_CONTRAST` = 4,5), `src/admin/documentThemeFields.ts` (`renderDocumentThemeFields`; hai `<input type="color">` `theme_primary`, `theme_accent`; `<select>` preset), `src/admin/profileDocumentWorkspace.ts` (`readTheme` ~dòng 362), `coverLetterWorkspace.ts`, `siteWorkspace.ts`.
- `docs/admin-ui-guidelines.md` (§6.1 select / chevron, §6.3 trường, §14), [AGENTS §5](../../AGENTS.md) mục 1, 2, 3, 6 (token, renderer chung, escape, a11y); `docs/ui-guidelines.md` §7 (màu tài liệu: không dùng accent làm màu chữ).
- **Không lưu logo** (riêng tư / không thêm dữ liệu): chỉ đọc màu bằng `createImageBitmap` hoặc `Image` + `canvas` thu nhỏ (≤ 128 px cạnh dài), rồi bỏ ảnh. Không tải lên Supabase, không migration.
- **Ngân sách CSS Admin đã hết dư địa (27,0 / 27,0 kB; GD3-21 đang làm giảm):** dùng lại tối đa class có sẵn (`button--secondary`, `admin-field-hint`, chip, `.admin-document-theme`); nếu CSS vẫn vượt, **dừng và báo** số cần thêm để Claude và người vận hành quyết nâng ngân sách; JS ngân sách còn dư (92,8 / 115,0 kB), ưu tiên nạp lười (`import()`) phần trích màu.

## 3. Phạm vi

**Làm:**

1. **Hàm thuần `extractLogoPalette(pixels)`** (file mới, ví dụ `src/shared/logoPalette.ts`): nhận mảng RGBA đã thu nhỏ; bỏ điểm trong suốt, gần trắng, gần đen và xám (độ bão hòa thấp); gom màu (lượng tử hóa 5 bit mỗi kênh hoặc k-means nhỏ); xếp theo diện tích × độ bão hòa; **Primary** = màu nổi bật nhất; **Accent** = màu nổi bật kế tiếp **khác sắc rõ** (khác Primary theo khoảng cách màu / sắc độ ≥ ngưỡng, ghi ngưỡng); nếu logo chỉ một màu thì Accent = biến thể sáng / tối của Primary (hàm đã có hoặc tự viết, ghi rõ). Trả tối đa **3 cặp** có thứ tự; logo đơn sắc đen / trắng trả danh sách rỗng (UI nói "không tìm thấy màu nổi bật").
2. **UI trong `renderDocumentThemeFields`:** nút **"Lấy màu từ logo"** (`button--secondary`) mở `<input type="file" accept="image/*">` ẩn (không file input native nhìn thấy, như §6.5); sau khi chọn, hiển thị **tối đa 3 nút cặp màu** (hai ô màu + mã hex, `aria-label` "Use <primary> and <accent>"); bấm một cặp: đặt `<select>` = `custom`, điền `theme_primary` / `theme_accent`, phát `input` / `change` để dirty-state và preview cập nhật; dòng gợi ý `aria-live="polite"` ghi kết quả tương phản của bộ màu vừa chọn lấy từ `buildDocumentThemeTokens` (ví dụ "Text on primary 5.1 : 1, passes") và, nếu hệ thống phải điều chỉnh màu để đạt 4,5 : 1, ghi "Adjusted for contrast". Hộp thoại lỗi / thông báo qua `showAdminToast` (không `alert`). Chuỗi EN (Admin chỉ tiếng Anh).
3. **Hành vi:** không đổi dữ liệu cho đến khi người dùng bấm một cặp; không tự lưu (vẫn Save draft / Publish như mọi thay đổi theme); file không phải ảnh hoặc quá lớn (> 5 MB) báo lỗi gọn; SVG được đọc qua `Image`; trạng thái disabled (tài liệu đã phát hành, khi `disabledAttribute` có) vô hiệu hóa cả nút.
4. **Test:** (a) `extractLogoPalette` với dữ liệu tổng hợp: logo hai màu (đỏ + xanh) → Primary / Accent đúng và khác sắc; logo chủ yếu trắng + một màu → Primary là màu đó, Accent là biến thể; logo đen trắng → rỗng; điểm trong suốt bị bỏ; thứ tự ổn định; (b) markup: nút có tên truy cập, không file input nhìn thấy, `disabled` khi tài liệu khóa, thoát chuỗi một lần (E-003); (c) test CSS dương nếu thêm CSS.
5. **Công cụ đo mới `tools/theme-from-logo-check.mjs`** (theo mẫu các tool Playwright có `.auth`): tạo ba logo tổng hợp (PNG vẽ bằng canvas: đỏ + xanh dương; trắng + một màu lục; đen trắng), vào Appearance của CV và Cover Letter, chọn từng file, kiểm gợi ý (số cặp, `aria-live`), bấm cặp đầu: `<select>` = Custom, hai `<input type="color">` đổi đúng, dòng tương phản ≥ 4,5. **Mốc trước khi làm: FAIL** (nút chưa có; ghi số). Mục tiêu All PASS.
6. **Kiểm kê điều khiển (UI-17 điều 2) và checklist từng mục (§14 × 16, docs/92 §2):** bảng kích thước nút mới so với nút Appearance / More hiện có, ảnh ở 1440, 1180, 768, 390; thử logo thật (ví dụ ảnh có chữ, nền trong suốt).

**Không làm:** lưu logo; thư viện bảng màu đặt tên (phương án B, làm sau nếu cần); đổi `buildDocumentThemeTokens`; đổi giao diện công khai; migration; dependency mới (viết trích màu thuần, không thêm thư viện).

## 3b. Các bước

1. `extractLogoPalette` + test thuần.
2. UI nút + cặp màu + điền Custom + dòng tương phản.
3. `tools/theme-from-logo-check.mjs`; kiểm kê; `verify:admin` một lần (CSS không vượt 27,0 kB); điền mục 5.

## 4. Tiêu chí nghiệm thu

- [ ] `node tools/theme-from-logo-check.mjs` All PASS (mốc FAIL → 0).
- [ ] Chọn logo → tối đa 3 cặp; bấm cặp → preset Custom, hai màu đổi, preview đổi, dirty-state bật; tải lại sau Save draft vẫn giữ màu.
- [ ] Tương phản của bộ màu hiển thị và đạt 4,5 : 1 (hoặc ghi "Adjusted for contrast").
- [ ] Logo không được lưu / tải lên đâu cả (đo: không có request mạng mới khi chọn file).
- [ ] `npm run verify:admin` đạt (từ `D:\…`), CSS / JS Admin không vượt ngân sách.

## 5. Báo cáo của người code

- Đã xong bước:
- Người code · đã dùng trước / sau:
- Nhánh, commit cuối:
- File đã đổi (ghi rõ file dùng chung):
- `verify:admin` (CSS / JS gzip trước / sau):
- `tools/theme-from-logo-check.mjs` (mốc FAIL → sau):
- **Bảng kiểm kê điều khiển:**
- **Checklist giao diện từng mục (§14 × 16, docs/92 §2):**
- Chỗ làm khác đề bài và lý do:
- Câu hỏi:

## 6. Review của Claude

(chưa review)
