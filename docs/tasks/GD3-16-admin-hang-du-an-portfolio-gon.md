# GD3-16 — Admin › Portfolio › Projects & tools: hàng dự án gọn, công tắc cùng hàng với tên (nhóm N14)

> **Trạng thái:** ĐẠT (review 1 sạch; gộp cùng GD3-15, 2026-11-24) · **Nhánh:** `gd3/16-admin-hang-du-an-portfolio-gon` từ `main` (sau khi GD3-15 đã gộp hoặc đã trả nhánh) · **Ngày giao:** 2026-11-24 · **Cỡ:** Nhỏ (~3 file) · **Người đang code:** Claude — cửa sổ code (hoặc Codex)
> **Gộp (ADR-018):** chỉ Admin, không migration, không đổi giao diện công khai hay PDF → **Claude tự gộp được** nếu review sạch.

## 1. Mục tiêu

Hàng dự án và công cụ trong tab Projects & tools của Portfolio gọn lại (ADR-037, Sổ #27, W-26): ô "In Portfolio" là công tắc nhỏ **cùng hàng với tên**, hàng đã thu gọn cao ≤ 72 px (mốc 109 – 130 px).

## 2. Căn cứ

- `docs/admin-ui-guidelines.md` §6.4 (card mục, hàng gọn ADR-037), §6.2 (giá trị cắt có `title`), §14; [AGENTS §5](../../AGENTS.md) mục 2, 5, 6 (renderer chung, a11y); `docs/92-ui-rules.md` §2 (checklist UI) và UI-14.
- **Công cụ đo:** `node tools/portfolio-selection-check.mjs` (cần dev server cổng 5199 và `.auth/`). **Mốc trước khi làm: 8 FAIL** (`row-height` FAIL ở cả ba màn hình: 19 hàng cao 109 – 130 px ở 1440 và 1920, 82 – 83 px ở 2560; `one-line` FAIL ở 1440 và 1920; `target` FAIL ở cả ba; `no-overflow` PASS). Mục tiêu: **All PASS**.
- Code: `src/admin/portfolioProjectSelection.ts` (`renderPortfolioProjectRow`), `src/admin/profileDocumentWorkspace.ts` (`portfolioSelectionPanel`), CSS `src/styles/admin-documents.css` / `admin-ui.css`. Dùng `admin-ui.ts`, token `--admin-*`.

## 3. Phạm vi

**Làm:**

1. Hàng dự án và hàng công cụ: dòng 1 = tên (cắt gọn có `title`) + công tắc "In Portfolio" nhỏ bên phải + chevron; dòng 2 = "địa điểm · trạng thái" (meta). Công tắc là `<input type="checkbox" role="switch">` (hoặc tương đương) có `aria-label` nêu tên dự án, vùng bấm ≥ 24 px, `:focus-visible` rõ; chevron nút ≥ 24 px có tên truy cập, `aria-expanded`. Không còn dòng riêng cho ô chọn.
2. Giữ hành vi: chọn / bỏ chọn, trạng thái Draft / archived (chip cạnh tên, disabled, không đếm), số đếm của disclosure group, chuyển layout / override khi mở rộng hàng, `setAdminDirty`. Không đổi dữ liệu hay publish.
3. Hàng đóng gọn theo token (không giá trị cứng; không `opacity` làm mờ chữ); không tạo breakpoint mới.
4. **Test:** markup hàng (công tắc cùng khối với tên, `aria-label`, thoát chuỗi một lần); test CSS có khẳng định dương (hàng `display: grid/flex` một dòng tiêu đề, không `!important` mới).

**Không làm:** tab khác của Portfolio; đổi logic chọn dự án; trang công khai; migration; dependency mới.

## 3b. Các bước

1. Markup + CSS hàng dự án; `portfolio-selection-check` giảm FAIL.
2. Hàng công cụ (cùng mẫu).
3. `node tools/portfolio-selection-check.mjs` All PASS; `npm run shots` xem tab này nếu cần; `verify:admin` một lần; điền mục 5.

## 4. Tiêu chí nghiệm thu

- [ ] `node tools/portfolio-selection-check.mjs` **All PASS** (mốc 8 FAIL → 0): hàng ≤ 72 px ở 1440 / 1920 / 2560.
- [ ] Công tắc dùng được bằng bàn phím, có tên truy cập; chevron mở rộng hàng đúng.
- [ ] Hàng Draft / archived vẫn bị disabled, không đếm; tên dài cắt gọn có tooltip.
- [ ] `npm run verify:admin` đạt (từ `D:\…`); ngân sách bundle Admin không vượt.

## 5. Báo cáo của người code

- Đã xong bước: 1 – 3
- Người code · đã dùng trước / sau: Claude — cửa sổ code · chưa ghi token
- Nhánh, commit cuối: gd3/16-admin-hang-du-an-portfolio-gon (commit feat(GD3-16))
- File đã đổi (ghi rõ file dùng chung): src/admin/portfolioProjectSelection.ts (thêm renderPortfolioToolRow), src/admin/profileDocumentWorkspace.ts, src/styles/admin-documents.css, hai file test (portfolioProjectSelection.test.ts, adminStyles.test.ts). Không file dùng chung ngoài admin-documents.css.
- `verify:admin`: đạt. Ngân sách bundle Admin: JS 92.8 / 115.0 kB gzip, CSS 26.9 / 27.0 kB gzip (CSS tăng 0.2 kB, còn 0.1 kB dư địa: lần sau thêm CSS Admin phải gọn lại hoặc nâng ngân sách).
- `tools/portfolio-selection-check.mjs` (PASS / FAIL, mốc 8 FAIL): All PASS (22 hàng cao 64 px ở cả ba màn hình).
- Chỗ làm khác đề bài và lý do: hàng công cụ viết lại bằng renderPortfolioToolRow (cùng khung `admin-cv-project`), bỏ lớp `admin-selection-card` của hàng công cụ cũ. Chevron của hàng này thu còn 24 px (đề bài cho ≥ 24 px) để hàng ≤ 72 px. Phát hiện `.admin-cv-project__options` có `display: grid` đè thuộc tính `hidden` → thêm quy tắc `[hidden] { display: none }`; quy tắc `.admin-document-selection article` (đệm, viền hex cứng) đè thẻ hàng nên đã ghi đè bằng `article.admin-portfolio-project` dùng token. Chưa chụp màn hình bằng mắt, chưa thử tab bằng bàn phím trên trình duyệt (mới đo bằng công cụ): cần Claude review kiểm.
- Câu hỏi:

## 6. Review của Claude

- Ngày, commit đã review: 2026-11-24, `41f9490` (worktree `npm ci` sạch, đã xóa; đo bằng dev server cổng 5199 vì phiên `.auth` gắn với cổng này).
- Đã kiểm (không dựa vào báo cáo):
  - `verify:admin`: 45 file / **337** test đạt; Admin JS 92,8 / 115,0 kB, CSS **26,9 / 27,0** kB gzip (còn dư 0,1 kB).
  - `node tools/portfolio-selection-check.mjs`: **All PASS 12 / 12** (22 hàng cao đúng 64 px ở 1440, 1920, 2560; mốc trước 8 FAIL, 109 – 130 px).
  - **Bàn phím trên trình duyệt thật (1440):** công tắc có `role="switch"` và `aria-label` "In Portfolio: <tên>"; Space bật / tắt đúng, số đếm "8 of 17" → "7 of 17" → trở lại, chevron ẩn khi tắt, hiện khi bật; chevron mở bằng Enter (`aria-expanded` true, hàng 232 px) và đóng lại 64 px. Không lưu gì (tải lại là bỏ).
  - Ảnh xem: hàng dự án (mở / đóng), hàng công cụ Ready / Draft (Draft bị disabled, nền muted) ở 1440.
- **Phải sửa:** không. **Nên sửa:** không.
- **Ghi nhận:** (1) hai lỗi cũ người code tìm ra và sửa đúng chỗ (`[hidden]` bị `display: grid` đè; quy tắc `.admin-document-selection article` hex cứng). (2) **Ngân sách CSS Admin chỉ còn dư 0,1 kB**: đề bài Admin kế tiếp phải làm gọn CSS hoặc xin nâng ngân sách (ghi vào `docs/admin-operations.md`). (3) Hình công tắc vẫn là ô vuông có nhãn (giống mẫu `admin-switch` hiện có), đúng phạm vi đề bài.
- Kết luận: **ĐẠT**; Admin-only, không migration, không đổi giao diện công khai → **đủ điều kiện tự gộp (ADR-018)**.
