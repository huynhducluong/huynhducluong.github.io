# GD3-21 — Admin: mọi checkbox 16 px bằng một quy tắc chung (nhóm N19)

> **Trạng thái:** GIAO CODE · **Nhánh:** `gd3/21-admin-checkbox-16px-chung` từ `main` · **Ngày giao:** 2026-11-24 · **Cỡ:** Nhỏ (~3 file) · **Người đang code:** Claude — cửa sổ code (hoặc Codex)
> **Gộp (ADR-018):** chỉ Admin, không migration, không đổi giao diện công khai → Claude tự gộp được nếu review sạch.

## 1. Mục tiêu

Việc còn lại của Sổ #32 / W-31 / [UI-17](../92-ui-rules.md#ui-17): checkbox trách nhiệm (khi mở hàng dự án ở CV và Portfolio) còn **13 × 13** (mặc định của trình duyệt) ngay dưới ô "In Portfolio" 16 × 16. Đưa **mọi** checkbox của Admin về **16 × 16** bằng **một quy tắc chung**, và **bỏ các quy tắc kích thước riêng bị trùng** để CSS không tăng.

## 2. Căn cứ

- UI-17: hộp điều khiển theo kích thước chung của Admin; vùng bấm ≥ 24 px bằng đệm nhãn, không phóng to hộp. `docs/admin-ui-guidelines.md` (đoạn "Hàng gọn", §6.3).
- **Số đo hiện có** (GD3-18, 1440 × 731): checkbox `admin-switch` 16 × 16; chọn nội dung Website 16; layout Appearance 16; **trách nhiệm 13 × 13** (`.admin-cv-project__responsibilities input`, CV và Portfolio); radio / checkbox ẩn thị giác 1 × 1 (segmented, layout option) **không đụng**.
- Code: `src/styles/admin-ui.css` (`.admin-shell :where(input[type="checkbox"], input[type="radio"]) { accent-color }`); `src/styles/admin-documents.css` (các quy tắc `width: 1rem` / `height: 1rem` riêng: khoảng dòng 87, 618, 663, 949; `.admin-cv-project__responsibilities input` ~dòng 1090); `src/styles/admin-site.css`.
- **Ngân sách CSS Admin đã hết dư địa (27,0 / 27,0 kB):** thay đổi phải **không tăng** CSS; xóa các quy tắc kích thước riêng khi quy tắc chung đã làm thay.

## 3. Phạm vi

**Làm:**

1. **Công cụ đo** `tools/admin-checkbox-size-check.mjs` (mới, theo mẫu `portfolio-selection-check.mjs`): mở các màn hình Admin có checkbox (Homepage › Content selection, CV › Projects & tools / Background, Portfolio › Projects & tools (mở một hàng để thấy trách nhiệm) / Background / Appearance, Cover letters nếu có) ở 1440 × 731; **mọi** `input[type=checkbox]` nhìn thấy được (bỏ ô ẩn thị giác 1 × 1 của segmented) phải **16 × 16 ± 1**; in số lượng theo kích thước. **Chạy trên mốc hiện tại trước khi sửa, ghi số FAIL vào mục 5.**
2. Thêm **một** quy tắc chung ở `admin-ui.css`: `.admin-shell input[type="checkbox"]` `width: 1rem; height: 1rem` (giữ `accent-color`, `margin: 0` nếu cần, **không** đụng radio và ô ẩn thị giác: dùng `:not(...)` hoặc selector theo ngữ cảnh đã có). Xóa các quy tắc `width` / `height` 1rem riêng trong `admin-documents.css` / `admin-site.css` mà quy tắc chung đã bao (giữ phần không trùng). Quy tắc riêng của checkbox trách nhiệm chỉ giữ lại phần bố cục (khoảng cách, căn dòng), không còn kích thước.
3. Hàng Portfolio (`.admin-portfolio-project__include input`), hàng CV, mọi hàng đã có **không đổi bề ngoài** (chiều cao hàng 64 / 67 px của GD3-17, 18 giữ nguyên): chạy lại `node tools/portfolio-selection-check.mjs` (All PASS).
4. Test CSS dương (E-002) trong `adminStyles.test.ts`: quy tắc chung 16 px tồn tại ở `admin-ui.css`; `.admin-cv-project__responsibilities input` không còn `width` riêng; không `!important` mới.
5. **Kiểm kê điều khiển (UI-17 điều 2) và checklist từng mục (§14 × 16, docs/92 §2):** mục 5 có bảng kích thước checkbox **trước và sau** theo màn hình, và nêu chỗ ngoại lệ kèm lý do (ví dụ ô ẩn thị giác); đo thêm ở 1180, 768 và 390; chạy `npm run shots -- --stress` (tắt dev server cổng 5199 trước, E-… cổng trùng) và báo không còn *overflows* / *uneven*.

**Không làm:** radio; công tắc kéo; chevron; đổi đệm hàng; màn hình công khai; migration; dependency mới.

## 3b. Các bước

1. Công cụ đo + mốc FAIL.
2. Quy tắc chung + xóa quy tắc trùng; công cụ All PASS; `portfolio-selection-check` All PASS.
3. Test CSS, kiểm kê, `verify:admin` một lần (CSS Admin ≤ 27,0 kB), điền mục 5.

## 4. Tiêu chí nghiệm thu

- [ ] `node tools/admin-checkbox-size-check.mjs` All PASS (mốc FAIL → 0): mọi checkbox nhìn thấy 16 × 16 ở các màn hình Admin đã liệt kê.
- [ ] `node tools/portfolio-selection-check.mjs` vẫn All PASS (hàng không đổi chiều cao).
- [ ] CSS Admin **không tăng** (≤ 27,0 kB gzip); bảng kiểm kê trước / sau có trong mục 5.
- [ ] `npm run verify:admin` đạt (từ `D:\…`), `shots --stress` sạch.

## 5. Báo cáo của người code

- Đã xong bước:
- Người code · đã dùng trước / sau:
- Nhánh, commit cuối:
- File đã đổi (ghi rõ file dùng chung):
- `verify:admin` (CSS gzip trước / sau):
- Công cụ đo (mốc FAIL trước → sau):
- **Bảng kiểm kê kích thước checkbox trước / sau:**
- **Checklist giao diện từng mục (§14 × 16, docs/92 §2):**
- Chỗ làm khác đề bài và lý do:
- Câu hỏi:

## 6. Review của Claude

(chưa review)
