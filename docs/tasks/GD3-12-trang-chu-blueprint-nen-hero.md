# GD3-12 — Trang chủ Blueprint: nền lưới liền, hero BP2, tối ưu điện thoại (nhóm N12)

> **Trạng thái:** CẦN SỬA (review 4, theo Sổ #25 và #26) · **Nhánh:** `gd3/12-trang-chu-blueprint-nen-hero` (`git fetch; git switch -c gd3/12-trang-chu-blueprint-nen-hero origin/main`) · **Ngày giao:** 2026-11-17 · **Cỡ:** Lớn (~6 file) · **Người đang code:** Claude — cửa sổ code (hoặc Codex nếu còn token; Codex nên dùng khi còn ≥ 60 % token)
> **Gộp (ADR-018):** **cần người vận hành duyệt** — đổi giao diện trang công khai. Không có migration. **Làm xong rồi mới giao GD3-13 và GD3-14** (cùng `main.ts` và `home.css`).

## 1. Mục tiêu

Dựng giao diện trang chủ Blueprint người vận hành chốt từ demo thật (ADR-032, ADR-033, ADR-034; Sổ #24 = W-23): **một lớp lưới liền trên cả trang, hero kiểu khung bản vẽ vừa trọn màn hình đầu, menu trên điện thoại, nút Admin xuống chân trang**, và tối ưu **đẹp nhất cho mọi cỡ điện thoại** (người xem chủ yếu dùng điện thoại). Máy tính chỉ cần ba màn hình mục tiêu và các viewport preview Website trong Admin.

Không làm ở đề bài này: thẻ dự án mới và chip lọc (GD3-13), ô Hero tagline trong Admin (GD3-14).

## 2. Căn cứ (đã sửa sẵn, đọc đúng các đoạn này)

- `docs/ui-guidelines.md` §2.1 (giao diện Blueprint: lưới liền, section trong suốt, hero BP2, hero vừa màn hình đầu, truy cập) và **§2.2 (ma trận màn hình, quy tắc điện thoại)**; §1 (ba họ token), §3, §5 (accessibility và chuyển động). ADR-032, ADR-033, ADR-034. `docs/coding-conventions.md` §3 (độ ưu tiên CSS), §4 (escape đúng một lần). `AGENTS.md` §5 (quy tắc 1, 3, 4, 6, 7, 10).
- **Công cụ đo, đã có trên `main` khi giao:** `node tools/home-viewport-check.mjs` (cần `npm run dev -- --port 5199 --strictPort` đang chạy; **không cần đăng nhập**; trang chủ đọc bản đã publish nên dữ liệu thật). Đo ma trận: điện thoại 320×568, 360×640, 375×667, 390×844, 393×852, 412×915, 430×932; máy tính 1440×731, 1920×940, 2560×1300; preview Admin 1440×900, 1280×800, 768×1024, 390×844. **Mốc trước khi sửa: 23 FAIL** (không menu trên điện thoại; mục bấm nhỏ: "HDL" 32×28, "VI" 52×36, "Admin" 81×36, "Explore all…" cao 26; nút chính dưới mép màn hình ở 320×568, 360×640, 375×667 và ở 1440×731; section kế tiếp bị hero che ở 1440×731, 1440×900, 1280×800, 390×844).
- Code: `src/main.ts` (`renderPage`: header ~dòng 160–195 gồm `.site-nav__links`, `.language-toggle`, `.admin-link`; hero ~dòng 192–229; chân trang ~dòng 369–376); `src/styles/home.css` (header ~1–150, `.hero*` ~96–180, `@media (max-width: 900px)` và `650px` ~405–458); `src/styles/tokens.css`; `src/shared/format.ts` (`assetUrl`, `escapeHtml`, `profileName`); `src/types/career.ts` (`photoPath` của Profile); `copy` EN / VI đầu `main.ts`. Trang công khai đọc bản publish; chế độ preview nhúng là `body.website-embedded`.
- **Mẫu demo (tham khảo, không sao chép nguyên):** hero hai cột `minmax(0,1.1fr) / minmax(0,.9fr)`; cột trái eyebrow (chữ mono), tên, tagline `--font-size-xl` đậm màu `--color-primary-dark`, nút; cột phải khung bản vẽ viền 2 px `--color-primary`, nền trắng, bóng lệch 8 px mờ: ảnh hồ sơ (viewport có hai góc đánh dấu) + bảng tên bản vẽ lưới 2 × 2 với ô nhãn mono nhỏ in hoa (NAME / ROLE / BASED IN / STACK) và ô SHEET `01 / 01` chiếm cả hàng. Lưới: `linear-gradient` hai chiều 1 px, `background-size: var(--grid-size)`. Phần chữ nhãn mono và tên bản vẽ không phải nội dung cần dịch: nhãn lấy từ `copy` EN / VI.

## 3. Phạm vi

**Làm** (mọi giá trị qua token; không hex mới; `prefers-reduced-motion` tắt chuyển động mới; chỉ giao diện sáng):

1. **Token** trong `tokens.css`: `--font-mono` (`ui-monospace, "Cascadia Code", Consolas, monospace`), `--grid-size: 4rem`, `--grid-alpha: 27%`, và một bước khoảng cách lớn `--space-24` (khoảng 7,5 rem) cho khoảng thở giữa các section (`.section` dùng `clamp` giữa `--space-16` và `--space-24`).
2. **Nền lưới liền trên cả trang** (chỉ trang chủ: `main.ts` thêm lớp `home-page` cho `body`): `background-color` giấy = `color-mix(in srgb, var(--color-primary) 4%, #fff)`; hai `linear-gradient` 1 px màu `color-mix(in srgb, var(--color-primary) var(--grid-alpha), transparent)`, `background-size: var(--grid-size) var(--grid-size)`. `.section` nền trong suốt; `.section--muted` là lớp `--color-primary` ~5 % trong suốt; `.contact` và chân trang nền `--color-dark` đặc. **Không `!important`.** Màu lấy từ theme Website (`applyWebsiteTheme` / ghi đè `--color-primary` đã có): đổi Theme preset thì lưới đổi theo.
3. **Hero BP2** thay hero cũ: markup theo "Mẫu demo"; tên (`h1`) giữ chữ hoa như dữ liệu; tagline là một `<p>` (nguồn tạm: hằng `copy.heroTagline` EN / VI, GD3-14 sẽ chuyển sang ô Admin): EN "I coordinate BIM models so infrastructure gets built right, starting from the drawing." / VI "Tôi điều phối mô hình BIM để công trình hạ tầng được xây đúng ngay từ bản vẽ."; ảnh hồ sơ `<img src=assetUrl(profile.photoPath)>` có `alt` là tên, `width` / `height`, `fetchpriority="high"`, **không** `loading="lazy"` (ảnh đầu trang); không có `photoPath` thì khung ảnh hiện ô chữ cái "HDL" (decorative, `aria-hidden`); bảng tên bản vẽ bốn ô **NAME, ROLE, BASED IN, STACK** (STACK = tối đa bốn công nghệ phổ biến nhất của các dự án và công cụ nổi bật, nối bằng " · ") và ô **SHEET `01 / 01`** (chỉ hiện khi đủ chỗ, xem mục 4); nhãn song ngữ qua `copy`; mọi giá trị qua `escapeHtml` đúng một lần.
4. **Hero vừa màn hình đầu (ADR-034, W-23):** ở **máy tính** chiều cao hero ≤ `100svh − 24 px` (để lộ ≥ 24 px section kế tiếp) ở 1440×731, 1920×940, 2560×1300 và các viewport preview 1440×900, 1280×800, 768×1024: khung bản vẽ co theo `svh` (`max-height` cho ảnh), ô SHEET ẩn khi hết chỗ, header không đẩy hero xuống. Ở **điện thoại** tên, tagline và nút chính nằm trong màn hình đầu **ở cả 320×568**: cột trái đứng trên, khung bản vẽ xuống dưới, nút xếp hàng không tràn.
5. **Điện thoại (≤ 900 px, ma trận §2.2):** hàng **menu cuộn ngang** dưới logo (cùng `.site-nav__links`; mỗi mục cao ≥ 44 px, `scroll-snap`, không `overflow-x` của trang), logo, nút VI / EN và các nút ≥ 44 × 44 px; `.section-more`, `.text-link`, chip, nút trong hero ≥ 44 px chiều cao; chữ ≥ 12 px, đoạn văn ≥ 14 px; không cuộn ngang ở 320 px.
6. **Nút Admin xuống chân trang:** bỏ `.admin-link` khỏi header công khai; chân trang có link chữ "Admin" nhỏ (`aria-label` giữ như `text.adminLabel`), href giữ `BASE_URL + "admin/"`. Sửa luôn quy tắc `body.website-embedded .admin-link`.
7. **Phông tiêu đề giữ nguyên** (Arial Narrow, ADR-033 f).
8. **Preview Website trong Admin** (`body.website-embedded`, `?preview=1&embedded=1`): hero mới hiển thị đúng ở các viewport 1440, 1280, 768, 390 của bộ chọn viewport; ảnh hồ sơ và khung không tràn.
9. **Test** (`main` có test hoặc file mới cạnh `renderPage`/helper): hero có ảnh và không có ảnh; escape (tên có `&`, `<`); nhãn song ngữ EN và VI; STACK lấy đúng công nghệ; test CSS có khẳng định **dương** (E-002): có token mới, có quy tắc lưới trên `.home-page`, `.section` trong suốt, quy tắc `min-height: 44px` cho mục điện thoại, không `!important` trong khối mới.

**Không làm:** thẻ dự án SHEET và chip lọc (GD3-13); ô Hero tagline và migration (GD3-14); trang `/projects/`, `/project/`, `/tool/`; CV, Portfolio, Cover Letter; công tắc sáng / tối; đổi phông; hiệu ứng chuyển động mới ngoài rê chuột ≤ 180 ms; dependency mới.

**Ràng buộc dùng chung không được đổi:** `siteHeader` / `siteFooter` của các trang khác (`src/site/shell.ts`), kiểu dữ liệu và Admin (không đổi gì ở Admin ở đề bài này), ngân sách bundle Admin (JS 115 kB, CSS 27,0 kB gzip). Liệt kê ở mục 5 mọi file dùng chung đã đổi (`tokens.css`, `home.css`, `main.ts`).

## 3b. Các bước (mỗi bước: test liên quan + commit `wip(GD3-12 bước k): …`)

1. Token + nền lưới liền + section trong suốt + test CSS.
2. Hero BP2 (markup, STACK, ảnh, ô chữ cái) + test hero.
3. Hero vừa màn hình đầu (máy tính) + tối ưu điện thoại (menu cuộn ngang, mục bấm ≥ 44 px, thứ tự hero, cỡ chữ) + nút Admin xuống chân trang.
4. `node tools/home-viewport-check.mjs` (mọi dòng PASS); xem ảnh ở 320×568, 390×844, 430×932, 1440×731, 1920×940 (ảnh lưu ngoài repo); `verify:admin` một lần; điền mục 5.

## 4. Tiêu chí nghiệm thu

- [ ] `node tools/home-viewport-check.mjs` ra **All PASS** (mốc: 23 FAIL, ma trận 14 cỡ màn hình); dán số PASS / FAIL vào mục 5 (không dán ảnh).
- [ ] Ở 1440×731: nút chính của hero kết thúc trước mép dưới và thấy ≥ 24 px section "Core expertise" (Sổ #24).
- [ ] Ở 320×568: tên, tagline và nút "View projects" nằm trong màn hình đầu; không cuộn ngang ở mọi cỡ điện thoại.
- [ ] Lưới **liền** từ hero xuống hết trang, kể cả các section Core expertise, Experience, Projects, Automation; chữ chính đọc rõ; thẻ trắng che lưới.
- [ ] Đổi Theme preset trong Admin (preview Website) thì màu lưới, nút và tiêu đề đổi theo (không còn hex viết cứng ở khối mới).
- [ ] Preview Website trong Admin ở 1440, 1280, 768 và 390 hiển thị đúng hero mới (Claude đo khi review có đăng nhập).
- [ ] `npm run verify:admin` đạt một lần ở cuối (chạy từ `D:\…`, E-006); bundle Admin trong ngân sách.
- [ ] Trang `/projects/`, `/project/`, `/tool/` không đổi giao diện (kiểm bằng cách mở một trang).

## 5. Báo cáo của người code

- Đã xong bước: 1, 2, 3, 4 (bước 1–3 gộp một commit wip); **lượt sửa review 1 và review 2 xong** (Phải sửa + Nên sửa)
- Người code: Claude — cửa sổ code · đã dùng trước / sau: (không đo được)
- Nhánh, commit cuối: `gd3/12-trang-chu-blueprint-nen-hero`, xem `git log` (commit `feat(GD3-12)` cuối cùng)
- File đã đổi (ghi rõ file dùng chung): **dùng chung:** `src/styles/tokens.css` (thêm `--font-mono`, `--grid-size`, `--grid-alpha`, `--space-24`), `src/styles/home.css` (viết lại header + hero, responsive), `src/main.ts`. Mới: `src/site/homeHero.ts`, `src/site/homeHero.test.ts`. `global.css`, `shell.ts` không đổi (padding section chỉ đổi dưới `.home-page`, nên `/projects/`, `/tool/` không đổi).
- `verify:admin`: số test đạt / tổng; bundle JS / CSS: 315 / 315 (44 file); Admin JS 92,8 / 115,0 kB, CSS 26,7 / 27,0 kB gzip
- `tools/home-viewport-check.mjs` (PASS / FAIL): **All PASS, 0 FAIL** sau lượt sửa (công cụ mới đo tiêu đề section kế tiếp; mốc trước lượt sửa: 3 FAIL ở 1440×731, preview 1440×900, preview 1280×800). Xem ảnh 320×568, 390×844, 1440×731, 1920×940 bằng mắt: đạt.
- Chỗ làm khác đề bài và lý do: (1) nhãn bản vẽ và tagline nằm trong `heroCopy` của `homeHero.ts`, không trong `copy` của `main.ts`, để test được mà không import `main.ts` (chạy side effect). GD3-14 chuyển tagline sang Admin sẽ sửa một chỗ. (2) Hero hai cột từ 651 px (không phải 901 px) để preview 768×1024 lộ section kế tiếp. (3) Chưa đo preview Website trong Admin có đăng nhập (mục 4 dòng 6) và chưa mở `/projects/`, `/project/`, `/tool/` bằng tay: Claude đo khi review.
- Lượt sửa review 1: (a) Phải sửa: thêm `--home-peek: 7rem` trừ vào chiều cao hero (`min-height` / `max-height`) từ 651 px, `.hero + .section` đệm trên `--space-8` (thay vì tới 7,5 rem), ảnh hồ sơ `max-height` 42svh → 36svh; tiêu đề Core expertise nay thấy được ở 1440×731, preview 1440×900, 1280×800; 1920×940 và 2560×1300 vẫn PASS, hero không bị nén (đã xem ảnh 1440×731 và 1920×940). (b) Nên sửa: `#fff` → `var(--color-surface)` ở nền `.home-page`. `verify:admin` 315/315, bundle Admin JS 115,0 / CSS 27,0 kB (không đổi).
- Lượt sửa review 2: `.hero__photo { object-position: 50% 8% }` (một dòng trong `home.css`) để không cắt mất đầu ảnh vuông 1024×1024 trong khung rộng. Đã xem ảnh 1440×731, 1280×800, 1920×940, 390×844: thấy đủ đầu và mặt ở cả bốn. `home-viewport-check`: All PASS, 0 FAIL (phép `photo-focus` đạt ở mọi cỡ; tôi đếm được 92 dòng PASS, reviewer ghi kỳ vọng 93, không có FAIL nào nên có thể là lệch cách đếm). `verify:admin` 315/315, bundle Admin không đổi (JS 115,0 / CSS 27,0 kB).
- Lượt sửa review 4 (ADR-035): (a) `--grid-alpha` 27 % → 14 % (`tokens.css`; test CSS khẳng định giá trị mới). (b) Ảnh hồ sơ vuông: `.hero__viewport { aspect-ratio: 1 }` (bỏ `max-height`), bỏ `object-position`; hero lệch `1.3fr / .7fr` từ 651 px; `.hero__sheet` rộng `min(100%, --hero-photo-size)` với `--hero-photo-size = 100svh − 24px − header − peek − space-8 − --hero-titleblock` (11 rem; 14 rem khi `min-height: 821px` có ô SHEET), căn phải. Điện thoại: ảnh vuông rộng bằng cột, dưới nút. File: `home.css`, `tokens.css`, `homeHero.test.ts`. `home-viewport-check`: **All PASS, 0 FAIL** (93 dòng PASS gồm dòng "All PASS"; `photo-fit` lệch 0 ở mọi cỡ, `peek` còn PASS). Đã xem ảnh 1440×731, 1280×800, 1920×940, 390×844: thấy nguyên ảnh, đủ đầu và vai; tiêu đề Core expertise hiện ở ba màn máy tính. `verify:admin` đạt, bundle Admin JS 92,8 / 115,0, CSS 26,7 / 27,0 kB (không đổi). Lưu ý: chạy `verify:admin` từ `D:\` (E-006). Chưa chụp riêng lưới 14 % ở độ phóng lớn; trong ảnh lưới nhạt hơn nhưng vẫn thấy rõ.
- Câu hỏi:

## 6. Review của Claude

- Ngày, commit đã review: 2026-11-17, `3009736` (worktree `D:\wt\pf-review`, `npm ci` sạch; đã xóa). Người code là cửa sổ Claude code; người review là phiên thiết kế (độc lập). Đo trên bản đã publish (đọc công khai) và trên Admin thật.
- Đã kiểm (không dựa vào báo cáo):
  - `verify:admin`: 44 file / 315 test đạt; Admin JS 92,8 / 115,0 kB, CSS **26,7 / 27,0 kB** gzip (tăng 0,1 kB do `tokens.css`; còn trống 0,3 kB).
  - `node tools/home-viewport-check.mjs` (bản cũ, đo khung section): **All PASS**, 14 cỡ màn hình (mốc trước: 23 FAIL).
  - Đọc diff: logic hero tách ra `src/site/homeHero.ts` có test (hợp lý, đúng lý do báo cáo); `renderHero` escape một lần (tên, ảnh, STACK, nhãn; `localize` đã escape); `home.css` không có `!important` mới, không hex mới ngoài một chỗ (xem "Nên sửa"); lưới liền trên `body.home-page`; token `--font-mono`, `--space-24`, `--grid-size`, `--grid-alpha` đúng đề bài.
  - **Preview Website trong Admin** (phần người code chưa kiểm): hero mới hiển thị ở **cả bốn viewport** 1440, 1280, 768, 390, `body.home-page` bật, không cuộn ngang (bản nháp Theme Personal Blue, ảnh hồ sơ của bản nháp).
  - Ảnh xem tay: 320×568 (tên, tagline, nút chính trong màn hình đầu, menu cuộn ngang), 390×844, 390 toàn trang, 1440×731, 1920×940, 2560×1300, tiếng Việt 390. Trang `/projects/` không đổi.
- **Phải sửa:**
  1. **Nội dung section kế tiếp bị hero che ở 1440×731, 1440×900 và 1280×800** (Sổ #24 / W-23: "hero lớn quá che phần bên dưới"). Đề bài ghi "lộ ≥ 24 px section kế tiếp" và người code đo đúng như vậy (khung section), nhưng section nền **trong suốt** nên khung lộ ra chỉ là lưới trống: tiêu đề "A practical combination…" của section Core expertise bắt đầu ở **815 px khi màn hình cao 731** (thấp hơn mép 84 px), 884 / 900 (cần ≤ 876), 879 / 800 (thấp hơn 79 px). Lỗi nằm ở **đặc tả của tôi** (đo khung thay vì nội dung); tôi đã sửa `docs/ui-guidelines.md` §2.1, §2.2, ADR-034 và `tools/home-viewport-check.mjs` (phép `peek` nay đo tiêu đề): mốc hiện tại **3 FAIL** (1440×731, preview 1440×900, preview 1280×800), 11 dòng còn lại PASS và phải còn PASS.
  - **Cách sửa (gợi ý, người code chọn cách gọn):** giảm khoảng đệm dưới của hero và khoảng đệm trên của section đầu tiên sau hero ở máy tính (ví dụ `padding-block` của hero và của `#expertise` dùng `clamp` theo `svh`) cho tiêu đề section kế tiếp lên ≤ `100svh − 24 px` ở 1440×731, 1440×900 và 1280×800, mà ở 1920×940 và 2560×1300 vẫn PASS và hero không bị nén xấu. Có thể thu thấp ảnh hồ sơ thêm một chút ở các màn thấp.
- **Nên sửa:** `color-mix(in srgb, var(--color-primary) 4%, #fff)` ở dòng 4 của `home.css` dùng `#fff` viết cứng: dùng `var(--color-surface)` (làm cùng lượt sửa).
- **Ghi nhận:** (1) trang công khai đang hiện **màu nâu đỏ** vì bản Website **đã publish** còn theme cũ; Personal Blue chỉ có ở bản nháp (preview Admin). Lưới, nút và tiêu đề đổi theo theme đúng thiết kế, nên người vận hành cần **publish Website** sau khi chọn Personal Blue. (2) Hero mới **bỏ đoạn tóm tắt hồ sơ** (`profile.summary`) và dòng chức danh riêng (vai trò nằm trong ô ROLE); đúng theo demo đã chọn nhưng trang chủ không còn đoạn giới thiệu dài. (3) Bốn chuỗi nhãn và tagline nằm trong `heroCopy` của `homeHero.ts` thay vì `copy` của `main.ts` (có lý do: `main.ts` chạy tác dụng phụ khi import); GD3-14 sẽ thay tagline bằng dữ liệu Admin. (4) Hero hai cột từ 651 px thay vì 901 px, để preview 768 lộ được section kế tiếp: hợp lý.
- **Cần người vận hành chốt:** không về thiết kế; sau lượt sửa sẽ cần **duyệt gộp** (đổi giao diện công khai, ADR-018).
- Token: Claude — cửa sổ code 16 % → 19 % đã dùng (~3 %, Lớn; chưa tính lượt sửa).
- Kết luận: **CẦN SỬA** (1 mục "Phải sửa" do đặc tả của tôi yếu, 1 mục "Nên sửa" nhỏ). Người code sửa trên cùng nhánh rồi báo lại; Claude chạy lại công cụ đo (kỳ vọng All PASS, 14 cỡ) và xem lại ảnh trước khi chuyển `CHỜ DUYỆT`.

### Review 2 (2026-11-17, `8fddcee`; worktree sạch, đã xóa)

- `verify:admin`: 44 file / 315 test đạt; Admin JS 92,8 / 115,0, CSS 26,7 / 27,0 kB gzip (không đổi). `node tools/home-viewport-check.mjs` (bản có phép `peek` đo tiêu đề): **All PASS, 79 dòng** (mốc review 1: 3 FAIL). Tiêu đề "Core expertise" nay thấy ở 1440×731 (615 / 731 px), 1920×940 (796 / 940), 1280×800 (684 / 800); preview Admin ở 1440, 1280, 768, 390 không cuộn ngang, hero hiển thị đúng.
- **Phải sửa:** **ảnh hồ sơ bị cắt mất đầu** ở màn hình laptop. Ảnh hồ sơ là **vuông 1024 × 1024** nhưng khung ảnh của hero rộng (522 × 263 px ở 1440×731, tức 2:1), `object-fit: cover` mà `object-position` để mặc định **50 % 50 %** nên chỉ thấy phần thân giữa: ở 1440×731 và 1280×800 chỉ còn thấy cằm trở xuống; ở 1920×940 mất trán; trên điện thoại thấy mặt nhưng sát mép trên. Việc hạ ảnh xuống 36 % chiều cao màn hình (lượt sửa review 1) làm lỗi lộ rõ hơn. Lỗi này tôi cũng bỏ sót ở review 1 vì ảnh hồ sơ của bản nháp khi đó là ảnh khác (cũng bị cắt nhưng lộ ít hơn).
  - **Cách sửa:** neo phần trên của ảnh: `.hero__photo { object-position: 50% 8% }` (hoặc giá trị tương đương ≤ 15 %); xem lại ảnh ở 1440×731, 1280×800, 1920×940, 390×844 để thấy **đủ đầu và mặt** ở cả bốn. Tôi đã thêm phép `photo-focus` vào `tools/home-viewport-check.mjs` (đo `object-position` dọc ≤ 15 %) và đặc tả `docs/ui-guidelines.md` §2.1: mốc hiện tại **14 FAIL** (mỗi cỡ màn hình một dòng), sau sửa phải **All PASS** (79 + 14 = 93 dòng).
- **Nên sửa:** không. Dòng `#fff` → `var(--color-surface)` đã sửa đúng.
- **Ghi nhận:** (1) trang công khai nay đã hiện **Personal Blue** và ảnh hồ sơ mới (bạn đã publish Website): lưới và nút đổi theo theme đúng thiết kế. (2) Lần đo đầu của cửa sổ code báo PASS do lệch CRLF / LF nhưng đã tự phát hiện và đo lại: ghi nhận cách làm tốt.
- **Cần người vận hành chốt:** không về thiết kế; sau lượt sửa cần **duyệt gộp** (đổi giao diện công khai, ADR-018).
- Token: Claude — cửa sổ code 23 % → 23 % đã dùng cho lượt sửa review 1 (~0 %).
- Kết luận: **CẦN SỬA** (1 mục "Phải sửa" nhỏ, một dòng CSS). Sửa xong báo lại; Claude chạy lại công cụ đo (kỳ vọng All PASS, 93 dòng) và xem ảnh đầu / mặt trước khi chuyển `CHỜ DUYỆT`.

### Review 3 (2026-11-17, `fe32ccb`; worktree sạch, đã xóa)

- Diff lượt sửa: một dòng `object-position: 50% 8%` cho `.hero__photo`. `verify:admin`: 44 file / 315 test đạt; Admin JS 92,8 / 115,0, CSS 26,7 / 27,0 kB gzip (không đổi).
- `node tools/home-viewport-check.mjs`: **All PASS, 92 dòng PASS, 0 FAIL** (14 cỡ màn hình; mốc trước tôi ghi "93" là đếm cả dòng "All PASS": 78 + 14 = 92 dòng; không lệch). Ảnh cắt khung ảnh hồ sơ ở 1440×731, 1280×800 và 390×844: **thấy đủ đầu và mặt** ở cả ba.
- **Phải sửa:** không. **Nên sửa:** không.
- **Cần người vận hành chốt:** không về thiết kế; chỉ cần **duyệt gộp** vì đổi giao diện công khai (ADR-018). Không có migration.
- Token: Claude — cửa sổ code 26 % → 26 % cho lượt sửa; cả đề bài 16 % → 26 % (~10 %, Lớn).
- Kết luận: **ĐẠT, CHỜ DUYỆT** — sạch về kỹ thuật; chờ người vận hành duyệt rồi Claude gộp và push.

### Review 4 (2026-11-22): người vận hành xem trang thật và chốt hai chỉnh sửa (ADR-035)

Không phải lỗi của lượt trước: người vận hành xem bản thật và ghi Sổ #25, #26 (W-24, W-25). Làm trên cùng nhánh trước khi gộp.

- **Phải sửa 1 — lưới nhạt lại (Sổ #25):** `--grid-alpha` từ `27%` xuống **`14%`** (một token trong `tokens.css`; kiểm test CSS khẳng định giá trị mới). Không đổi `--grid-size` (4 rem).
- **Phải sửa 2 — ảnh hồ sơ hiện nguyên ảnh vuông (Sổ #26):** ảnh hồ sơ là vuông 1024 × 1024 nhưng khung ảnh hero là 16:11 nên mất nửa dưới. Đổi thành **khung ảnh vuông**:
  - Hero hai cột **lệch** từ 651 px trở lên: cột chữ rộng hơn (ví dụ `minmax(0, 1.3fr) / minmax(0, .7fr)`), cột ảnh hẹp hơn; cột ảnh gồm **ảnh vuông** (`aspect-ratio: 1`, giữ hai góc đánh dấu) và **bảng tên bản vẽ bốn ô** bên dưới.
  - Kích thước ảnh theo chiều cao màn hình: bề rộng ảnh = `min(100%, <chiều cao còn lại của hero − chiều cao bảng tên>)` để hero **vẫn trọn màn hình đầu và lộ tiêu đề section kế tiếp** (11 dòng `peek` hiện đang PASS phải còn PASS ở 1440×731, 1440×900, 1280×800, 1920×940, 2560×1300).
  - Trên điện thoại ảnh vuông rộng bằng cột nội dung, đặt **dưới** tên, tagline, nút (như hiện nay).
  - Bỏ `object-position: 50% 8%` (ảnh vuông vào khung vuông không còn bị cắt); giữ `object-fit: cover` làm dự phòng; vẫn `fetchpriority="high"`, không `loading="lazy"`, có `width`, `height`, `alt`; ô chữ cái "HDL" khi không có ảnh cũng vuông.
- **Công cụ đo:** phép `photo-focus` cũ nay thành **`photo-fit`** (tỉ lệ khung ảnh lệch tỉ lệ ảnh ≤ 0,08). Mốc hiện tại **14 FAIL** (mỗi cỡ màn hình một dòng); sau sửa **All PASS** (cả `peek`, `first-screen`, `tap`, `font`, `no-hscroll`, `images`).
- **Nghiệm thu:** `node tools/home-viewport-check.mjs` All PASS; xem ảnh ở 1440×731, 1280×800, 1920×940, 390×844 (thấy nguyên ảnh, đủ đầu và vai; hero vẫn vừa màn hình đầu); `verify:admin` đạt; chụp lưới ở độ đậm mới thấy nhạt hơn nhưng vẫn rõ.
- **Ghi nhận:** thẻ dự án trên trang chủ **vẫn là kiểu cũ** vì kiểu "SHEET" có ảnh và chip lọc thuộc **GD3-13** (đề bài riêng, chờ GD3-12). Hai đề bài nên gộp cùng một lúc để trang không nửa mới nửa cũ.
