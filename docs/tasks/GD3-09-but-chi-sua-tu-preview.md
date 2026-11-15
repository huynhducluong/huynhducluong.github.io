# GD3-09 — Bút chì "sửa ở đâu" trên preview Portfolio (nhóm N4a)

> **Trạng thái:** GIAO CODE · **Nhánh:** `gd3/09-but-chi-sua-tu-preview` (`git fetch; git switch -c gd3/09-but-chi-sua-tu-preview origin/main`) · **Ngày giao:** 2026-11-15 · **Cỡ:** Vừa (~6 file) · **Người đang code:** Claude — cửa sổ code (hoặc Codex nếu còn token)
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

- Đã xong bước:
- Người code: · đã dùng trước / sau:
- Nhánh, commit cuối:
- File đã đổi (ghi rõ file dùng chung):
- `verify:admin`: số test đạt / tổng; bundle JS / CSS:
- Số đo (bút chì ở zoom Fit / 100 %, ô không bị header che ở 3 màn hình):
- Cách kiểm trang công khai và PDF không đổi:
- Chỗ làm khác đề bài và lý do:
- Câu hỏi:

## 6. Review của Claude

- Ngày, commit đã review:
- **Phải sửa:**
- **Nên sửa:**
- **Cần người vận hành chốt:**
- Kết luận:
