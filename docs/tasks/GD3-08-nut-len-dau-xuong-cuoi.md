# GD3-08 — Nút "lên đầu / xuống cuối" trong danh sách Projects / Tools (nhóm N8)

> **Trạng thái:** GIAO CODE · **Nhánh:** `gd3/08-nut-len-dau-xuong-cuoi` (`git fetch; git switch -c gd3/08-nut-len-dau-xuong-cuoi origin/main`) · **Ngày giao:** 2026-11-15 · **Cỡ:** Nhỏ (~4 file) · **Người đang code:** Claude — cửa sổ code (hoặc Codex nếu còn token)
> **Gộp (ADR-018):** tự gộp được nếu review sạch — chỉ Admin, không migration, không đổi trang công khai hay PDF.

## 1. Mục tiêu

Sổ #12 (W-11): đưa mục lên đầu / xuống cuối danh sách Projects / Tools bằng **một lần bấm**. Hiện hai việc này nằm trong menu ⋯ (2 lần bấm). Thay cụm `⋮⋮ ↑ ↓ ⋯` bằng `⋮⋮` + **lưới 2×2**:

```text
⋮⋮  [⇈] [↑]
     [⇊] [↓]
```

Người vận hành chọn (2026-11-15): lưới 2×2, **chưa** làm đổi chỗ tức thì (cập nhật giao diện trước khi lưu).

## 2. Căn cứ

- Sổ W-11 (`docs/93-workflow-friction.md`); `docs/admin-ui-guidelines.md` §6.4 (bullet "Sắp xếp mục trong danh sách Projects / Tools"), §6.2 (chữ dài), UI-14.
- Đã đo trên Admin thật: thẻ cao 69 px; cụm hiện tại 91 × 22 px, mỗi nút 22 × 22 px; ở 1024 px thẻ chỉ rộng 251 px.
- Code (`src/admin/main.ts`): markup mục ở dòng ~723 (`.admin-content-item__reorder`); menu `[data-reorder-menu]` (popover) ở ~1080; trình xử lý `[data-reorder-menu-trigger]` ~1828, `[data-reorder-edge]` ~1901 và `toggle` ~1895; `focusSelector.more` ở ~364; `reorderMasterItem(type, id, "first" | "last" | "up" | "down")` **đã nhận** `first` / `last`, giữ nguyên. CSS: `admin.css` ~439–448 (cụm và nút) và ~644–660 (`.admin-reorder-menu`), `admin-ui.css` ~906–925 (biểu tượng nút). Biểu tượng: `src/admin/ui.ts` đã có `adminArrowUpIcon`, `adminArrowDownIcon`.

## 3. Phạm vi

**Làm:**

1. Thêm biểu tượng `adminArrowTopIcon` / `adminArrowBottomIcon` trong `src/admin/ui.ts` (SVG cùng họ với mũi tên hiện có: mũi tên + vạch ngang ở đầu / cuối, `viewBox 0 0 16 16`, nét `currentColor`), không dùng ký tự ⇈ ⇊.
2. Markup mục: thay nút `[data-reorder-menu-trigger]` bằng hai nút `data-reorder-edge="first"` (`aria-label="Move <tên> to first"`, `title="Move to first"`, `disabled` khi `position.first`) và `data-reorder-edge="last"` (`"Move <tên> to last"`, `disabled` khi `position.last`); đặt lưới 2×2: hàng 1 = lên đầu, ↑; hàng 2 = xuống cuối, ↓. Tay kéo giữ nguyên bên trái. Mục duy nhất (`position.only`): cả bốn nút `disabled`.
3. Trình xử lý: cùng kiểu với `[data-reorder-direction]` (gọi `reorderMasterItem(type, id, edge)` đã có); **xóa** menu popover, các trình xử lý `[data-reorder-menu-trigger]`, `[data-reorder-edge]` của menu, `toggle`, và quy tắc CSS `.admin-reorder-menu`. `focusSelector.more` đổi thành `first` / `last` trỏ nút tương ứng; `reorderMasterItem` đặt `focus` về nút vừa bấm (`first` → `[data-reorder-edge="first"]`, `last` → `[data-reorder-edge="last"]`).
4. CSS: `.admin-content-item__reorder` thành `display: grid` hai cột cho bốn nút (tay kéo nằm ngoài lưới, căn giữa theo chiều dọc), giữ kích thước nút 22 px (và 36 px ở `@media (pointer: coarse)`, kiểm lại thẻ vẫn vừa); chỉ dùng token `--admin-*` / `--color-*` đã có; `:focus-visible` thấy rõ; không giá trị cứng mới.
5. **Test:** markup mục có bốn nút điều hướng với `aria-label` đúng; `disabled` đúng ở mục đầu, mục cuối, mục duy nhất; không còn `data-reorder-menu` trong markup; test CSS có khẳng định **dương** (E-002): quy tắc lưới của `.admin-content-item__reorder` có mặt.

**Không làm:** đổi nhanh giao diện kiểu optimistic (cập nhật trước khi lưu) — người vận hành chưa chọn; đổi kéo thả; đổi luồng `reorderMasterItem`, `persistMasterOrder`; các menu More (⋯) khác trong Admin (`renderAdminMoreMenu`); migration; dependency mới.

**Ràng buộc dùng chung:** ngân sách bundle (JS 115 kB, CSS 27,0 kB gzip: bỏ menu sẽ giảm chút); liệt kê ở mục 5 mọi thay đổi ở file dùng chung (`ui.ts`, `admin.css`, `admin-ui.css`).

## 3b. Các bước (mỗi bước: test liên quan + commit `wip(GD3-08 bước k): …`)

1. Biểu tượng + markup + trình xử lý + bỏ menu + test markup.
2. CSS lưới 2×2 + bỏ quy tắc menu + test CSS.
3. `verify:admin` một lần; chạy `npm run shots -- --views=projects,tools --stress` ở ba màn hình, xem ảnh thẻ; điền mục 5.

## 4. Tiêu chí nghiệm thu

- [ ] Một lần bấm ⇈ / ⇊ đưa mục lên đầu / xuống cuối; ↑ ↓ và kéo thả hoạt động như trước; sau khi bấm, tiêu điểm bàn phím ở lại nút vừa bấm (hoặc nút còn bật gần nhất nếu nó thành `disabled`).
- [ ] Ở 1024 px, 1440 × 731 và 1920 px: thẻ **vẫn cao 69 px** (không cao thêm), cụm không rộng hơn cụm cũ (91 px), tên dài (`--stress`) không tràn và vẫn có `title`; không dòng nào so le (UI-01).
- [ ] Mục đầu có ⇈ ↑ `disabled`, mục cuối có ⇊ ↓ `disabled`, danh sách một mục thì cả bốn `disabled`.
- [ ] Không còn `popover` / `data-reorder-menu` / `aria-haspopup` trong Projects / Tools.
- [ ] Tên truy cập cho cả bốn nút; focus-visible thấy rõ; cảm ứng (`pointer: coarse`) nút ≥ 36 px mà thẻ vẫn vừa.
- [ ] `npm run verify:admin` đạt một lần ở cuối (chạy từ `D:\…`, E-006); bundle trong ngân sách.

## 5. Báo cáo của người code

- Đã xong bước: 1, 2, 3 (xong cả đề bài)
- Người code: Claude — cửa sổ code · đã dùng trước / sau: không đo
- Nhánh, commit cuối: `gd3/08-nut-len-dau-xuong-cuoi` (xem `git log`)
- File đã đổi (ghi rõ file dùng chung): **dùng chung:** `src/admin/ui.ts` (+`adminArrowTopIcon`, `adminArrowBottomIcon`), `src/styles/admin.css` (lưới `.admin-content-item__reorder-grid`, focus-visible, bỏ `.admin-reorder-menu`); `admin-ui.css` không đổi (biểu tượng đã bao phủ `.admin-content-item__reorder button > svg`). **Khác:** `src/admin/main.ts` (bỏ menu + trình xử lý, thêm trình xử lý `[data-reorder-edge]`, focus first / last có dự phòng nút còn bật), mới `src/admin/reorderControls.ts` + `reorderControls.test.ts`.
- `verify:admin`: 229 / 229 test đạt; bundle JS 92,8 / 115,0 kB, CSS 26,6 / 27,0 kB gzip (giảm nhẹ)
- Số đo thẻ (cao, rộng cụm) ở 3 màn hình: chưa đo bằng số; xem ảnh `shots --stress` ở 3 màn hình: mọi thẻ cùng chiều cao (~70 px, cạnh nhau đều, không so le), tên dài cắt có `title`; cụm = tay kéo + 2 cột × 22 px. **Claude đo số khi review.**
- Chỗ làm khác đề bài và lý do: markup nút tách thành `reorderControls.ts` (đề bài để inline trong main.ts) để test được bằng hàm thuần; lưới nằm trong `div.admin-content-item__reorder-grid` (tay kéo ngoài lưới như đề bài). Focus sau ⇈ / ⇊: nút vừa bấm sẽ `disabled`, nên chuyển tới nút còn bật gần nhất (⇊ / ⇈ rồi ↓ / ↑) theo tiêu chí nghiệm thu.
- Câu hỏi: không

## 6. Review của Claude

- Ngày, commit đã review:
- **Phải sửa:**
- **Nên sửa:**
- **Cần người vận hành chốt:**
- Kết luận:
