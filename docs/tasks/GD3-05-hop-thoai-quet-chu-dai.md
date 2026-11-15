# GD3-05 — Hộp thoại đóng khi bấm ra ngoài, quét chữ dài (nhóm N5)

> **Trạng thái:** GIAO CODE · **Nhánh:** `gd3/05-hop-thoai-quet-chu-dai` (`git fetch; git switch -c gd3/05-hop-thoai-quet-chu-dai origin/main`) · **Ngày giao:** 2026-11-15 · **Cỡ:** Vừa (~10–12 file) · **Người đang code:** Claude — cửa sổ code
> **Gộp (ADR-018):** tự gộp được — chỉ Admin, script và công cụ đo, không migration, không đổi trang công khai hay PDF, không phải đề bài cuối giai đoạn.

## 1. Mục tiêu

1. **W-07 (Sổ #9):** mọi hộp thoại Admin đóng khi bấm ra ngoài vùng hộp, qua **một hàm dùng chung** và có test báo lỗi nếu hộp thoại mới quên gắn; hộp **Add credential** hỏi xác nhận khi đã gõ dở.
2. **UI-15:** hết chữ cố định bị cắt không tooltip ở thẻ chọn dự án CV / Portfolio; quét lại bằng `--stress` ở 1440 và 1180 px.

## 2. Căn cứ (đã sửa sẵn)

- `docs/admin-ui-guidelines.md` §8.1 gạch "**Đóng:**" (toàn bộ hành vi ở đó là yêu cầu của đề bài); §6.2 (chữ cố định không co, dữ liệu người dùng cắt có tooltip); §11, §14 mục 9 (`--stress`).
- Sổ: W-07, UI-15 (`docs/92-ui-rules.md`), ADR-028.
- **Công cụ đo, đã có trên `main`:** `node tools/dialog-backdrop-check.mjs` (cần `npm run dev -- --port 5199 --strictPort` đang chạy và `.auth/`). **Mốc trước khi sửa: 10 FAIL** (8 hộp "click outside closes" + 2 ca Add credential); ca "kéo chuột từ ô nhập ra ngoài không đóng" đang PASS và **phải còn PASS** sau khi sửa.
- Code: `src/admin/ui.ts`; các dialog hiện có ở `confirmDialog.ts:52`, `textInputDialog.ts:62`, `profilePhotoCropper.ts:193`, `projectCoverCropper.ts:339` (đã tự đóng khi bấm ra ngoài bằng `if (event.target === dialog)`); các dialog **chưa** có: `coverLetterWorkspace.ts:351` (Check), `credentialWorkspace.ts:188` (Add credential), `main.ts:1068` (Security / mật khẩu), `profileDocumentWorkspace.ts:1245, 1246` (History, Pre-publish check của CV / Portfolio), `siteWorkspace.ts:247` (đổi tên ảnh), `siteWorkspace.ts:861, 862` (History, Pre-publish check của Website).

## 3. Phạm vi

**Làm:**

1. **Hàm dùng chung** `bindAdminDialogBackdropClose(dialog, requestClose)` trong `ui.ts`: đóng khi **cả nhấn lẫn thả** (`pointerdown` và `click`) đều có đích là chính `dialog` (nền); nhấn trong ô nhập rồi kéo ra ngoài **không** đóng; bấm trong hộp không đóng. Phần quyết định (đích nhấn, đích thả, `dialog`) là hàm thuần có test.
2. **Một đường đóng cho mỗi dialog:** Escape (`cancel`), nút Close, Cancel và bấm ngoài đều gọi cùng `requestClose` của dialog. Dùng hàm dùng chung cho **bốn dialog đã có** (xóa mã `event.target === dialog` lặp) và gắn cho **mọi dialog còn lại** ở mục 2 (hộp chỉ đọc và hộp một ô ngắn đóng thẳng).
3. **Add credential** (`credentialWorkspace.ts`): lúc mở lưu bản chụp giá trị các trường; trên **mọi đường đóng** (Esc, Close, Cancel, bấm ngoài), nếu giá trị đã khác thì hỏi qua `confirmAdmin` (cùng chữ với hộp crop: "Keep editing" / "Discard changes", `tone: "danger"`), nguyên vẹn thì đóng thẳng. Lưu thành công thì không hỏi.
4. **Test hợp đồng** (`adminStyles.test.ts` hoặc test riêng, đọc nguồn bằng `import.meta.glob` + `?raw` như các test hiện có): mỗi file trong `src/admin/` có `<dialog class="admin-dialog` phải gọi `bindAdminDialogBackdropClose` ít nhất một lần cho mỗi dialog của file đó; có ít nhất một khẳng định dương (E-002).
5. **UI-15:** thẻ chọn dự án CV (`cvProjectSelection.ts` ~dòng 47) và Portfolio (`portfolioProjectSelection.ts` ~dòng 41): chữ cố định "Summary · 3 of 3 responsibilities", "Technical · 3 of 3 responsibilities", "Available once the project is Ready" không được cắt: tách khỏi track chứa tên dự án (§6.2 gạch đầu: không đặt chữ cố định trong track `minmax(0, 1fr)` cạnh dữ liệu người dùng), rút ngắn câu nếu vẫn dài ở khung hẹp. Sửa cả mẫu cùng loại ở `profileDocumentWorkspace.ts` ~dòng 901 (thẻ tool).
6. **Bộ phát hiện** (`scripts/admin-screenshots.mjs`): nhãn `overflows its container → <tag.class>` thêm lớp của cha, ví dụ `div (in .admin-profile-entry-card__heading)`, để lần ra chỗ lỗi.
7. **Quét lại:** `npm run shots -- --stress --screens=laptop` (mọi view) và `npm run shots -- --stress --views=profile,homepage,cv,portfolio,cover-letters,projects,tools --viewport=1180x731`. Sửa mọi dòng *overflows its container* / *NO TOOLTIP* còn lại **nếu sửa nhỏ** (tooltip, `min-width: 0`, `width: 100%`, tách track); dòng nào cần thiết kế lại thì **liệt kê ở mục 5, không sửa**.

**Không làm:** hộp thoại mới; đổi bố cục hộp; N6 (link video), N7 (preview); đổi trang công khai, CV, Portfolio, PDF; migration; dependency mới; nâng ngân sách bundle.

**Ràng buộc dùng chung không được đổi:** breakpoint, token, cấu trúc dialog (§8.1 header / body / footer), `admin-ui.css` chung ngoài phần cần cho mục 5; ngân sách bundle **JS 115 kB, CSS 27,0 kB gzip** (hiện CSS 26,6: phần thêm phải nhỏ; vượt thì **dọn CSS thừa trước**, không nâng ngân sách). Liệt kê ở mục 5 mọi thay đổi trong `ui.ts`, `main.ts`, các file dialog, `scripts/`.

## 3b. Các bước (mỗi bước: test liên quan + commit `wip(GD3-05 bước k): …`)

1. Hàm dùng chung + test thuần; chuyển bốn dialog cũ sang dùng nó.
2. Gắn cho các dialog còn lại + test hợp đồng.
3. Add credential: bản chụp giá trị + hỏi xác nhận trên mọi đường đóng.
4. UI-15 và mẫu cùng loại.
5. Nhãn bộ phát hiện + quét `--stress` + `verify:admin` + chạy `tools/dialog-backdrop-check.mjs` + điền mục 5.

## 4. Tiêu chí nghiệm thu

- [ ] `node tools/dialog-backdrop-check.mjs` ra **All PASS** (kể cả "Keep editing" giữ hộp mở, "Discard changes" đóng; kéo chuột ra ngoài không đóng).
- [ ] Test thuần của hàm dùng chung (nhấn nền + thả nền → đóng; nhấn trong + thả nền → không; nhấn nền + thả trong → không; đích khác `dialog` → không) và test hợp đồng đạt; cố ý xóa một lần gắn trong một dialog thì test hợp đồng **báo lỗi** (ghi kết quả thử vào mục 5, không commit phần xóa).
- [ ] `npm run verify:admin` đạt một lần ở cuối (chạy từ `D:\…`, E-006); CSS ≤ 27,0 kB gzip, JS ≤ 115 kB.
- [ ] `npm run shots -- --stress --screens=laptop` (mọi view): **0** dòng *overflows*, **0** *NO TOOLTIP* (hoặc danh sách còn lại ở mục 5 kèm lý do cần thiết kế lại); cùng yêu cầu cho lượt `--viewport=1180x731`.
- [ ] Không *uneven field row*, không cuộn ngang ở `npm run shots` các view đã đổi.
- [ ] Không chuỗi giao diện song ngữ mới (chuỗi Admin tiếng Anh).

## 5. Báo cáo của người code

- Đã xong bước:
- Người code: · đã dùng trước / sau:
- Nhánh, commit cuối:
- File đã đổi (ghi rõ file dùng chung):
- `verify:admin`: số test đạt / tổng; bundle JS / CSS:
- `tools/dialog-backdrop-check.mjs` (số PASS / FAIL; dán dòng FAIL nếu có):
- Thử phá test hợp đồng (xóa một lần gắn → báo lỗi):
- Kết quả `--stress` (laptop mọi view; 1180 các view đã nêu); phần còn lại cần thiết kế lại:
- Ghi chú vận hành cho docs:
- Chỗ làm khác đề bài và lý do:
- Câu hỏi:

## 6. Review của Claude

- Ngày, commit đã review:
- **Phải sửa:**
- **Nên sửa:**
- **Cần người vận hành chốt:**
- Kết luận:
