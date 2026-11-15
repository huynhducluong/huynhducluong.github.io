# GD3-11 — Chỉ số dự án: số lớn + đơn vị nhỏ (nhóm N9)

> **Trạng thái:** CHỜ DUYỆT · **Nhánh:** `gd3/11-chi-so-du-an-n9` (`git fetch; git switch -c gd3/11-chi-so-du-an-n9 origin/main`) · **Ngày giao:** 2026-11-15 · **Cỡ:** Nhỏ (~3 file) · **Người đang code:** Claude — cửa sổ code (hoặc Codex nếu còn token)
> **Gộp (ADR-018):** **cần người vận hành duyệt** — đổi giao diện PDF và bản web của Portfolio.

## 1. Mục tiêu

Chỉ số dự án (Project › Key facts) không còn xuống dòng chắp vá, theo **phương án A** người vận hành chốt từ demo thật (ADR-031; Sổ #14, #15, #18, #19 = W-13, W-14, W-17, W-18): **số in lớn, đơn vị in nhỏ, cùng một hàng**. Ví dụ "≈17.95 km", "4 lanes", "VND 25.773 trillion".

## 2. Căn cứ (đã sửa sẵn, đọc đúng đoạn này)

- `docs/ui-guidelines.md` §8.4, gạch con "**Chỉ số dự án (key facts)**" của "Chi tiết trình bày Portfolio" (yêu cầu của đề bài); ADR-031; `docs/coding-conventions.md` §3, §4.
- **Công cụ đo, đã có trên `main`:** `node tools/portfolio-detail-check.mjs --section=n9` (cần dev server cổng 5199 và `.auth/`). **Mốc trước khi sửa: 6 FAIL** (`[N9] facts`: Technical, Balanced, Editorial × EN / VI; chỉ số "≈17.95 km" và "VND 25.773 trillion" xuống dòng).
- Code: `src/portfolio/renderPortfolioV2.ts` ~dòng 219 (`factItems`: `<div><strong>${value}</strong><span>${label}</span></div>`, khi có `keyFacts`; nhánh dự phòng "year / tools…" giữ nguyên); `src/styles/portfolio-screen.css` ~240–247 và quy tắc Technical / Editorial của `.portfolio-project-facts` (~266–278, ~279). **Bẫy đã gặp trong demo:** `.portfolio-project-facts span { font-size: 2xs; color: muted }` và quy tắc Technical `:is(strong, span) { color: inherit }` chạm vào mọi `<span>` bên trong, nên token con **không được là `<span>`** (dùng `<b>` và `<small>` hoặc phần tử khác, kèm lớp `.portfolio-fact__num` / `.portfolio-fact__unit`) hoặc phải đặt `font-size` / `color` tường minh.
- **Kết quả demo (để khỏi làm lại):** `strong { display: flex; align-items: baseline; gap: 1.2mm; white-space: nowrap }`, đơn vị `font-size: var(--document-type-xl); font-weight: var(--document-weight-bold)`, số `font-size: inherit`; ô có giá trị ≥ 3 token (hoặc ≥ 14 ký tự) chiếm cả hàng (`grid-column: 1 / -1`) → 0 chỉ số xuống dòng, 0 tràn ở cả ba layout.

## 3. Phạm vi

**Làm:**

1. **Hàm thuần `factValueParts(value: string)`** (trong `renderPortfolioV2.ts` hoặc file nhỏ riêng) tách giá trị theo khoảng trắng: token **có chữ số** là số, token còn lại là đơn vị. Giá trị chỉ có **một token**, hoặc **không có chữ số**, hoặc rỗng thì trả về dạng "thuần" (in như hôm nay, markup không đổi). Giữ nguyên ký tự gốc của từng token (dấu `≈`, `.`, `,`, `+`).
2. **Markup:** `<strong>` chứa các phần tử con theo thứ tự gốc, số bọc `.portfolio-fact__num`, đơn vị bọc `.portfolio-fact__unit`; ô có giá trị dài (≥ 14 ký tự sau khi chuẩn hóa khoảng trắng) thêm lớp `is-wide`. Mọi giá trị qua `escapeHtml` đúng một lần (E-003). Chỉ nhánh `keyFacts`; nhánh dự phòng không đổi.
3. **CSS** (mọi quy tắc bắt đầu bằng `.portfolio-page`, chỉ token `--document-*`): như "Kết quả demo"; màu số và đơn vị đúng màu hiện tại ở từng layout (trên cột xanh Technical là màu `inherit`, không opacity); `is-wide` thành `grid-column: 1 / -1`; không `!important` mới.
4. **Test:** (a) `factValueParts`: "≈17.95 km", "VND 25.773 trillion", "4 lanes", "2026", "Phase 1", "", "18 km + 3 km", "25.773 tỷ đồng", "≈17,95 km" (dấu phẩy); (b) markup: giá trị có đơn vị có `.portfolio-fact__num` và `.portfolio-fact__unit`; giá trị một token và dự án **không có** keyFacts cho markup **giống hệt** trước khi sửa (snapshot); escape (`&`, `<` trong giá trị và nhãn); (c) test CSS có khẳng định **dương** (E-002): tiền tố `.portfolio-page`, có `white-space: nowrap` cho giá trị chỉ số, có `is-wide`, không `!important` trong khối mới.

**Không làm:** đổi cách nhập Key facts trong Admin (không ô "đơn vị" riêng; xét sau nếu cần); chữ bị cắt "…" (N10); CV, Website; layout khác; migration; dependency mới.

**Ràng buộc dùng chung không được đổi:** lưới trang `--pf-*`, vùng an toàn, kích thước trang in; ngân sách bundle (JS 115 kB, CSS 27,0 kB gzip). Liệt kê ở mục 5 mọi file dùng chung đã đổi.

## 3b. Các bước (mỗi bước: test liên quan + commit `wip(GD3-11 bước k): …`)

1. `factValueParts` + test thuần.
2. Markup + CSS + test markup / CSS.
3. Chạy `node tools/portfolio-detail-check.mjs` (mọi dòng PASS, gồm cả `--section=n11` đã đạt ở GD3-10), `node tools/portfolio-video-link-check.mjs <thư-mục-tạm>` (All PASS), xem ảnh Technical, Balanced, Editorial (EN và VI), điền mục 5.

## 4. Tiêu chí nghiệm thu

- [ ] `node tools/portfolio-detail-check.mjs --section=n9` ra **All PASS** (mốc: 6 FAIL) và `--section=n11` vẫn All PASS; dán số PASS / FAIL vào mục 5.
- [ ] Test của mục 3.4 đạt; dự án không có keyFacts và chỉ số một token cho markup giống hệt trước khi sửa.
- [ ] `npm run verify:admin` đạt một lần ở cuối (chạy từ `D:\…`, E-006); bundle trong ngân sách.
- [ ] Xem ảnh: số lớn đơn vị nhỏ đọc rõ trên nền trắng, trên cột xanh (Technical, Editorial) và trong băng chỉ số Balanced; không chỉ số nào xuống dòng.
- [ ] `grep` `portfolio-print.css` không ghi đè các lớp mới; ghi kết quả ở mục 5.

## 5. Báo cáo của người code

- Đã xong bước: 1, 2, 3 (đủ).
- Người code: Claude — cửa sổ code · đã dùng trước / sau: chưa ghi (không đọc được số token trong phiên)
- Nhánh, commit cuối: `gd3/11-chi-so-du-an-n9`; commit cuối là commit chứa báo cáo này
- File đã đổi (**dùng chung** in đậm): **`src/portfolio/renderPortfolioV2.ts`** (`factValueParts`, `keyFactMarkup`; chỉ nhánh `keyFacts`, nhánh "year / tools" giữ nguyên) · **`src/styles/portfolio-screen.css`** (khối "Key facts" ở cuối file, mọi quy tắc có tiền tố `.portfolio-page`) · mới: `src/portfolio/factsN9.test.ts` (+ snapshot) · `src/portfolio/layouts.test.ts` (một khẳng định cũ: "18 km" giờ in thành số + đơn vị).
- `verify:admin`: 43 file, 306 / 306 test đạt; Admin JS 92,8 / 115,0 kB, CSS 26,6 / 27,0 kB gzip (không đổi).
- `tools/portfolio-detail-check.mjs` (cả `--section=n9` và `--section=n11`, tức `all`): **All PASS**, 0 FAIL (mốc trước: 6 FAIL ở n9); `portfolio-video-link-check`: **All PASS**.
- `portfolio-print.css` có ghi đè không: **không** (`grep` ra 0 dòng; test CSS khẳng định).
- Xem ảnh (lưu ngoài repo): Technical, Balanced, Editorial × EN và VI: số lớn, đơn vị nhỏ đọc rõ trên nền trắng, trên cột xanh và trong băng Balanced; không chỉ số nào xuống dòng; không trang nào bị `findPortfolioLayoutIssues` báo.
- Chỗ làm khác đề bài và lý do:
  1. **`is-wide` chỉ theo độ dài (≥ 14 ký tự sau chuẩn hóa khoảng trắng), bỏ nhánh "≥ 3 token" của demo.** Với nhánh đó, "4 làn xe" (8 ký tự) bị coi là dài, chiếm cả hàng và đẩy băng Balanced bản VI xuống lấn footer.
  2. **Thêm quy tắc riêng cho băng Balanced** (`display: flex; flex-wrap: wrap`, ô `max-width: 62mm`, đoạn tóm tắt `flex: 0 0 100%`). Lý do: chỉ với `is-wide` toàn hàng, giá trị "VND 25.773 trillion" tách thành hàng thứ hai và đáy băng ở dự án 01 vượt đường footer (đo: EN +4,7 px, VI +18,2 px; trước khi sửa là −1,0 và −14,2 px). Sau khi thêm, đáy băng cách footer −54 px ở cả EN và VI (tốt hơn trước), ba chỉ số nằm một hàng. `findPortfolioLayoutIssues` không bắt được lỗi này vì nó chỉ đo phần tử chữ chứ không đo nền băng; đề nghị Claude cân nhắc đo cả nền khi review.
  3. Thêm `class="portfolio-fact__value"` trên `<strong>` của giá trị tách (đề bài không nêu) để CSS flex chỉ chạm giá trị tách; giá trị thuần giữ markup cũ từng byte. Token con dùng `<b>` (không dùng `<span>`) theo bẫy đã ghi ở mục 2, nối bằng một dấu cách để chữ được chọn / đọc đúng.
  4. "Phase 1" (có chữ số, 2 token) được tách thành đơn vị "Phase" + số "1", đúng quy tắc của đề bài; snapshot "markup không đổi" vì vậy chỉ dùng các giá trị một token, trống hoặc không chữ số.
- Câu hỏi: không.

## 6. Review của Claude

- Ngày, commit đã review: 2026-11-15, `4fa94b5` (worktree `D:\wt\pf-review`, `npm ci` sạch; đã xóa). Người code là cửa sổ Claude code; người review là phiên thiết kế (độc lập). Đo trên bản nháp Portfolio thật.
- Đã kiểm (không dựa vào báo cáo):
  - `verify:admin`: 43 file / 306 test đạt; Admin JS 92,8 / 115,0, CSS 26,6 / 27,0 kB gzip (không đổi).
  - **`node tools/portfolio-detail-check.mjs` (cả n9 và n11): All PASS** (mốc n9 trước sửa: 6 FAIL); `portfolio-video-link-check`: All PASS; `portfolio-print.css` không chứa lớp mới.
  - **Phép thử thêm của tôi (không có trong công cụ):** (1) khoảng cách từ đáy băng chỉ số tới đường footer ở mọi dự án × Technical, Balanced, Editorial × EN, VI: nhỏ nhất **41 px** (Balanced, dự án 2, EN), không âm ở đâu; (2) **ép giá trị dài** ("≈17.95 km", "4 lanes", "VND 25.773 trillion" / "25.773 tỷ đồng") vào chỉ số của cả 9 dự án (27 chỉ số mỗi layout): **0 xuống dòng, 0 tràn ngang, 0 `findPortfolioLayoutIssues`**, khoảng cách tới footer nhỏ nhất 41 px (Balanced). Bản nháp hiện tại của bạn đã đổi giá trị thành "25.8 T VND" nên chính công cụ không còn thử trường hợp dài; phép thử ép này bù lại.
  - Đọc diff: `factValueParts` thuần, giữ nguyên ký tự từng token; markup chỉ đổi khi có đơn vị (giá trị một token, trống, không chữ số in như cũ, snapshot chụp trên mã chưa sửa); escape một lần; CSS có tiền tố `.portfolio-page`, token `--document-*`, không `!important`; thẻ `<b>` tránh được bẫy `<span>`. Xem ảnh Balanced và Technical (số lớn, đơn vị nhỏ cùng hàng, cả trên cột xanh).
- **Phải sửa:** không.
- **Nên sửa:** không.
- **Ghi nhận:** (1) bốn chỗ làm khác đề bài đều hợp lý và có số đo; đặc biệt bỏ nhánh "≥ 3 token" của demo (làm "4 làn xe" chiếm cả hàng) và quy tắc flex riêng cho băng Balanced (tránh đáy băng lấn footer). (2) Nhận xét đúng của người code: `findPortfolioLayoutIssues` chỉ đo phần tử chữ, không đo nền của băng chỉ số nên lỗi "băng lấn footer" không bị bắt; phép đo khoảng cách ở trên nên thành một dòng của `tools/portfolio-detail-check.mjs` (việc nhỏ của Claude, không cần đề bài). (3) "Phase 1" tách thành "Phase" + "1" đúng quy tắc đề bài.
- **Cần người vận hành chốt:** không về thiết kế; chỉ cần **duyệt gộp** vì đổi giao diện PDF và bản web (ADR-018).
- Token: Claude — cửa sổ code 12 % → 17 % đã dùng (~5 %, Nhỏ; vượt ước vì có snapshot và hai lượt sửa CSS).
- Kết luận: **ĐẠT, CHỜ DUYỆT** — sạch về kỹ thuật; chờ người vận hành duyệt rồi Claude gộp và push.
