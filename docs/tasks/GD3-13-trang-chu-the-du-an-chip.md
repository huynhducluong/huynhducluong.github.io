# GD3-13 — Trang chủ: thẻ dự án "SHEET" có ảnh và chip lọc theo công nghệ (nhóm N12)

> **Trạng thái:** GIAO CODE · **Nhánh:** `gd3/13-trang-chu-the-du-an-chip` **tách từ nhánh GD3-12** (`git switch gd3/12-trang-chu-blueprint-nen-hero; git switch -c gd3/13-trang-chu-the-du-an-chip`), vì hai đề bài gộp cùng một lần · **Ngày giao:** 2026-11-24 · **Cỡ:** Vừa (~4 file) · **Người đang code:** Claude — cửa sổ code (hoặc Codex)
> **Gộp (ADR-018):** người vận hành chốt "gộp cùng lúc" (2026-11-24): Claude review xong thì gộp `gd3/12` rồi `gd3/13` vào `main` và **push một lần** (một lần deploy); **cần người vận hành duyệt** (đổi giao diện công khai). Không có migration.

## 1. Mục tiêu

Phần dự án của trang chủ theo ADR-033 (d): **thẻ dự án kiểu "SHEET nn" có ảnh** và **chip lọc theo công nghệ**, tối ưu cho điện thoại (ADR-034).

## 2. Căn cứ

- `docs/ui-guidelines.md` §2.1 (thẻ SHEET, chip lọc), §2.2 (ma trận màn hình, quy tắc điện thoại), §3 (card: `--radius-lg` ở trang khác; ảnh `loading="lazy"`, `object-fit: cover`, khung ảnh cố định, `alt`; **không bao giờ để `<img>` hỏng**, thiếu ảnh dùng `.media-placeholder`), §5. ADR-033 (d), ADR-034.
- **Công cụ đo:** `node tools/home-viewport-check.mjs` (phải **All PASS**, như sau GD3-12; thẻ và chip nằm trong phép đo `tap`, `font`, `images`, `no-hscroll`).
- Code: `src/main.ts` mục `#projects` (`.project-grid`, `.project-card`); `src/site/renderers.ts` (`renderMedia`, `renderTags`) và `src/site/shell.ts` (`projectUrl`, `withWebsiteLanguage`); `home.css` quy tắc `.project-card*`, `.tag-list`.
- **Dữ liệu thật:** trên bản đã publish chỉ **2 / 6** dự án nổi bật có ảnh; dự án 05 và 06 chưa có tóm tắt và thẻ công nghệ. Thiết kế phải **trông có chủ ý** khi thiếu ảnh (không hiện chữ "Image will be added"), vì người vận hành sẽ gán ảnh dần.
- **Mẫu demo (tham khảo):** thẻ trắng viền 2 px `--color-primary`; ảnh 16:10 trên cùng (hai góc đánh dấu); thân: dòng "SHEET 01 · địa điểm" bằng chữ mono nhỏ, tên (`h3`, là link), vai trò, tóm tắt tối đa 3 dòng, thẻ công nghệ (tối đa 5), link "View project →". Chip: nút bo tròn cao 44 px, "All" + 7 công nghệ phổ biến nhất kèm số dự án; chip đang chọn nền `--color-primary-dark`.

## 3. Phạm vi

**Làm:**

1. **Thẻ dự án SHEET** thay `.project-card` của trang chủ: ảnh `project.images[0]` qua `renderMedia`, khung tỉ lệ cố định; **thiếu ảnh** dùng biến thể `.media-placeholder` không chữ, nền `--color-primary-light` có lưới nhẹ và số "SHEET nn" (decorative, `aria-hidden`); tên là link tới `projectUrl(slug, language)` (link ảnh chỉ để bấm, `tabindex="-1"` `aria-hidden="true"` để không đọc hai lần); tóm tắt `-webkit-line-clamp: 3` (không giấu bằng `…` giữa câu một cách vô tình: giữ như quy tắc hiện có, đây không phải N10); thẻ công nghệ tối đa 5; địa điểm và vai trò thiếu thì bỏ (không in "·" lẻ, không in "—").
2. **Chip lọc:** dải chip trên lưới thẻ (`role="group"` `aria-label` qua `copy` EN / VI); "All" + tối đa 7 công nghệ phổ biến nhất (đếm trên các dự án nổi bật, sắp theo số lượng rồi theo tên); nút `aria-pressed`; bấm chip ẩn thẻ không khớp bằng `hidden`, **thông báo số dự án** trong vùng `aria-live="polite"` (`sr-only`); dùng được bằng bàn phím; ≥ 44 px chiều cao; trên điện thoại chip **xuống dòng** (không cuộn ngang) hoặc cuộn ngang có `scroll-snap`, nhưng không tràn trang.
3. **Lưới thẻ theo màn hình:** điện thoại 1 cột, tablet 2 cột, máy tính 3 cột (`repeat(auto-fill, minmax(min(100%, 20rem), 1fr))`); không tạo breakpoint mới ngoài 900 / 650 hiện có.
4. **Khung bản vẽ của hero ôm sát nội dung** (tồn đọng ở review 5 của GD3-12, cùng `home.css`): khung ảnh hồ sơ đang có **dải trống 18 px dưới bảng tên** (khung `.hero__sheet` cao hơn nội dung, trông như ô chưa điền) và **khe 16 px giữa ảnh và bảng tên** ở mọi cỡ màn hình. Sửa để khung ôm sát: ảnh, bảng tên bản vẽ liền nhau, đáy khung trùng đáy ô cuối; tìm nguyên nhân (nghi do `.hero__sheet` giãn theo chiều cao cột chữ, khoảng trắng dưới `<img>` hoặc đệm của `.hero__viewport`). Công cụ đo có phép `titleblock-fit` (mốc **14 FAIL**).
5. **Test:** hàm đếm và chọn công nghệ cho chip (thuần): thứ tự, giới hạn 7, trùng lặp, rỗng; markup thẻ có ảnh / không ảnh / thiếu tóm tắt / thiếu địa điểm; escape (`&`, `<` trong tên, tag); nhãn EN và VI; test CSS có khẳng định **dương** (E-002): khung ảnh tỉ lệ cố định, chip cao ≥ 44 px, thẻ 1 cột ở điện thoại; không `!important` trong khối mới.

**Không làm:** ô Hero tagline và migration (GD3-14, làm sau khi gộp); trang `/projects/`; số liệu dự án (key facts, chưa có trong bản publish Website); tìm kiếm; phân trang; sắp xếp lại; migration; dependency mới.

**Ràng buộc dùng chung:** `renderProjectCard` và `.listing-card` của trang `/projects/` không đổi; ngân sách bundle Admin.

## 3b. Các bước

1. Hàm chip + test thuần.
2. Thẻ SHEET (markup, CSS, thiếu ảnh) + test.
3. Chip lọc (markup, hành vi, `aria-live`) + test.
4. `node tools/home-viewport-check.mjs` (All PASS); xem ảnh phần Projects ở 320×568, 390×844, 1440×731; `verify:admin` một lần; điền mục 5.

## 4. Tiêu chí nghiệm thu

- [ ] `node tools/home-viewport-check.mjs` **All PASS** (14 cỡ màn hình, gồm phép `titleblock-fit` mới: mốc 14 FAIL, sau sửa 0).
- [ ] Dự án thiếu ảnh hiển thị ô SHEET có chủ ý, **không** chữ "Image will be added", không ảnh hỏng.
- [ ] Bấm chip lọc đúng, "All" khôi phục đủ thẻ, `aria-pressed` và vùng `aria-live` đúng, dùng được bằng bàn phím.
- [ ] Ở 320 px: thẻ một cột, chip xuống dòng hoặc cuộn ngang gọn, không cuộn ngang trang.
- [ ] `npm run verify:admin` đạt (từ `D:\…`); `/projects/` và trang con không đổi.

## 5. Báo cáo của người code

- Đã xong bước: 1, 2, 3, 4 (làm một lượt, một commit)
- Người code: Claude — cửa sổ code · đã dùng trước / sau: không đo
- Nhánh, commit cuối: `gd3/13-trang-chu-the-du-an-chip` (tách từ gd3/12), xem `git log`
- File đã đổi (ghi rõ file dùng chung): `src/site/homeProjects.ts` (mới: `projectChips`, `renderProjectSheet`, `renderProjectFilter`, `bindProjectFilter`), `src/site/homeProjects.test.ts` (mới, 14 test), `src/main.ts` (mục #projects dùng hàm mới), `src/styles/home.css` (thẻ SHEET, chip, `.sr-only`, lưới auto-fill, `margin: 0` cho `.hero__titleblock`). Không đổi `renderers.ts`, `/projects/`.
- `verify:admin`: đạt (typecheck, test, build, ngân sách bundle: JS 92,8 / 115,0 kB, CSS 26,7 / 27,0 kB gzip)
- `tools/home-viewport-check.mjs` (PASS / FAIL): All PASS (14 cỡ màn hình; `titleblock-fit` từ 14 FAIL xuống 0)
- Chỗ làm khác đề bài và lý do: (1) nguyên nhân `titleblock-fit`: `<dl>` bảng tên còn lề mặc định 1em (16 px trên, 16 px dưới) — sửa `margin: 0`. (2) `.sr-only` chưa có ngoài admin.css nên thêm vào home.css. (3) Dữ liệu dev hiện chỉ có 2 dự án cùng công nghệ nên chưa thấy chip ẩn thẻ trên trình duyệt; logic lọc xem bằng đọc code, chưa có test DOM. (4) Dự án không ảnh: ô decorative không chữ; link ảnh `aria-hidden` + `tabindex="-1"`. Chưa chụp 1440×731 của phần Projects để so (có chụp 320/390/1440 vào `tmp/`, không commit).
- Câu hỏi: không

## 6. Review của Claude

- Ngày, commit đã review:
- **Phải sửa:**
- **Nên sửa:**
- **Cần người vận hành chốt:**
- Kết luận:
