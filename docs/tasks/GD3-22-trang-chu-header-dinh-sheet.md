# GD3-22 — Trang chủ: header dính ≤ 900 px, bỏ đường kẻ dưới menu, ô SHEET cả tiếng Việt (nhóm N21 + N22)

> **Trạng thái:** ĐẠT (gộp 2026-11-24, người vận hành duyệt) · **Nhánh:** `gd3/22-trang-chu-header-dinh-sheet` từ `main` · **Ngày giao:** 2026-11-24 · **Cỡ:** Nhỏ (~3 file) · **Người đang code:** Claude — cửa sổ code (hoặc Codex)
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

- Đã xong bước: 1 – 3
- Người code · đã dùng trước / sau: Claude — cửa sổ code · chưa ghi token
- Nhánh, commit cuối: gd3/22-trang-chu-header-dinh-sheet (commit feat(GD3-22))
- File đã đổi (ghi rõ file dùng chung): src/styles/home.css, src/site/homeHero.ts, src/site/homeHero.test.ts. Không file dùng chung.
- `verify:admin`: đạt (CSS Admin 27,0 / 27,0 kB, trang chủ không nằm trong ngân sách này).
- `tools/home-viewport-check.mjs` (PASS / FAIL, mốc 22 FAIL): **All PASS** ngay lần chạy sau khi sửa (gồm `nav-line`, `header-sticky`, `anchor-clear` ở mọi cỡ ≤ 900). Mốc 22 FAIL lấy từ đề bài, tôi không chạy lại.
- **Bảng chiều cao header / tỉ lệ màn hình** (`.site-header` hai hàng, `getBoundingClientRect`; sau khi cuộn 700 px đỉnh header = 0 ở mọi cỡ):

  | Màn hình | Header cao | Tỉ lệ viewport | position |
  |---|---|---|---|
  | 320 × 568 | 108 px | **19,0 %** | sticky |
  | 360 × 800 (EN và VI) | 108 px | 13,5 % | sticky |
  | 390 × 844 | 108 px | 12,8 % | sticky |
  | 1440 × 731 | 60 px | 8,2 % | **relative** (không dính, đỉnh −700 sau khi cuộn: không đổi) |

  Rủi ro: ở 320 × 568 header dính chiếm 19 % (cao hơn ước tính 17 % của đề bài vì header cao 108, không 96 px) còn ~460 px cho nội dung khi cuộn; chấp nhận được nhưng nên để người vận hành thấy trên máy nhỏ. Đề bài cấm ẩn header khi cuộn nên không xử lý thêm.
- **Checklist giao diện từng mục (ui-guidelines §9, docs/92 §2):**

  §9: 1 đạt. 2 đã đo EN ở mọi cỡ ≤ 900 (`home-viewport-check`), VI ở 360 × 800 (header dính, 108 px) và 390 × 900 (ô SHEET); ~900 px nằm trong ma trận; **chưa thử chỉ bằng bàn phím** (Tab tới menu khi header dính). 3 đạt: `no-hscroll` PASS. 4 – 10 không áp dụng.

  docs/92 §2: 2 đã áp UI-16, UI-17. 3 trạng thái: chưa cuộn / đã cuộn (đã đo); link nhảy: `anchor-clear` PASS với bốn mục menu (`scroll-margin-top: var(--home-header-h)` = 8,25 rem trên `.section` ở ≤ 900; còn dư ~24 px so với header 108 px). 4 dữ liệu dài không áp dụng. 5 có số đo (bảng). 6 không file dùng chung. 7 không lỗi UI mới.

  **Chưa kiểm:** (a) header dính trong **khung preview Website của Admin** (390, 768; `body.website-embedded` có `overflow: hidden`, tôi chưa mở Admin để xem) , đề bài yêu cầu, cần Claude kiểm khi review; (b) bóng nhẹ khi cuộn: **không thêm** (đề bài cho phép, không bắt buộc), nền đặc `--color-surface` đủ che chữ phía dưới (đã xem ảnh 360 × 800 sau khi cuộn: chữ không lọt qua header).

  Ảnh đã xem: 360 × 800 EN sau khi cuộn 700 px (HDL, VI, menu một hàng trên cùng, không đường kẻ); ô SHEET ở `?lang=vi` 390 × 900 ("SHEET 01 / 01"). Ảnh 320 × 568, 390 × 844 và 360 × 800 VI chụp ra nhưng **chưa xem lại**; số đo thay thế. Ô SHEET chỉ hiện khi màn cao ≥ 821 px (quy tắc có sẵn), nên không có ở 360 × 800.
- Chỗ làm khác đề bài và lý do: nhãn VI đổi thành "Sheet" (CSS `text-transform: uppercase` có sẵn in thành "SHEET", giống thẻ dự án), không viết hoa cứng trong chuỗi. `scroll-margin-top` đặt trên `.section` (thay 5rem có sẵn ở ≤ 900) thay vì `scroll-padding-top` trên `html`, để không cộng dồn với `scroll-margin-top` cũ. Xóa luôn dòng `border-bottom: 0` ở khối ≥ 901 (không còn gì để đặt lại).
- Câu hỏi:

## 6. Review của Claude

- Ngày, commit đã review: 2026-11-24, `822f44b` (đo trên dev server cổng 5173 của người vận hành, thư mục chính đang ở nhánh này; Admin đo bằng phiên `.auth` chép sang cổng 5173).
- **Checklist giao diện (UI-16, UI-17), Claude chạy lại từng mục, gồm các mục coder chưa làm:**
  - §9 / `docs/92` §2 mục 1: `verify:admin` 45 file / **341** test, Admin JS 92,8 / 115,0, CSS **27,0 / 27,0** kB gzip (`home.css` được nhúng vào preview Admin nên ngân sách CSS lại hết dư địa); `node tools/home-viewport-check.mjs` **All PASS, 212 dòng PASS, 0 FAIL** (gồm `nav-line`, `header-sticky`, `anchor-clear` ở mọi cỡ ≤ 900).
  - **Preview Website trong Admin** (coder chưa kiểm): chọn Website viewport Laptop (1280): header `position: relative`, 60 px, không đổi; Tablet (768) và Mobile (390): `position: sticky`, nền trắng đặc, cao 108 px, menu một hàng, không đường kẻ, không cuộn ngang, hiển thị đúng. Lưu ý: khung preview cao đúng bằng cả trang (iframe không tự cuộn) nên **trong preview header không "dính" khi cuộn** (nó cuộn theo khung ngoài); đây là hành vi của preview, không phải lỗi: hành vi dính đo trên trang thật ở 320 – 900 px bằng `header-sticky`.
  - **Bàn phím** (coder chưa thử): Tab 40 lần ở 360 × 800: không phần tử nào bị header che (ngoại lệ duy nhất: "Skip to content" hiện **trên** header có chủ ý, `position: fixed; z-index: 100` > header 10, đã xác nhận bằng CSS) nên **Focus Not Obscured** đạt.
  - **Tablet:** 768 trong preview và các cỡ 651 / 768 / 900 của công cụ: sticky đúng; **máy tính** 901 và 1440 không đổi (header `position: relative`).
  - Ảnh xem: preview Mobile (khung bản vẽ hero có ô "SHEET 01 / 01", tiêu đề section kế tiếp lộ ra dưới khung), phép đo header sau khi cuộn 700 px ở mọi cỡ ≤ 900.
- **Kiểm kê (UI-17 điều 2):** bảng chiều cao header của coder (108 px: 19,0 % ở 320 × 568, 13,5 % ở 360 × 800, 12,8 % ở 390 × 844) khớp số đo của tôi (108 px trong preview 768 và 390).
- **Phải sửa:** không. **Nên sửa:** không.
- **Ghi nhận:** (1) rủi ro "header chiếm 19 % màn 320 × 568" đã nêu và chấp nhận (đề bài cấm ẩn header); nếu sau này bạn thấy chiếm chỗ, phương án C của sổ #35 (ẩn khi cuộn xuống) vẫn còn. (2) Ngân sách CSS Admin lại 27,0 / 27,0 vì `home.css` nằm trong gói: GD3-23 (màu từ logo) và GD3-24 đã có ràng buộc "không tăng CSS" / "dừng và báo". (3) Token: coder chưa ghi, để trống `docs/96`.
- **Cần người vận hành chốt:** **duyệt gộp** (đổi giao diện công khai, ADR-018). Không migration. Bạn xem trực tiếp trên localhost:5173 (đang ở nhánh `gd3/22`): cuộn xuống ở khung 360 × 800 và bấm các mục menu.
- Kết luận: **ĐẠT, CHỜ DUYỆT**.
