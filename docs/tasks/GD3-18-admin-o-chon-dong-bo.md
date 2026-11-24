# GD3-18 — Admin › Portfolio › Projects & tools: ô chọn "In Portfolio" đồng bộ với cả Admin (nhóm N16)

> **Trạng thái:** ĐẠT (review 1 sạch; gộp 2026-11-24) · **Nhánh:** `gd3/18-admin-o-chon-dong-bo` từ `main` · **Ngày giao:** 2026-11-24 · **Cỡ:** Nhỏ (~3 file) · **Người đang code:** Claude — cửa sổ code (hoặc Codex)
> **Gộp (ADR-018):** chỉ Admin, không migration, không đổi giao diện công khai → Claude tự gộp được nếu review sạch.

## 1. Mục tiêu

Sửa Sổ #32 / W-31 / [UI-17](../92-ui-rules.md#ui-17): ô tick "In Portfolio" của hàng Portfolio đang **24 × 24 px** trong khi mọi checkbox khác của Admin là **13 – 16 px**. Đưa về **16 px** như CV và Background; vùng bấm vẫn ≥ 24 px bằng đệm của nhãn.

## 2. Căn cứ

- `docs/92-ui-rules.md` UI-17 (và UI-16); `docs/admin-ui-guidelines.md` đoạn "Hàng gọn (ADR-037)" ở phần Projects & tools, §14 mục 2, 5, 10, 12.
- **Số đo (1440 × 731, `getBoundingClientRect`):** Portfolio › Projects & tools: 22 ô **24 × 24** (`.admin-switch`), 3 ô trách nhiệm 13 × 13; Portfolio › Background 5 ô 16 × 16; CV › Projects & tools 3 ô 16 × 16; CV › Background 15 ô 16 × 16. Chevron 24 × 24 giữ nguyên (người vận hành: "dấu xuống phù hợp").
- Code: `src/styles/admin-documents.css` (khối "Portfolio project / tool rows": `.admin-portfolio-project__include input[type="checkbox"]` `width` / `height` 1.5rem; `.admin-document-selection .admin-switch input`), `tools/portfolio-selection-check.mjs` (phép `target`).
- **Ngân sách CSS Admin đã hết dư địa (27,0 / 27,0 kB):** thay đổi này phải **không tăng** CSS (ưu tiên xóa dòng thay vì thêm); nếu vẫn vượt, dừng và báo.

## 3. Phạm vi

**Làm:**

1. Hộp chọn của hàng dự án và hàng công cụ Portfolio: **16 × 16** (bỏ `width` / `height` 1.5rem; dùng kích thước chung như CV / Background), `accent-color: var(--color-primary)`, `margin: 0`. Nhãn `.admin-portfolio-project__include` (cả nhãn "In Portfolio" hiện, và ô khi nhãn ẩn ở hàng hẹp) có **vùng bấm ≥ 24 × 24 px** bằng `padding` (ví dụ `padding: .25rem`), toàn nhãn là vùng bấm. Hàng vẫn ≤ 72 px, một dòng, chip / tên không đổi chỗ.
2. Hàng hẹp (`@container pf-row` ≤ 22 rem): chữ nhãn vẫn ẩn sr-only, vùng bấm quanh ô vẫn ≥ 24 × 24.
3. Cập nhật **phép `target`** của công cụ đo: đo **vùng bấm** (hộp nhãn bao quanh ô), không đo hộp input; thêm phép `checkbox-size` (hộp chọn trong hàng Portfolio phải **bằng cỡ** checkbox của hàng CV ở cùng màn hình, ±1 px).
4. Test CSS dương (E-002) trong `adminStyles.test.ts`: khối hàng Portfolio không còn `width` / `height` 1.5rem cho hộp chọn; nhãn có đệm.
5. **Kiểm kê điều khiển (UI-17 điều 2, bắt buộc):** mục 5 có **bảng kích thước** mọi ô checkbox / nút chevron / chip trạng thái ở các màn hình Admin Portfolio, CV, Background, Homepage (grep + đo), nêu chỗ lệch với đa số kèm lý do; kèm checklist §14 từng mục và `docs/92` §2 như UI-16, đo ở 1440, 1180, 768, 390.

**Không làm:** đổi chevron; đổi hàng CV; hình công tắc kéo; tab khác; migration; dependency mới.

## 3b. Các bước

1. Sửa CSS hộp chọn + vùng bấm; `portfolio-selection-check` (phép `target`, `checkbox-size`) và `name-width` vẫn PASS.
2. Test CSS; kiểm kê điều khiển; `verify:admin` một lần (CSS không vượt 27,0 kB).

## 4. Tiêu chí nghiệm thu

- [ ] Hộp chọn "In Portfolio" 16 × 16 như CV / Background; vùng bấm (nhãn) ≥ 24 × 24 ở 1440, 1920, 2560 và các cột hẹp (1024, 768, 390).
- [ ] `node tools/portfolio-selection-check.mjs` All PASS (kể cả `checkbox-size`, `name-width`); hàng ≤ 72 px.
- [ ] Mục 5 có bảng kiểm kê kích thước điều khiển và checklist từng mục.
- [ ] `npm run verify:admin` đạt (từ `D:\…`), CSS Admin không vượt ngân sách.

## 5. Báo cáo của người code

- Đã xong bước: 1 – 2
- Người code · đã dùng trước / sau: Claude — cửa sổ code · chưa ghi token
- Nhánh, commit cuối: gd3/18-admin-o-chon-dong-bo (commit feat(GD3-18))
- File đã đổi (ghi rõ file dùng chung): src/styles/admin-documents.css, src/admin/adminStyles.test.ts, tools/portfolio-selection-check.mjs. Không file dùng chung.
- `verify:admin`: đạt; CSS Admin **27,0 / 27,0 kB** (không tăng so với trước; hết dư địa).
- Công cụ đo (mốc FAIL trước → sau): phép `checkbox-size` mới FAIL khi ô còn 13 × 13 (lần chạy giữa chừng, sau khi bỏ 1.5rem nhưng chưa đặt 1rem) và 0 × 0 do chọn nhầm ô ẩn của CV (lỗi công cụ, đã sửa chọn ô nhìn thấy); không đo mốc 24 × 24 bằng phép mới (mốc 24 × 24 lấy từ số đo của đề bài). Sau sửa: **All PASS**, ô 16 × 16 = CV 16 × 16 ở 1440 / 1920 / 2560; `target` đo hộp nhãn; `name-width` thêm vùng bấm ≥ 24 px, đạt ở 1024 / 768 / 390 (vùng bấm nhỏ nhất 24 px). Hàng 67 px (≤ 72, trước 64: nhãn cao hơn do đệm).
- **Bảng kiểm kê kích thước điều khiển** (1440 × 731, `getBoundingClientRect`, đã đo bằng Playwright ở Homepage, CV, Portfolio, Professional Profile, mọi tab):

  | Điều khiển | Kích thước | Ở đâu |
  |---|---|---|
  | Checkbox `admin-switch` (gồm "In Portfolio") | **16 × 16** | CV › Background, CV › Projects & tools, Portfolio › Background, Portfolio › Projects & tools |
  | Checkbox chọn nội dung Website | 16 × 16 | Homepage › Content selection |
  | Checkbox tùy chọn layout | 16 × 16 | Portfolio › Appearance |
  | Checkbox trách nhiệm (khi mở hàng) | **13 × 13** | CV và Portfolio, cùng nhau |
  | Radio / checkbox ẩn (segmented, layout option, treatment, section visibility) | 1 × 1 (ẩn thị giác, nhãn là vùng bấm) | Portfolio › Appearance, CV › Projects & tools, Homepage › Sections |
  | Chevron / nút mở rộng | **24 × 24** vuông (Portfolio, quyết định ADR-037); **40 × 40** (CV, Profile) | Portfolio › Projects & tools; CV › Projects & tools; Profile (Experience, Education, Credentials, Languages) |
  | Chip trạng thái `.status` | cao 22 | CV và Portfolio, Draft và Ready |
  | Vùng bấm "In Portfolio" (nhãn) | ≥ 24 × 24 (24 ở cột hẹp, nhãn ẩn) | Portfolio › Projects & tools |

  Lệch với đa số, **không sửa** (ngoài phạm vi): (1) checkbox trách nhiệm 13 × 13, lệch 16 nhưng CV và Portfolio giống nhau, và đề bài cấm đổi CV; (2) chevron Portfolio 24 so với CV / Profile 40: có chủ ý (ADR-037, người vận hành: "dấu xuống phù hợp"). Đề nghị Claude cân nhắc đưa checkbox trách nhiệm về 16 bằng một đề bài riêng.
- **Checklist giao diện từng mục (§14 × 16, docs/92 §2), so cạnh hàng CV và mọi nơi dùng cùng loại điều khiển:**

  §14: 1 đạt (`verify:admin`). 2 đạt (ô 16 × 16 như CV / Background / Homepage). 3 không kiểm (không đổi header). 4 đã đo hộp chọn, vùng bấm, tên, chiều cao hàng ở 1440, 1920, 2560, 1024, 768, 390; **chưa đo 1180**. 5 đạt về markup (`aria-label` giữ, nhãn vẫn bọc ô nên bấm nhãn là bấm ô); **chưa thử Tab thật** trên trình duyệt lần này. 6 – 9, 11, 13 – 16 không áp dụng / không đổi; mục 9 `shots --stress` **chưa chạy**. 10 đạt (không đổi viền / nền hàng). 12 đạt về chiều cao (hàng 67 px nhất quán cho 22 hàng, một dòng; `one-line` PASS).

  docs/92 §2: 2 đã đọc UI-17 và UI-16. 3 đã đo trạng thái hàng bật / tắt / Draft qua công cụ (không đổi). 4 chưa thử tên 120 ký tự lần này (không đổi tên / nội dung). 5 có số đo (bảng trên). 6 không file dùng chung. 7 không lỗi UI mới ngoài ghi chú checkbox trách nhiệm 13 px.
- Chỗ làm khác đề bài và lý do: ô đặt `width` / `height: 1rem` (không để mặc định) vì checkbox mặc định của trình duyệt là 13 × 13; CV có 16 qua `.admin-selection-card`. Hàng cao 67 px thay vì 64 px vì nhãn có đệm. Không có phép đo mốc cho 24 × 24 bằng chính phép mới.
- Câu hỏi:

## 6. Review của Claude

- Ngày, commit đã review: 2026-11-24, `f50aaf0` (worktree `npm ci` sạch, đã xóa; phiên `.auth` chép sang cổng 5198 vì cổng 5199 đang do coder GD3-19 giữ).
- **Checklist giao diện (UI-16, UI-17), Claude chạy lại từng mục, gồm các mục coder chưa kiểm:**
  - §14 mục 1 đạt: `verify:admin` 45 file / **338** test, Admin JS 92,8 / 115,0, CSS **27,0 / 27,0** kB gzip (không tăng).
  - Mục 2 đạt: `portfolio-selection-check` All PASS, `checkbox-size` Portfolio 16 × 16 = CV 16 × 16 ở 1440, 1920, 2560.
  - **Mục 4 đạt:** đo thêm **1180** (22 hàng cao 64 px, vùng bấm nhỏ nhất 24 px, không tràn) và 1024 / 768 / 390 (`name-width` đạt, vùng bấm 24 px, tên ≥ 148 px).
  - **Mục 5 đạt trên trình duyệt thật:** Tab đi công tắc (16 × 16, viền focus 3 px, `:focus-visible`) → chevron (24 × 24, viền 2 px) → ô trách nhiệm; bấm vào **đệm của nhãn** (góc, giữa, chữ "In Portfolio") đều bật / tắt ô (3 / 3).
  - **Mục 9 đạt (thay `shots --stress`, cổng 5199 đang bận):** tên 117 ký tự ở 1440 và 1180: 22 hàng không tràn ngang, không tràn trang, cắt "…" có `title`.
  - Mục 10, 12, 16 đạt: viền nét đứt Draft, chevron vuông, hàng 64 – 67 px (≤ 72), một dòng. Ảnh hàng đang mở ở 1440: ô tick hàng 16 px, ô trách nhiệm 13 px bên dưới.
  - `docs/92` §2 mục 3, 5 đạt; mục 4 (tên dài) đạt như trên; mục 6 không file dùng chung. **Kiểm kê điều khiển (UI-17 điều 2):** bảng của coder đúng với số đo của tôi (checkbox 16 ở CV, Background, Homepage, Appearance; chevron 24 / 40 có chủ ý).
- **Phải sửa:** không. **Nên sửa:** không.
- **Ghi nhận:** (1) hàng cao 67 px ở 1440 / 1920 / 2560 (nhãn có đệm .25rem) nhưng 64 px ở cột hẹp; cả hai ≤ 72, chấp nhận. (2) **Checkbox trách nhiệm còn 13 × 13** (mặc định trình duyệt) ở CV và Portfolio, nằm ngay dưới ô 16 px của hàng: là chỗ lệch cuối cùng của UI-17. Sửa bằng **một quy tắc chung** `.admin-shell input[type="checkbox"] { width: 1rem; height: 1rem }` và bỏ các quy tắc kích thước riêng trùng (để CSS Admin **không tăng**, ngân sách 27,0 / 27,0): giao thành đề bài riêng sau (W-31, ghi trong docs/93). (3) Token: Claude — cửa sổ code chưa ghi, để trống `docs/96`.
- Kết luận: **ĐẠT**; Admin-only, không migration, không đổi giao diện công khai → **tự gộp (ADR-018)**.
