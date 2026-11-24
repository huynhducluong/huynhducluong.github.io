# GD3-22 — Trang chủ: header dính ≤ 900 px, bỏ đường kẻ dưới menu, ô SHEET cả tiếng Việt (nhóm N21 + N22)

> **Trạng thái:** GIAO CODE (làm **sau** GD3-21, một thư mục làm việc) · **Nhánh:** `gd3/22-trang-chu-header-dinh-sheet` từ `main` · **Ngày giao:** 2026-11-24 · **Cỡ:** Nhỏ (~3 file) · **Người đang code:** Claude — cửa sổ code (hoặc Codex)
> **Gộp (ADR-018):** đổi giao diện công khai → **cần người vận hành duyệt** trước khi gộp. Không có migration.

## 1. Mục tiêu

[ADR-040](../../decisions/ADR-REGISTER.md) (Sổ #35, #36; W-34, W-35): ở ≤ 900 px header **dính trên cùng** khi cuộn (HDL + nút ngôn ngữ + menu), **bỏ đường kẻ** dưới menu (của GD3-20), link nhảy tới mục không bị header che; ô khung bản vẽ của hero ghi **"SHEET"** ở cả tiếng Việt.

## 2. Căn cứ

- `docs/ui-guidelines.md` §2.1, §2.2; [UI-16, UI-17](../92-ui-rules.md); breakpoint 900 / 650 có sẵn (không tạo mới); token `--color-*`, `--space-*`, `--z-*` nếu có.
- **Công cụ đo:** `node tools/home-viewport-check.mjs` có ba phép mới (≤ 900): `nav-line` (không `border-bottom` của menu), `header-sticky` (sau khi cuộn 700 px: đỉnh header 0, nền đặc, thấy 4 mục menu), `anchor-clear` (bấm từng mục menu, tiêu đề section đích nằm dưới header). **Mốc trước khi làm: 22 FAIL** (11 cỡ ≤ 900 × `nav-line` và `header-sticky`; `anchor-clear` đang PASS vì header chưa dính, phải **giữ PASS** sau khi header dính). Mục tiêu: **All PASS**; các phép khác (`first-screen`, `peek`, `nav-fit`…) không xấu đi.
- Code: `src/styles/home.css` (`.site-header` hiện `position: relative`; `.site-nav__links` `border-bottom` 1 px ở khối ≤ 900), `src/site/homeHero.ts` (`sheetNumber` EN "Sheet", VI "Bản vẽ"), `src/site/homeProjects.ts` (thẻ VI giữ "SHEET": mẫu nhất quán).

## 3. Phạm vi

**Làm:**

1. **Bỏ đường kẻ** `border-bottom` của `.site-nav__links` ở ≤ 900 (xóa dòng, không để CSS chết).
2. **Header dính** ở ≤ 900 px: `position: sticky; top: 0`, `z-index` đủ trên nội dung, **nền đặc** `var(--color-surface)` (hoặc nền trang) để chữ cuộn phía dưới không đè lên; không đổi cấu trúc hai hàng (HDL + ngôn ngữ, menu một hàng của GD3-20). Có thể thêm **bóng rất nhẹ chỉ khi đã cuộn** (class do `IntersectionObserver` hoặc `scroll`), nhưng **không** đường kẻ. `prefers-reduced-motion`: không hiệu ứng chuyển. Admin preview Website (khung 390, 768) cũng dính đúng.
3. **Link nhảy không bị che:** thêm `scroll-padding-top` (hoặc `scroll-margin-top` cho section đích) **bằng chiều cao header** để tiêu đề section không nằm dưới header; `anchor-clear` PASS ở mọi cỡ ≤ 900. Ở ≥ 901 px header **không dính** và không đổi.
4. **Ô khung bản vẽ:** `homeHero.ts` đổi `sheetNumber` tiếng Việt thành "SHEET" (giữ "01 / 01"); cập nhật test `homeHero.test.ts` (cả EN và VI đều "Sheet" / "SHEET" như thẻ dự án; nhãn in hoa qua CSS nếu đang vậy).
5. **Test CSS dương** (E-002): header `position: sticky` trong khối ≤ 900, không `border-bottom` của menu, không `!important`; khối ≥ 901 giữ `position: relative`.
6. **Kiểm kê điều khiển (UI-17 điều 2) và checklist từng mục (ui-guidelines §9, docs/92 §2):** mục 5 có bảng chiều cao header (hai hàng) ở 320, 360, 390 và tỉ lệ chiếm màn hình (px / chiều cao viewport), ảnh chụp trạng thái đã cuộn ở 320 × 568, 360 × 800, 390 × 844 (EN) và 360 × 800 (VI), ảnh khung bản vẽ ở `?lang=vi` (cần màn cao để ô SHEET hiện), và nêu rủi ro "header chiếm quá nhiều màn nhỏ" nếu có (320 × 568: ~96 px = 17 %).

**Không làm:** máy tính (≥ 901 px); ẩn header khi cuộn; menu; hamburger; đổi nội dung ô SHEET ngoài chữ nhãn VI; ngày publish; migration; dependency mới.

## 3b. Các bước

1. Bỏ đường kẻ; `nav-line` PASS.
2. Header dính + `scroll-padding`; `header-sticky`, `anchor-clear` PASS.
3. Nhãn SHEET VI + test; `home-viewport-check` All PASS; ảnh; `verify:admin` một lần; điền mục 5.

## 4. Tiêu chí nghiệm thu

- [ ] `node tools/home-viewport-check.mjs` **All PASS** (mốc 22 FAIL → 0; `anchor-clear` vẫn PASS).
- [ ] Cuộn xuống ở 360 × 800: HDL, nút ngôn ngữ và menu vẫn thấy trên cùng; không đường kẻ; chữ phía dưới không lọt qua header.
- [ ] Hero tiếng Việt ghi "SHEET 01 / 01".
- [ ] Máy tính (≥ 901 px) không đổi (header không dính; đo hoặc chụp 1440).
- [ ] `npm run verify:admin` đạt (từ `D:\…`).

## 5. Báo cáo của người code

- Đã xong bước:
- Người code · đã dùng trước / sau:
- Nhánh, commit cuối:
- File đã đổi (ghi rõ file dùng chung):
- `verify:admin`:
- `tools/home-viewport-check.mjs` (PASS / FAIL, mốc 22 FAIL):
- **Bảng chiều cao header / tỉ lệ màn hình:**
- **Checklist giao diện từng mục (ui-guidelines §9, docs/92 §2):**
- Chỗ làm khác đề bài và lý do:
- Câu hỏi:

## 6. Review của Claude

(chưa review)
