# Hướng dẫn UI/UX Website và tài liệu

Các quy tắc này áp dụng cho mọi thứ ngoài Admin: website công khai (`/`, `/projects/`, `/project/`, `/tools/`, `/tool/`) và tài liệu có thể in (`/cv/`, `/portfolio/`, `/cover-letter/`). Admin có quy tắc riêng trong `docs/admin-ui-guidelines.md`.

Khi một thay đổi buộc phải phá vỡ quy tắc, hãy cập nhật file này trong cùng thay đổi và giải thích lý do.

## 1. Ba họ token, không bao giờ trộn lẫn

| Bề mặt | Token | Định nghĩa tại | Áp dụng cho |
|---|---|---|---|
| Website công khai | `--color-*`, `--space-*`, `--font-*`, `--font-size-*`, `--radius-*`, `--shadow-card`, `--transition-fast`, `--content-max-width` | `src/styles/tokens.css` | `:root` |
| Admin | `--admin-*` | `admin-ui.css`, `admin-typography.css` | `html.admin-app` |
| Tài liệu (CV, Portfolio, Cover Letter) | `--document-*` | `src/themes/documentThemes.ts` → `applyDocumentTheme` | phần tử gốc của tài liệu |

- Selector Website chỉ dùng token Website; selector tài liệu chỉ dùng token `--document-*` và đơn vị vật lý. Style Admin không bao giờ đọc `--document-*`, trừ bên trong preview tài liệu nhúng.
- Khoảng cách trên Website dùng thang `--space-1 … --space-20` (bước 4 px đến 1.5 rem, sau đó là 2, 2.5, 3, 4, 5 rem). Không thêm giá trị rem riêng lẻ khi đã có bước phù hợp.
- Màu thương hiệu Website có thể đổi theme: `applyWebsiteTheme` (`src/site/shell.ts`) ghi đè `--color-primary`, `--color-primary-dark`, `--color-primary-light` và `--color-accent` từ theme Draft Website. Luôn tham chiếu các biến này; mã hex thương hiệu viết cứng sẽ không theo theme.

## 2. Kiểu chữ và layout Website

- Body: `--font-body` (Inter → Aptos → Segoe UI), `line-height: 1.65`. Tiêu đề `h1–h3`: `--font-heading` (Arial Narrow / Roboto Condensed), `line-height: 1.05`.
- Thang kích thước: `--font-size-xs`, `-sm`, `-base` là cố định; `-lg`, `-xl`, `-2xl`, `-hero` là các giá trị `clamp()` linh hoạt. Dùng thang có sẵn, không tạo kích thước mới.
- Chiều rộng trang: `.container` (`min(100% - 2rem, var(--content-max-width))`, tối đa 1200 px). Section dùng `.section` (`--space-20` theo chiều dọc, `--space-16` dưới 700 px) và `.section--muted` cho nền xen kẽ.
- Mẫu header section: `.section-heading` chứa `.section-kicker` (chữ hoa, giãn chữ, màu primary) và `.section-title` (tối đa 18ch).
- Text eyebrow/kicker luôn viết hoa, dùng `--font-size-xs`, weight 800, letter-spacing ≥ 0.12em.

### 2.1 Trang chủ: giao diện Blueprint (ADR-032, [MASTER_PLAN #15](../MASTER_PLAN.md))

Đã chốt (ADR-032):

- **Một lớp lưới liền trên cả trang.** Lưới nằm ở nền `body` (hai `linear-gradient` 1 px, không gắn riêng cho hero hay một section). Token: `--grid-size: 4rem` (ô chuẩn), `--grid-alpha: 27%` (người vận hành chọn "rất đậm"). Màu đường = `color-mix(in srgb, var(--color-primary) var(--grid-alpha), transparent)`; màu giấy = `color-mix(in srgb, var(--color-primary) 4%, #fff)`. **Không viết cứng hex**: đổi Theme preset trong Admin thì lưới, nút, tiêu đề đổi theo ([§1](#1-ba-họ-token-không-bao-giờ-trộn-lẫn)).
- **Section để lưới lộ ra:** `.section` nền trong suốt; `.section--muted` chỉ là một lớp `--color-primary` ~5 % trong suốt; phần liên hệ và chân trang nền `--color-dark` đặc. Không section nào được dùng nền đặc che lưới giữa hai khối nội dung.
- **Hero kiểu bản vẽ (BP2):** cột trái là eyebrow, tên, tagline, các nút (View projects / CV / Portfolio); cột phải là **khung bản vẽ** viền 2 px `--color-primary`: ảnh hồ sơ tỉ lệ 16:11 (hai góc đánh dấu) và **bảng tên bản vẽ** hai cột (NAME, ROLE, BASED IN, STACK, SHEET 01 / 01) dùng chữ mono. Trên điện thoại cột phải xuống dưới cột trái.
- **Hero nằm trọn màn hình đầu** (Sổ #24, ADR-034): ở máy tính **nội dung đầu của section kế tiếp (kicker / tiêu đề) phải lộ ≥ 24 px** ở đáy màn hình đầu, tức khoảng đệm cuối hero cộng khoảng đệm đầu section phải đủ nhỏ (đo phần tử tiêu đề, không phải khung section trong suốt); khung bản vẽ co theo `svh` (ảnh có `max-height`, bảng tên bản vẽ chỉ bốn ô NAME / ROLE / BASED IN / STACK, bỏ ô SHEET khi thiếu chỗ). Trên điện thoại: tên, tagline và nút chính nằm trong màn hình đầu ở cả 320 × 568; ảnh và bảng tên xuống dưới.
- **Không có công tắc sáng / tối** ([AGENTS §5.10](../AGENTS.md)).

Đã chốt (ADR-033, 2026-11-17): ảnh hồ sơ trong hero; ô Hero tagline EN / VI trong Admin; nút Admin xuống chân trang; thẻ dự án "SHEET nn" có ảnh (ảnh trên, số SHEET và địa điểm bằng chữ mono, tên, vai trò, thẻ công nghệ) cùng chip lọc theo công nghệ (`aria-pressed`, thông báo số kết quả bằng `aria-live`); menu cuộn ngang trên điện thoại với mục cao ≥ 44 px; giữ phông tiêu đề hẹp.

`[ĐỀ XUẤT] quy tắc mới` (đi kèm đề bài GD3-12, chờ người vận hành xác nhận): token `--font-mono` (`ui-monospace, "Cascadia Code", Consolas, monospace`) cho nhãn kiểu bản vẽ; token `--grid-size`, `--grid-alpha`; thang khoảng cách thêm một bước lớn (khoảng 6 – 7,5 rem) cho khoảng thở giữa các section (hiện `--space-20` = 5 rem).

**Truy cập (đã tính, chưa đo trên trang thật):** lưới chỉ là nền trang trí. Chữ chính (`--color-text`, `--color-dark`) vẫn trên 4,5:1 so với đường lưới. Chữ xám `--color-text-muted` đúng chỗ cắt đường lưới ở 27 % chỉ còn khoảng 3,9:1 (tính từ màu), nên **đoạn văn dài đặt trên nền đặc** (thẻ trắng, khung bản vẽ); tiêu đề lớn đặt thẳng trên lưới được chấp nhận (chữ lớn cần 3:1). Nếu thấy rối chữ trên trang thật, hạ `--grid-alpha` (token duy nhất).

### 2.2 Ma trận màn hình của Website công khai (ADR-034)

- **Ưu tiên số 1: điện thoại** (người xem chủ yếu dùng điện thoại). Trang chủ viết **mobile-first**: kiểu gốc là điện thoại, màn lớn thêm quy tắc. Phải đẹp nhất ở các cỡ dọc: **320×568, 360×640, 375×667, 390×844, 393×852, 412×915, 430×932** (CSS px). Màn ngang không bắt buộc đẹp nhưng không được vỡ.
- **Máy tính: chỉ ba màn hình mục tiêu** ([admin-ui §11](admin-ui-guidelines.md)): **1440×731** (laptop), **1920×≈940**, **2560×≈1300**. Độ rộng trung gian (tablet, 1024…) không cần tối ưu riêng nhưng không được vỡ; dùng lại breakpoint 900 / 650 hiện có.
- **Preview Website trong Admin:** bộ chọn viewport có 1440 (desktop), 1280 (laptop), 768 (tablet), 390 (mobile); preview phải hiển thị đúng như trang công khai ở độ rộng đó.
- **Quy tắc điện thoại:** link và nút trong header, hero, chip, nút chính ≥ **44 × 44 px**; chữ ≥ 12 px, đoạn văn ≥ 14 px (khuyến nghị 16); **luôn có menu tới các mục** (không ẩn điều hướng); không cuộn ngang; ảnh có kích thước và `alt`; nội dung quan trọng đặt trong màn hình đầu.
- **Quy tắc máy tính:** hero trọn màn hình đầu và lộ ≥ 24 px **nội dung** (kicker / tiêu đề) của section kế tiếp (§2.1). Section nền trong suốt nên khung section lộ ra không có nghĩa là người xem thấy gì bên dưới.
- **Kiểm:** `node tools/home-viewport-check.mjs` (đo tất cả cỡ trên; mốc **23 FAIL** trên trang đang chạy trước GD3-12) cộng xem ảnh bằng mắt ở 320×568, 390×844 và 1440×731; trong Admin chọn từng viewport của preview Website.

## 3. Component Website

Dùng lại các mẫu này trước khi viết markup mới:

| Mẫu | Cách dùng |
|---|---|
| Chrome trang (skip link, header, nav, đổi ngôn ngữ, footer) | `siteHeader`, `siteFooter` (`src/site/shell.ts`) |
| Card danh sách Project / Tool | `renderProjectCard`, `renderToolCard` (`.listing-card`) |
| Ảnh có placeholder dự phòng | `renderMedia`, `renderMediaFigure` (`src/site/renderers.ts`) |
| Tag công nghệ | `renderTags` bên trong `<ul class="tag-list">` |
| Nút | `.button` (primary), `.button--secondary`; chiều cao tối thiểu 46 px |
| Call-to-action dạng text | `.text-link` có `→` ở cuối |
| Link nội bộ | `projectUrl`, `toolUrl`, `withWebsiteLanguage` (giữ `?lang=`) |

- Card: `--radius-lg`, viền 1 px `--color-border`, `--shadow-card`. Khi hover chỉ được dịch chuyển tối đa `-2px`.
- Ảnh dùng `loading="lazy"`, dùng `object-fit: cover` trong box media có chiều cao cố định và luôn có text `alt` đã bản địa hóa. Khi thiếu ảnh, render `.media-placeholder`, không bao giờ để `<img>` hỏng.
- Trạng thái loading/empty/error của trang dùng `.website-load-state`.

## 4. Ngôn ngữ (EN/VI)

- Mọi chuỗi hiển thị cho người dùng đều lấy từ object `{ en, vi }`: `LocalizedText` cho nội dung, hằng cục bộ `copy`/`shellCopy` cho UI chrome. Không viết inline chuỗi chỉ có tiếng Anh trong renderer.
- Ngôn ngữ Website lấy từ `?lang=vi` (`readWebsiteLanguage`); tiếng Anh là mặc định và URL không mang tham số `lang` cho tiếng Anh.
- Mỗi trang đặt `document.documentElement.lang` thành ngôn ngữ đang dùng.
- Khi giá trị tiếng Việt trống, renderer dùng tiếng Anh làm dự phòng (`localize(value, lang) || localize(value, "en")`).
- Tên Profile: `profileName(name, lang)` — tiếng Việt giữ dấu, tiếng Anh dùng dạng ASCII từ `vietnameseToAscii`.
- CV và Portfolio là tài liệu tiếng Anh; Cover Letter dùng một ngôn ngữ đúng như nội dung đã viết.

## 5. Accessibility và chuyển động Website

- Mỗi trang bắt đầu bằng `.skip-link` tới `#main-content`.
- Navigation dùng `<nav aria-label>` và đánh dấu trang hiện tại bằng `aria-current="page"`.
- Focus: `:focus-visible` toàn cục là outline 3 px `--color-accent` với offset 4 px. Không bao giờ xóa nếu chưa có giải pháp thay thế tương đương.
- Transition dùng `--transition-fast` (180 ms) và chỉ áp dụng cho color, background, border và transform. `prefers-reduced-motion: reduce` tắt chúng toàn cục trong `global.css`; đặt chuyển động mới bên trong quy tắc đó.
- Text trên màu primary là màu trắng; kiểm tra độ tương phản của mọi cặp màu mới theo WCAG AA (4.5:1 cho body, 3:1 cho text lớn). Có thể dùng `getContrastRatio` trong `documentThemes.ts` để test.

### Các breakpoint đang dùng

Website: `900px`, `760px`, `700px`, `650px`. Màn hình tài liệu: `760px`, và `720px` cho toolbar in. Dùng lại một trong các giá trị này trước khi thêm giá trị mới.

## 6. Hợp đồng trang tài liệu

| Tài liệu | Kích thước trang | Class gốc của trang | CSS in |
|---|---|---|---|
| CV | A4 dọc, 210 × 297 mm, tuyển chọn trong 2 trang | `.cv-page` (`[data-cv-page]`) | `cv-print.css` |
| Portfolio | A4 ngang, 297 × 210 mm | `.portfolio-page` | `portfolio-print.css` |
| Cover Letter | A4 dọc, đúng 1 trang | `.cover-letter-page` | `cover-letter-print.css` |

- Mỗi trang là một box kích thước cố định với `overflow: hidden` và `box-sizing: border-box`. Bên trong trang, đo bằng `mm` và đặt cỡ chữ bằng `pt`; không dùng `rem`, `vw` hoặc `clamp()`.
- `@page { size: …; margin: 0 }`; margin nằm trong padding của trang để preview màn hình khớp với PDF.
- CSS in ẩn toàn bộ chrome màn hình (`.cv-toolbar`, `[data-print-toolbar]`, `[data-print-status]`, skip link), bỏ shadow, đặt `print-color-adjust: exact` và dùng `break-after: page` / `break-inside: avoid` theo từng trang.
- **Overflow là lỗi, không phải style.** CV đánh dấu trang bị tràn bằng `.cv-page--overflow` và báo "PDF export needs attention" qua `updateDocumentPrintStatus`; Cover Letter chặn Final khi `coverLetterOverflows` là true. Tài liệu hoặc layout mới phải phát hiện overflow theo cùng cách (`scrollHeight > clientHeight + 1`, áp dụng cả chiều rộng) và hiển thị trong trạng thái in.
- Chỉ kiểm tra mép trang là chưa đủ khi trang vẽ chrome cố định (header, footer, số trang) trên nội dung: nội dung có thể va vào chrome dù vẫn nằm trong trang. Vì vậy Portfolio kiểm tra **vùng an toàn** (§8.3); mọi tài liệu mới có chrome phải làm tương tự.
- Luôn export qua engine in của trình duyệt (`window.print`, qua `bindDocumentPrintButton`) để text PDF vẫn chọn được. Không bao giờ export qua canvas hoặc ảnh chụp.

## 7. Theme tài liệu

- Theme là một cặp màu HEX sáu chữ số (primary, accent). `buildDocumentThemeTokens` suy ra phần còn lại: `primaryStrong` (28 % về phía đen), `surfaceMuted` (90 % về phía trắng), `border` (68 % về phía trắng), cùng text `onPrimary` / `onAccent` dễ đọc được chọn theo độ tương phản.
- **Engine bảo đảm độ tương phản.** Màu primary đã chọn được làm tối theo bước 2 % cho đến khi đạt `DOCUMENT_TEXT_CONTRAST` (4.5:1), cả khi làm text trên `surfaceMuted` (và do đó trên màu trắng) lẫn làm nền phía sau `onPrimary`. Màu tùy chỉnh của người dùng được giữ nguyên nếu đã đạt. Vì vậy preset Personal Blue `#087fb6` render thành `#0772a4`.
- `documentThemes.test.ts` kiểm tra mọi cặp text/nền tài liệu in ra cho từng preset. Thêm preset hoặc cặp mới (ví dụ text màu accent) thì phải thêm vào test đó.
- Preset nằm trong `documentThemes`: Personal Blue (mặc định), Professional Navy, Engineering Green, Architectural Burgundy, Neutral Graphite. Thêm preset tại đó thay vì định nghĩa màu trong CSS.
- Dạng preference đã lưu: `StoredDocumentTheme { presetId, primary?, accent? }`; `presetId: "custom"` dùng cặp màu đã lưu. Resolve bằng `resolveDocumentTheme`, áp dụng bằng `applyDocumentTheme`.
- Giá trị mặc định CSS tài liệu và `var(--document-*, fallback)` phải bằng token Personal Blue **đã tính** (`#0772a4`, `#055276`, `#e6f1f6`, `#b0d2e2`), không phải input preset. Tính lại mỗi khi engine thay đổi (`cv-screen.css`, `portfolio-screen.css`, `cover-letter-screen.css`, `docs/ui-kit/tokens.css`).
- Vai trò màu:
  - Text trên `--document-primary` hoặc `--document-accent` dùng `--document-on-primary` / `--document-on-accent`, không bao giờ dùng màu trắng cố định.
  - Accent chỉ để trang trí (rail, đường kẻ, vòng ảnh). Không bao giờ dùng làm màu text: accent trên nền trắng không đạt độ tương phản ở mọi preset.
  - Không bao giờ giảm độ tương phản text bằng `opacity` hoặc `color-mix` về trong suốt. Text phụ trên vùng có màu khác nhau ở kích thước và weight, không phải độ trong suốt.

## 8. Kiểu chữ và layout tài liệu

### 8.0 Kiểu chữ tài liệu (CV, Portfolio, Cover Letter)

Một hệ thống cho ba tài liệu in, trên trang riêng, trong preview Admin và trong PDF. Hệ thống nằm trong `src/styles/document-typography.css`, được mọi entry tài liệu và Admin (preview Cover Letter inline) import. CSS tài liệu chỉ dùng token của hệ thống; `documentTypography.test.ts` thất bại với mọi font size, weight, line height, letter spacing hoặc face dạng literal trong `cv-screen.css`, `portfolio-screen.css` và `cover-letter-screen.css` (toolbar chỉ dành cho màn hình có kích thước bằng `rem` được miễn).

**Face.** `--document-font`: **Be Vietnam Pro** (OFL-1.1, đóng gói từ `@fontsource/be-vietnam-pro`), sau đó là Segoe UI, Arial. Font được thiết kế cho dấu tiếng Việt và giống nhau trên mọi máy, nên trang có kích thước cố định không bao giờ reflow do font hệ thống khác nhau (stack cũ ghi Aptos nhưng Chrome không dùng được và âm thầm in bằng Segoe UI). Chỉ khai báo các subset Latin và Vietnamese của weight 400, 600, 700, 900 và italic 400, dưới dạng woff2 với `unicode-range` của fontsource, cùng `font-display: block` để không trang nào được đo overflow hoặc in bằng face dự phòng. Admin và website công khai giữ face riêng (§1).

**Thang (pt).** Mỗi bước là một vai trò. Không bao giờ thêm kích thước ở giữa; hãy chọn vai trò phù hợp.

| Token | pt | Vai trò |
|---|---|---|
| `--document-type-2xs` | 7 | Caption, tag, header/footer Portfolio, chip công nghệ |
| `--document-type-xs` | 8 | Meta và ngày, kicker, text phụ trong sidebar CV, summary project |
| `--document-type-sm` | 8.5 | Gạch đầu dòng CV và mục sidebar |
| `--document-type-base` | 9 | Body CV, summary và tên project |
| `--document-type-md` | 10 | Body Portfolio, **body Cover Letter** |
| `--document-type-lg` | 10.5 | Role CV (job title theo từng mục) |
| `--document-type-xl` | 11 | Lead, statement ngắn, nhận diện cover |
| `--document-type-2xl` | 13 | Tiêu đề section, professional title |
| `--document-type-3xl` | 16 | Tiêu đề card, số lớn, tiêu đề Credential, header trang hai CV |
| `--document-type-4xl` | 20 | Tiêu đề rail và aside, fact project |
| `--document-type-5xl` | 24 | Statement, tiêu đề trang trong rail, tên trên Cover Letter |
| `--document-type-6xl` | 30 | Tên trên CV, tiêu đề trang Portfolio |
| `--document-type-display` | 48 | Dòng display closing và index, tiêu đề cover split |
| `--document-type-hero` | 68 | Hero cover và closing xanh |

CV giữ token vai trò riêng (`--cv-font-body`, `--cv-font-role`, …) nhưng mỗi token trỏ tới một bước trong thang; token `--pf-*-size` của Portfolio cũng vậy (§8.1).

**Weight.** `--document-weight-regular` 400 (text liên tục, gạch đầu dòng), `-semibold` 600 (meta cần nhấn, ngày), `-bold` 700 (tiêu đề, label, tên trong danh sách), `-black` 900 (tên, tiêu đề hero, kicker, số lớn). Đây là các weight đi kèm face; giá trị ở giữa sẽ bị trình duyệt làm tròn và in khác CSS.

**Leading.** `display` .88 (≥ 48 pt), `none` 1 (box một dòng: số, badge, ngày), `title` 1.05 (tiêu đề ≥ 16 pt), `tight` 1.15 (tiêu đề, label, meta ngắn), `body` 1.35 (body và danh sách), `relaxed` 1.45 (đoạn văn: summary, thư).

**Tracking.** `caps` .12em cho mọi kicker và label viết hoa, `wide` .03em cho tên và từ viết toàn chữ hoa trong text liên tục, `title` -.025em cho tiêu đề trang, `display` -.05em cho hero và dòng display.

**Vai trò dùng chung.** Cùng một phần tử có hình thức giống nhau trong cả ba tài liệu; chỉ khác bước kích thước khi trang yêu cầu.

| Vai trò | Cách trình bày |
|---|---|
| Tên người | Weight black, tracking `wide`; text tối hoặc primary-strong trên nền trắng, `--document-on-primary` trên nền màu. CV 30 pt (xếp chồng), Cover Letter 24 pt (một dòng: cột liên hệ là `auto`, tên chiếm phần còn lại), cover Portfolio 16 pt trong block nhận diện |
| Professional title | Bold, một dòng dưới tên. CV 13 pt, Cover Letter 10.5 pt (primary), cover Portfolio 11 pt |
| Kicker | 8 pt, black, `caps`, viết hoa, primary |
| Body | CV 9 pt (layout hai trang dày), Portfolio và Cover Letter 10 pt |
| Meta, ngày | 8 pt, semibold hoặc regular, muted |
| Caption, tag | 7 pt |

**Thay đổi kiểu chữ.** Chọn bước gần nhất (nếu bằng nhau thì chọn bước nhỏ hơn), rồi kiểm tra mọi trang của ba tài liệu bằng EN và VI: CV vẫn có hai trang, mỗi Cover Letter một trang, trạng thái in Portfolio và báo cáo "issues" trong Admin không có lỗi layout.

### 8.1 Lưới trang Portfolio

Mọi layout Portfolio căn theo token `--pf-*` trên `.portfolio-document` (`portfolio-screen.css`). Hãy dùng chúng; không thêm padding riêng cho từng layout trùng với chúng.

| Token | Giá trị | Ý nghĩa |
|---|---|---|
| `--pf-margin-x` | 11 mm | Margin ngang ngoài của nội dung, header và footer |
| `--pf-header` / `--pf-footer` | 15 mm / 12 mm | Dải chrome. Được phản chiếu bởi `PORTFOLIO_PAGE_MM` trong `safeArea.ts`; test khóa cả hai cùng nhau |
| `--pf-body-height` | 183 mm | Chiều cao khung nội dung giữa hai dải |
| `--pf-content-top` | 8 mm | Khoảng cách từ dải header đến kicker đầu tiên |
| `--pf-top` | 23 mm | Dòng đầu trên layout full-bleed (= header + content-top), để kicker không bao giờ nhảy giữa các trang |
| `--pf-bottom` | 18 mm | Mép nội dung thấp nhất trên layout full-bleed (footer + 6 mm) |
| `--pf-kicker-gap` | 5 mm | Khoảng cách kicker → tiêu đề |
| `--pf-title-size` | 30 pt (`6xl`) | Tiêu đề trang (index, project, automation, credentials) |
| `--pf-title-rail-size` | 24 pt (`5xl`) | Tiêu đề bên trong rail màu hoặc cột hẹp |
| `--pf-statement-size` | 24 pt (`5xl`) | Tiêu đề statement Profile |
| `--pf-caption-size` | 7 pt (`2xs`) | Caption hình |

- Kicker: `--document-type-xs` (8 pt), black, `--document-tracking-caps`, viết hoa, `--document-primary`. Body: `--document-type-md` (10 pt).
- Mọi trang có chrome là một block với `padding: var(--pf-header) var(--pf-margin-x) var(--pf-footer)`, và nội dung bắt đầu bằng `padding-top: var(--pf-content-top)`.
- **Layout full-bleed** (rail màu hoặc ảnh sát mép: Profile Classic và Capability, Index Editorial, Project Classic, Editorial và Technical) hủy frame bằng margin âm và `height: 210mm`. Mỗi cột dùng `padding: var(--pf-top) var(--pf-margin-x) var(--pf-bottom)`. Các quy tắc này có tiền tố `.portfolio-page` vì nếu không, chiều cao family chung và reset danh sách sẽ ghi đè chúng.

### 8.2 Chrome trang

- `page()` trong `renderPortfolioV2.ts` vẽ chrome. Header hiển thị tên người và **section label** từ `copy` (Professional profile, Project index, Selected work, Selected BIM automation, Education & credentials, Let's connect). Nó không bao giờ hiển thị id layout. Footer hiển thị **Footer text** đã bản địa hóa (`content.footerText`, Content › Portfolio cover) và `NN / TT`.
- Trang cover và closing toàn màu không có header hoặc footer, chỉ có `.portfolio-page-number`, màu của nó theo nền phía dưới (`--document-on-primary` trên nền màu, `--document-text-muted` trên nền trắng).
- **Chrome không bao giờ nằm trên rail.** Mỗi layout full-bleed khai báo chiều rộng rail một lần bằng `--pf-rail-left` hoặc `--pf-rail-right` trên class trang. Biến đó đặt cả cột grid và inset header/footer, để chrome luôn bắt đầu hoặc kết thúc trên nền trắng và dùng màu text bình thường. Layout rail mới phải khai báo chiều rộng theo cách này.
- Ảnh cần chạy dưới vùng chrome được bọc trong phần tử có `data-pf-bleed`.

### 8.3 Vùng an toàn và overflow

- `findPortfolioLayoutIssues` (`src/portfolio/safeArea.ts`) báo lỗi trang khi nội dung vượt mép trang **hoặc** đi vào dải header/footer (trang không có chrome chỉ dành riêng dải dưới). Bỏ qua phần tử bên trong `[data-pf-bleed]` và chính chrome.
- Preview in liệt kê các lỗi này trong trạng thái sẵn sàng. Preview Portfolio trong Admin thêm chúng vào số đếm "N issues" và kiểm tra Pre-publish mà không chặn Publish (validation nội dung vẫn chặn).
- Vùng có chiều cao cố định vừa theo thiết kế: cột flex với `flex: 1; min-height: 0`, các kích thước có tổng bằng `--pf-body-height`, và line clamp trên text tự do có thể dài ra (bước workflow, tiêu đề visual index). Không che overflow bằng `overflow: hidden` bên trong trang; làm vậy sẽ giấu lỗi khỏi kiểm tra.

### 8.4 Quy tắc nội dung layout

- Layout được khai báo trong `src/portfolio/layouts.ts` dưới dạng `{ id: "<section>.<variant>", label, description, preview }`. Layout mới thêm một option tại đó, hoạt động khi không có ảnh (vị trí media tự động dùng phương án dự phòng), và chỉ yêu cầu media qua crop profile `wide` (21:9), `landscape` (4:3) hoặc `portrait` (3:4).
- **Song ngữ.** Mọi chuỗi hiển thị lấy từ object `copy` trong `renderPortfolioV2.ts` hoặc từ nội dung đã bản địa hóa. Bao gồm caption, label, tên bước, loại Credential và label liên hệ. Test "prints no English chrome in the Vietnamese PDF" liệt kê các chuỗi tiếng Anh đã biết; mở rộng test khi thêm copy.
- **Không lặp thông tin trên một trang.** Không in cùng một số hai lần (badge index cạnh kicker "01 / …"), cùng một headline hai lần (kicker và tiêu đề đều ghi "Thank you"), hoặc cùng một đoạn văn hai lần (solution trong aside rồi lặp lại làm bước workflow).
- **Bỏ giá trị không biết.** Fact không có giá trị (năm, số tool) bị bỏ thay vì in "—". Placeholder chỉ xuất hiện khi toàn bộ vị trí trống (không có ảnh, không chọn Credential).
- **Không bịa nội dung.** Renderer không bao giờ in câu người chỉnh sửa chưa viết: không có "Project details will be updated…", không có địa điểm thay thế, không có bước workflow chung chung ("Project information", "Automated model generation"). Thiếu summary, địa điểm, danh sách trách nhiệm hoặc lợi ích tool thì bỏ block tương ứng; `layouts.test.ts` thất bại nếu chuỗi bịa đặt quay lại.
- **Mọi phần bỏ và cắt đều được báo.** `profileDocumentRecommendations` liệt kê theo từng Project hoặc Tool phần còn thiếu và phần layout cắt (`PORTFOLIO_PROFILE_CARD_GROUPS` 3, `PORTFOLIO_PROFILE_CARD_ITEMS` 4, `portfolioContributionLimit`: Editorial 1, Classic 5, các loại khác 3). Renderer cắt bằng cùng hằng số, nên báo cáo không thể lệch khỏi bản in. Recommendation không bao giờ chặn publish.
- **Label nhóm chỉ in một lần.** Các card contribution dùng chung một kicker "My contribution" phía trên nhóm; card chỉ hiển thị số và text.
- **Kicker Profile.** Mọi layout Profile dùng kicker About có thể chỉnh sửa trong body; không layout nào lặp section label của header ("Professional profile").
- **Caption lấy từ ảnh.** Mọi figure, kể cả ảnh closing White, in caption media và dùng label vị trí đã bản địa hóa làm dự phòng.
- **Các dòng Portfolio có thể chỉnh sửa (tab Content).** Không có nội dung nào người đọc thấy trên trang là copy cố định, trừ section chrome (label header, kicker như "Selected work", label liên hệ):
  - **Cover statement** (`coverStatement`) trên cover Split và Horizontal; độc lập với tiêu đề About.
  - **Cover highlight** (`coverHighlight`: kicker + tối đa 3 dòng) cạnh ảnh trên cover Horizontal; nếu trống thì không in aside.
  - **Footer text** (`footerText`) trên mọi trang có chrome; độc lập với kicker cover.
  - **Automation statement** (`automationStatement`): một dòng của mọi layout Automation (tiêu đề trang Classic, subtitle Workflow và Input → Geometry).
  - Draft được lưu trước khi một trường tồn tại sẽ được chuẩn hóa theo nội dung nó từng in (statement = tiêu đề About, footer = kicker cover, highlight = các dòng cố định trước đây), nên thêm trường không bao giờ làm thay đổi PDF.
- **Trang Profile (tab Background).** Card Capability in các skill group đã chọn theo thứ tự Professional Profile, tối đa `PORTFOLIO_PROFILE_CARD_GROUPS`; nếu không chọn thì dùng các nhóm đầu tiên (được báo là một phần cắt). Profile Portrait in hai figure đã chọn (Selected projects, Automation tools, Capabilities, Credentials); figure có giá trị 0 bị bỏ. `portfolioCapabilityGroups` được renderer và kiểm tra Pre-publish dùng chung.
- **Fact Project.** Key fact của Project (Project › Content, tối đa 3, value + label bằng EN và VI) là fact Portfolio của Project đó; nếu không có, trang in năm và số tool được suy ra. Fact nằm trong grid có wrap (`minmax(28mm, 1fr)`): hai fact mỗi hàng trong rail, summary luôn nằm dưới chúng với toàn bộ chiều rộng và clamp 4 dòng.
- **Trách nhiệm được chọn theo từng Portfolio.** `portfolioProjectResponsibilities` trả về các trách nhiệm được chọn trong Projects & tools (theo thứ tự Project), hoặc tất cả nếu chưa từng chọn; layout in `portfolioContributionLimit` mục đầu. Renderer và kiểm tra Pre-publish dùng chung hàm này.
- **Project story là tùy chọn chủ động.** Khi Appearance › Project pages được đặt thành *Challenge · Approach · Outcome*, Technical và Editorial in `.portfolio-project-story` (từng phần được clamp, bỏ phần trống) thay cho summary; Project không có cả ba phần vẫn giữ summary. Mặc định là *Summary*, nên bật tính năng không bao giờ âm thầm viết lại PDF hiện có sau lưng người chỉnh sửa.
- **Bước Workflow thuộc về chính Tool.** Layout Workflow in các bước Workflow của Tool (tối đa 3), sau đó in lợi ích làm Outcome (`li.is-outcome`, bước được làm nổi bật duy nhất), trong grid hai cột; bước đứng một mình trên hàng sẽ trải rộng cả hàng. Nếu không có bước và lợi ích thì bỏ block.
- **Một feature image.** Cover Split và Horizontal cùng closing White dùng `resolvePortfolioFeatureImage`: Project và ảnh được chọn trong Appearance › Portfolio media › Cover & closing, nếu không thì dùng hình Primary của Project được chọn đầu tiên. Project đã chọn nhưng không còn nằm trong lựa chọn cũng dùng phương án dự phòng tương tự.
- **Crop in đúng tỉ lệ (hợp đồng tỉ lệ crop).** Vị trí người chỉnh sửa đặt trong Adjust crops chính xác là nội dung được in trong mọi layout, để frame không bao giờ crop lại ảnh:
  - `imageMarkup` đặt `data-crop-profile` (wide, landscape, portrait) trên frame và placeholder của nó, và một quy tắc cho mỗi profile đặt tỉ lệ đó (`--pf-crop-ratio`: 21 / 9, 4 / 3, 3 / 4). Layout chỉ đặt kích thước **một cạnh** (thường là `width: 100%` của cột); cạnh còn lại theo tỉ lệ. Không bao giờ đặt chiều cao cố định bằng mm cho frame: `layouts.test.ts` sẽ thất bại.
  - Khi trang cần box cố định, grid được suy ra từ tỉ lệ: rail của Classic là `210mm × 3 / 4` (Portrait toàn chiều cao), cột của Portrait là `151mm × 3 / 4` cộng padding, Wide và Landscape của Evidence dùng chung chiều cao với cột `7fr 4fr`, cột ảnh của cover horizontal là `61mm × 21 / 9`, và mọi vị trí tài liệu Credential là Landscape (`aspect-ratio: 4 / 3`; Dual trải toàn chiều rộng card, Bands là cột `72mm`).
  - Profile mà mỗi layout in lấy từ `mediaSlots.ts` (cùng bảng Admin dùng để yêu cầu crop); `layouts.test.ts` đối chiếu renderer với bảng đó. Index (Visual) in thumbnail Wide; Input + Geometry in input và output cạnh nhau, cả hai là Landscape.
  - Thay đổi layout được kiểm tra bằng cách render mọi layout và so tỉ lệ đo được của mỗi frame với profile tương ứng (phải khớp trong sai số làm tròn), cùng với `findPortfolioLayoutIssues`.
  - Visual Workflow không có block workflow được căn giữa với aside toàn chiều cao thay vì bị kéo giãn.
- **Nội dung thưa được kéo giãn.** Grid có số mục thay đổi (automation tool, contribution bằng chứng, card capability Profile) đặt `--pf-columns` qua `columnsStyle(count, max)` thay vì để trống nửa trang.
- **Các hàng bằng nhau thẳng hàng.** Card trong cùng một hàng dành cùng chiều cao tiêu đề (hai dòng trong visual index) để các dòng meta và frame bắt đầu cùng độ cao. Hai card Credential Dual **dùng chung các hàng của lưới cha** (`grid-template-rows: subgrid` với ba hàng tiêu đề / frame / meta, [UI-08](92-ui-rules.md#ui-08)), nên tiêu đề dài ba dòng chỉ làm cả hàng tiêu đề cao thêm và hai frame vẫn thẳng nhau; không dùng `min-height` đoán trước chiều cao tiêu đề. Cần Chrome từ 117 (Chrome là bộ in PDF của dự án).
- **Một component tag.** Mọi danh sách công nghệ và skill dùng `<ul class="portfolio-tags">` qua `tagList()`. Không restyle `li` bên trong container khác; giới hạn style danh sách vào class riêng (ví dụ `.portfolio-workflow-steps`).
- **Tiêu đề Credential** dùng `.portfolio-credential__title` (15 pt) trong mọi layout Credential. Loại Credential được in qua `copy.credentialKinds`, không bao giờ dùng giá trị cơ sở dữ liệu.
- Family trang có thể dài hơn một trang phải phân trang thay vì cắt ngắn. Credential hiển thị `PORTFOLIO_CREDENTIALS_PER_PAGE` (2) mục mỗi trang trong mọi layout Credential. Mỗi Credential resolve layout bằng `resolveCredentialLayout` (override riêng, nếu không thì mặc định Credentials); các mục liền nhau theo thứ tự Profile dùng chung layout sẽ cùng lấp đầy một trang, còn layout khác bắt đầu trang mới. `portfolioCredentialPages` trả về `{ layout, credentials, firstIndex }` và điều khiển cả renderer lẫn `portfolioPageCount`. Đánh số tiếp tục qua các trang (cả qua các layout), kicker thêm `· n / total` khi có nhiều hơn một trang, và placeholder chỉ xuất hiện khi không chọn gì. Không bao giờ `slice` một lựa chọn mà không báo cho người chỉnh sửa.
- **Bằng chứng Credential chỉ in khi được cho hiển thị.** Credential chỉ in bằng chứng khi một file ảnh được bật "Show in Portfolio" trong Profile › Credentials và có ít nhất một crop đã lưu. **Layout quyết định dùng crop nào** (ADR-026, từ GD3-03): mỗi layout Credential khai báo hướng khung của nó (`credentialsLayoutDocumentProfile` trong `layouts.ts`; hiện Dual và Bands đều là Landscape) và in crop đúng hướng đó; thiếu thì in crop còn lại trong khung ấy và recommendation pre-publish nói rõ ("prints its Portrait crop in a Landscape frame"). Không có lựa chọn "Print as". Snapshot mang tối đa một crop mỗi hướng (`CredentialSnapshot.previews`); trường `preview` của Release đã publish trước đó vẫn được đọc. **Vị trí tài liệu là một tờ giấy đặt trên nền trắng** ([UI-11](92-ui-rules.md#ui-11), kiểu B, ADR-025). `.portfolio-document-frame` có đúng hình dạng của crop Landscape, 4:3 (Dual: toàn chiều rộng card, 120.5 × 90.4 mm; Bands: 72 × 54 mm) và là một **tấm nền** (`.portfolio-document-slot`): `padding: 3mm`, nền `--document-surface`, viền `.3mm` `--document-border`, bo `1mm`. Crop nằm trong phần đệm ở **đúng tỉ lệ của nó** (`.portfolio-document-preview`, viền `.3mm`, không bo), không bao giờ bị crop lại và không có dải trống bên trong ảnh. Crop Landscape lấp đầy phần ruột của tấm nền; crop Portrait (3:4, khi layout không có crop Landscape) cao hết phần ruột và được căn giữa, hai bên là nền trắng, để card bên cạnh giữ cùng chiều cao frame và một dòng caption. Phép đo bắt buộc: tỉ lệ đo được của `.portfolio-document-preview` khớp profile (±1 %); `node tools/portfolio-credentials-check.mjs` đo cả hai layout, EN và VI, kể cả tiêu đề ba dòng. Bands luôn in tài liệu bên trái để cả hai cột text bắt đầu cùng dòng. Nếu không, frame giữ placeholder đã bản địa hóa và recommendation pre-publish nêu tên Credential. PDF và bản gốc riêng tư không bao giờ được in.
- Số trang, kicker và đường kẻ dùng `--document-primary` / `--document-text-muted`; không đưa thêm màu accent.
- **Mọi ảnh Portfolio đều đi qua `imageMarkup`.** Hàm render `<span class="portfolio-media {sizing class}"><img></span>`; layout đặt kích thước frame (`figure > .portfolio-media`, `.portfolio-cover__image`, …), không bao giờ đặt trực tiếp cho `img`, và quy tắc style `span` riêng của layout phải loại trừ `.portfolio-media`.
- **Một overlay ảnh cho mọi layout.** "Image treatment" (Admin › Appearance) nhuộm mọi ảnh Project, Tool, cover, index và closing bằng `--document-primary` ở `--portfolio-image-overlay-opacity`, qua một quy tắc `.portfolio-media::after`. Màu nhuộm chỉ phủ ảnh: không bao giờ phủ caption, placeholder, chrome trang, ảnh Profile (chân dung một người không bao giờ bị nhuộm nên không render qua `imageMarkup`) hoặc preview Credential (`data-portfolio-credential-preview`: tài liệu phải giữ khả năng đọc). `DEFAULT_IMAGE_OVERLAY_OPACITY` (10 %) là giá trị seed, fallback CSS và giá trị "Reset to" trong Admin. `layouts.test.ts` thất bại nếu layout render ảnh không có frame hoặc quy tắc overlay biến mất.
- **Link video của Project và Tool** (ADR-029, [W-08](93-workflow-friction.md), GD3-07). Dữ liệu là `youtubeUrl` của Project / Tool (đã chuẩn hóa `https://www.youtube.com/watch?v=…`). Chỉ in khi **có**; không có thì **không in gì** (không chỗ trống, không "—"). Một thành phần dùng chung cho cả 12 layout (3 index, 6 trang dự án, 3 Automation), không có bản sao theo layout:
  - **Hình dạng:** `.portfolio-video-link`, nút bo tròn (`border-radius: 3mm`, cùng họ với `.portfolio-tags` nhưng **đặc**, không viền nhạt, để không bị nhầm với nhãn công nghệ) gồm biểu tượng ▶ (SVG nội tuyến, `fill: currentColor`) và chữ `copy.video` ("Video" ở cả EN và VI, qua `copy`); nền `--document-primary`, chữ `--document-on-primary`, cỡ `--document-type-2xs`, đậm. Trên nền `--document-primary` (cột xanh của Technical, Editorial và index Editorial) **đảo màu**: nền `--document-on-primary`, chữ `--document-primary-strong`. Không `opacity`, không dùng accent làm màu chữ; độ tương phản ≥ 4,5:1.
  - **Nội dung liên kết:** `href` là `youtubeUrl`, `target="_blank" rel="noopener noreferrer"`, `aria-label` và `title` là `copy.watchVideo(tên)` ("Watch video: …" / "Xem video: …"). **Không in địa chỉ** (dài, trùng thông tin). Giá trị không phải URL YouTube hợp lệ thì coi như không có.
  - **Vị trí theo họ trang:** *Index* — lưới ảnh: nút nằm **trên ảnh, góc phải trên** (`position: absolute`, cạnh số thứ tự; người vận hành chốt 2026-11-15 vì đặt ở dòng meta làm hẹp cột chữ và trang 9 dự án lấn footer ở bản VI); hai kiểu danh sách: cuối hàng, cột thứ ba `auto`, căn giữa theo chiều dọc. *Trang dự án* — ngay sau dòng vai trò trong `projectHeading`, **cùng hàng** (`strong` là inline) nên không thêm chiều cao; dự án không có vai trò thì nằm dưới tiêu đề (`margin-top: 3mm`). Một thay đổi ở `projectHeading` phủ cả 6 layout. *Automation* — dưới dòng mô tả của `heading()`; Automation Classic: cuối thẻ tool.
  - **Nút không bao giờ giãn:** `width: fit-content` / `justify-self: start` / `align-self: flex-start` ở nơi cha là flex hoặc grid (demo Automation Classic đã bị kéo thành thanh dài).
  - **CSS:** `.portfolio-page a { color: inherit }` có độ ưu tiên cao hơn một class, nên mọi quy tắc của nút bắt đầu bằng `.portfolio-page` ([coding-conventions §3](coding-conventions.md)); không dùng `!important`.
  - **Kiểm:** mọi layout phải qua `findPortfolioLayoutIssues`, EN và VI, kể cả tên dự án dài (nút không làm tràn; Balanced và Portrait đã tràn từ ~100 ký tự dù không có nút: giới hạn sẵn có); link **sống sót trong PDF in từ Chrome** (đếm `/URI` trong `page.pdf()` bằng số link); `node tools/portfolio-video-link-check.mjs` đo toàn bộ.

- **Chi tiết trình bày Portfolio** (ADR-031, W-12 … W-21; GD3-10 và GD3-11; kiểm bằng `node tools/portfolio-detail-check.mjs`):
  - **Chỉ số dự án (key facts):** giá trị tách theo khoảng trắng; **token có chữ số in lớn** (cỡ hiện tại của chỉ số), **token còn lại in nhỏ** (`--document-type-xl`, đậm), cùng một hàng, cùng đường cơ sở, `white-space: nowrap`; nhãn bên dưới vẫn được xuống dòng. Giá trị chỉ có một token hoặc không có chữ số thì in như cũ. Giá trị dài (từ 14 ký tự) chiếm cả hàng của lưới chỉ số. Không bao giờ có chỉ số xuống dòng hay tràn ngang ở Technical, Balanced, Editorial (EN và VI).
  - **Nút Video cạnh dòng vai trò:** tâm nút lệch ≤ 0,5 px so với tâm chữ vai trò (căn theo đường cơ sở và bù, không `vertical-align: middle`).
  - **Số 01 / 02 / 03 của phần đóng góp:** căn tâm số với tâm **dòng đầu** của đoạn chữ (số dùng `line-height: 1` và bù theo `--document-leading-relaxed`), lệch ≤ 0,5 px; áp dụng cho mọi layout có `.portfolio-contributions`.
  - **Ảnh trang Automation:** mọi ảnh (Workflow và Input / Geometry) nằm trong khung `--document-surface` (trắng), viền `.25mm solid var(--document-border)`, đệm 4 mm; hợp đồng tỉ lệ crop giữ nguyên (đệm nằm ngoài ảnh).
  - **Dòng meta của index lưới ảnh:** luôn hai khối: **địa điểm** (muted) rồi **vai trò** (`--document-text`, đậm); thiếu một trong hai thì chỉ in khối còn lại. Các index kiểu danh sách giữ "địa điểm · vai trò" một dòng.
  - **Thẻ công nghệ ở Balanced:** ngay dưới danh sách đóng góp (cách ≤ 12 mm), không neo ở đáy cột.

## 9. Checklist trước khi hoàn tất thay đổi Website hoặc tài liệu

1. `npm run verify:admin` đạt.
2. Website: đã kiểm tra bằng EN và `?lang=vi`, ở desktop, ~900 px và ≤650 px, chỉ dùng bàn phím.
3. Website: không có scroll ngang ở 360 px; ảnh có alt text; link giữ tham số ngôn ngữ.
4. Tài liệu: không trang nào hiển thị trạng thái overflow với nội dung dài thực tế; Print preview trong Chrome hiển thị đúng số trang, không có trang trắng ở cuối.
5. Tài liệu: đã kiểm tra với ít nhất hai preset theme (một primary sáng, một primary tối) để text dễ đọc.
6. Preview nhúng trong Admin của trang đã thay đổi vẫn đồng bộ và zoom Fit vẫn hoạt động.
7. Portfolio: mọi layout của family đã thay đổi được kiểm tra bằng EN và VI với nội dung dài thực tế. Trạng thái in và số đếm "issues" trong Admin không báo lỗi layout, không có gì chạm header hoặc footer.
8. Portfolio: kicker và tiêu đề bắt đầu cùng độ cao như trên trang bên cạnh, header/footer bắt đầu trên nền trắng ở layout rail.
9. Portfolio: khi bật overlay, mọi ảnh trong layout đã thay đổi được nhuộm còn caption, placeholder và ảnh Profile thì không; vị trí ảnh không đổi khi tắt overlay.
10. Tài liệu: kiểu chữ chỉ dùng token `document-typography.css` (§8.0); CV hai trang, Cover Letter một trang, không có lỗi layout Portfolio, bằng EN và VI.
