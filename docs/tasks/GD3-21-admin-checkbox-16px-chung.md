# GD3-21 — Admin: mọi checkbox 16 px bằng một quy tắc chung (nhóm N19)

> **Trạng thái:** ĐẠT (review 1 sạch; gộp 2026-11-24) · **Nhánh:** `gd3/21-admin-checkbox-16px-chung` từ `main` · **Ngày giao:** 2026-11-24 · **Cỡ:** Nhỏ (~3 file) · **Người đang code:** Claude — cửa sổ code (hoặc Codex)
> **Gộp (ADR-018):** chỉ Admin, không migration, không đổi giao diện công khai → Claude tự gộp được nếu review sạch.

## 1. Mục tiêu

Việc còn lại của Sổ #32 / W-31 / [UI-17](../92-ui-rules.md#ui-17): checkbox trách nhiệm (khi mở hàng dự án ở CV và Portfolio) còn **13 × 13** (mặc định của trình duyệt) ngay dưới ô "In Portfolio" 16 × 16. Đưa **mọi** checkbox của Admin về **16 × 16** bằng **một quy tắc chung**, và **bỏ các quy tắc kích thước riêng bị trùng** để CSS không tăng.

## 2. Căn cứ

- UI-17: hộp điều khiển theo kích thước chung của Admin; vùng bấm ≥ 24 px bằng đệm nhãn, không phóng to hộp. `docs/admin-ui-guidelines.md` (đoạn "Hàng gọn", §6.3).
- **Số đo hiện có** (GD3-18, 1440 × 731): checkbox `admin-switch` 16 × 16; chọn nội dung Website 16; layout Appearance 16; **trách nhiệm 13 × 13** (`.admin-cv-project__responsibilities input`, CV và Portfolio); radio / checkbox ẩn thị giác 1 × 1 (segmented, layout option) **không đụng**.
- Code: `src/styles/admin-ui.css` (`.admin-shell :where(input[type="checkbox"], input[type="radio"]) { accent-color }`); `src/styles/admin-documents.css` (các quy tắc `width: 1rem` / `height: 1rem` riêng: khoảng dòng 87, 618, 663, 949; `.admin-cv-project__responsibilities input` ~dòng 1090); `src/styles/admin-site.css`.
- **Ngân sách CSS Admin đã hết dư địa (27,0 / 27,0 kB):** thay đổi phải **không tăng** CSS; xóa các quy tắc kích thước riêng khi quy tắc chung đã làm thay.

## 3. Phạm vi

**Làm:**

1. **Công cụ đo** `tools/admin-checkbox-size-check.mjs` (mới, theo mẫu `portfolio-selection-check.mjs`): mở các màn hình Admin có checkbox (Homepage › Content selection, CV › Projects & tools / Background, Portfolio › Projects & tools (mở một hàng để thấy trách nhiệm) / Background / Appearance, Cover letters nếu có) ở 1440 × 731; **mọi** `input[type=checkbox]` nhìn thấy được (bỏ ô ẩn thị giác 1 × 1 của segmented) phải **16 × 16 ± 1**; in số lượng theo kích thước. **Chạy trên mốc hiện tại trước khi sửa, ghi số FAIL vào mục 5.**
2. Thêm **một** quy tắc chung ở `admin-ui.css`: `.admin-shell input[type="checkbox"]` `width: 1rem; height: 1rem` (giữ `accent-color`, `margin: 0` nếu cần, **không** đụng radio và ô ẩn thị giác: dùng `:not(...)` hoặc selector theo ngữ cảnh đã có). Xóa các quy tắc `width` / `height` 1rem riêng trong `admin-documents.css` / `admin-site.css` mà quy tắc chung đã bao (giữ phần không trùng). Quy tắc riêng của checkbox trách nhiệm chỉ giữ lại phần bố cục (khoảng cách, căn dòng), không còn kích thước.
3. Hàng Portfolio (`.admin-portfolio-project__include input`), hàng CV, mọi hàng đã có **không đổi bề ngoài** (chiều cao hàng 64 / 67 px của GD3-17, 18 giữ nguyên): chạy lại `node tools/portfolio-selection-check.mjs` (All PASS).
4. Test CSS dương (E-002) trong `adminStyles.test.ts`: quy tắc chung 16 px tồn tại ở `admin-ui.css`; `.admin-cv-project__responsibilities input` không còn `width` riêng; không `!important` mới.
5. **Kiểm kê điều khiển (UI-17 điều 2) và checklist từng mục (§14 × 16, docs/92 §2):** mục 5 có bảng kích thước checkbox **trước và sau** theo màn hình, và nêu chỗ ngoại lệ kèm lý do (ví dụ ô ẩn thị giác); đo thêm ở 1180, 768 và 390; chạy `npm run shots -- --stress` (tắt dev server cổng 5199 trước, E-… cổng trùng) và báo không còn *overflows* / *uneven*.

**Không làm:** radio; công tắc kéo; chevron; đổi đệm hàng; màn hình công khai; migration; dependency mới.

## 3b. Các bước

1. Công cụ đo + mốc FAIL.
2. Quy tắc chung + xóa quy tắc trùng; công cụ All PASS; `portfolio-selection-check` All PASS.
3. Test CSS, kiểm kê, `verify:admin` một lần (CSS Admin ≤ 27,0 kB), điền mục 5.

## 4. Tiêu chí nghiệm thu

- [ ] `node tools/admin-checkbox-size-check.mjs` All PASS (mốc FAIL → 0): mọi checkbox nhìn thấy 16 × 16 ở các màn hình Admin đã liệt kê.
- [ ] `node tools/portfolio-selection-check.mjs` vẫn All PASS (hàng không đổi chiều cao).
- [ ] CSS Admin **không tăng** (≤ 27,0 kB gzip); bảng kiểm kê trước / sau có trong mục 5.
- [ ] `npm run verify:admin` đạt (từ `D:\…`), `shots --stress` sạch.

## 5. Báo cáo của người code

- Đã xong bước: 1 – 3
- Người code · đã dùng trước / sau: Claude — cửa sổ code · chưa ghi token
- Nhánh, commit cuối: gd3/21-admin-checkbox-16px-chung (commit feat(GD3-21))
- File đã đổi (ghi rõ file dùng chung): **dùng chung:** src/styles/admin-ui.css (quy tắc chung), src/styles/admin.css (bỏ `.admin-switch input { width: auto }`); src/styles/admin-documents.css, admin-site.css, admin-cover-letter.css (bỏ quy tắc kích thước riêng); src/admin/adminStyles.test.ts; tools/admin-checkbox-size-check.mjs (mới).
- `verify:admin` (CSS gzip trước / sau): đạt; CSS Admin **27 638 byte (27,0 kB) → 26,9 kB** (giảm, còn dư địa nhỏ). JS không đổi (92,8 kB).
- Công cụ đo (mốc FAIL trước → sau): `admin-checkbox-size-check` mốc **2 FAIL** (CV › Projects & tools: 4 ô 13 × 13; Portfolio › Projects & tools: 3 ô 13 × 13; ở 1440 × 731, sáu màn hình) → **All PASS** ở 1440, 1180, 768, 390 (`--all-widths`). Tôi thêm màn Cover letters › Evidence **sau** mốc (22 ô, 16 × 16 sau khi sửa; trước sửa không đo). `portfolio-selection-check` vẫn **All PASS** (hàng 67 px).
- **Bảng kiểm kê kích thước checkbox trước / sau** (1440 × 731; sau đo thêm ở 1180, 768, 390, kết quả giống):

  | Màn hình | Trước | Sau |
  |---|---|---|
  | Homepage › Content selection | 44 ô 16 × 16 | 44 ô 16 × 16 |
  | CV › Projects & tools (mở một hàng) | 3 ô 16, **4 ô 13 × 13** (trách nhiệm) | 7 ô 16 × 16 |
  | CV › Background | 15 ô 16 | 15 ô 16 |
  | Portfolio › Projects & tools (mở một hàng) | 22 ô 16, **3 ô 13 × 13** | 25 ô 16 × 16 |
  | Portfolio › Background | 5 ô 16 | 5 ô 16 |
  | Portfolio › Appearance | 1 ô 16 | 1 ô 16 |
  | Cover letters › Evidence | (không đo trước; nhận 16 qua `!important` cũ) | 22 ô 16 × 16 |
  | Overview, Projects, Tools, Profile, Trash | không có checkbox | không có checkbox |

  Ngoại lệ có chủ ý: radio và checkbox ẩn thị giác 1 × 1 (segmented, layout option, image treatment, section visibility) **không đo, không đổi** (quy tắc chung có độ ưu tiên 0 nên các quy tắc kích thước ẩn riêng của chúng vẫn thắng).

  Quy tắc đã xóa / gọn: `.admin-switch input { width: auto }` (admin.css); `.admin-document-selection .admin-switch input`, `.admin-cv-selection .admin-switch input` (width: auto); `width: auto` của `.admin-cv-project__responsibilities input`, `.admin-cv-background__item > input`, `.admin-layout-picker__optional-toggle input`, `.evidence-option input`; `.admin-site-content-selection__toggle input { width: auto !important }`; `width / height / accent-color / !important` của `.admin-selection-card :is(...)`; `width / height` của `.admin-inline-check input` và `.admin-portfolio-project__include input`. Thêm đúng **một** quy tắc: `.admin-shell :where(input[type="checkbox"]) { width: 1rem; height: 1rem }`. (Các quy tắc `width: auto` thắng quy tắc chung ở độ ưu tiên, nên phải xóa, không chỉ thêm.)
- **Checklist giao diện từng mục (§14 × 16, docs/92 §2):**

  §14: 1 đạt. 2 đạt (mọi màn Admin có checkbox cùng 16 × 16). 3 không kiểm (không đổi header). 4 đã đo checkbox ở 1440, 1180, 768, 390; **chưa đo chiều cao hàng ở 1180** (hàng Portfolio đã đo ở 1440 / 1920 / 2560 bằng `portfolio-selection-check` và 1024 / 768 / 390 bằng `name-width`). 5 không đổi (tên truy cập giữ); chưa thử Tab thật. 6 – 9, 11, 13 – 16 không áp dụng. 9: `shots --stress` xem dưới. 10, 12 đạt: hàng Portfolio vẫn 67 px, một dòng (`portfolio-selection-check` All PASS).

  `shots --stress`: **không sạch**, nhưng **không do thay đổi này**: còn *overflows its container → span (in small)* ở laptop và monitor2 › portfolio-projects-tools. Tôi chạy lại trên `main` (stash thay đổi) và **cùng dòng đó xuất hiện** → có sẵn từ trước (rất có thể từ nhãn "In Portfolio" có đệm của GD3-18 làm cột tên hẹp thêm 8 px, và dòng trạng thái `flex: none` của GD3-17). Ngoài phạm vi; Claude nên giao đề bài sửa. Không còn *uneven* hay *NO TOOLTIP*.

  docs/92 §2: 2 đã áp UI-17. 3 mọi trạng thái hàng không đổi. 4 dữ liệu dài xem `--stress`. 5 có số đo (bảng trước / sau). 6 file dùng chung đã liệt kê ở trên. 7 không UI mới ngoài lỗi *overflows* có sẵn.
- Chỗ làm khác đề bài và lý do: quy tắc chung dùng `:where(...)` (độ ưu tiên 0) thay vì `.admin-shell input[type="checkbox"]`, để không đè kích thước 1 × 1 của ô ẩn thị giác (không phải dùng `:not`). Xóa thêm nhiều quy tắc `width: auto` (cả `!important`) ngoài danh sách dòng của đề bài, vì chúng thắng quy tắc chung. Thêm màn Cover letters › Evidence vào công cụ đo (đề bài ghi "nếu có": có, 22 ô).
- Câu hỏi:

## 6. Review của Claude

- Ngày, commit đã review: 2026-11-24, `7aa7706` (worktree `npm ci` sạch, đã xóa; dev server riêng cổng 5198 vì cổng 5199 / 5173 đang do coder GD3-22 giữ; `.auth` chép sang 5198).
- **Checklist giao diện (UI-16, UI-17), Claude chạy lại từng mục:**
  - §14 mục 1 đạt: `verify:admin` 45 file / **340** test, Admin JS 92,8 / 115,0, CSS **26,9 / 27,0** kB gzip (giảm 0,1 kB, có dư địa trở lại).
  - Mục 2 đạt: `node tools/admin-checkbox-size-check.mjs --all-widths` **All PASS** ở 1440, 1180, 768, 390 (Homepage 44 ô, CV 7 + 15, Portfolio 25 + 5 + 1, Cover letters 22: tất cả **16 × 16**); `portfolio-selection-check` **All PASS** (22 hàng, **67 px** ở ba màn hình mục tiêu, không đổi so với GD3-18).
  - **Quét thêm của Claude (ngoài công cụ):** mười màn Admin (Overview, Homepage, Projects, Tools, Profile, CV, Portfolio, Cover letters, Trash, Security) và mọi tab của chúng ở 1440 × 900: mọi checkbox nhìn thấy **16 × 16** (Homepage 44, CV 18, Portfolio 28, Cover letters 22); không ô nào 13 × 13 hay 24 × 24; các màn khác không có checkbox.
  - Mục 4, 9, 10, 12, 16 không đổi bố cục hàng (67 px) và không đổi trạng thái disabled / Draft; `docs/92` §2 mục 6: file dùng chung đã đổi `admin-ui.css` (một quy tắc chung) và năm file CSS xóa quy tắc kích thước trùng (liệt kê đầy đủ ở mục 5); độ ưu tiên `:where` = 0 nên ô ẩn thị giác 1 × 1 không bị đè (đã xác nhận bằng công cụ: ô ẩn không nằm trong danh sách).
- **`shots --stress` của coder:** tôi **tái hiện được lỗi** bằng cách thay nhãn dòng meta của 3 hàng Portfolio bằng chuỗi ~130 ký tự: ở **1440 và 1920** phần tử `<span data-portfolio-project-state>` (dòng trạng thái) tràn ra ngoài hàng (mép phải 1066 px so với hàng 717 px; `text-overflow: clip`, `overflow: visible`); ở 2560, 1180, 768, 390 không tràn (cột đủ rộng hoặc quy tắc cột hẹp `pf-row` của GD3-17 đã cắt "…"). **Không do GD3-21** (đã có từ GD3-16 / GD3-17: quy tắc cắt chỉ nằm trong `@container pf-row (max-width: 22rem)`, không áp dụng ở hàng rộng); với dữ liệu thật hiện nay chuỗi trạng thái ngắn nên không thấy, nhưng vi phạm UI-14 (tên dài phải cắt "…" có tooltip). Ghi UI-18, sửa ở [GD3-24](GD3-24-admin-meta-hang-cat-gon.md).
- **Phải sửa:** không. **Nên sửa:** không (lỗi stress là việc có sẵn, giao đề bài riêng). **Cần người vận hành chốt:** không.
- **Ghi nhận:** (1) đúng khi **xóa** quy tắc `width: auto` / `!important` thay vì đè bằng `!important`. (2) Token: coder chưa ghi, để trống `docs/96`.
- Kết luận: **ĐẠT**; Admin-only, không migration, không đổi giao diện công khai → **tự gộp (ADR-018)**.
