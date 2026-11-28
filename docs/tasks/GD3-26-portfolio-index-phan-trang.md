# GD3-26 — Portfolio: trang Project index tự thêm trang khi nhiều dự án (nhóm N26)

> **Trạng thái:** CHỜ REVIEW (làm **trước** GD3-25) · **Nhánh:** `gd3/26-portfolio-index-phan-trang` từ `main` · **Ngày giao:** 2026-11-28 · **Cỡ:** Vừa (~5 file) · **Người đang code:** Claude — cửa sổ code (hoặc Codex)
> **Gộp (ADR-018):** đổi đầu ra PDF Portfolio → **cần người vận hành duyệt** trước khi gộp. Không có migration.

## 1. Mục tiêu

[ADR-043](../../decisions/ADR-REGISTER.md) (Sổ #40, W-39): `renderIndex` luôn dựng **một** trang; với 19 dự án, mục 13 – 16 lấn xuống chân trang, phần còn lại bị cắt và preview báo "6 issues". Index phải **tự thêm trang**.

## 2. Căn cứ

- `docs/ui-guidelines.md` §8.1 – §8.4 (lưới trang, chrome, vùng an toàn; quy tắc phân trang index vừa thêm), [AGENTS §5.8](../../AGENTS.md) (không tràn, dịch qua `copy`, không in "—").
- Code: `src/portfolio/renderPortfolioV2.ts` (`renderIndex` ~dòng 227; ba layout `index.classic`, `index.visual` (`is-dense` khi > 8), `index.editorial`; mảng `pages` và `totalPages` ~dòng 340 – 370; `copy` EN / VI), `src/portfolio/layouts.ts` (mô tả "up to eight selected projects"), `src/portfolio/safeArea.ts` (`findPortfolioLayoutIssues`), `src/portfolio/editMarkerLayer.ts` và nơi Admin nhảy tới trang index, `src/styles/portfolio-screen.css` (`.portfolio-index*`), test `detailN11.test.ts` (snapshot một trang phải **không đổi**).
- **Đo hiện tại:** dữ liệu thật 19 dự án đã chọn: tài liệu 25 trang, **1 trang index bị tràn** (preview "6 issues").

## 3. Phạm vi

**Làm:**

1. **Công cụ đo `tools/portfolio-index-check.mjs`** (mẫu `portfolio-video-link-check.mjs`: dựng bằng trình dựng thật với dữ liệu giả trong trình duyệt): ba layout index × EN / VI × số dự án **1, 8, 9, 12, 13, 19, 40** (tên dài ~100 ký tự ở một số mục, có mục thiếu ảnh / địa điểm / vai trò): mỗi dự án xuất hiện **đúng một lần** trong các trang index theo đúng thứ tự; `findPortfolioLayoutIssues` **không có vấn đề** ở trang index; số trang index = trần(N / sức chứa); `NN / TT` liên tục. **Chạy trên mốc hiện tại trước khi sửa, ghi số FAIL vào mục 5.**
2. **Sức chứa mỗi layout:** đo trên trang A4 ngang thật với tên dài (không giảm cỡ chữ / thẻ so với hiện nay; `index.visual` giữ lưới 4 cột, `is-dense` theo số mục **trên trang đó**); ghi con số và cách đo vào mục 5; đặt thành hằng số có tên.
3. **Phân trang:** `renderIndex` trả **danh sách trang**; trang đầu giữ nguyên tiêu đề / bố cục khi tổng ≤ sức chứa (snapshot cũ không đổi); từ hai trang trở lên tiêu đề ghi "Project index (k/n)" / bản VI qua `copy`; kicker giữ tổng số dự án; số thứ tự chạy tiếp; `index.editorial` (cột bên + danh sách) lặp cột bên ở mọi trang hoặc chỉ trang đầu (chọn một, ghi lý do, không để trang trống lệch).
4. **Tài liệu và Admin:** `totalPages`, số trang dự án, preview, bút chì "Edit markers" và mọi nơi giả định index là trang 3 duy nhất phải đúng; mô tả layout trong `layouts.ts` bỏ "up to eight" hoặc ghi sức chứa mỗi trang (nếu `suitability` đang cảnh báo > 8 cho Visual Grid thì cập nhật).
5. **Test:** phân trang thuần (0, 1, đúng sức chứa, sức chứa + 1, 40), thứ tự và số thứ tự, EN / VI, thoát chuỗi một lần (E-003); snapshot một trang cũ không đổi; thêm snapshot hai trang.
6. **Checklist:** `ui-guidelines` §9 và `docs/92` §2 từng mục (UI-16); ảnh các trang index (19 dự án, ba layout) và kiểm in PDF (số trang đúng).

**Không làm:** đổi thẻ dự án / trang dự án; đổi thứ tự dự án; CV; Website; migration; dependency mới.

## 3b. Các bước

1. Công cụ đo + mốc FAIL.
2. Đo sức chứa; phân trang cho ba layout + test.
3. Tài liệu / Admin (tổng trang, bút chì); công cụ All PASS; `verify:admin` một lần; điền mục 5.

## 4. Tiêu chí nghiệm thu

- [ ] `node tools/portfolio-index-check.mjs` **All PASS** (ba layout × EN / VI × 7 số dự án).
- [ ] 19 dự án thật: preview không còn cảnh báo tràn ở index; đủ 19 mục, số 01 – 19, trang `NN / TT` đúng.
- [ ] ≤ sức chứa một trang: đầu ra **không đổi** (snapshot cũ nguyên vẹn).
- [ ] `npm run verify:admin` đạt (từ `D:\…`).

## 5. Báo cáo của người code

- Đã xong bước: 1 – 3
- Người code · đã dùng trước / sau: Claude — cửa sổ code · chưa ghi token
- Nhánh, commit cuối: gd3/26-portfolio-index-phan-trang (commit feat(GD3-26))
- File đã đổi (ghi rõ file dùng chung): **dùng chung (Portfolio công khai / PDF và Admin preview):** `src/portfolio/renderPortfolioV2.ts`, `src/portfolio/layouts.ts`. Mới: `src/portfolio/indexPages.test.ts` (+ snapshot hai trang), `tools/portfolio-index-check.mjs`. Không đổi CSS, CV, Website, dữ liệu, migration, dependency.
- `verify:admin`: đạt, 48 file / 389 test; Admin JS 92,8 / 115,0 kB, CSS 27,0 / 28,0 kB (không đổi).
- Công cụ đo (mốc FAIL trước → sau): **48 FAIL / 48** (chạy trên code trước khi sửa: chưa có sức chứa; từ 19 dự án Classic và Visual, từ 12 Editorial còn thêm tràn) → **All PASS** (48 tổ hợp + 3 phép đếm trang PDF).
- **Sức chứa mỗi layout và cách đo:** `index.classic` **10**, `index.visual` **12**, `index.editorial` **8** (`PORTFOLIO_INDEX_CAPACITY` trong `layouts.ts`). Đo bằng `node tools/portfolio-index-check.mjs --probe` trên code cũ (mọi mục dồn một trang A4 ngang thật), mọi mục đều ở trạng thái cao nhất: tên ~105 ký tự, địa điểm và vai trò dài, có video, EN và VI. Đáy mục thấp nhất ở sức chứa / vượt một mục: Classic 174,3 / 198,9 mm (giới hạn 198); Visual 195,9 / 245,2 (198); Editorial 183,3 / 203,8 (192, `--pf-bottom`). Kiểm thêm tên 120 và 150 ký tự ở đúng sức chứa: không tràn. Tên dài nhất của dữ liệu thật: 49. Không đổi cỡ chữ hay thẻ. Visual Grid chỉ còn dư ~2 mm ở trang đầy 12 thẻ.
- **Dữ liệu thật (19 dự án, chỉ đọc bản nháp):** layout đang chọn `index.visual`: 2 trang index (12 + 7), đủ 19 mục, 0 vấn đề, tổng 26 trang (trước: 25 trang, index tràn). Đổi thử trong bộ nhớ: Classic 2 trang (26), Editorial 3 trang (27), đều 0 vấn đề, EN và VI. Admin › Portfolio preview: "26 pages · Ready · 11 recommendations".
- **Quyết định trình bày:** Editorial **lặp cột bên ở mọi trang** (chrome của layout này lùi theo rail `--pf-rail-left`; bỏ cột sẽ để mảng trống lệch). Kicker / số lớn giữ tổng số dự án. Tiêu đề VI có đánh số giữ "dự án" liền nhau (khoảng trắng không ngắt) vì ở cột Editorial nó ngắt thành "DANH MỤC DỰ / ÁN (1/3)". Visual Grid: `is-dense` theo số thẻ **của trang**, nên với 19 dự án trang 1 (12 thẻ) thẻ thấp, trang 2 (7 thẻ) thẻ cao như thường: hai trang khác cỡ thẻ (đúng đề bài, nêu để người vận hành xem).
- **Công cụ khác:** `portfolio-video-link-check` All PASS (chạy trước khi thêm khoảng trắng không ngắt). `portfolio-detail-check`: **5 FAIL `[N9] facts`** ở trang dự án với dữ liệu thật; chạy trên code `main` (stash) ra **đúng 5 dòng đó**, cộng 18 FAIL `no-issue` do index tràn, nhánh này còn 0. 5 FAIL facts là lỗi có sẵn, ngoài phạm vi.
- **Checklist giao diện từng mục:**

  `ui-guidelines` §9: 1 đạt. 2, 3 không áp dụng (không đổi Website). 4 đạt về tràn (0 vấn đề) và số trang PDF khớp (`page.pdf` của Chromium: 24 / 24 / 25, không trang trắng thừa); **chưa mở Print preview Chrome bằng tay**. 5 đo hai theme custom (#f2c94c, #102d3b) với Editorial VI: 0 vấn đề; chỉ xem ảnh theme sáng (hệ thống tự làm tối màu). 6 đạt: preview Admin 26 trang Ready; **không bấm thử zoom** (nút Fit đang bật). 7 đạt: ba layout × EN / VI, tên dài; Admin không báo issue. 8 đạt: kicker / tiêu đề hai trang cùng độ cao (ảnh), header Editorial bắt đầu trên nền trắng. 9 **chưa kiểm** overlay (không đổi ảnh hay CSS). 10 không áp dụng kiểu chữ mới; không đổi CV / Cover Letter.

  `docs/92` §2: 1 như trên. 2 UI-01, UI-08 áp dụng: đo trên trình dựng thật, tiêu đề nhiều dòng. 3 không có toggle mới. 4 tên 105 – 150 ký tự. 5 số đo ở trên. 6 file dùng chung đã liệt kê. 7 lỗi ngắt "DỰ / ÁN" do người code tìm thấy; **tiêu đề một trang** của Editorial VI có thể ngắt tương tự (có từ trước, tôi không đổi để giữ đầu ra một trang) — chưa kiểm.
  Ảnh đã xem: Classic và Visual trang 1 – 2, Editorial trang 1 và 3 (EN, 19 dự án giả), Editorial VI trang 1 và cột bên.
- Chỗ làm khác đề bài và lý do: `layouts.ts`: mô tả ba layout ghi số dự án mỗi trang (không có cảnh báo `suitability` > 8 nào để cập nhật). Số dự án chọn nay vượt sức chứa sẽ sang trang ngay cả khi trước đó vừa một trang (ví dụ Classic 11 – 12 tên ngắn), vì sức chứa cố định theo trường hợp cao nhất. Không phải sửa bút chì "Edit markers": trang index không có mốc sửa nào; chỗ duy nhất giả định một trang index là `portfolioPageCount`.
- Câu hỏi: **Số (k/n) ở trang đầu.** Ví dụ 19 dự án: hiện trang 3 ghi "Project index (1/2)", trang 4 "(2/2)". Đề bài ghi "từ hai trang trở lên tiêu đề ghi (k/n)" (tôi làm theo), còn `ui-guidelines` §8.4 ghi "tiêu đề **trang sau** thêm (2/2)". Phương án A (khuyến nghị): giữ như hiện nay, Claude sửa câu trong §8.4; người đọc biết ngay còn trang sau. Phương án B: trang đầu không số; sửa một dòng nhưng trang đầu không báo còn tiếp. Trả lời: "A" hoặc "B".

## 6. Review của Claude

(chưa review)
