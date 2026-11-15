# GD3-11 — Chỉ số dự án: số lớn + đơn vị nhỏ (nhóm N9)

> **Trạng thái:** GIAO CODE · **Nhánh:** `gd3/11-chi-so-du-an-n9` (`git fetch; git switch -c gd3/11-chi-so-du-an-n9 origin/main`) · **Ngày giao:** 2026-11-15 · **Cỡ:** Nhỏ (~3 file) · **Người đang code:** Claude — cửa sổ code (hoặc Codex nếu còn token)
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

- Đã xong bước:
- Người code: · đã dùng trước / sau:
- Nhánh, commit cuối:
- File đã đổi (ghi rõ file dùng chung):
- `verify:admin`: số test đạt / tổng; bundle JS / CSS:
- `tools/portfolio-detail-check.mjs` (PASS / FAIL):
- `portfolio-print.css` có ghi đè không:
- Chỗ làm khác đề bài và lý do:
- Câu hỏi:

## 6. Review của Claude

- Ngày, commit đã review:
- **Phải sửa:**
- **Nên sửa:**
- **Cần người vận hành chốt:**
- Kết luận:
