# GD3-15 — Trang chủ: thẻ dự án thẳng hàng (subgrid), menu 2 × 2, lưới nhạt và nút hero đều nhau trên điện thoại (nhóm N13)

> **Trạng thái:** GIAO CODE · **Nhánh:** `gd3/15-trang-chu-subgrid-menu-luoi` từ `main` · **Ngày giao:** 2026-11-24 · **Cỡ:** Vừa (~4 file) · **Người đang code:** Claude — cửa sổ code (hoặc Codex)
> **Gộp (ADR-018):** đổi giao diện công khai → **cần người vận hành duyệt** trước khi gộp. Không có migration. Làm **trước** GD3-16 (một thư mục làm việc).

## 1. Mục tiêu

Ba quyết định của ADR-037 (Sổ #28, #29; W-27, W-28) cho trang chủ công khai: thẻ dự án thẳng hàng, và điện thoại gọn hơn (menu, lưới, nút).

## 2. Căn cứ

- `decisions/ADR-REGISTER.md` ADR-037; `docs/ui-guidelines.md` §2.1, §2.2; [UI-08](../92-ui-rules.md#ui-08) (dùng `subgrid`, không `min-height`); breakpoint có sẵn 900 / 650 (không tạo mới).
- **Công cụ đo:** `node tools/home-viewport-check.mjs` đã có bốn phép mới: `nav-fit`, `buttons-equal`, `grid-alpha`, `cards-aligned`. **Mốc trước khi làm: 29 FAIL** (nav-fit 8, buttons-equal 8, grid-alpha 8 ở mọi cỡ ≤ 650 gồm preview 390; cards-aligned 5, lệch 33 px giữa các thẻ cùng hàng ở 1440, 1920, 2560, preview 1440 và 1280). Mục tiêu: **All PASS**; các phép cũ (`no-hscroll`, `first-screen`, `peek`, `tap`, `font`, `photo-fit`, `titleblock-fit`, `images`) không được xấu đi.
- Code: `src/site/homeProjects.ts` (`renderProjectSheet`), `src/styles/home.css` (`.project-grid`, `.project-card*`, `.hero__actions`, `.site-nav__links`), `src/styles/tokens.css` (`--grid-alpha`), `src/site/homeHero.ts` (`.hero__actions`).

## 3. Phạm vi

**Làm:**

1. **Subgrid (W-27):** `.project-grid` giữ cột `repeat(auto-fill, minmax(min(100%, 20rem), 1fr))`; mỗi `.project-card` thành `display: grid; grid-row: span N; grid-template-rows: subgrid` (N = số hàng của thẻ: ảnh, thân… tuỳ cấu trúc bạn chọn; cần để **tiêu đề, vai trò/meta, tóm tắt, thẻ công nghệ, link** mỗi thứ một hàng chung). Thẻ thiếu một phần (không tóm tắt, không công nghệ) vẫn giữ hàng (hàng rỗng) để các thẻ khác thẳng. Không `min-height` đoán; không `!important`. Một cột (điện thoại) thì không cần căn.
2. **Menu 2 × 2 (W-28a):** ở ≤ 650 px `.site-nav__links` là lưới 2 cột đều nhau, bốn mục cùng độ rộng, không cuộn ngang, mục cao ≥ 44 px; bỏ phần cuộn ngang / `scroll-snap` của GD3-12 trong phạm vi này; ≥ 651 px giữ như hiện nay. Header không được cao đến mức đẩy nút chính ra khỏi màn hình đầu ở 320 × 568 (`first-screen` vẫn PASS: nếu cần, giảm đệm header, không giảm cỡ chạm).
3. **Lưới nhạt (W-28b):** `--grid-alpha: 8%` trong `@media (max-width: 650px)` (một chỗ ghi đè); máy tính vẫn 14 %.
4. **Nút hero (W-28c):** ở ≤ 650 px `.hero__actions` là lưới 2 × 2 cùng độ rộng (`grid-template-columns: repeat(2, 1fr)`), nút cao ≥ 44 px, chữ không xuống dòng làm lệch hàng (rút gọn nhãn qua `copy` nếu cần, vẫn EN / VI); ≥ 651 px giữ như hiện nay. Nút chính "View projects" vẫn nằm trong màn hình đầu.
5. **Test:** test CSS có khẳng định **dương** (E-002): `subgrid` có mặt trên `.project-card`, `--grid-alpha` 8 % trong khối ≤ 650 px và 14 % ngoài khối, lưới 2 cột cho menu và nút, không `!important` mới. Test markup nếu đổi cấu trúc thẻ (vẫn thoát chuỗi đúng một lần, E-003).

**Không làm:** hamburger; đổi màu; đổi nội dung; chip lọc; Hero tagline (GD3-14); `/projects/`; migration; dependency mới.

## 3b. Các bước

1. Subgrid + `cards-aligned` PASS (xem ảnh ba thẻ ở 1440).
2. Menu 2 × 2 + `nav-fit`, `first-screen` PASS ở 320 × 568.
3. Lưới 8 % + nút hero 2 × 2 + `grid-alpha`, `buttons-equal` PASS.
4. `node tools/home-viewport-check.mjs` All PASS; xem ảnh 320 × 568, 390 × 844, 1440 × 731; `verify:admin` một lần; điền mục 5.

## 4. Tiêu chí nghiệm thu

- [ ] `node tools/home-viewport-check.mjs` **All PASS** (mốc 29 FAIL → 0).
- [ ] Ba thẻ dự án ở 1440 / 1920 / 2560: tiêu đề, tóm tắt, thẻ công nghệ, link thẳng hàng; thử thêm tên dài 2 dòng không làm lệch (dữ liệu giả, ghi cách thử).
- [ ] Điện thoại: menu 2 × 2, bốn nút 2 × 2 đều nhau, lưới nhạt hơn, không cuộn ngang, `first-screen` đạt ở 320 × 568.
- [ ] `npm run verify:admin` đạt (từ `D:\…`); `/projects/` và trang con không đổi.

## 5. Báo cáo của người code

- Đã xong bước: 1 – 4
- Người code · đã dùng trước / sau: Claude — cửa sổ code · chưa ghi token
- Nhánh, commit cuối: gd3/15-trang-chu-subgrid-menu-luoi (commit feat(GD3-15))
- File đã đổi (ghi rõ file dùng chung): src/styles/home.css, src/site/homeProjects.test.ts (không đổi markup, không file dùng chung)
- `verify:admin`: đạt (bundle Admin 92.8 / 115.0 kB gzip JS, 26.7 / 27.0 kB CSS)
- `tools/home-viewport-check.mjs` (PASS / FAIL, mốc 29 FAIL): All PASS (0 FAIL)
- Chỗ làm khác đề bài và lý do: không đổi markup; `.project-card__body` thành `display: contents`, bảy hàng chung (ảnh, kicker, tiêu đề, vai trò, tóm tắt, công nghệ, link) đặt bằng `grid-row` rõ ràng để thẻ thiếu phần vẫn giữ hàng. `.project-grid` đặt `row-gap: 0` và mỗi thẻ `margin-bottom` (gap hàng của lưới cha sẽ cộng vào mọi hàng subgrid). Nút hero không đổi nhãn (vừa 2 cột ở 320). Chưa thử thẻ dữ liệu giả tên dài 2 dòng và chưa xem ảnh bằng mắt: cần Claude review kiểm.
- Câu hỏi:

## 6. Review của Claude

(chưa review)
