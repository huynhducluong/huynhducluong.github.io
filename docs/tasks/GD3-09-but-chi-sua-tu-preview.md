# GD3-09 — Bút chì "sửa ở đâu" trên preview Portfolio (nhóm N4a)

> **Trạng thái:** CẦN SỬA (review 1) · **Nhánh:** `gd3/09-but-chi-sua-tu-preview` (`git fetch; git switch -c gd3/09-but-chi-sua-tu-preview origin/main`) · **Ngày giao:** 2026-11-15 · **Cỡ:** Vừa (~6 file) · **Người đang code:** Claude — cửa sổ code (hoặc Codex nếu còn token)
> **Gộp (ADR-018):** tự gộp được nếu review sạch **và** test chứng minh trang công khai, bản in và PDF không đổi (bút chì chỉ có trong preview nhúng của Admin).

## 1. Mục tiêu

W-06 (Sổ #6), ADR-030: người vận hành không biết chữ trên Portfolio nhập ở ô nào. Thêm **công tắc "Edit markers"** trên thanh preview Portfolio của Admin; khi bật, các khối **chữ lấy từ form Portfolio** hiện nút bút chì; bấm → Admin chuyển sang tab Content, cuộn tới đúng ô, focus và làm sáng ô.

**Chỉ** chữ thuộc form Portfolio. Tên người, email, dự án, tool, tag, ảnh, số đếm, credential **không** có bút chì (người vận hành chốt 2026-11-15: các phần đó đã liên kết rõ, thêm bút chì sẽ rối).

## 2. Căn cứ (đọc đúng các đoạn này)

- ADR-030; `docs/admin-ui-guidelines.md` §7.2 (đặc tả đầy đủ, **là yêu cầu của đề bài**) và §10 (accessibility); UI-05 (không `scrollIntoView`, dùng `revealAdminElement`); `docs/coding-conventions.md` §3 (độ ưu tiên CSS), §4 (escape).
- Code: `src/portfolio/main.ts` (bộ nhận preview: nhánh `embeddedPreview`, `previewReceiver.activate(...)`; tin `hdl:portfolio-appearance-preview` là mẫu cho tin mới); `src/portfolio/renderPortfolioV2.ts` (bìa ~140–152, trang giới thiệu ~155–178, Automation ~226–232, trang kết ~275–281, chân trang ~97–108 và ~291, hàm xuất `renderPortfolio` ~284); `src/admin/profileDocumentWorkspace.ts` (thanh công cụ ~1207–1208 có công tắc ngôn ngữ và điều khiển zoom; tab `[data-document-tab]` ~1793; mẫu gửi tin cho iframe ~1562; ngôn ngữ preview `state.previewLanguage[kind]`; ô form dựng bởi `localizedFields` ~156 với `name="<tên>_en"` / `<tên>_vi`); `src/admin/previewZoom.ts` (đặt `--preview-scale` trên khung ngoài iframe, dòng ~89); `src/shared/previewProtocol.ts` (giao thức preview, **không đổi**).
- **Bảng khối → ô** (tất cả ở tab Content; ô có hậu tố `_en` / `_vi` trừ khi ghi khác):

| Trang | Khối trong preview | Tên ô |
|---|---|---|
| Bìa | kicker | `portfolio_kicker` |
| Bìa | tiêu đề tài liệu (`h1`) | `portfolio_title` (một ô, không có `_en` / `_vi`) |
| Bìa | tagline (`coverStatement`) | `portfolio_cover_statement` |
| Bìa | khối highlight (kicker và các dòng) | `portfolio_highlight_kicker`, `portfolio_highlight_lines` |
| Giới thiệu | kicker, heading | `about_kicker`, `about_heading` |
| Giới thiệu và Bìa | chức danh nghề nghiệp | `portfolio_profile_title` |
| Giới thiệu | tóm tắt | `portfolio_summary` |
| Automation | câu mô tả (`automationStatement`) | `automation_statement` |
| Trang kết | kicker, heading, nội dung | `closing_kicker`, `closing_heading`, `closing_text` |
| Mọi trang | chân trang | `portfolio_footer_text` |

## 3. Phạm vi

**Làm:**

1. **Đánh dấu khối ở renderer, chỉ trong preview nhúng.** `renderPortfolio(data, language, options?)` nhận tùy chọn `{ editMarkers?: boolean }` (mặc định tắt). Khi bật, mỗi khối ở bảng trên được gắn `data-edit-field="<tên ô không hậu tố>"` trên **phần tử có sẵn** (không thêm phần tử bọc, không đổi cấu trúc). Khi tắt, markup **giống hệt từng byte** so với hôm nay. Chỉ `src/portfolio/main.ts` ở nhánh `embeddedPreview` bật tùy chọn này; trang công khai, `?mode=print` và PDF không bao giờ bật.
2. **Chỉ lần xuất hiện đầu tiên** của khối lặp: chân trang và câu Automation hiện bút chì ở trang đầu tiên có chúng, không phải mọi trang (ADR-030).
3. **Tin nhắn mới** `hdl:portfolio-edit-mode` (Admin → preview: `{ enabled, scale }`) và `hdl:portfolio-edit-target` (preview → Admin: `{ field }`); kiểm `event.origin`, `event.source` và dạng dữ liệu hai chiều như tin `hdl:portfolio-appearance-preview`; chuỗi `field` ngoài bảng trên bị bỏ qua. Không đổi `src/shared/previewProtocol.ts`.
4. **Bút chì trong preview** (DOM do `main.ts` của Portfolio dựng khi bật, gỡ khi tắt): một `<button type="button">` cho mỗi khối có `data-edit-field`, `position: absolute` ở góc khối, **không chiếm chỗ trong layout** và không tính vào `findPortfolioLayoutIssues` (loại bút chì khỏi phép đo); `aria-label` và `title` "Edit <nhãn khối>" (EN, nhãn theo bảng ở mục 2), dùng được bằng bàn phím, `:focus-visible` thấy rõ; cỡ bấm được **không phụ thuộc zoom** (nhận `scale` từ Admin, đặt biến CSS để bút chì luôn ≈ 22 px trên màn hình); chỉ token `--admin-*` / `--color-*` (bút chì là chrome của Admin chứ không phải tài liệu); viền mờ quanh khối khi rê chuột / focus; mọi hiệu ứng ≤ 150 ms và tắt khi `prefers-reduced-motion`; `@media print { display: none }` làm lưới an toàn.
5. **Công tắc trên thanh preview Portfolio** (chỉ Portfolio, không CV, không Website): nút `aria-pressed`, nhãn "Edit markers", mặc định **tắt**; nhớ lựa chọn bằng `localStorage` (bọc `try/catch`, trang vẫn đúng khi không dùng được). Gửi `hdl:portfolio-edit-mode` khi bật / tắt, khi zoom đổi, và khi preview vẽ lại (iframe tải xong hoặc `hdl:preview-rendered`) để bút chì không biến mất sau mỗi lần cập nhật.
6. **Nhảy tới ô:** nhận `hdl:portfolio-edit-target` → chuyển sang tab Content (đúng đường của `[data-document-tab]`, cập nhật route), tìm ô `name="<field>_<ngôn ngữ preview>"` (ô không hậu tố thì đúng tên), đưa vào tầm nhìn bằng `revealAdminElement` (không `scrollIntoView`; **không để thanh header dính che ô**, xem MASTER_PLAN #12, đo ở ba màn hình), `focus({ preventScroll: true })`, làm sáng ô ~1,2 giây (tắt khi `prefers-reduced-motion`). Mở cả `<details>` / thẻ thu gọn chứa ô nếu có. Tài liệu `archived` (form chỉ đọc) vẫn chuyển tab và focus được.
7. **Test:** (a) markup khi tắt `editMarkers` **giống hệt** một snapshot trước / sau cho đủ ba kiểu bìa, ba kiểu giới thiệu, Automation, trang kết, chân trang (E-002: có khẳng định dương); (b) bật thì có `data-edit-field` đúng bảng, và chỉ ở lần đầu cho chân trang và câu Automation; (c) hàm thuần ánh xạ `field` + ngôn ngữ → tên ô (EN, VI, ô không hậu tố, `field` lạ bị bỏ); (d) test CSS có khẳng định dương: có `@media print` ẩn bút chì, có `prefers-reduced-motion`.

**Không làm:** bút chì cho Project, Tool, Profile, Credential, tên, email, ảnh, số đếm; chọn layout từng trang (tab Appearance); CV, Cover Letter, Website; `?mode=print` và trang công khai; đổi giao thức `previewProtocol`; migration; dependency mới.

**Ràng buộc dùng chung:** lưới trang `--pf-*`, vùng an toàn, kích thước trang in, `findPortfolioLayoutIssues` không đổi kết quả khi bút chì bật; ngân sách bundle (JS 115 kB, CSS 27,0 kB gzip). Liệt kê ở mục 5 mọi file dùng chung đã đổi (`renderPortfolioV2.ts`, `src/portfolio/main.ts`, `profileDocumentWorkspace.ts`).

## 3b. Các bước (mỗi bước: test liên quan + commit `wip(GD3-09 bước k): …`)

1. Tùy chọn `editMarkers` ở renderer + hàm ánh xạ ô + test (a)(b)(c).
2. Tin nhắn hai chiều + bút chì trong preview + CSS + test (d).
3. Công tắc trên thanh preview + nhảy tới ô (tab, `revealAdminElement`, làm sáng).
4. `verify:admin` một lần; kiểm thủ công ở Admin thật (EN và VI, ba màn hình), điền mục 5.

## 4. Tiêu chí nghiệm thu

- [ ] Công tắc "Edit markers" mặc định tắt; bật thì bút chì hiện ở các khối trong bảng và **không** ở khối nào khác; tắt thì preview giống hệt trước đây.
- [ ] Markup `renderPortfolio` khi **không** bật `editMarkers` giống hệt trước khi sửa (test snapshot); `?mode=print` và trang công khai không có `data-edit-field`, không có bút chì.
- [ ] Bấm bút chì ở bìa (tagline) mở tab Content, ô đúng ngôn ngữ đang xem (preview VI → ô VI), được focus và làm sáng; ô **không bị header dính che** ở 1024, 1440 × 731 và 1920 px.
- [ ] Bút chì ≈ 22 px trên màn hình ở zoom Fit và các mức zoom khác; không đổi chiều cao hay vị trí của chữ trong trang; `findPortfolioLayoutIssues` cho cùng kết quả bật / tắt.
- [ ] Chân trang và câu Automation chỉ có bút chì ở lần đầu; bút chì còn sau khi gõ trong form (preview vẽ lại).
- [ ] Bàn phím: Tab tới bút chì, Enter / Space mở ô; `aria-label` đúng; công tắc có `aria-pressed`.
- [ ] `npm run verify:admin` đạt một lần ở cuối (chạy từ `D:\…`, E-006); bundle trong ngân sách.

## 5. Báo cáo của người code

- Đã xong bước: 1, 2, 3 (code + test). **Bước 4 làm dở:** `verify:admin` đạt; **kiểm thủ công ở Admin thật chưa làm được** (xem "Câu hỏi").
- Người code: Claude — cửa sổ code · đã dùng trước / sau: chưa ghi (không đọc được số token trong phiên)
- Nhánh, commit cuối: `gd3/09-but-chi-sua-tu-preview`, commit cuối là `wip(GD3-09 bước 3)` (bước 4 chỉ thêm báo cáo này)
- File đã đổi (**dùng chung** in đậm):
  - **`src/portfolio/renderPortfolioV2.ts`** (tùy chọn `editMarkers`, hàm `mark`; hàm xuất `renderPortfolio` thêm đối số thứ ba, mặc định tắt)
  - **`src/portfolio/main.ts`** (chỉ nhánh `embeddedPreview` bật marker; nhận tin `hdl:portfolio-edit-mode`)
  - **`src/admin/profileDocumentWorkspace.ts`** (công tắc, gửi tin, nhận `hdl:portfolio-edit-target`, tách `selectDocumentTab` khỏi bộ nghe click tab)
  - **`src/admin/ui.ts`** (chỉ `export` hàm `scrollParent` có sẵn để tính đúng vùng bị header dính che)
  - **`src/styles/admin-documents.css`** (thêm `label.is-edit-target`)
  - Mới: `src/portfolio/editMarkers.ts`, `editMarkerLayer.ts`, `src/styles/portfolio-edit-markers.css`, `src/admin/portfolioEditTarget.ts`; test: `src/portfolio/editMarkers.test.ts` (+ snapshot), `src/admin/portfolioEditTarget.test.ts`
  - Không đổi `src/shared/previewProtocol.ts`, không migration, không dependency.
- `verify:admin`: 258 / 258 test đạt (41 file); bundle Admin JS 92,8 / 115,0 kB, CSS 26,6 / 27,0 kB gzip (trong ngân sách). CSS bút chì chỉ vào bundle trang Portfolio, không vào CSS Admin ban đầu.
- Số đo (bút chì ở zoom Fit / 100 %, ô không bị header che ở 3 màn hình): **chưa đo.** Phiên đăng nhập `.auth/admin.json` hết hạn (Admin trả form đăng nhập, request làm mới token lỗi 400), nên không mở được Admin thật. Đã viết sẵn kịch bản đo (1024, 1440 × 731, 1920; Fit và zoom; EN và VI; bàn phím; sống sót sau khi gõ) nhưng chưa chạy được. Cần người vận hành chạy `npm run shots:login`.
- Cách kiểm trang công khai và PDF không đổi: test snapshot (`editMarkers.test.ts`) chụp markup `renderPortfolio` của 12 biến thể layout × EN / VI **trên code trước khi sửa**, rồi so từng byte sau khi sửa (24 snapshot). Thêm test: gỡ `data-edit-field` khỏi markup bật thì ra đúng markup tắt. Test nguồn `main.ts`: chỉ `embeddedPreview` có thể bật marker, tin nhắn kiểm origin / source / dạng dữ liệu.
- Chỗ làm khác đề bài và lý do:
  - Pencil nằm trong một lớp `.portfolio-edit-layer` riêng đặt cuối `.portfolio-preview-shell` (không nằm trong trang), vì nằm trong trang có thể làm `page.scrollWidth/scrollHeight` đổi và vào phép đo `findPortfolioLayoutIssues`. Vị trí tính bằng `getBoundingClientRect`, cập nhật khi font, ảnh, thay đổi kích thước.
  - Nút làm sáng ô: giữ 1,2 giây bằng class tĩnh (không animation), nên không cần nhánh riêng cho `prefers-reduced-motion`.
  - Ô của tài liệu `archived` bị `disabled` nên không focus được; thay vào đó focus vào `label` của ô (`tabindex=-1`). Chưa kiểm trên trình duyệt.
  - `renderPortfolio` dùng trạng thái cấp module (đặt và luôn đặt lại bằng `try/finally`) thay vì truyền tham số qua mọi hàm con, để không đổi chữ ký của ~15 hàm dựng trang; render đồng bộ nên an toàn.
- Câu hỏi:
  - Phiên đăng nhập hết hạn nên chưa kiểm ở Admin thật. **Khuyến nghị:** người vận hành chạy `npm run shots:login`, rồi Claude review đo các mục "Số đo" ở trên trong worktree (Claude review vẫn phải đo ba màn hình theo mục 4). Cách còn lại là cho gộp theo test, nhưng bỏ qua kiểm giao diện; không khuyến nghị vì tiêu chí "ô không bị header che" và "≈ 22 px" chỉ đo được trên trình duyệt.

**Lượt sửa theo mục 6 (Claude — cửa sổ code):**
- Đã sửa **Phải sửa 1 và 2**: `src/portfolio/editMarkerLayer.ts`, hàm `place`. Bút chì neo ở cuối **dòng chữ đầu** của khối (`Range` của nội dung khối), cách 4 px trên màn hình; xếp từ trên xuống, bút chì nào chồng bút chì đã đặt thì dời xuống một bước 22 px + 4 px. Kích thước, khoảng cách và bước đều chia cho zoom nên không đổi trên màn hình. Đổi zoom thì `setEditMarkerScale` báo lớp đặt lại vị trí. Chặn mép phải bằng kích thước bút chì; chưa cần nhánh "sang trái" vì công cụ đo không gặp trường hợp hết chỗ.
- Đã sửa **Nên sửa**: `twoDigits = (value` ở `renderPortfolioV2.ts`.
- `node tools/portfolio-edit-markers-check.mjs`: **All PASS** (24 dòng ở 1024, 1440 × 731, 1920: default-off, size 22,0 px ở Fit / Zoom in / Zoom out, no-overlap và near-text EN và VI, jump 15 / 15, off-clean).
- `verify:admin` chạy lại: 258 / 258 test đạt; Admin JS 92,8 / 115,0 kB, CSS 26,6 / 27,0 kB gzip (không đổi).
- Dev server cổng 5199 đã tắt.

## 6. Review của Claude

- Ngày, commit đã review: 2026-11-15, `74d1316` (worktree `D:\wt\pf-review`, `npm ci` sạch; đã xóa). Người code là cửa sổ Claude code; người review là phiên thiết kế (độc lập). Đo trên Admin thật sau khi người vận hành đăng nhập lại.
- Đã kiểm (không dựa vào báo cáo):
  - `verify:admin`: 41 file / 258 test đạt; Admin JS 92,8 / 115,0, CSS 26,6 / 27,0 kB gzip (không đổi). Đọc diff: chỉ nhánh `embeddedPreview` bật marker; origin / source kiểm hai chiều; lớp bút chì tách khỏi trang; `renderPortfolio` luôn reset trạng thái trong `finally`.
  - **Đo trên Admin thật** (1024, 1440 × 731, 1920; công cụ mới `tools/portfolio-edit-markers-check.mjs`): công tắc mặc định tắt và nhớ sau khi tải lại; **bút chì đúng 22,0 px** ở Fit, Zoom in và Zoom out; **15 bút chì, bấm cả 15 đều nhảy đúng ô** (preview VI → ô `_vi`), nằm dưới thanh tab dính và trong khung nhìn; tắt công tắc thì không còn bút chì hay `data-edit-field`; bút chì còn sau khi gõ trong form; `/portfolio/` công khai và `/portfolio/?preview=1` không có bút chì hay `data-edit-field`. "1 issue" trên thanh preview có sẵn từ trước, không đổi khi bật bút chì.
- **Phải sửa:**
  1. **Bút chì chồng lên nhau** ở 1024 và 1440 (dữ liệu thật): "Edit highlight label" đè "Edit highlight lines", "Edit about kicker" đè "Edit about heading"; bút chì dưới bị che một phần, khó bấm đúng. (Ở 1920 không chồng chỉ vì trang rộng hơn.)
  2. **Bút chì cách xa chữ của nó**: bút chì neo ở góc trên phải của **khối** (khối kéo hết bề ngang cột), nên kicker bìa cách cuối chữ 263 – 625 px (trên màn hình), tiêu đề tài liệu 176 – 387 px, chức danh 262 – 602 px, câu Automation 223 – 568 px: người dùng không biết bút chì nào của chữ nào, trái mục đích W-06.
  - **Cách sửa (đã chốt theo đề bài, xem mục 3.4):** neo bút chì ở **cuối chữ của khối** (`Range` của nội dung khối, mép phải của dòng chữ, dòng đầu nếu nhiều dòng), cách nó một khoảng nhỏ; thêm một lượt tránh chồng (xếp theo từ trên xuống, bút chì nào chồng bút chì đã đặt thì dời xuống dưới một bước 22 px + 4 px, hoặc sang trái nếu hết chỗ). Vẫn `position: absolute` trong lớp riêng. Đo bằng `node tools/portfolio-edit-markers-check.mjs` phải **All PASS** (mốc hiện tại **10 FAIL**: 4 `no-overlap` ở 1024 / 1440 và 6 `near-text`; các dòng `default-off`, `size`, `jump`, `off-clean` đang PASS và phải còn PASS).
- **Nên sửa:** `twoDigits =(value` thiếu dấu cách ở `renderPortfolioV2.ts` (làm cùng lượt sửa).
- **Ghi nhận:** (1) chưa đo tài liệu `archived` (focus vào `label` vì ô bị disabled): không có tài liệu lưu trữ để thử trên dữ liệu thật; mã xử lý hợp lý (đặt `tabindex=-1` rồi focus). (2) Phép thử gõ vào form chỉ gõ rồi xóa, không Save; không ghi gì lên Supabase.
- **Cần người vận hành chốt:** không.
- Token: Claude — cửa sổ code 60 % → 66 % đã dùng (~6 %, Vừa; chưa tính lượt sửa).
- Kết luận: **CẦN SỬA** (2 mục "Phải sửa", cùng một chỗ: vị trí bút chì). Người code sửa trên cùng nhánh rồi báo lại; Claude review lại (chủ yếu chạy lại công cụ đo) và gộp nếu sạch.
