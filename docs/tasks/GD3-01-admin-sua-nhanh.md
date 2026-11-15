# GD3-01 — Admin sửa nhanh (nhóm N1)

> **Trạng thái:** ĐẠT (Claude tự gộp theo ADR-018, 2026-11-15) · **Nhánh:** `gd3/01-admin-sua-nhanh` (`git fetch; git switch -c gd3/01-admin-sua-nhanh origin/main`) · **Ngày giao:** 2026-11-15 · **Cỡ:** Vừa (~6–8 file) · **Người đang code:** Codex (token 61 %)
> **Gộp (ADR-018):** tự gộp được — chỉ Admin, không migration, không đổi trang công khai / PDF, không phải đề bài cuối giai đoạn.

## 1. Mục tiêu

Sửa ba chỗ khó chịu hằng ngày trong Admin mà người vận hành ghi ở sổ lỗi UI/UX: tên trên rail đổi chữ lúc tải (UI-10), chip **Archived** không bao giờ có kết quả (W-02), các nhóm override / media của Portfolio mở chồng lên nhau (UI-12).

## 2. Căn cứ

- Quy tắc (đã sửa sẵn, đọc đúng các đoạn này): `docs/admin-ui-guidelines.md` §5 (gạch đầu dòng "Bộ lọc trạng thái chỉ đưa lựa chọn có thể có kết quả"), §6.4 (gạch "Nhóm disclosure cùng cấp là accordion"), §11 "Nhận diện rail", §12 (`revealAdminElement`, cấm `scrollIntoView`), §13 (`localStorage` trong `try/catch`).
- Sổ: UI-10, UI-12 (`docs/92-ui-rules.md`), W-02 (`docs/93-workflow-friction.md`).
- Mẫu có sẵn để làm theo: `src/admin/headerDensity.ts` + `headerDensity.test.ts` (đọc / ghi `localStorage` có fallback và test fallback).

## 3. Phạm vi

**Làm:**

1. **UI-10 — tên trên rail không đổi chữ khi tải.**
   - Module mới `src/admin/adminIdentityName.ts`: `readStoredAdminIdentityName(storage?)` và `storeAdminIdentityName(name, storage?)`, khóa `hdl-admin-identity-name`, mọi truy cập trong `try/catch` (không có storage / lỗi → `""`, không ném lỗi).
   - `src/admin/main.ts`: `adminIdentityLabel` (dòng ~266) **bỏ dự phòng** `adminBrand.workspace`; không có Profile thì dùng tên đã lưu, không có nữa thì `""`. Shell (dòng ~1028) dựng ngay với tên đã lưu. Lưu tên khi Profile tải xong (dòng ~2175) và khi Profile được lưu (`updateAdminIdentity(…, true)`); **không** lưu khi đang gõ chưa lưu. Tên rỗng → không có `title`.
   - Bỏ `workspace` khỏi `adminBrand` trong `src/admin/brand.ts` nếu không còn nơi dùng.
   - Dòng tên rỗng **giữ chiều cao một dòng** (rail không nhảy khi tên xuất hiện): đặt `min-block-size` bằng line-height đang dùng của dòng đó, trong stylesheet đang chứa style `.admin-brand`. Vẫn gọi `fitAdminIdentityLabel` sau khi đổi chữ.
2. **W-02 — chip Archived chỉ hiện khi có kết quả.**
   - Hàm thuần mới (đặt cạnh logic lọc, ví dụ `src/admin/contentStatusFilters.ts`): nhận danh sách mục của view đang xem (Projects hoặc Tools), trả `["all", "draft", "published"]` và thêm `"archived"` chỉ khi có ≥ 1 mục `status === "archived"`.
   - `src/admin/main.ts` dòng ~1045 dùng hàm đó thay mảng cố định. Bộ lọc đang là `archived` mà không còn mục archived → về `all`.
3. **UI-12 — nhóm disclosure cùng cấp là accordion.**
   - `src/admin/profileDocumentWorkspace.ts`: các `<details class="admin-disclosure-group">` trong `[data-layout-overrides]` (Project / Automation / Credentials overrides, `layoutOverrideGroup` dòng ~264) dùng chung thuộc tính `name="portfolio-layout-overrides"`; các nhóm trong `[data-portfolio-media-assignments]` (Cover & closing / Projects / Automation tools, dòng ~289–291) dùng `name="portfolio-media-groups"`. Trình duyệt tự đóng nhóm khác khi mở một nhóm (exclusive accordion của `<details name>`).
   - Helper dùng chung mới trong `src/admin/ui.ts`: `bindAdminDisclosureReveal(root: ParentNode)` — với mọi `details.admin-disclosure-group[name]` trong `root`, khi `toggle` sang mở: chờ một `requestAnimationFrame` rồi `revealAdminElement(summary, { align: "start" })`. Gọi một lần sau khi workspace Portfolio dựng form. Không gọi `scrollIntoView`.

**Không làm (để sau):**
- Dropdown trang preview Homepage (W-01 → `GIỮ`).
- Accordion của bộ chọn layout (`data-layout-accordion`, đã có).
- Mọi thứ của nhóm N2, N3, N4.

**Ràng buộc dùng chung không được đổi:** breakpoint, token, `--admin-topbar-height`, chiều cao rail brand (§11 "Một chiều cao top-bar"), ngân sách bundle (JS 115 / CSS 27 kB gzip); không thêm dependency; không sửa `docs/`, `decisions/`, `AGENTS.md`, `MASTER_PLAN.md`. Liệt kê ở mục 5 mọi thay đổi trong `ui.ts`, `admin-ui.css`, `main.ts`.

**Phép tính chỗ:** không thêm phần tử mới trên rail; dòng tên rỗng phải bằng đúng chiều cao dòng tên có chữ (so `getBoundingClientRect().height`, chênh ≤ 1 px).

## 3b. Các bước (mỗi bước: test liên quan + commit `wip(GD3-01 bước k): …`)

1. `adminIdentityName.ts` + test; nối vào `main.ts`, bỏ dự phòng; CSS giữ chiều cao.
2. Hàm lọc trạng thái + test; nối vào danh sách Content.
3. `name` cho hai khối disclosure + `bindAdminDisclosureReveal` + test markup.
4. `verify:admin` toàn bộ; chụp `npm run shots -- --views=portfolio,projects,tools --screens=laptop` (phiên đăng nhập đã có trong `.auth/`); điền mục 5.

## 4. Tiêu chí nghiệm thu

- [ ] `adminIdentityName.test.ts`: đọc / ghi đúng; storage ném lỗi khi đọc và khi ghi → trả `""`, không ném; tên chỉ khoảng trắng → coi như rỗng.
- [ ] Test (vd. trong `adminStyles.test.ts` hoặc test của `main` hiện có): không còn chuỗi `Career workspace` trong `src/admin/`; CSS dòng tên có `min-block-size` (một `toContain` khẳng định, E-002).
- [ ] Test hàm lọc: không có archived → không có `"archived"`; có 1 archived → có; thứ tự `all, draft, published, archived`.
- [ ] Test markup: mọi nhóm do `layoutOverrideGroup` và Portfolio media render có `name="portfolio-layout-overrides"` / `name="portfolio-media-groups"`; `bindAdminDisclosureReveal` được export từ `ui.ts`; `adminStyles.test.ts` (cấm `scrollIntoView`) vẫn đạt.
- [ ] `npm run verify:admin` đạt **một lần ở cuối** (chạy từ `D:\…`, E-006).
- [ ] Không chuỗi giao diện mới (không cần EN / VI).
- [ ] Ảnh laptop 1440 × 731: rail, danh sách Projects / Tools, Portfolio › Appearance khi mở lần lượt ba nhóm override.

## 5. Báo cáo của người code

- Đã xong bước: 1, 2, 3, 4.
- Người code: Codex · token trước / sau: 61% / phiên Codex API không cung cấp chỉ số % còn lại.
- Nhánh, commit cuối: `gd3/01-admin-sua-nhanh` · `d96f544` (WIP bước 4; commit báo cáo ở ngay sau).
- File đã đổi (ghi rõ file dùng chung): dùng chung — `src/admin/main.ts`, `src/admin/ui.ts`, `src/styles/admin.css`; còn lại — `src/admin/brand.ts`, `src/admin/adminIdentityName.ts`, `src/admin/adminIdentityName.test.ts`, `src/admin/contentStatusFilters.ts`, `src/admin/contentStatusFilters.test.ts`, `src/admin/profileDocumentWorkspace.ts`, `src/admin/adminStyles.test.ts`, `src/admin/ui.test.ts`.
- `verify:admin`: 194 / 194 test đạt (31 file); bundle Admin JS 92,8 / 115,0 kB gzip, CSS 26,5 / 27,0 kB gzip.
- Giao diện đã chụp / đo: `npm run shots -- --views=portfolio,projects,tools --screens=laptop` tạo 10 ảnh 1440 × 731; kiểm tra rail, Projects, Tools và Portfolio › Appearance. Chụp bổ sung ba trạng thái Project / Automation / Credentials override bằng thay đổi nháp không lưu: mỗi trạng thái chỉ có 1 disclosure mở. Dòng tên rail có chữ 18 px, rỗng 18 px, chênh 0 px.
- Ghi chú vận hành cho docs: Không có; không migration, không dependency mới, không đổi ngân sách bundle.
- Chỗ làm khác đề bài và lý do: Không có.
- Câu hỏi: Không có.

## 6. Review của Claude

- Ngày, commit đã review: 2026-11-15, `b36e2ec` (worktree `D:\wt\pf-review`, `npm ci` sạch).
- Đã kiểm (không dựa vào báo cáo):
  - `verify:admin`: 31 file / 194 test; Admin JS 92,8 / 115, CSS 26,5 / 27 kB gzip.
  - Diff đúng 12 file liệt kê; không đổi breakpoint, token, chiều cao top-bar; không `scrollIntoView`.
  - `admin.css` là file dùng chung → `npm run shots` **mọi view × 3 màn hình**: không *uneven field row*, không cuộn ngang, không checkbox xuống dòng. 3 cảnh báo *NO TOOLTIP* ở thành phần nhánh không đụng (slug trong Homepage › Content selection, dòng meta và tên trong bộ chọn Cover Letter) → ghi [UI-13](../92-ui-rules.md#ui-13), không thuộc đề bài.
  - Đo hành vi bằng Playwright ở 1440 × 731, 1920 × 940, 2560 × 1300 (phiên đăng nhập thật):
    - UI-10: lần đầu trên máy dòng tên `""` → `HUYNH DUC LUONG`, cao 18 px cả hai; lần sau tên có **ngay từ đầu, không đổi**; không còn "Career workspace".
    - W-02: chip lọc Projects và Tools = `all, draft, published` (không có mục archived).
    - UI-12: mở Project → Automation overrides: chỉ một nhóm mở; Portfolio media cũng vậy; tiêu đề nhóm vừa mở nằm trong khung nhìn (khung đã cuộn tới đáy nên không lên sát mép được — đúng); shell và `window` không cuộn.
- **Phải sửa:** không.
- **Nên sửa:** không.
- **Ghi nhận:** test của `bindAdminDisclosureReveal` chỉ kiểm hàm được export (Vitest không có DOM); hành vi đã đo ở review. Màu `#a9c2cc` của dòng tên là giá trị cứng có từ trước, không thuộc đề bài.
- **Cần người vận hành chốt:** không.
- Token: Codex 61 % → 36 % (~25 %, Vừa).
- Kết luận: **ĐẠT** — đủ điều kiện ADR-018 → Claude gộp và push.
