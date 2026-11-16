# GD3-12 — Trang chủ Blueprint: nền lưới liền, hero BP2, tối ưu điện thoại (nhóm N12)

> **Trạng thái:** GIAO CODE · **Nhánh:** `gd3/12-trang-chu-blueprint-nen-hero` (`git fetch; git switch -c gd3/12-trang-chu-blueprint-nen-hero origin/main`) · **Ngày giao:** 2026-11-17 · **Cỡ:** Lớn (~6 file) · **Người đang code:** Claude — cửa sổ code (hoặc Codex nếu còn token; Codex nên dùng khi còn ≥ 60 % token)
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

- Đã xong bước:
- Người code: · đã dùng trước / sau:
- Nhánh, commit cuối:
- File đã đổi (ghi rõ file dùng chung):
- `verify:admin`: số test đạt / tổng; bundle JS / CSS:
- `tools/home-viewport-check.mjs` (PASS / FAIL):
- Chỗ làm khác đề bài và lý do:
- Câu hỏi:

## 6. Review của Claude

- Ngày, commit đã review:
- **Phải sửa:**
- **Nên sửa:**
- **Cần người vận hành chốt:**
- Kết luận:
