# GD3-20 — Trang chủ: menu ≤ 900 px một hàng phẳng, không lướt ngang (nhóm N18)

> **Trạng thái:** GIAO CODE · **Nhánh:** `gd3/20-trang-chu-menu-mot-hang-phang` từ `main` · **Ngày giao:** 2026-11-24 · **Cỡ:** Nhỏ (~3 file) · **Người đang code:** Claude — cửa sổ code (hoặc Codex)
> **Gộp (ADR-018):** đổi giao diện công khai → **cần người vận hành duyệt** trước khi gộp. Không có migration.

## 1. Mục tiêu

Sổ #33 / W-32 / [ADR-039](../../decisions/ADR-REGISTER.md) (phương án A): menu ≤ 900 px là **một hàng phẳng** (như hình 2 người vận hành gửi) và **không phải lướt ngang** ở 360 × 800 cũng như mọi màn điện thoại ưu tiên. Thay lưới 2 × 2 (ADR-037 a) và ô viền (ADR-038, GD3-19).

## 2. Căn cứ

- `docs/ui-guidelines.md` §2.1, §2.2; [UI-16, UI-17](../92-ui-rules.md) (đo mọi nơi dùng cùng loại điều khiển); breakpoint 900 / 650 có sẵn (không tạo mới); token `--color-*`, `--space-*`, `--font-size-*`.
- **Số đo của Claude** (phông Inter 650, độ rộng chữ): EN: Expertise / Experience / Projects / Automation = 57 / 67 / 49 / 74 px (13 px), tổng **247**; 14 px tổng 266; 12 px tổng 228. VI (Chuyên môn / Kinh nghiệm / Dự án / Tự động hóa): 77 / 78 / 37 / 79 (13 px), tổng **271**; 14 px tổng 292; 12 px tổng 250. Rộng khả dụng: 360 → **328 px**, 320 → **288 px**. Nghĩa là một hàng vừa nếu đệm ngang mỗi mục chỉ ~4 px (`--space-1`) ở 14 / 13 px (EN), 13 px (VI ≥ 360), và 12 px cho VI ở ≤ 340.
- **Công cụ đo:** `node tools/home-viewport-check.mjs`: phép `nav-fit` nay đòi **một hàng, không cuộn ngang, không mục ngoài khung** (≤ 900); phép mới `nav-flat` đòi mục **không viền, không nền, ≥ 44 × 44**. **Mốc trước khi làm: 22 FAIL** (11 cỡ ≤ 900 × 2 phép). Mục tiêu: **All PASS**, các phép khác không xấu đi.
- Code: `src/styles/home.css` (`.site-nav__links`, `li`, `a` trong `@media (max-width: 900px)` mà GD3-19 đã đặt ô viền; khối ≥ 901 px **không đổi**).

## 3. Phạm vi

**Làm:**

1. Ở ≤ 900 px bỏ ô viền / lưới 2 × 2 của GD3-19 (gỡ `border`, `background` ô, `margin` âm, `padding` của `ul`, `justify-content: flex-start`, đừng để CSS chết) và thay bằng: `display: flex`, `justify-content: space-between`, `flex-wrap: nowrap`, mục `flex: none` hoặc co giãn đều, đệm ngang `--space-1`, chữ canh giữa, cao ≥ 44 px, rộng mỗi mục ≥ 44 px, `:hover` / `:focus-visible` thấy rõ (không cần viền ô). Cho phép **một** đường kẻ dưới cả hàng (token màu); không viền từng mục.
2. **Cỡ chữ theo độ rộng** để vừa **cả EN và VI**: lớn nhất còn vừa trong 14 → 13 → 12 px (không dưới 12 px), tầng 12 px ở ≤ 340 px (độ rộng có sẵn trong ma trận, không tạo breakpoint mới ngoài 340 nếu cần: nếu phải thêm, ghi lý do vào mục 5). Dùng token `--font-size-*` có sẵn; nếu thiếu 13 px, dùng `clamp()` theo `vw` thay vì giá trị cứng.
3. **Mở rộng `tools/home-viewport-check.mjs`:** chạy phép `nav-fit` và `nav-flat` thêm với `?lang=vi` ở 320, 360, 390 (ba cỡ). Ghi mốc FAIL của phần mới nếu có.
4. **Test CSS dương** (E-002) trong `homeHero.test.ts`: khối ≤ 900 px có `flex-wrap: nowrap`, `justify-content: space-between`, không còn `border` trên `.site-nav__links a`; khối ≥ 901 không đổi; không `!important`.
5. **Kiểm kê điều khiển (UI-17 điều 2) và checklist từng mục (ui-guidelines §9, docs/92 §2):** mục 5 có bảng kiểm kê (cỡ chữ, cao, rộng, nền, viền) của link menu, nút hero, công tắc ngôn ngữ ở 320, 360, 390, **cả EN và VI**, và nêu chỗ lệch kèm lý do; kèm ảnh chụp 320 × 568, 360 × 800, 390 × 844 (EN) và 360 × 800 (VI).

**Không làm:** máy tính (≥ 901 px); thêm hamburger; đổi nội dung / thứ tự menu; đánh dấu mục đang xem; nút hero; migration; dependency mới.

## 3b. Các bước

1. Menu một hàng + `nav-fit`, `nav-flat` PASS (EN).
2. Phép đo `?lang=vi`; chỉnh cỡ chữ cho VI ở 320.
3. `first-screen` vẫn PASS ở 320 × 568; test CSS; kiểm kê; `verify:admin` một lần; điền mục 5.

## 4. Tiêu chí nghiệm thu

- [ ] `node tools/home-viewport-check.mjs` **All PASS** (mốc 22 FAIL → 0), gồm phép VI ở 320, 360, 390.
- [ ] 360 × 800: bốn mục thấy đủ trên **một hàng**, không lướt ngang, EN và VI.
- [ ] Máy tính (≥ 901 px) không đổi (đo hoặc chụp 1440 để chứng minh).
- [ ] Mục 5 có bảng kiểm kê, ảnh, checklist từng mục.
- [ ] `npm run verify:admin` đạt (từ `D:\…`).

## 5. Báo cáo của người code

- Đã xong bước:
- Người code · đã dùng trước / sau:
- Nhánh, commit cuối:
- File đã đổi (ghi rõ file dùng chung):
- `verify:admin`:
- `tools/home-viewport-check.mjs` (PASS / FAIL, mốc 22 FAIL):
- **Bảng kiểm kê điều khiển (EN và VI):**
- **Checklist giao diện từng mục (ui-guidelines §9, docs/92 §2):**
- Chỗ làm khác đề bài và lý do:
- Câu hỏi:

## 6. Review của Claude

(chưa review)
