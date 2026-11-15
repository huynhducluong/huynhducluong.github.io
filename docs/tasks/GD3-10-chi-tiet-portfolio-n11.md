# GD3-10 — Chi tiết trình bày Portfolio (nhóm N11)

> **Trạng thái:** GIAO CODE · **Nhánh:** `gd3/10-chi-tiet-portfolio-n11` (`git fetch; git switch -c gd3/10-chi-tiet-portfolio-n11 origin/main`) · **Ngày giao:** 2026-11-15 · **Cỡ:** Vừa (~5 file) · **Người đang code:** Claude — cửa sổ code (hoặc Codex nếu còn token)
> **Gộp (ADR-018):** **cần người vận hành duyệt** — đổi giao diện PDF và bản web của Portfolio. Claude review xong thì chuyển `CHỜ DUYỆT`. **Làm xong rồi mới giao GD3-11** (cùng file `renderPortfolioV2.ts` và `portfolio-screen.css`).

## 1. Mục tiêu

Sáu chi tiết trình bày người vận hành chốt từ demo thật (ADR-031; Sổ #13, #15, #16, #20, #21, #22 = W-12, W-14, W-15, W-16, W-20, W-21). Không đổi nội dung hay dữ liệu.

## 2. Căn cứ (đã sửa sẵn, đọc đúng đoạn này)

- `docs/ui-guidelines.md` §8.4, gạch "**Chi tiết trình bày Portfolio**" và các gạch con (trừ gạch "Chỉ số dự án": thuộc GD3-11). Toàn bộ là yêu cầu của đề bài. ADR-031. `docs/coding-conventions.md` §3 (độ ưu tiên CSS: `.portfolio-page a { color: inherit }`; quy tắc mới có tiền tố `.portfolio-page`, không `!important` mới), §4 (escape đúng một lần).
- **Công cụ đo, đã có trên `main` khi giao:** `node tools/portfolio-detail-check.mjs --section=n11` (cần `npm run dev -- --port 5199 --strictPort` đang chạy và `.auth/`; xem phần đầu file tool). Dùng **trình dựng thật** trên bản nháp Portfolio của người vận hành. **Mốc trước khi sửa:** 28 FAIL ở mục `[N11]` (nút Video 1,97 px ở 12 ca, số đóng góp −2,54 px ở 10 ca, khung ảnh 0 / 3 ở 4 ca, meta 2 ca, thẻ công nghệ cách 42 – 56 mm ở 2 ca); các dòng `no-issue` đang PASS và phải còn PASS. Ảnh chụp có thể chứa dữ liệu riêng: lưu ngoài repo, không commit (E-008).
- Code: `src/portfolio/renderPortfolioV2.ts` (`indexRow`; nhánh `index.visual` của `renderIndex` có `<p>${projectMeta(...)}</p>`; `projectMeta` ~124 dùng chung với index danh sách, **không đổi**); CSS `src/styles/portfolio-screen.css`: `.portfolio-page .portfolio-video-link` (cuối file), `.portfolio-contributions article` (~dòng 247), `.portfolio-tags` (~112), `.portfolio-index-visual p` (~206), `.portfolio-automation__image` (~310), `.portfolio-automation__media-pair figure` (~332), `.portfolio-automation__workflow-grid > main` (~313); `portfolio-print.css` (chỉ kiểm không ghi đè).
- **Kết quả demo đã đo (để khỏi làm lại):** nút Video: `vertical-align: baseline; position: relative; top: -.45mm` đưa độ lệch về −0,2 px. Số đóng góp: `align-items: start` trên `article` và trên số `line-height: 1; margin-top: calc((var(--document-type-xs) * var(--document-leading-relaxed) - var(--document-type-3xl)) / 2)` cho 0,0 px (phải dùng `--document-leading-relaxed` vì đoạn chữ dùng 1,45, không phải 1,35). Khung ảnh: nền `--document-surface` + `border: .25mm solid var(--document-border)` trên `figure`. Thẻ công nghệ: `.portfolio-project--balanced .portfolio-tags { margin-top: 7mm !important; padding-top: 0 !important }` (đang đè `margin-top: auto !important` của quy tắc gốc nên giữ `!important` đúng chỗ này). Meta: hai khối `display: block`, vai trò `--document-text` đậm.

## 3. Phạm vi

**Làm** (mọi quy tắc CSS bắt đầu bằng `.portfolio-page`, chỉ token `--document-*`):

1. **Nút Video cạnh dòng vai trò** (`projectHeading`): căn theo đường cơ sở và bù để tâm nút lệch ≤ 0,5 px so với tâm chữ vai trò. Chỉ áp ở nút đứng cùng hàng với vai trò (`.portfolio-project-heading > strong + .portfolio-video-link`); nút ở index, Automation và nút nằm dưới tiêu đề (không vai trò) **không đổi**.
2. **Số 01 / 02 / 03 của phần đóng góp:** căn tâm số với tâm dòng đầu của đoạn chữ, lệch ≤ 0,5 px, ở mọi layout có `.portfolio-contributions` (Balanced, Technical, Portrait, Evidence và các layout khác dùng cùng thành phần).
3. **Ảnh trang Automation:** mọi `figure` có ảnh ở Workflow và Input / Geometry nằm trong khung nền `--document-surface`, viền `.25mm solid var(--document-border)`, đệm 4 mm. Hợp đồng tỉ lệ crop §8.4 giữ nguyên (đệm nằm ngoài ảnh); layout không được tràn trang hay lấn header / footer.
4. **Dòng meta của index lưới ảnh** (chỉ nhánh `index.visual`): thay `<p>${projectMeta}</p>` bằng hai khối `<span class="portfolio-index__location">` và `<span class="portfolio-index__role">`, thiếu một trong hai thì chỉ in khối còn lại; địa điểm màu muted như hiện nay, vai trò `--document-text` đậm; mọi giá trị qua `escapeHtml` đúng một lần. Index kiểu danh sách (`indexRow`) và `projectMeta` giữ nguyên. Trang index 9 dự án (EN và VI) **không được lấn footer**.
5. **Thẻ công nghệ ở Balanced:** ngay dưới danh sách đóng góp (cách ≤ 12 mm), không neo ở đáy cột.
6. **Test** (`layouts.test.ts` hoặc file mới): meta index có hai khối (đủ ba ca: có cả hai, chỉ địa điểm, chỉ vai trò; escape `&` và `<`); dự án không đổi ở các layout khác (markup so snapshot trước / sau cho trang dự án, Automation và index danh sách); test CSS có khẳng định **dương** (E-002): tiền tố `.portfolio-page`, có quy tắc khung ảnh Automation (nền `--document-surface` và viền), có quy tắc căn số theo `--document-leading-relaxed`, có quy tắc thẻ công nghệ Balanced; không `!important` mới ngoài chỗ ghi ở mục 2.

**Không làm:** chỉ số dự án (GD3-11); chữ bị cắt "…" (N10, chưa bàn); Admin; trang Website; layout khác; nội dung và dữ liệu; migration; dependency mới.

**Ràng buộc dùng chung không được đổi:** lưới trang `--pf-*`, vùng an toàn, kích thước trang in, hợp đồng tỉ lệ crop (§8.4), overlay ảnh; ngân sách bundle (JS 115 kB, CSS 27,0 kB gzip). Liệt kê ở mục 5 mọi thay đổi ở file dùng chung (`renderPortfolioV2.ts`, `portfolio-screen.css`).

## 3b. Các bước (mỗi bước: test liên quan + commit `wip(GD3-10 bước k): …`)

1. Nút Video và số đóng góp (CSS) + test CSS.
2. Khung ảnh Automation và thẻ công nghệ Balanced (CSS) + test CSS.
3. Meta index lưới ảnh (renderer + CSS) + test markup.
4. Chạy `node tools/portfolio-detail-check.mjs --section=n11` (mọi dòng PASS), `node tools/portfolio-video-link-check.mjs <thư-mục-tạm-ngoài-repo>` (All PASS, **121 PASS**: nút Video không được xấu đi), xem ảnh `index.visual`, `project.balanced`, `automation.workflow`, `automation.input-geometry`, điền mục 5.

## 4. Tiêu chí nghiệm thu

- [ ] `node tools/portfolio-detail-check.mjs --section=n11` ra **All PASS** (mốc: 28 FAIL); dán số PASS / FAIL vào mục 5 (không dán ảnh).
- [ ] `node tools/portfolio-video-link-check.mjs …` vẫn **All PASS (121)**.
- [ ] Test của mục 3.6 đạt; markup trang dự án, Automation và index danh sách **không đổi** so với trước khi sửa (snapshot).
- [ ] `npm run verify:admin` đạt một lần ở cuối (chạy từ `D:\…`, E-006); bundle trong ngân sách.
- [ ] Xem ảnh: khung ảnh Automation trắng có viền ở cả Workflow và Input / Geometry; meta index hai dòng gọn ở thẻ dài và thẻ ngắn; thẻ công nghệ Balanced ngay dưới danh sách; không trang nào tràn.
- [ ] `grep` `portfolio-print.css` không ghi đè các lớp mới; ghi kết quả ở mục 5.

## 5. Báo cáo của người code

- Đã xong bước: 1, 2, 3, 4 (đủ).
- Người code: Claude — cửa sổ code · đã dùng trước / sau: chưa ghi (không đọc được số token trong phiên)
- Nhánh, commit cuối: `gd3/10-chi-tiet-portfolio-n11`; commit cuối là commit chứa báo cáo này
- File đã đổi (**dùng chung** in đậm): **`src/portfolio/renderPortfolioV2.ts`** (hàm `gridMeta`, nhánh `index.visual` của `renderIndex`; `projectMeta` và `indexRow` không đổi) · **`src/styles/portfolio-screen.css`** (một khối quy tắc mới ở cuối file, tiền tố `.portfolio-page`; bỏ `padding` và nền của `.portfolio-automation__media-pair figure` vì khung mới thay thế) · mới: `src/portfolio/detailN11.test.ts` (+ snapshot) · cập nhật snapshot `src/portfolio/__snapshots__/editMarkers.test.ts.snap` (chỉ phần meta của index lưới ảnh, đúng thay đổi dự kiến).
- `verify:admin`: 42 file, 280 / 280 test đạt; Admin JS 92,8 / 115,0 kB, CSS 26,6 / 27,0 kB gzip (không đổi).
- `tools/portfolio-detail-check.mjs --section=n11`: **All PASS** (mốc trước: 28 FAIL; chạy lần cuối 46 PASS / 0 FAIL, đo trước khi đổi `line-height: 1` thành token cùng giá trị 1); `portfolio-video-link-check`: **All PASS, 121 PASS / 0 FAIL**.
- `portfolio-print.css` có ghi đè không: **không** (`grep` các lớp mới trong file đó ra 0 dòng; test CSS cũng khẳng định).
- Xem ảnh (lưu ngoài repo): `index.visual` 9 dự án: meta hai dòng gọn ở thẻ dài và ngắn, không lấn footer; Balanced: thẻ công nghệ ngay dưới danh sách đóng góp; Workflow và Input / Geometry: khung trắng viền mảnh quanh mọi ảnh; không trang nào tràn.
- Chỗ làm khác đề bài và lý do:
  1. **Meta index lưới ảnh dùng `<p>` bọc hai `<span>`** thay vì hai `span` đứng trực tiếp trong `article`: công cụ đo tìm `.portfolio-index-visual article > p`; `<p>` cũng giữ quy tắc `.portfolio-index-visual p` sẵn có (muted, 2xs, cách 3 mm). Không còn `<p>` khi thiếu cả hai giá trị.
  2. **Số đóng góp: bù thêm `- .2mm`** vào công thức demo (kết quả đo 0,74 px, quá ngưỡng 0,5): công cụ đo tâm hộp chữ của dòng đầu, thấp hơn tâm hộp dòng khoảng 0,73 px; dùng `var(--document-leading-none)` (= 1) thay cho `line-height: 1` vì test hiện có cấm `line-height` không đơn vị.
  3. **Nút Video: thêm `margin-top: .6mm`** ngoài `top: -.45mm`: ở Editorial, vai trò dài ("BIM Modeling Team Leader & BIM Coordinator") đẩy nút xuống dòng riêng, nút dịch lên chạm dòng vai trò nên bị đo nhầm là "cùng hàng" (18,97 px). Lề trên chỉ có tác dụng khi nút xuống dòng riêng, không đổi vị trí khi cùng hàng (đo vẫn −0,34 px).
- Câu hỏi: không.

## 6. Review của Claude

- Ngày, commit đã review:
- **Phải sửa:**
- **Nên sửa:**
- **Cần người vận hành chốt:**
- Kết luận:
