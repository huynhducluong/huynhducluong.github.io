# GD3-24 — Admin › Portfolio › Projects & tools: dòng meta cắt gọn có tooltip ở mọi độ rộng (nhóm N23)

> **Trạng thái:** GIAO CODE (làm **sau** GD3-23, một thư mục làm việc) · **Nhánh:** `gd3/24-admin-meta-hang-cat-gon` từ `main` · **Ngày giao:** 2026-11-24 · **Cỡ:** Nhỏ (~3 file) · **Người đang code:** Claude — cửa sổ code (hoặc Codex)
> **Gộp (ADR-018):** chỉ Admin, không migration, không đổi giao diện công khai → Claude tự gộp được nếu review sạch.

## 1. Mục tiêu

[UI-18](../92-ui-rules.md#ui-18): ở hàng dự án / công cụ Portfolio, dòng meta (`<small>` gồm địa điểm và trạng thái) **không được tràn** khi chuỗi dài, ở **mọi** độ rộng cột. Hiện `[data-portfolio-project-state]` có `text-overflow: clip`, `overflow: visible` ngoài cột hẹp nên tràn khỏi hàng.

## 2. Căn cứ

- `docs/92-ui-rules.md` UI-14, UI-18; `docs/admin-ui-guidelines.md` §6.2 (giá trị cắt mang `title`), §14 mục 9; [AGENTS §5](../../AGENTS.md) mục 6.
- **Số đo của Claude** (stress: thay nhãn dòng meta của 3 hàng bằng chuỗi ~130 ký tự): phần tử trạng thái tràn ở **1440** (mép phải 1066 px, hàng kết thúc ở 717 px) và **1920** (1068 px so với 926 px); không tràn ở 2560, 1180, 768, 390. **Mốc: 2 FAIL** (1440, 1920) ở phép `meta-clip` chưa có (coder thêm). `npm run shots -- --stress` báo *overflows its container → span (in small)* ở laptop và monitor2 › portfolio-projects-tools.
- Code: `src/styles/admin-documents.css` (khối "Portfolio project / tool rows": `.admin-portfolio-project .admin-cv-project__identity small`, `[data-portfolio-project-state]`; quy tắc cắt hiện nằm trong `@container pf-row (max-width: 22rem)`), `src/admin/portfolioProjectSelection.ts` (đã có `title` cho cả hai span).
- **Ngân sách CSS Admin** 26,9 / 27,0 kB: không tăng; dời quy tắc cắt từ khối cột hẹp ra ngoài (dùng chung) thay vì thêm bản thứ hai.

## 3. Phạm vi

**Làm:**

1. Mọi `small > span` của hàng Portfolio (địa điểm và trạng thái): `min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap` **ở mọi độ rộng**; `small` là flex một dòng (có sẵn) với địa điểm co trước, trạng thái co sau (`flex: 0 1 auto`); `title` đầy đủ giữ nguyên. Quy tắc trong `@container pf-row` chỉ giữ phần **khác** (ẩn địa điểm, chip xuống dòng), không lặp thuộc tính cắt.
2. **Phép `meta-clip`** trong `tools/portfolio-selection-check.mjs`: ở 2560, 1920, 1440, 1180, 768, 390 thay nhãn dòng meta của 3 hàng đầu bằng chuỗi ~130 ký tự (chỉ DOM, không lưu), kiểm mép phải của mọi `small > span` ≤ mép phải của hàng và `text-overflow: ellipsis`; chạy trên mốc hiện tại, ghi số FAIL (kỳ vọng 2) vào mục 5.
3. Test CSS dương (E-002) trong `adminStyles.test.ts`: `small > span` của hàng có `overflow: hidden` và `text-overflow: ellipsis` **ngoài** khối `@container`; không `!important`.
4. **Chạy lại** `node tools/portfolio-selection-check.mjs` (All PASS, hàng vẫn 67 / 64 px) và `node tools/admin-checkbox-size-check.mjs --all-widths` (All PASS); `npm run shots -- --stress` (tắt dev server cổng 5199 trước) không còn *overflows → span (in small)*.
5. **Kiểm kê điều khiển (UI-17 điều 2) và checklist từng mục (§14 × 16, docs/92 §2)** như UI-16, đo ở 2560, 1920, 1440, 1180, 768, 390.

**Không làm:** đổi nội dung chuỗi trạng thái; hàng CV; tab khác; migration; dependency mới.

## 3b. Các bước

1. Phép `meta-clip` + mốc FAIL.
2. Sửa CSS (cắt gọn ở mọi độ rộng, bỏ lặp trong container); công cụ All PASS.
3. Test CSS, `shots --stress`, kiểm kê, `verify:admin` một lần (CSS không tăng), điền mục 5.

## 4. Tiêu chí nghiệm thu

- [ ] `meta-clip` All PASS ở 6 độ rộng (mốc 2 FAIL → 0); `portfolio-selection-check` và `admin-checkbox-size-check` vẫn All PASS.
- [ ] `npm run shots -- --stress` không còn *overflows its container → span (in small)*, không có *NO TOOLTIP*.
- [ ] CSS Admin không tăng (≤ 26,9 kB gzip); `npm run verify:admin` đạt (từ `D:\…`).
- [ ] Mục 5 có checklist từng mục và số đo ở 6 độ rộng.

## 5. Báo cáo của người code

- Đã xong bước:
- Người code · đã dùng trước / sau:
- Nhánh, commit cuối:
- File đã đổi (ghi rõ file dùng chung):
- `verify:admin` (CSS gzip trước / sau):
- Công cụ đo (mốc FAIL trước → sau):
- **Checklist giao diện từng mục (§14 × 16, docs/92 §2):**
- Chỗ làm khác đề bài và lý do:
- Câu hỏi:

## 6. Review của Claude

(chưa review)
