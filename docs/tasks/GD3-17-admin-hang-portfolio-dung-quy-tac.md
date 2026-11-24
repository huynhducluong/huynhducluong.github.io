# GD3-17 — Admin › Portfolio › Projects & tools: sửa hàng cho đúng quy tắc (nhóm N15)

> **Trạng thái:** GIAO CODE · **Nhánh:** `gd3/17-admin-hang-portfolio-dung-quy-tac` từ `main` · **Ngày giao:** 2026-11-24 · **Cỡ:** Nhỏ (~3 file) · **Người đang code:** Claude — cửa sổ code (hoặc Codex)
> **Gộp (ADR-018):** chỉ Admin, không migration, không đổi giao diện công khai → Claude tự gộp được nếu review sạch.

## 1. Mục tiêu

Sửa hai chỗ lệch quy tắc của GD3-16 (Sổ #30, W-29, [UI-16](../92-ui-rules.md#ui-16)), **đo cạnh hàng CV** (màn anh em): (1) hàng Draft / archived phải viền **nét đứt** và nền muted như hàng CV, không viền liền; (2) nút chevron phải **vuông**.

## 2. Căn cứ

- `docs/admin-ui-guidelines.md` §6.4, §6.7 ("Project Draft hoặc archived … card muted nét đứt") và đoạn "Hàng gọn (ADR-037)" trong phần Portfolio Projects & tools; `docs/92-ui-rules.md` UI-16 và §2 (checklist).
- **Số đo hiện tại** (1440 × 731, `getComputedStyle`): hàng Draft Portfolio `border-style: solid` (hàng CV Draft: `dashed`); chevron Portfolio **30 × 24** (CV: 40 × 40). Hàng bình thường 64 px (giữ ≤ 72).
- Code: `src/styles/admin-documents.css` (khối "Portfolio project / tool rows": quy tắc `.admin-document-selection article.admin-portfolio-project` đặt `border: 1px solid` và đè `.admin-cv-project.is-unavailable`; `.admin-portfolio-project .admin-cv-project__row > .admin-cv-project__toggle` đặt `width`, `height` nhưng giữ đệm ngang 14 px của `admin-icon-button`); `tools/portfolio-selection-check.mjs`.

## 3. Phạm vi

**Làm:**

1. Hàng `.is-unavailable` (Draft / archived, cả dự án lẫn công cụ) giữ `border-style: dashed` và `background: var(--admin-color-surface-muted)` của §6.7; chỉ ghi đè phần cần thiết (đệm, bo), không ghi đè viền / nền của trạng thái. Không `!important`.
2. Chevron: `padding: 0`, **`width` = `height` = 1.5rem**, icon ở giữa (`display: inline-grid; place-items: center`), vẫn `aria-expanded`, `aria-label`. Ba màn hình mục tiêu: hàng ≤ 72 px (giữ 64 px).
3. **Mở rộng `tools/portfolio-selection-check.mjs`** (nhỏ, đúng phạm vi): phép `state-style` (mọi hàng `.is-unavailable` có `border-style: dashed`), phép `icon-square` (chiều rộng nút chevron = chiều cao ± 1 px). Chạy trên **mốc hiện tại** trước khi sửa, ghi số FAIL vào mục 5.
4. **Test CSS dương** (E-002) trong `adminStyles.test.ts`: khối hàng Portfolio **không** đặt viền liền cho `.is-unavailable`; chevron `padding: 0` và `width`/`height` bằng nhau.
5. **Chạy checklist từng mục (UI-16, bắt buộc):** mục 5 liệt kê từng mục của `admin-ui-guidelines.md` §14 (16 mục) và `docs/92` §2 là đạt / không áp dụng / không đạt, **kèm số đo cạnh hàng CV** cho các trạng thái bật, tắt, Draft, mở, đóng (chiều cao, viền, nền, kích thước nút, cỡ chữ). Mục nào không đạt mà ngoài phạm vi: ghi, không tự sửa.

**Không làm:** đổi hình công tắc (vẫn ô chọn có nhãn như `admin-switch` hiện có); hàng CV; tab khác; migration; dependency mới. Ngân sách CSS Admin chỉ còn dư 0,1 kB: **bớt CSS thừa trong khối này** thay vì thêm; nếu vẫn vượt, dừng và báo.

## 3b. Các bước

1. Mở rộng công cụ đo, ghi mốc FAIL.
2. Sửa CSS (nét đứt, chevron vuông) + test CSS.
3. Chạy công cụ (All PASS), `verify:admin` một lần, so cạnh hàng CV và điền checklist mục 5.

## 4. Tiêu chí nghiệm thu

- [ ] `node tools/portfolio-selection-check.mjs` All PASS (kể cả hai phép mới; hàng vẫn ≤ 72 px).
- [ ] Hàng Draft / archived nét đứt giống hàng CV; chevron vuông.
- [ ] Mục 5 có checklist §14 và `docs/92` §2 từng mục, kèm số đo cạnh hàng CV.
- [ ] `npm run verify:admin` đạt (từ `D:\…`), ngân sách CSS Admin không vượt.

## 5. Báo cáo của người code

- Đã xong bước:
- Người code · đã dùng trước / sau:
- Nhánh, commit cuối:
- File đã đổi (ghi rõ file dùng chung):
- `verify:admin`:
- Công cụ đo (mốc FAIL trước → sau):
- **Checklist giao diện từng mục (§14 × 16, docs/92 §2), so cạnh hàng CV:**
- Chỗ làm khác đề bài và lý do:
- Câu hỏi:

## 6. Review của Claude

(chưa review)
