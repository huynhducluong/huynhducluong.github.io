# GD3-20 — Trang chủ: menu ≤ 900 px một hàng phẳng, không lướt ngang (nhóm N18)

> **Trạng thái:** ĐẠT, CHỜ DUYỆT (review 1 sạch) · **Nhánh:** `gd3/20-trang-chu-menu-mot-hang-phang` từ `main` · **Ngày giao:** 2026-11-24 · **Cỡ:** Nhỏ (~3 file) · **Người đang code:** Claude — cửa sổ code (hoặc Codex)
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

- Đã xong bước: 1 – 3
- Người code · đã dùng trước / sau: Claude — cửa sổ code · chưa ghi token
- Nhánh, commit cuối: gd3/20-trang-chu-menu-mot-hang-phang (commit feat(GD3-20))
- File đã đổi (ghi rõ file dùng chung): src/styles/home.css, src/site/homeHero.test.ts, src/site/homeProjects.test.ts (bỏ khẳng định menu lưới 2 × 2 của GD3-15 vì ADR-039 thay thế), tools/home-viewport-check.mjs. Không file dùng chung.
- `verify:admin`: đạt (CSS Admin 27,0 / 27,0 kB, không liên quan trang chủ).
- `tools/home-viewport-check.mjs` (PASS / FAIL, mốc 22 FAIL): **All PASS** (gồm `first-screen` 320 × 568 và sáu phép VI mới ở 320 / 360 / 390). Mốc 22 FAIL lấy từ đề bài, tôi không chạy lại; phần VI mới tôi thêm sau khi sửa CSS nên **không có số FAIL mốc** cho nó.
- **Bảng kiểm kê điều khiển (EN và VI)** (`getComputedStyle` / `getBoundingClientRect`):

  | Rộng | Ngôn ngữ | Link menu: chữ · rộng × cao · nền · viền | Nút hero phụ | Công tắc ngôn ngữ |
  |---|---|---|---|---|
  | 320 | EN | 12 px · 53 – 76 × 44 · trong suốt · 0 | 16 px · 140 × 52 · 1 px | 12 px · 44 × 44 · 1 px |
  | 360 | EN | 12,96 px · 57 – 81 × 44 · trong suốt · 0 | 16 px · 160 × 52 | 12 px · 44 × 44 |
  | 390 | EN | 14 px · 61 – 87 × 44 · trong suốt · 0 | 16 px · 175 × 52 | 12 px · 44 × 44 |
  | 320 | VI | 12 px · 44 – 80 × 44 · trong suốt · 0 | 16 px · 140 × 52 | 12 px · 44 × 44 |
  | 360 | VI | 12,96 px · 45 – 86 × 44 · trong suốt · 0 | 16 px · 160 × 52 | 12 px · 44 × 44 |
  | 390 | VI | 14 px · 48 – 92 × 44 · trong suốt · 0 | 16 px · 175 × 52 | 12 px · 44 × 44 |
  | 1440 (không đổi) | EN | 14 px · 77 – 103 × 44 (85 / 95 / 77 / 103) · trong suốt · 0 | 16 px · 158 × 52 | 12 px · 44 × 44 |

  Lệch có chủ ý: chữ menu (12 – 14 px, theo `clamp(--font-size-xs, 3.6vw, --font-size-sm)`) nhỏ hơn nút hero (16 px) để vừa một hàng cho cả EN và VI; mục "Dự án" tiếng Việt rộng đúng 44 – 48 px (chạm sàn 44). Link menu không viền, nút hero có viền 1 px: menu là hàng chữ phẳng theo ADR-039. Cỡ chữ không dưới 12 px; không thêm breakpoint (dùng `vw` trong `clamp`, nên không cần mốc 340).
- **Checklist giao diện từng mục (ui-guidelines §9, docs/92 §2):**

  §9: 1 đạt. 2 đã đo EN và `?lang=vi` ở 320 / 360 / 390 (và EN ở mọi cỡ ≤ 900 trong `home-viewport-check`); **chưa thử chỉ bằng bàn phím**. 3 đạt: `no-hscroll` PASS, không đổi alt / link. 4 – 10 không áp dụng.

  docs/92 §2: 2 đã áp UI-16, UI-17 (bảng kiểm kê ở trên, đo cạnh nút hero và công tắc ngôn ngữ). 3 trạng thái: thường đã đo; hover / `:focus-visible` đổi màu `--color-primary` + gạch chân (không làm lệch hàng), **chưa chụp ảnh trạng thái focus**. 4 dữ liệu dài: nhãn menu cố định, không áp dụng. 5 có số đo (bảng, `nav-fit`, `nav-flat`). 6 không file dùng chung. 7 không lỗi UI mới.

  Ảnh đã xem: 360 × 800 EN (một hàng, đường kẻ dưới cả hàng) và 320 × 568 VI (cả bốn mục "Chuyên môn / Kinh nghiệm / Dự án / Tự động hóa" vừa một hàng). Ảnh 320 × 568 EN, 390 × 844 EN và 360 × 800 VI đã chụp ra nhưng **chưa xem lại từng ảnh**; số đo thay thế. Máy tính 1440 không đổi (độ rộng bốn mục 85 / 95 / 77 / 103 như trước).
- Chỗ làm khác đề bài và lý do: đưa kiểu một hàng vào quy tắc **nền** của `.site-nav__links` (bỏ lưới 2 × 2 nền và khối ô viền của GD3-19), rồi đặt lại `justify-content`, `border-bottom`, đệm và cỡ chữ trong khối ≥ 901 px để máy tính giống hệt (đã đo 1440). Cỡ chữ dùng `clamp()` theo `vw` thay vì ba bậc 14 / 13 / 12 với breakpoint 340. Đường kẻ dưới cả hàng dùng `--color-border`.
- Câu hỏi:

## 6. Review của Claude

- Ngày, commit đã review: 2026-11-24, `3b4316f` (đo trên dev server cổng 5173 của người vận hành, thư mục chính đang ở nhánh này).
- **Checklist giao diện (UI-16, UI-17), Claude chạy lại từng mục, gồm các mục coder chưa xem:**
  - §9 / `docs/92` §2 mục 1: `verify:admin` 45 file / **339** test, Admin CSS 27,0 / 27,0 kB (không đổi); `node tools/home-viewport-check.mjs` **All PASS, 179 dòng PASS, 0 FAIL** (gồm `nav-fit`, `nav-flat` EN và sáu phép VI).
  - **Một hàng, không lướt ngang, đo trên trình duyệt thật (EN và VI):** 320 (12 px; EN 60/69/53/76, VI 79/80/**44**/80), 360 (12,96 px; EN 64/74/57/81, VI 85/86/45/86), 375 VI (13,5 px), 412 và 430 VI (14 px): mọi cỡ **một hàng**, mép phải ≤ khung (320 → 304, 360 → 344), không cuộn ngang, cao 44 px, rộng ≥ 44 px, không viền, không nền, một đường kẻ dưới cả hàng. `first-screen` đạt (320 × 568: nút chính ở 413 – 440 px).
  - **Tablet và máy tính:** 651, 768 (VI), 900: một hàng dàn đều, phẳng; **901 và 1440 không đổi** (85 / 95 / 77 / 103 px, không đường kẻ dưới).
  - **Bàn phím:** Tab tới "Experience": viền focus 3 px, chữ đổi màu và gạch chân, `:focus-visible` đúng (ảnh đã xem).
  - Ảnh xem: 360 EN (khung một hàng như hình 2 của sổ #33), 320 VI (đủ bốn mục), trạng thái focus.
- **Kiểm kê (UI-17 điều 2):** bảng của coder khớp số đo của tôi (link menu, nút hero, công tắc ngôn ngữ).
- **Phải sửa:** không. **Nên sửa:** không.
- **Ghi nhận:** (1) "Dự án" tiếng Việt ở 320 rộng **44 px**, đúng sàn ≥ 44, không dư; chấp nhận, nhưng đừng đổi nhãn VI dài hơn. (2) `clamp(var(--font-size-xs), 3.6vw, var(--font-size-sm))` thay tầng 340 px nên không thêm breakpoint: tốt. (3) Token: coder chưa ghi, để trống `docs/96`.
- **Cần người vận hành chốt:** **duyệt gộp** (đổi giao diện công khai, ADR-018). Không migration. Bạn xem trực tiếp trên localhost:5173 (đang ở nhánh `gd3/20`).
- Kết luận: **ĐẠT, CHỜ DUYỆT**.
