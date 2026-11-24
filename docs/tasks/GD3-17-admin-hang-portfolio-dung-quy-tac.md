# GD3-17 — Admin › Portfolio › Projects & tools: sửa hàng cho đúng quy tắc (nhóm N15)

> **Trạng thái:** ĐẠT (review 2 sạch; gộp 2026-11-24) · **Nhánh:** `gd3/17-admin-hang-portfolio-dung-quy-tac` từ `main` · **Ngày giao:** 2026-11-24 · **Cỡ:** Nhỏ (~3 file) · **Người đang code:** Claude — cửa sổ code (hoặc Codex)
> **Gộp (ADR-018):** chỉ Admin, không migration, không đổi giao diện công khai → Claude tự gộp được nếu review sạch.

## 1. Mục tiêu

Sửa hai chỗ lệch quy tắc của GD3-16 (Sổ #30, W-29, [UI-16](../92-ui-rules.md#ui-16)), **đo cạnh hàng CV** (màn anh em): (1) hàng Draft / archived phải viền **nét đứt** và nền muted như hàng CV, không viền liền; (2) nút chevron phải **vuông**.

## 2. Căn cứ

- `docs/admin-ui-guidelines.md` §6.4, §6.7 ("Project Draft hoặc archived … card muted nét đứt") và đoạn "Hàng gọn (ADR-037)" trong phần Portfolio Projects & tools; `docs/92-ui-rules.md` UI-16 và §2 (checklist).
- **Số đo hiện tại** (1440 × 731, `getComputedStyle`): hàng Draft Portfolio `border-style: solid` (hàng CV Draft: `dashed`); chevron Portfolio **30 × 24** (CV: 40 × 40). Hàng bình thường 64 px (giữ ≤ 72).
- Code: `src/styles/admin-documents.css` (khối "Portfolio project / tool rows": quy tắc `.admin-document-selection article.admin-portfolio-project` đặt `border: 1px solid` và đè `.admin-cv-project.is-unavailable`; `.admin-portfolio-project .admin-cv-project__row > .admin-cv-project__toggle` đặt `width`, `height` nhưng giữ đệm ngang 14 px của `admin-icon-button`); `tools/portfolio-selection-check.mjs`.

## 3. Phạm vi

**Làm:**

1. Hàng `.is-unavailable` (Draft / archived, cả dự án lẫn công cụ) giữ `border-style: dashed` và `background: var(--admin-color-surface-muted)` của §6.7; chỉ ghi đè phần cần thiết (đệm, bo), không ghi đè viền / nền của trạng thái. Không `!important`.
2. Chevron: `padding: 0`, **`width` = `height` = 1.5rem**, icon ở giữa (`display: inline-grid; place-items: center`), vẫn `aria-expanded`, `aria-label`. Ba màn hình mục tiêu: hàng ≤ 72 px (giữ 64 px).
3. **Mở rộng `tools/portfolio-selection-check.mjs`** (nhỏ, đúng phạm vi): phép `state-style` (mọi hàng `.is-unavailable` có `border-style: dashed`), phép `icon-square` (chiều rộng nút chevron = chiều cao ± 1 px). Chạy trên **mốc hiện tại** trước khi sửa, ghi số FAIL vào mục 5.
4. **Test CSS dương** (E-002) trong `adminStyles.test.ts`: khối hàng Portfolio **không** đặt viền liền cho `.is-unavailable`; chevron `padding: 0` và `width`/`height` bằng nhau.
5. **Chạy checklist từng mục (UI-16, bắt buộc):** mục 5 liệt kê từng mục của `admin-ui-guidelines.md` §14 (16 mục) và `docs/92` §2 là đạt / không áp dụng / không đạt, **kèm số đo cạnh hàng CV** cho các trạng thái bật, tắt, Draft, mở, đóng (chiều cao, viền, nền, kích thước nút, cỡ chữ). Mục nào không đạt mà ngoài phạm vi: ghi, không tự sửa.

**Không làm:** đổi hình công tắc (vẫn ô chọn có nhãn như `admin-switch` hiện có); hàng CV; tab khác; migration; dependency mới. Ngân sách CSS Admin chỉ còn dư 0,1 kB: **bớt CSS thừa trong khối này** thay vì thêm; nếu vẫn vượt, dừng và báo.

## 3b. Các bước

1. Mở rộng công cụ đo, ghi mốc FAIL.
2. Sửa CSS (nét đứt, chevron vuông) + test CSS.
3. Chạy công cụ (All PASS), `verify:admin` một lần, so cạnh hàng CV và điền checklist mục 5.

## 4. Tiêu chí nghiệm thu

- [ ] `node tools/portfolio-selection-check.mjs` All PASS (kể cả hai phép mới; hàng vẫn ≤ 72 px).
- [ ] Hàng Draft / archived nét đứt giống hàng CV; chevron vuông.
- [ ] Mục 5 có checklist §14 và `docs/92` §2 từng mục, kèm số đo cạnh hàng CV.
- [ ] `npm run verify:admin` đạt (từ `D:\…`), ngân sách CSS Admin không vượt.

## 5. Báo cáo của người code

- Đã xong bước: 1 – 3
- Người code · đã dùng trước / sau: Claude — cửa sổ code · chưa ghi token
- Nhánh, commit cuối: gd3/17-admin-hang-portfolio-dung-quy-tac (commit feat(GD3-17))
- File đã đổi (ghi rõ file dùng chung): src/styles/admin-documents.css (không phải admin-ui.css), src/admin/adminStyles.test.ts, tools/portfolio-selection-check.mjs
- `verify:admin`: đạt; CSS Admin 26.9 / 27.0 kB gzip (không đổi so với GD3-16, nên không vượt).
- Công cụ đo (mốc FAIL trước → sau): 6 FAIL (state-style 3, icon-square 3: 10 hàng Draft / archived đều viền liền, 3 chevron 30 × 24) → All PASS; hàng vẫn 64 px ở cả ba màn hình.
- **Checklist giao diện từng mục (§14 × 16, docs/92 §2), so cạnh hàng CV:**

  Số đo 1440 × 731, `getComputedStyle`, hàng CV vs hàng Portfolio (cỡ chữ tiêu đề 14 px, meta 13 px ở cả hai):

  | Trạng thái | CV | Portfolio |
  |---|---|---|
  | Bật, đóng | 112 px · viền liền 1 px · nền trắng · nút 40 × 40 | 64 px · viền liền 1 px · nền trắng · nút 24 × 24 |
  | Tắt (excluded) | 112 px · liền · nền rgb(247,250,251) | 64 px · liền · cùng nền |
  | Draft | 113 px · **nét đứt** 1 px · nền rgb(234,242,245) | 64 px · **nét đứt** 1 px · cùng nền |
  | Mở (bật) | 309 px | 232 px |
  | Đóng lại sau khi mở | 112 px | 64 px (trở về đúng) |

  Khác có chủ ý: Portfolio gọn hơn (ADR-037) nên nút chevron 24 × 24 vuông, không 40 × 40.

  §14: 1 đạt (`verify:admin`). 2 đạt (hàng Portfolio dùng chung khung `admin-cv-project` với CV). 3 **không kiểm** (chưa đổi mật độ header). 4 **chỉ kiểm desktop** 1440 / 1920 / 2560; chưa kiểm ~1180 px và < 900 px (còn `@container` đặt lại cột). 5 đạt về markup (`aria-label`, `aria-expanded`); chưa thử Tab thực trên trình duyệt. 6 không áp dụng. 7 không áp dụng. 8 không áp dụng. 9 **chưa kiểm** dữ liệu dài tối đa (`shots --stress` chưa chạy); `title` và `min-width: 0` có sẵn. 10 đạt (hàng Draft nét đứt, muted như CV). 11 không áp dụng. 12 đạt cho các trạng thái bật / tắt / Draft / mở / đóng ở bảng trên (hàng không nhảy; công cụ `one-line` PASS); `npm run shots` chưa chạy. 13 không áp dụng. 14 đạt (số đếm không đổi, tool vẫn `data-selection-count-item`). 15 không áp dụng. 16 không áp dụng.

  docs/92 §2: 1 xem trên. 2 đã đọc UI-16 (nét đứt, nút vuông). 3 đạt cho bốn trạng thái (bảng). 4 **chưa thử** tên ~120 ký tự. 5 có số đo (bảng và công cụ). 6 file dùng chung: không có (chỉ `admin-documents.css`). 7 không thấy lỗi giao diện mới.

  Không đạt / chưa kiểm ngoài phạm vi, ghi để Claude xử lý: §14 mục 3, 4 (≈1180 và < 900), 9 (dữ liệu dài / `--stress`), kiểm bàn phím thật.
- Chỗ làm khác đề bài và lý do: quy tắc chung `.admin-document-selection article` đè luôn nền của hàng Tắt (excluded) nên thêm một quy tắc nền cho `[data-display="excluded"]` (cùng ý "đúng như CV"); không thêm file hay token. Đóng nhánh bằng một phép đo ngoài công cụ (file thăm dò tạm, đã xóa).
- Câu hỏi:

### 5b. Sửa sau review (Phải sửa 1: cột hẹp)

- Hàng Portfolio là container riêng (`container: pf-row / inline-size`), không breakpoint viewport mới. Khi rộng hàng ≤ 22 rem: chữ "In Portfolio" ẩn kiểu sr-only (ô chọn và `aria-label` giữ nguyên), chip Draft / Archived xuống dòng meta, địa điểm ẩn khi có dòng trạng thái (bỏ dấu "·" đứng đầu), dòng trạng thái cắt "…" và có `title` (cả khi đồng bộ lại sau đổi).
- Công cụ: thêm phép `name-width` (1024, 768, 390): trước sửa theo số đo review tên chỉ 5 – 35 px; sau sửa tên hẹp nhất **176 / 148 / 177 px** (≥ 128), hàng cao nhất 66 px, 0 meta bắt đầu bằng "·". Toàn bộ công cụ **All PASS**. Phép `name-width` dùng `click()` trong trang vì ở 390 px preview che tab; chưa chạy công cụ trên mốc cũ nên không có số FAIL của chính phép này.
- Ngân sách: bản đầu vượt (CSS 27,2 / 27,0 kB). Gỡ CSS chết trong `admin-documents.css` (`.admin-document-selection__item--tool`, `.admin-document-selection__identity` không còn markup nào dùng) và khối `@container cv-selection` thừa của GD3-16 → **27,0 / 27,0 kB** (đạt, hết dư địa). `verify:admin` đạt.
- Đã xem ảnh chụp hàng Draft và hàng bật ở 768 px. Lỗi này có từ GD3-16.

## 6. Review của Claude

- Ngày, commit đã review: 2026-11-24, `a2aa2c3` (nhánh checkout trong thư mục chính vì coder đã xong; dev server cổng 5199; đã tắt).
- **Checklist giao diện (UI-16), Claude chạy lại từng mục, gồm các mục coder chưa kiểm:**
  - §14 mục 1 đạt: `verify:admin` 45 file / **338** test, Admin JS 92,8 / 115,0, CSS 26,9 / 27,0 kB gzip (không đổi).
  - Mục 2 đạt (cùng khung `admin-cv-project` với hàng CV). Mục 3 không áp dụng (không đổi header).
  - **Mục 4 KHÔNG ĐẠT** (xem Phải sửa 1). Đo 22 hàng ở 1440, 1180, 899, 768, 390: cao đúng 64 px, không chồng ô chọn xuống dưới tên; nhưng ở cột hẹp tên bị bóp (bảng dưới).
  - Mục 5 đạt: Tab từ công tắc → chevron → công tắc kế, `:focus-visible` có viền 2 – 3 px ở cả ba; công tắc có `aria-label` nêu tên dự án.
  - Mục 9 đạt: `npm run shots -- --stress` không còn *overflows* / *uneven* / *NO TOOLTIP* (hàng Portfolio ở laptop, monitor1, monitor2); tên 117 ký tự cắt gọn "…" có `title` ở mọi độ rộng, không tràn trang.
  - Mục 10, 12, 16 đạt: hàng Draft / archived **nét đứt** và nền muted như hàng CV (công cụ: 10 hàng, 0 sai), hàng Tắt có nền subtle, chevron vuông 24 × 24 (3 chevron, 0 sai) ở cả ba màn hình mục tiêu. Mục 6, 7, 8, 11, 13, 14, 15 không áp dụng hoặc không đổi (số đếm "8 of 17" giữ đúng).
  - `docs/92` §2 mục 3 đạt bốn trạng thái (bật, tắt, Draft, mở / đóng 232 → 64 px); mục 4 xem Phải sửa 1; mục 5 có số đo; mục 6 không đổi file dùng chung.
- **Độ rộng tên dự án nhìn thấy** (`strong` ngắn nhất trong 22 hàng; cột form hẹp do preview chiếm chỗ):

  | Màn hình Admin | Rộng hàng | Tên hiện ra | Hàng Draft (tên cạnh chip) |
  |---|---|---|---|
  | 2560 / 1920 / 1440 | 919 / 637 / 431 px | ≥ 58 px (mọi tên ngắn nhất) | ≥ 68 px |
  | 1180 | 338 px | ≥ 58 px, tên dài còn ~15 ký tự | ≥ 68 px |
  | 1024 | 269 px | **33 px** (≈ 3 ký tự) | **33 px** |
  | 768 | 241 px | **5 px** (chỉ "C…" trước chip DRAFT) | **5 px** |
  | 390 | 270 px | **34 px** | **35 px** |

  (Sau GD3-16 công tắc có nhãn "In Portfolio" 68 px + ô 24 px + chevron 24 px + khoảng cách ≈ 140 px, nên rộng 240 – 270 px chỉ còn 30 px cho tên. Trước GD3-16 ô chọn nằm dưới tên nên tên có cả chiều rộng. Ảnh chụp 768 và 1180 đã xem; dòng meta còn dấu "·" đứng đầu vì địa điểm bị cắt hết.)
- **Phải sửa:**
  1. **Cột hẹp làm tên dự án gần như biến mất** (checklist §14 mục 4 "dưới 900 px", UI-16): ở rộng hàng ≤ ~22 rem (1024, 768, 390) tên chỉ còn 5 – 35 px, hàng Draft chỉ thấy chip. Sửa bằng container query của chính danh sách (`cv-selection` hoặc container mới, **không breakpoint mới theo viewport**): khi rộng hàng ≤ 22 rem (352 px) **ẩn chữ "In Portfolio" nhưng giữ `aria-label`** (hoặc `.sr-only`) để công tắc còn ô + nhãn truy cập, và để chip Draft / Archived **xuống dòng meta** thay vì chen cạnh tên. Mục tiêu đo: **tên hiện ra ≥ 8 rem (128 px) ở mọi rộng hàng ≥ 240 px**, hàng vẫn ≤ 72 px, không dấu "·" đứng đầu meta (bỏ phân cách khi địa điểm trống). Thêm phép `name-width` vào `tools/portfolio-selection-check.mjs` ở các độ rộng 1024, 768, 390 (đặt viewport rồi đo, có thể thêm vòng viewport phụ) và test CSS dương. Lỗi này **có từ GD3-16** (đã gộp): ghi nhận trong báo cáo.
- **Nên sửa:** không.
- **Cần người vận hành chốt:** không (không đổi hình thức ở màn lớn; ẩn chữ nhãn ở cột hẹp là quyết định kỹ thuật theo UI-16 / §14 mục 4, **Claude đề xuất và tự quyết**; nếu bạn muốn giữ chữ "In Portfolio" mọi lúc, cho tôi biết, phương án thay thế là xếp công tắc xuống dòng meta ở cột hẹp, hàng cao ~92 px).
- **Ghi nhận:** hai việc đề bài giao (nét đứt, chevron vuông) **đã đúng**; coder báo trung thực các mục chưa kiểm (đúng quy trình mới). Token: Claude — cửa sổ code 43 % → 44 %.
- Kết luận: **PHẢI SỬA** (một mục: cột hẹp, §14 mục 4).

### Review 2 (2026-11-24, `6919009`)

- **Checklist giao diện (UI-16) chạy lại cho phần sửa:** §14 mục 1 đạt (`verify:admin` 45 file / 338 test; Admin JS 92,8 / 115,0, CSS **27,0 / 27,0** kB gzip: vừa đủ, không dư); mục 4 **đạt** (1024, 768, 390: tên hẹp nhất 176 / 148 / 177 px ≥ 128, hàng 64 px; `name-width` PASS); mục 5 đạt (công tắc 24 × 24, nhãn chữ ẩn kiểu sr-only nhưng `aria-label` "In Portfolio: <tên>" còn nguyên, đo trên trình duyệt thật ở 768 và 390); mục 9: tên dài vẫn "…" có `title`, dòng trạng thái cắt có `title`; mục 10, 12, 16 vẫn đạt (nét đứt, chevron vuông, 3 màn hình mục tiêu All PASS 18 phép + 3 phép `name-width`).
- Ảnh xem: 768 (hàng Tắt, Draft, Bật; Draft chip xuống dòng meta, không còn dấu "·" đứng đầu).
- CSS gỡ ra là **chết thật** (đã grep: `.admin-document-selection__item--tool`, `.admin-document-selection__identity` không còn trong `src`).
- **Phải sửa:** không. **Nên sửa:** không. **Cần người vận hành chốt:** không.
- **Ghi nhận:** (1) ở cột hẹp địa điểm bị ẩn khi hàng có dòng trạng thái (chỉ còn trạng thái); chấp nhận vì địa điểm vẫn nằm ở hàng rộng và trong tooltip tên. (2) **Ngân sách CSS Admin đã hết dư địa (27,0 / 27,0)**: đề bài Admin kế tiếp phải bớt CSS hoặc xin nâng ngân sách ([docs/admin-operations.md](../admin-operations.md)). (3) Token: Claude — cửa sổ code 43 % → 47 % (~4 % cả hai lượt).
- Kết luận: **ĐẠT**; Admin-only, không migration, không đổi giao diện công khai → **tự gộp (ADR-018)**.
