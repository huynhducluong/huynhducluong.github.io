# GD3-02 — Credentials: khung "tờ giấy trên nền trắng" và thẻ Dual thẳng hàng (N3a)

> **Trạng thái:** ĐẠT (gộp `d87934f`, 2026-11-15, người vận hành duyệt) · **Nhánh:** `gd3/02-credentials-khung-giay` (`git fetch; git switch -c gd3/02-credentials-khung-giay origin/main`) · **Ngày giao:** 2026-11-15 · **Cỡ:** Nhỏ (3 file) · **Người đang code:** Codex (token 36 %)
> **Gộp (ADR-018):** **cần người vận hành duyệt** — đổi giao diện PDF Portfolio. Claude review xong thì chuyển `CHỜ DUYỆT`.

## 1. Mục tiêu

Thực hiện kiểu **B** người vận hành đã chọn từ demo thật (ADR-025): ảnh minh chứng Credentials trông như một tờ giấy đặt trên tấm nền trắng có viền (UI-11), và hai thẻ Dual luôn có khung ảnh thẳng hàng dù tiêu đề dài ba dòng (UI-08). **Chỉ đổi CSS và test**, không đổi HTML do `renderPortfolioV2.ts` sinh ra.

## 2. Căn cứ (đã trích đủ ở mục 3)

- ADR-025. Quy tắc đã sửa sẵn: `docs/ui-guidelines.md` §8.3 gạch "Các hàng bằng nhau thẳng hàng", §8.4 gạch "Bằng chứng Credential chỉ in khi được cho hiển thị".
- Sổ: UI-08, UI-11 (`docs/92-ui-rules.md`); E-002 (test CSS bằng `?raw` phải có khẳng định dương).
- Công cụ đo (Claude đã viết, có sẵn trên `main`): `tools/portfolio-credentials-check.mjs`. **Trước khi sửa: 2 FAIL** (`dual-en-longtitle`, `dual-vi-longtitle`, mục `frames-aligned`: 87,15 so với 82,69 mm).

## 3. Phạm vi

**Làm** — chỉ trong `src/styles/portfolio-screen.css` (vùng Credentials, quanh dòng 337–360) và `src/portfolio/layouts.test.ts`:

1. **Tấm nền trắng (UI-11).** Hai quy tắc hiện có đổi thành:

   ```css
   .portfolio-document-slot { box-sizing: border-box; display: grid; min-width: 0; place-items: center; padding: 3mm; border: .3mm solid var(--document-border); border-radius: 1mm; background: var(--document-surface); container-type: size; }
   .portfolio-document-preview { display: block; width: min(100cqw, 100cqh * var(--pf-crop-ratio-n)); overflow: hidden; border: .3mm solid var(--document-border); border-radius: 0; background: var(--document-surface); }
   ```

   (`.portfolio-document-frame { aspect-ratio: 4 / 3; }` giữ nguyên; placeholder `.portfolio-document-placeholder` không đổi.) Phần đệm 3 mm nằm **trong** khung 4:3, nên khung vẫn 120,5 × 90,4 mm (Dual) và 72 × 54 mm (Bands); crop nằm trong phần đệm ở đúng tỉ lệ của nó.

2. **Dual thẳng hàng (UI-08).** Bỏ `min-height: 15mm` của `.portfolio-credentials--dual article header` (và dòng chú thích "Room for a two-line title…" đi kèm); thêm:

   ```css
   .portfolio-credentials--dual > div { align-items: stretch; grid-template-rows: auto auto 1fr; }
   .portfolio-credentials--dual article { display: grid; grid-row: span 3; grid-template-rows: subgrid; row-gap: 0; }
   .portfolio-credentials--dual article header { min-height: 0; }
   ```

   Giữ `padding`, viền, bo, `margin-bottom: 4mm` của header, `margin-top: 5mm` của dòng meta như đang có. Nếu `row-gap` 9 mm của `> div` còn tác động lên khoảng cách giữa các hàng, đổi `gap: 9mm` thành `column-gap: 9mm` (đo lại).

3. **Test (`layouts.test.ts`, mục "crop ratio contract")**: thêm khẳng định **dương** (E-002) cho: `.portfolio-document-slot` có `padding: 3mm`; `.portfolio-credentials--dual article` có `grid-template-rows: subgrid`; và **phủ định** `.portfolio-credentials--dual article header` không còn `min-height: 15mm`. Test cũ "khung không có chiều cao mm cố định" giữ nguyên và vẫn phải đạt.

**Không làm (để GD3-03):** bỏ "Print as", chọn crop theo layout, đổi dạng snapshot, hộp Adjust crops, kiểm tra trước khi publish. Không sửa `renderPortfolioV2.ts`, `layouts.ts`, `portfolio-print.css` (chỉ `grep` kiểm `portfolio-print.css` có ghi đè các selector trên không; nếu có, ghi vào mục 5, không tự sửa).

**Ràng buộc dùng chung không được đổi:** token, `--pf-*`, kích thước trang A4 ngang, các layout khác; không thêm dependency; không sửa `docs/`, `decisions/`, `AGENTS.md`, `MASTER_PLAN.md`, `tools/`. **Ảnh chụp và số đo có thể chứa số giấy tờ cá nhân: lưu ngoài repo (thư mục tạm), không commit, không dán vào báo cáo** (E-008).

**Phép tính chỗ** (số đo thật trên trang Dual, tính từ đỉnh trang): với tiêu đề ba dòng khung bắt đầu ở 87,2 mm và kết thúc ở 177,6 mm (khung 90,4 mm không đổi, phần đệm nằm trong khung); phía dưới còn 5 mm lề + một dòng meta (~5 mm); thân trang kết thúc ở 198 mm (`footerTop`). Dư khoảng 10 mm. Subgrid không được làm hàng tiêu đề cao hơn mức tiêu đề dài nhất cần; vượt thì `no-issue` báo FAIL.

## 3b. Các bước (mỗi bước: test liên quan + commit `wip(GD3-02 bước k): …`)

1. CSS tấm nền (mục 3.1) + test; `npx vitest run src/portfolio/layouts.test.ts`.
2. CSS Dual subgrid (mục 3.2) + test.
3. Đo: chạy dev server (`npm run dev -- --port 5199 --strictPort`, cửa sổ riêng), rồi `node tools/portfolio-credentials-check.mjs <thư-mục-tạm-ngoài-repo>`; mọi dòng PASS; xem ảnh `dual-en-longtitle-p1.png`, `bands-vi-p1.png`; điền mục 5.

## 4. Tiêu chí nghiệm thu

- [ ] `node tools/portfolio-credentials-check.mjs …` ra **All PASS** (0 FAIL), 24 dòng.
- [ ] `npx vitest run src/portfolio/layouts.test.ts` đạt, có các khẳng định ở mục 3.3.
- [ ] `npm run verify:admin` đạt **một lần ở cuối** (chạy từ `D:\…`, E-006); ngân sách bundle không đổi.
- [ ] Xem ảnh: Dual (dữ liệu thật + tiêu đề dài) và Bands (EN + VI): ảnh nằm trên nền trắng có viền, hai khung Dual thẳng hàng, không cắt chữ, không tràn trang.
- [ ] Không đổi file nào ngoài `portfolio-screen.css` và `layouts.test.ts`.

## 5. Báo cáo của người code

- Đã xong bước: 1, 2, 3.
- Người code: Codex · token trước / sau: 36% / phiên Codex API không cung cấp chỉ số % còn lại.
- Nhánh, commit cuối: `gd3/02-credentials-khung-giay` · `03044d4` (WIP bước 3; commit báo cáo ở ngay sau).
- File đã đổi: `src/styles/portfolio-screen.css`, `src/portfolio/layouts.test.ts`.
- `verify:admin`: 194 / 194 test đạt (31 file); bundle Admin JS 92,8 / 115,0 kB gzip, CSS 26,5 / 27,0 kB gzip.
- Kết quả `portfolio-credentials-check` (số PASS / FAIL, dán dòng FAIL nếu có; **không dán ảnh**): 24 PASS / 0 FAIL, `All PASS`; hai ca Dual tiêu đề dài có hai khung cùng bắt đầu ở 87,15 mm, kích thước 120,48 × 90,36 mm.
- `portfolio-print.css` có ghi đè selector nào ở mục 3 không: Không.
- Chỗ làm khác đề bài và lý do: Không; đã đổi `gap: 9mm` thành `column-gap: 9mm` đúng điều kiện mục 3.2 vì grid nay có ba hàng và shorthand sẽ tạo thêm row-gap.
- Câu hỏi: Không có.

## 6. Review của Claude

- Ngày, commit đã review: 2026-11-15, `87f0e23` (worktree `D:\wt\pf-review`, `npm ci` sạch).
- Đã kiểm (không dựa vào báo cáo):
  - `verify:admin`: 31 file / 194 test; Admin JS 92,8 / 115, CSS 26,5 / 27 kB gzip.
  - Diff đúng 3 file (`portfolio-screen.css`, `layouts.test.ts`, đề bài); CSS đúng mục 3 (có thay `gap: 9mm` bằng `column-gap: 9mm`, đề bài cho phép); không đụng renderer, `layouts.ts`, `portfolio-print.css`.
  - `tools/portfolio-credentials-check.mjs`: **All PASS** (24 phép đo). Trước khi sửa: 2 FAIL (`dual-*-longtitle`, 87,15 so với 82,69 mm); sau: cả hai khung ở 87,15 mm.
  - Ca ngoài đề bài (dữ liệu giả, không có thông tin cá nhân): crop **Portrait** trong khung Landscape, cả hai layout, EN + VI: tỉ lệ đo 0,750, cao hết phần ruột (Dual 83,8 mm, Bands 47,5 mm), căn giữa, không lỗi `findPortfolioLayoutIssues`.
  - Xem ảnh Dual (tiêu đề ba dòng) và Bands (VI): đúng kiểu B đã chọn.
- **Phải sửa:** không.
- **Nên sửa:** không.
- **Ghi nhận (không chặn):** khung 4:3 đã gồm phần đệm nên phần ruột là 114,2 × 84,4 mm (tỉ lệ 1,36); crop Landscape đo được 111,8 × 83,8 mm, nên lề trắng trên / dưới 3,3 mm còn trái / phải 4,4 mm (lệch 1,1 mm, mắt thường khó thấy; demo kiểu B người vận hành đã xem có cùng đặc điểm). Muốn đều tuyệt đối thì để GD3-03 xử lý bằng `padding-inline`.
- **Cần người vận hành chốt:** duyệt gộp (đổi giao diện PDF, ADR-018).
- Token: Codex 36 % → 27 % (~9 %, Nhỏ).
- Kết luận: **ĐẠT** — người vận hành duyệt gộp 2026-11-15.
