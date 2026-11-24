# GD3-18 — Admin › Portfolio › Projects & tools: ô chọn "In Portfolio" đồng bộ với cả Admin (nhóm N16)

> **Trạng thái:** GIAO CODE · **Nhánh:** `gd3/18-admin-o-chon-dong-bo` từ `main` · **Ngày giao:** 2026-11-24 · **Cỡ:** Nhỏ (~3 file) · **Người đang code:** Claude — cửa sổ code (hoặc Codex)
> **Gộp (ADR-018):** chỉ Admin, không migration, không đổi giao diện công khai → Claude tự gộp được nếu review sạch.

## 1. Mục tiêu

Sửa Sổ #32 / W-31 / [UI-17](../92-ui-rules.md#ui-17): ô tick "In Portfolio" của hàng Portfolio đang **24 × 24 px** trong khi mọi checkbox khác của Admin là **13 – 16 px**. Đưa về **16 px** như CV và Background; vùng bấm vẫn ≥ 24 px bằng đệm của nhãn.

## 2. Căn cứ

- `docs/92-ui-rules.md` UI-17 (và UI-16); `docs/admin-ui-guidelines.md` đoạn "Hàng gọn (ADR-037)" ở phần Projects & tools, §14 mục 2, 5, 10, 12.
- **Số đo (1440 × 731, `getBoundingClientRect`):** Portfolio › Projects & tools: 22 ô **24 × 24** (`.admin-switch`), 3 ô trách nhiệm 13 × 13; Portfolio › Background 5 ô 16 × 16; CV › Projects & tools 3 ô 16 × 16; CV › Background 15 ô 16 × 16. Chevron 24 × 24 giữ nguyên (người vận hành: "dấu xuống phù hợp").
- Code: `src/styles/admin-documents.css` (khối "Portfolio project / tool rows": `.admin-portfolio-project__include input[type="checkbox"]` `width` / `height` 1.5rem; `.admin-document-selection .admin-switch input`), `tools/portfolio-selection-check.mjs` (phép `target`).
- **Ngân sách CSS Admin đã hết dư địa (27,0 / 27,0 kB):** thay đổi này phải **không tăng** CSS (ưu tiên xóa dòng thay vì thêm); nếu vẫn vượt, dừng và báo.

## 3. Phạm vi

**Làm:**

1. Hộp chọn của hàng dự án và hàng công cụ Portfolio: **16 × 16** (bỏ `width` / `height` 1.5rem; dùng kích thước chung như CV / Background), `accent-color: var(--color-primary)`, `margin: 0`. Nhãn `.admin-portfolio-project__include` (cả nhãn "In Portfolio" hiện, và ô khi nhãn ẩn ở hàng hẹp) có **vùng bấm ≥ 24 × 24 px** bằng `padding` (ví dụ `padding: .25rem`), toàn nhãn là vùng bấm. Hàng vẫn ≤ 72 px, một dòng, chip / tên không đổi chỗ.
2. Hàng hẹp (`@container pf-row` ≤ 22 rem): chữ nhãn vẫn ẩn sr-only, vùng bấm quanh ô vẫn ≥ 24 × 24.
3. Cập nhật **phép `target`** của công cụ đo: đo **vùng bấm** (hộp nhãn bao quanh ô), không đo hộp input; thêm phép `checkbox-size` (hộp chọn trong hàng Portfolio phải **bằng cỡ** checkbox của hàng CV ở cùng màn hình, ±1 px).
4. Test CSS dương (E-002) trong `adminStyles.test.ts`: khối hàng Portfolio không còn `width` / `height` 1.5rem cho hộp chọn; nhãn có đệm.
5. **Kiểm kê điều khiển (UI-17 điều 2, bắt buộc):** mục 5 có **bảng kích thước** mọi ô checkbox / nút chevron / chip trạng thái ở các màn hình Admin Portfolio, CV, Background, Homepage (grep + đo), nêu chỗ lệch với đa số kèm lý do; kèm checklist §14 từng mục và `docs/92` §2 như UI-16, đo ở 1440, 1180, 768, 390.

**Không làm:** đổi chevron; đổi hàng CV; hình công tắc kéo; tab khác; migration; dependency mới.

## 3b. Các bước

1. Sửa CSS hộp chọn + vùng bấm; `portfolio-selection-check` (phép `target`, `checkbox-size`) và `name-width` vẫn PASS.
2. Test CSS; kiểm kê điều khiển; `verify:admin` một lần (CSS không vượt 27,0 kB).

## 4. Tiêu chí nghiệm thu

- [ ] Hộp chọn "In Portfolio" 16 × 16 như CV / Background; vùng bấm (nhãn) ≥ 24 × 24 ở 1440, 1920, 2560 và các cột hẹp (1024, 768, 390).
- [ ] `node tools/portfolio-selection-check.mjs` All PASS (kể cả `checkbox-size`, `name-width`); hàng ≤ 72 px.
- [ ] Mục 5 có bảng kiểm kê kích thước điều khiển và checklist từng mục.
- [ ] `npm run verify:admin` đạt (từ `D:\…`), CSS Admin không vượt ngân sách.

## 5. Báo cáo của người code

- Đã xong bước:
- Người code · đã dùng trước / sau:
- Nhánh, commit cuối:
- File đã đổi (ghi rõ file dùng chung):
- `verify:admin`:
- Công cụ đo (mốc FAIL trước → sau):
- **Bảng kiểm kê kích thước điều khiển:**
- **Checklist giao diện từng mục (§14 × 16, docs/92 §2), so cạnh hàng CV và mọi nơi dùng cùng loại điều khiển:**
- Chỗ làm khác đề bài và lý do:
- Câu hỏi:

## 6. Review của Claude

(chưa review)
