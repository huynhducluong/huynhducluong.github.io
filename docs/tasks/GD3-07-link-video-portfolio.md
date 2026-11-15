# GD3-07 — Link "▶ Video" trong Portfolio (nhóm N6)

> **Trạng thái:** CHỜ DUYỆT · **Nhánh:** `gd3/07-link-video-portfolio` (`git fetch; git switch -c gd3/07-link-video-portfolio origin/main`) · **Ngày giao:** 2026-11-15 · **Cỡ:** Vừa (~6 file) · **Người đang code:** Claude — cửa sổ code (Codex còn ít token)
> **Gộp (ADR-018):** **cần người vận hành duyệt** — đổi giao diện PDF và bản web của Portfolio. Claude review xong thì chuyển `CHỜ DUYỆT`.

## 1. Mục tiêu

Thêm link "▶ Video" vào Portfolio (PDF và bản web) cho Project và Tool có `youtubeUrl`, theo kiểu A và vị trí người vận hành đã chọn từ demo thật (ADR-029, Sổ #10, W-08). Không có video thì không in gì.

## 2. Căn cứ (đã sửa sẵn, đọc đúng đoạn này)

- `docs/ui-guidelines.md` §8.4, gạch "**Link video của Project và Tool**" và các gạch con (hình dạng, nội dung liên kết, vị trí theo họ trang, nút không giãn, CSS, kiểm). Toàn bộ là yêu cầu của đề bài.
- ADR-029; `docs/coding-conventions.md` §3 (độ ưu tiên CSS: `.portfolio-page a { color: inherit }` ở `portfolio-screen.css:53` đè một class đơn; phải có tiền tố `.portfolio-page`, không `!important`) và §4 (escape đúng một lần).
- **Công cụ đo, đã có trên `main`:** `node tools/portfolio-video-link-check.mjs <thư-mục-tạm-ngoài-repo>` (cần `npm run dev -- --port 5199 --strictPort` đang chạy và `.auth/`). Dùng **trình dựng thật** với `youtubeUrl` giả lập trong bộ nhớ (dự án 1, 2, 4, 6 và công cụ). **Mốc trước khi sửa: 97 FAIL** (24 ca `no-issue` đang PASS). Ảnh chụp có thể chứa dữ liệu riêng: lưu ngoài repo, không commit, không dán vào báo cáo (E-008).
- Code: `src/portfolio/renderPortfolioV2.ts` — `copy` (EN / VI), `renderIndex` (~dòng 173: ba kiểu `index.classic`, `index.visual`, `index.editorial`), `projectHeading` (~184: dùng chung cho cả 6 layout dự án), `renderClassicAutomation` (~213) và `renderAutomation` với `heading()` (~214); kiểu dữ liệu `PortfolioProject.youtubeUrl?` và `PortfolioTool.youtubeUrl?` (`src/types/portfolio.ts`); `src/shared/youtube.ts` (`normalizeYouTubeUrl` ném lỗi khi không hợp lệ); CSS `src/styles/portfolio-screen.css` (quanh `.portfolio-tags` dòng ~112, `.portfolio-index*` ~192–221, `.portfolio-project-heading` ~225); `portfolio-print.css` (chỉ kiểm không ghi đè).
- **Kết quả demo đã đo (để khỏi làm lại):** đặt nút ngay sau `<strong>` vai trò trong `projectHeading` là inline nên cùng hàng, không thêm chiều cao và không làm tràn ở layout nào (Balanced và Portrait đã tràn khi tên dự án ≥ 100 ký tự dù không có nút: giới hạn sẵn có, **không sửa ở đề bài này**); Automation Classic phải để nút **co theo chữ**; trên cột xanh đảo màu; link sống sót trong PDF in từ Chrome.

## 3. Phạm vi

**Làm:**

1. **Chuỗi (`copy`):** `video` ("Video" cả EN và VI) và `watchVideo(name)` ("Watch video: …" / "Xem video: …"); mọi chuỗi in ra đi qua `copy`.
2. **Hàm `safeYouTubeUrl(value)`** trong `src/shared/youtube.ts`: trả URL chuẩn hóa hoặc `null`, **không ném lỗi** (bọc `normalizeYouTubeUrl`); test (URL hợp lệ, `youtu.be`, rỗng, chuỗi rác, `javascript:`).
3. **Thành phần `videoLink(url, name, language)`** trong `renderPortfolioV2.ts`: trả `""` nếu `safeYouTubeUrl` là `null`; nếu không trả `<a class="portfolio-video-link" href=… target="_blank" rel="noopener noreferrer" aria-label=… title=…><svg …></svg><span>Video</span></a>`; mọi giá trị động qua `escapeHtml` đúng một lần.
4. **Gắn vào ba họ trang** đúng vị trí ở §8.4: ba kiểu index; `projectHeading` (sau dòng vai trò, cùng hàng; không vai trò thì dưới tiêu đề); `heading()` của Automation Workflow / Input-Geometry và cuối thẻ của Automation Classic. Hàm `projectHeading` cần nhận `youtubeUrl` của dự án.
5. **CSS** trong `portfolio-screen.css`: hình dạng và hai bộ màu (mặc định, và đảo màu trên `.portfolio-index-editorial > aside`, `.portfolio-project--editorial > section`, `.portfolio-project--technical > aside`) chỉ bằng token `--document-*`; mọi quy tắc bắt đầu bằng `.portfolio-page`; nút không giãn ở mọi cha flex / grid; dòng meta của index lưới ảnh thành `flex` `space-between`; hàng danh sách có cột thứ ba `auto` khi có link.
6. **Test** (`layouts.test.ts` và test của hàm): có link khi có URL và **không có** khi không; dự án không video không đổi markup so với hôm nay; escape (tên dự án có `&`, `<`); `href`, `rel`, `aria-label` EN và VI; link xuất hiện ở đủ ba họ trang; test CSS có khẳng định **dương** (E-002): tiền tố `.portfolio-page .portfolio-video-link`, có quy tắc đảo màu cho ba nền xanh, không có `!important` trong khối này.

**Không làm:** Admin (ô nhập YouTube URL ở Project / Tool đã có); trang Website (đã có nút "Watch project video"); công tắc ẩn link trong PDF; in địa chỉ YouTube; sửa Balanced / Portrait cho tên rất dài; đổi layout nào khác; migration; dependency mới.

**Ràng buộc dùng chung không được đổi:** lưới trang `--pf-*`, vùng an toàn, kích thước trang in, hợp đồng tỉ lệ crop (§8.4), overlay ảnh; ngân sách bundle (JS 115 kB, CSS 27,0 kB gzip). Liệt kê ở mục 5 mọi thay đổi ở file dùng chung (`renderPortfolioV2.ts`, `portfolio-screen.css`, `shared/youtube.ts`).

## 3b. Các bước (mỗi bước: test liên quan + commit `wip(GD3-07 bước k): …`)

1. `safeYouTubeUrl` + `copy` + `videoLink` + test.
2. Gắn vào index (3 kiểu), `projectHeading`, Automation (3 kiểu) + test markup.
3. CSS + test CSS.
4. Chạy `tools/portfolio-video-link-check.mjs` (mọi dòng PASS), xem ảnh `index.visual`, `project.technical`, `project.balanced`, `automation.classic`, điền mục 5.

## 4. Tiêu chí nghiệm thu

- [ ] `node tools/portfolio-video-link-check.mjs …` ra **All PASS** (24 ca × 5 phép đo + dòng PDF); dán số PASS / FAIL vào mục 5 (không dán ảnh).
- [ ] Test của mục 3.2 và 3.6 đạt; dự án và công cụ **không có** `youtubeUrl` cho markup giống hệt trước khi sửa (so một snapshot trước / sau trong test).
- [ ] `npm run verify:admin` đạt một lần ở cuối (chạy từ `D:\…`, E-006); bundle trong ngân sách.
- [ ] Xem ảnh: nút đọc rõ trên nền trắng, trên cột xanh (Technical, Editorial, index Editorial) và trong thẻ lưới ảnh; Automation Classic **không** thành thanh dài.
- [ ] `grep` `portfolio-print.css` không ghi đè `.portfolio-video-link`; ghi kết quả ở mục 5.
- [ ] Không chuỗi giao diện Admin mới; mọi chuỗi in ra qua `copy` (EN và VI).

## 5. Báo cáo của người code

- Đã xong bước: 1, 2, 3, 4 (xong cả đề bài)
- Người code: Claude — cửa sổ code · đã dùng trước / sau: không đo
- Nhánh, commit cuối: `gd3/07-link-video-portfolio` (commit cuối xem `git log`)
- File đã đổi (ghi rõ file dùng chung): **dùng chung:** `src/portfolio/renderPortfolioV2.ts` (copy `video` / `watchVideo`, `videoLink`, `indexRow`, `projectHeading`, `heading()` và Automation Classic), `src/styles/portfolio-screen.css` (khối "Video link" cuối file), `src/shared/youtube.ts` (`safeYouTubeUrl`). **Test mới:** `src/shared/youtube.test.ts`, `src/portfolio/videoLink.test.ts`.
- `verify:admin`: 225 / 225 test đạt (38 file); bundle JS 93,1 / 115,0 kB, CSS 26,7 / 27,0 kB gzip
- `tools/portfolio-video-link-check.mjs` (số PASS / FAIL): **121 PASS / 0 FAIL** (24 ca × 5 phép đo + dòng PDF; 9 `/URI` = 9 link)
- `portfolio-print.css` có ghi đè không: không (grep `video-link` = 0 kết quả)
- Chỗ làm khác đề bài và lý do: **Index lưới ảnh (`index.visual`): nút nằm ở góc trên bên phải của ảnh (cạnh số thứ tự), không ở dòng meta như §8.4.** Lý do: đặt nút cạnh dòng meta làm hẹp cột chữ, meta tiếng Việt của dự án 4 thành 3 dòng, hàng 1 cao thêm và trang index (9 dự án) lấn footer (đo được: FAIL `no-issue` VI). Đặt trên ảnh thì không đổi chiều cao hàng nào. Hai kiểu index danh sách và các họ trang khác đúng §8.4. Vì deviate, **cần Claude cập nhật `docs/ui-guidelines.md` §8.4 gạch "Index" nếu người vận hành chọn giữ.**
- Câu hỏi: Giữ nút trên ảnh ở index lưới ảnh (khuyến nghị: giữ, vì là cách duy nhất vừa không đổi chiều cao hàng vừa không làm tràn khi meta dài; cái giá: khác vị trí đã chốt ở demo) hay muốn giữ đúng dòng meta và chấp nhận giảm chỗ ở chỗ khác (cần đề bài riêng)?

## 6. Review của Claude

- Ngày, commit đã review: 2026-11-15, `5f540e0` (worktree `D:wtpf-review`, `npm ci` sạch; đã xóa). Người code là cửa sổ Claude code; người review là phiên thiết kế (độc lập).
- Đã kiểm (không dựa vào báo cáo):
  - `verify:admin`: 38 file / 225 test đạt; Admin JS 93,1 / 115,0, CSS 26,7 / 27,0 kB gzip.
  - `tools/portfolio-video-link-check.mjs` chạy lại: **All PASS, 121 PASS / 0 FAIL** (mốc trước: 97 FAIL), gồm dòng PDF.
  - `portfolio-print.css` không chứa `video-link`. Đọc diff: một thành phần `videoLink` dùng chung, `safeYouTubeUrl` không ném lỗi, escape một lần, mọi quy tắc CSS có tiền tố `.portfolio-page`, không `!important`, chỉ token `--document-*`; không có `youtubeUrl` thì markup không đổi (chỉ `indexRow` thay chuỗi tương đương).
  - Xem ảnh `index.visual` (nút ở góc trên phải ảnh, đọc rõ, không đổi chiều cao hàng) và `project.balanced` (nút cùng hàng với vai trò, không thêm chiều cao). Ảnh dự án vỡ trong lúc đo do tải dữ liệu cục bộ, không liên quan đề bài.
- **Phải sửa:** không.
- **Nên sửa:** không.
- **Cần người vận hành chốt:** vị trí nút ở `index.visual` khác §8.4 (trên ảnh thay vì ở dòng meta). Khuyến nghị: **giữ trên ảnh** (đã đo: đặt ở dòng meta làm trang index 9 dự án lấn footer ở bản VI); nếu chốt, Claude sửa §8.4 gạch "Index".
- Token: Claude — cửa sổ code 43 % → 50 % đã dùng (~7 %, Vừa).
- Kết luận: **CHỜ DUYỆT** — đạt về kỹ thuật nhưng đổi giao diện PDF và web (ADR-018): cần người vận hành chốt vị trí nút rồi duyệt gộp.
