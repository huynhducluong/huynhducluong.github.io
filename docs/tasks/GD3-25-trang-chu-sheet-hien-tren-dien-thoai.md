# GD3-25 — Trang chủ: ô SHEET 01 / 01 luôn hiện ở điện thoại ≤ 650 px (nhóm N24)

> **Trạng thái:** GIAO CODE · **Nhánh:** `gd3/25-trang-chu-sheet-hien-tren-dien-thoai` từ `main` (sau khi GD3-23 đã gộp, một thư mục làm việc) · **Ngày giao:** 2026-11-24 · **Cỡ:** Nhỏ (~3 file) · **Người đang code:** Claude — cửa sổ code (hoặc Codex)
> **Gộp (ADR-018):** đổi giao diện công khai → **cần người vận hành duyệt** trước khi gộp. Không có migration.

## 1. Mục tiêu

Sổ #37 / W-36: ở điện thoại 360 × 800 (và 320 × 568, 360 × 640, 375 × 667) ô "SHEET 01 / 01" của khung bản vẽ **không hiện**, trái quyết định giữ ô SHEET (ADR-040). Nguyên nhân: `.hero__cell--sheet` chỉ hiện khi `@media (min-height: 821px)` cho **mọi độ rộng**; quy tắc chỉ cần ở hero hai cột ≥ 651 px.

## 2. Căn cứ

- `docs/ui-guidelines.md` §2.1 (đã sửa: "chỉ ở hero hai cột ≥ 651 px mới bỏ ô SHEET khi thấp hơn 821 px; ở ≤ 650 px luôn hiện"), ADR-034, ADR-040; [UI-16, UI-17](../92-ui-rules.md).
- **Công cụ đo:** `node tools/home-viewport-check.mjs` có phép mới `sheet-cell` (≤ 650 px: ô hiện, mọi chiều cao) và ma trận điện thoại thêm **360 × 800**. **Mốc trước khi làm: 4 FAIL** (320 × 568, 360 × 640, 360 × 800, 375 × 667). Mục tiêu: **All PASS**; `first-screen`, `peek`, `titleblock-fit`, `photo-fit` và các phép khác không xấu đi.
- Code: `src/styles/home.css` (`.hero__cell--sheet { display: none }` ~dòng 272; `@media (min-height: 821px)` ~dòng 670 hiện ô và đặt `--hero-titleblock`; `@media (min-width: 651px)` ~dòng 701 dùng `--hero-titleblock` để co ảnh theo `svh`).

## 3. Phạm vi

**Làm:**

1. Ở **≤ 650 px** ô `.hero__cell--sheet` luôn `display: block`, bất kể chiều cao. Ở **≥ 651 px** giữ nguyên quy tắc chiều cao 821 px (ví dụ đặt hai điều kiện: `display: none` mặc định ở ≥ 651, hiện ở `min-height: 821px`; hoặc đưa khối chiều cao vào `@media (min-width: 651px) and (min-height: 821px)` và để ô hiện mặc định ở ≤ 650). Giữ `--hero-titleblock: 14rem` chỉ ở tổ hợp hai cột cao.
2. Khung bản vẽ ôm sát nội dung (`titleblock-fit` vẫn PASS: không dải trống dưới bảng tên) khi có ô SHEET ở điện thoại; ô SHEET nằm dưới hàng cuối, trải hết bề ngang (`grid-column: 1 / -1` có sẵn); nhãn "Sheet" in hoa, VI cũng "SHEET" (GD3-22).
3. **Test CSS dương** (E-002) trong `homeHero.test.ts`: ô hiện ở khối ≤ 650 px (hoặc không bị ẩn bởi điều kiện chiều cao ở ≤ 650), quy tắc chiều cao 821 chỉ trong tổ hợp ≥ 651; không `!important`.
4. **Kiểm kê điều khiển (UI-17 điều 2) và checklist từng mục (ui-guidelines §9, docs/92 §2):** mục 5 có ảnh khung bản vẽ ở 320 × 568, 360 × 640, 360 × 800, 375 × 667 (EN) và 360 × 800 (VI), số đo chiều cao hero / hàng cuối, và xác nhận ≥ 651 px không đổi (đo 651 × 700 thấp hơn 821 vẫn không hiện ô, 1440 × 900 hiện).

**Không làm:** máy tính; nội dung ô; migration; dependency mới.

## 3b. Các bước

1. Sửa CSS; `sheet-cell` PASS.
2. `home-viewport-check` All PASS; ảnh; test CSS; `verify:admin` một lần; điền mục 5.

## 4. Tiêu chí nghiệm thu

- [ ] `node tools/home-viewport-check.mjs` **All PASS** (mốc 4 FAIL → 0).
- [ ] 360 × 800 (EN và VI): thấy ô "SHEET 01 / 01" dưới bảng tên, khung ôm sát.
- [ ] ≥ 651 px không đổi (651 × 700 ẩn, 1440 × 900 hiện).
- [ ] `npm run verify:admin` đạt (từ `D:\…`).

## 5. Báo cáo của người code

- Đã xong bước:
- Người code · đã dùng trước / sau:
- Nhánh, commit cuối:
- File đã đổi (ghi rõ file dùng chung):
- `verify:admin`:
- `tools/home-viewport-check.mjs` (PASS / FAIL, mốc 4 FAIL):
- **Bảng kiểm kê / số đo:**
- **Checklist giao diện từng mục:**
- Chỗ làm khác đề bài và lý do:
- Câu hỏi:

## 6. Review của Claude

(chưa review)
