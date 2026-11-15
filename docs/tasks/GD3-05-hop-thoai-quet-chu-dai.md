# GD3-05 — Hộp thoại đóng khi bấm ra ngoài, quét chữ dài (nhóm N5)

> **Trạng thái:** ĐẠT (Claude tự gộp `25d9fa8` theo ADR-018, 2026-11-15) · **Nhánh:** `gd3/05-hop-thoai-quet-chu-dai` (`git fetch; git switch -c gd3/05-hop-thoai-quet-chu-dai origin/main`) · **Ngày giao:** 2026-11-15 · **Cỡ:** Vừa (~10–12 file) · **Người đang code:** Claude — cửa sổ code
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

- Đã xong bước: 1, 2, 3, 4, 5 (cả năm).
- Người code: Claude — cửa sổ code · đã dùng trước / sau: không ghi (không có số token trong phiên).
- Nhánh, commit cuối: `gd3/05-hop-thoai-quet-chu-dai`, commit `wip(GD3-05 bước 5)` (xem `git log`).
- File đã đổi (ghi rõ file dùng chung):
  - **Dùng chung:** `src/admin/ui.ts` (thêm `shouldCloseDialogOnBackdrop`, `bindAdminDialogBackdropClose`); `src/styles/admin-ui.css` (meta của thanh công cụ preview cho xuống dòng, bỏ `overflow: hidden` / `nowrap`); `src/styles/admin-documents.css` (UI-15); `scripts/admin-screenshots.mjs` (nhãn *overflows* kèm lớp cha).
  - Dialog: `confirmDialog.ts`, `textInputDialog.ts`, `profilePhotoCropper.ts`, `projectCoverCropper.ts` (chuyển sang hàm chung); `coverLetterWorkspace.ts`, `main.ts` (Security), `profileDocumentWorkspace.ts`, `siteWorkspace.ts` (gắn mới); `credentialWorkspace.ts` (gắn mới + hỏi xác nhận).
  - Test: `ui.test.ts` (hàm thuần), `dialogBackdropContract.test.ts` (mới, hợp đồng).
- `verify:admin`: 214 / 214 test đạt (35 file); bundle JS 92,9 / 115,0 kB, CSS 26,7 / 27,0 kB gzip.
- `tools/dialog-backdrop-check.mjs`: **All PASS** (0 FAIL, kể cả kéo chuột ra ngoài không đóng, Keep editing, Discard changes).
- Thử phá test hợp đồng: bỏ dòng gắn của `renameDialog` trong `siteWorkspace.ts` → test báo `./siteWorkspace.ts: 3 dialog(s), 2 bind(s)`; đã `git checkout` lại, không commit.
- Kết quả `--stress`: laptop mọi view **0** overflows, **0** NO TOOLTIP; 1180×731 (profile, homepage, cv, portfolio, cover-letters, projects, tools) **0 / 0** sau khi sửa. Lần quét đầu ở 1180 có một lỗi: `div.admin-preview-toolbar__meta "Live draft · Synced · 46 issues"` bị cắt không tooltip ở ba view homepage → sửa bằng CSS (meta cho xuống dòng). Không còn mục nào cần thiết kế lại. Dòng *truncated with tooltip* còn lại là dữ liệu người dùng có tooltip, được phép (§6.2).
- Ghi chú vận hành cho docs: Add credential nay hỏi "Discard credential changes?" trên mọi đường đóng khi đã gõ. Meta thanh preview có thể thành hai dòng ở khung hẹp (Claude nên chụp kiểm chiều cao thanh khi review). Mẫu thẻ tool (`profileDocumentWorkspace.ts` ~901) không bị quét báo lỗi nên **không sửa**.
- Chỗ làm khác đề bài và lý do: mục 5 UI-15 sửa bằng CSS (state text `flex: none`, location co lại) thay vì tách track trong HTML; không rút ngắn câu vì vừa ở khung 1180. Thêm sửa CSS thanh preview ngoài danh sách (mục 7 cho phép sửa nhỏ).
- Câu hỏi: không.
## 6. Review của Claude

- Ngày, commit đã review: 2026-11-15, `e0cccac` (worktree `D:\wt\pf-review`, `npm ci` sạch). Người code là cửa sổ Claude code; người review là phiên thiết kế (độc lập).
- Đã kiểm (không dựa vào báo cáo):
  - `verify:admin`: 35 file / 214 test; Admin JS 92,9 / 115, **CSS 26,7 / 27,0 kB gzip**. Diff 16 file, đúng phạm vi mục 3; không migration, không dependency, không đụng trang công khai, CV, Portfolio, PDF.
  - **`tools/dialog-backdrop-check.mjs` (chạy lại bằng công cụ trên `main`): All PASS, 21 phép đo** (mốc trước khi sửa: 10 FAIL), gồm: 8 hộp chỉ đọc / một ô ngắn đóng khi bấm ngoài và không đóng khi bấm trong; Add credential nguyên vẹn đóng thẳng; kéo chuột từ ô nhập ra ngoài **không** đóng; gõ dở rồi bấm ngoài thì hỏi; "Keep editing" giữ hộp mở; "Discard changes" đóng hết.
  - Đọc mã: `bindAdminDialogBackdropClose` + hàm thuần `shouldCloseDialogOnBackdrop` (nhấn và thả đều phải trên nền); bốn dialog cũ dùng lại hàm chung; Add credential dùng bản chụp `FormData` (tính cả tên file đã chọn) và cùng `requestClose` cho Esc, Close, Cancel, bấm ngoài; test hợp đồng đếm `<dialog class="admin-dialog` so với số lần gắn trong từng file, có khẳng định dương (E-002); người code đã tự thử bỏ một lần gắn → test báo `3 dialog(s), 2 bind(s)`.
  - `npm run shots -- --stress`: laptop mọi view và 1180 × 731 (profile, homepage, cv, portfolio, cover-letters, projects, tools): **0** *overflows*, **0** *NO TOOLTIP*; `npm run shots` ba màn hình cho homepage / cv / portfolio: sạch.
  - UI-15: ảnh `portfolio-projects-tools.png` cho thấy "Ca Mau · Technical · 3 of 3 responsibilities" và "Thanh Hoa · Available once the project is Ready" hiện đủ chữ; chỉ phần địa điểm (dữ liệu người dùng) co lại.
  - **Thanh preview (thay đổi dùng chung, người code đã tự báo):** đo bằng Playwright, trước và sau, 3 trang × 6 độ rộng: từ **1440 px trở lên giống hệt (52 px, một dòng)**; ở 1280 và 1180 px thanh Website cao **64 px thay vì 52 px** vì dòng "Live draft · Synced · 46 issues" nay xuống hàng thay vì **bị cắt mất chữ "46 issues"** (nút mở Pre-publish check); CV / Portfolio và 1024 px không đổi. Chấp nhận: không thuộc ba màn hình mục tiêu và hết chữ bị cắt.
- **Phải sửa:** không.
- **Nên sửa:** không.
- **Ghi nhận:** (1) nhấn trên nền rồi thả trong hộp vẫn tính là bấm ngoài (trình duyệt gửi `click` tới `dialog` vì tổ tiên chung): bắt đầu bấm ở ngoài nên chấp nhận. (2) Mẫu thẻ tool ở `profileDocumentWorkspace.ts` không được `--stress` báo nên không sửa, đúng điều kiện đề bài. (3) % Claude "trước" 16 % thấp hơn "sau" 76 % của đề bài trước vì hạn mức tính chung cả tài khoản đã làm mới giữa hai đề bài.
- **Cần người vận hành chốt:** không.
- Token: Claude — cửa sổ code 16 % → 28 % đã dùng (~12 %, Vừa).
- Kết luận: **ĐẠT** — đủ điều kiện ADR-018 (chỉ Admin và script, không migration, không đổi trang công khai hay PDF): Claude gộp và push.
