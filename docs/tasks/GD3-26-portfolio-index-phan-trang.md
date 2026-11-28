# GD3-26 — Portfolio: trang Project index tự thêm trang khi nhiều dự án (nhóm N26)

> **Trạng thái:** GIAO CODE (làm **trước** GD3-25) · **Nhánh:** `gd3/26-portfolio-index-phan-trang` từ `main` · **Ngày giao:** 2026-11-28 · **Cỡ:** Vừa (~5 file) · **Người đang code:** Claude — cửa sổ code (hoặc Codex)
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

- Đã xong bước:
- Người code · đã dùng trước / sau:
- Nhánh, commit cuối:
- File đã đổi (ghi rõ file dùng chung):
- `verify:admin`:
- Công cụ đo (mốc FAIL trước → sau):
- **Sức chứa mỗi layout và cách đo:**
- **Checklist giao diện từng mục:**
- Chỗ làm khác đề bài và lý do:
- Câu hỏi:

## 6. Review của Claude

(chưa review)
