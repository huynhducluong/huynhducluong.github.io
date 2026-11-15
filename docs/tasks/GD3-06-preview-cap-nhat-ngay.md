# GD3-06 — Preview cập nhật ngay, không chờ ảnh tải lười (nhóm N7)

> **Trạng thái:** NHÁP — giao sau khi GD3-05 gộp (một người ghi một lúc, AGENTS §1.1) · **Nhánh:** `gd3/06-preview-cap-nhat-ngay` (`git fetch; git switch -c gd3/06-preview-cap-nhat-ngay origin/main`) · **Ngày giao:** — · **Cỡ:** Nhỏ (~3 file) · **Người đang code:** Claude — cửa sổ code (hoặc Codex nếu còn đủ token, bảng chọn người code)
> **Gộp (ADR-018):** tự gộp được — chỉ chế độ preview (`?preview=1&embedded=1`) và Admin; trang công khai không kích hoạt bộ nhận preview nên không đổi.

## 1. Mục tiêu

Sửa **độ trễ preview** người vận hành báo ở Sổ #11 (W-09): bấm EN / VI liên tục thì preview chậm vài giây mới theo kịp, và cùng cơ chế làm mọi cập nhật preview (kể cả khi gõ trong form) trễ trên trang nhiều ảnh. **Giữ nguyên nút EN / VI đơn như hiện tại** (người vận hành chọn giữ kiểu cũ, ADR-028) và giữ nguyên việc Website nhớ VI còn CV / Portfolio về EN khi quay lại.

## 2. Căn cứ

- Sổ W-09 (`docs/93-workflow-friction.md`); ADR-028.
- **Nguyên nhân đã đo:** `src/shared/previewProtocol.ts` — `drain()` gọi `await waitForPreviewAssets()` sau mỗi lần vẽ (chờ mọi `<img>` tải và giải mã, tối đa **4 giây**) rồi mới lấy `pending` kế tiếp. Trang Projects của Website có 13 ảnh, cả 13 `loading="lazy"` (`src/site/renderers.ts:44`), 9 ảnh nằm dưới màn hình **không bao giờ tải** nên luôn chờ đủ 4 giây. Hai cú bấm EN / VI cách 150 ms: preview về EN sau **3.880 ms** (CV 8 ms, Portfolio 34 ms).
- **Công cụ đo, đã có trên `main`:** `node tools/preview-language-check.mjs` (cần `npm run dev -- --port 5199 --strictPort` đang chạy và `.auth/`). **Mốc trước khi sửa: 1 FAIL** (`Website: two quick clicks (VI then EN) settle within 1.5 s`, 3.880 ms); các ca còn lại đang PASS và phải còn PASS.

## 3. Phạm vi

**Làm** (chủ yếu `src/shared/previewProtocol.ts`):

1. **Không chờ ảnh tải lười:** `waitForPreviewAssets` chỉ chờ ảnh **sẽ** tải; bỏ qua `<img loading="lazy">` chưa hoàn tất (chúng không tải cho tới khi cuộn tới). Phần chọn ảnh phải là hàm **thuần** (nhận danh sách `{ complete, loading, naturalWidth }`) và có test.
2. **Cập nhật mới ngắt lúc chờ:** nếu trong lúc chờ ảnh có tin mới (`pending` được gán) thì thôi chờ và vẽ ngay bản mới; chỉ gửi `hdl:preview-rendered` cho `sequence` mới nhất (giữ nguyên ý nghĩa `onRendered` của bộ gửi: chỉ báo "Synced" khi bản cuối đã vẽ xong). Giữ trần 4 giây làm lưới an toàn cho ảnh đang tải thật.
3. Kiểm `src/main.ts`, `src/pages/*.ts`, `src/cv/dynamicMain.ts`, `src/portfolio/main.ts`: các nơi dùng `createPreviewReceiver` không cần đổi nếu giao diện hàm giữ nguyên.

**Không làm:** đổi nút EN / VI (giữ nút đơn); đổi việc nhớ ngôn ngữ giữa các mục; tối ưu cách vẽ lại bằng `innerHTML`; đổi bộ gửi trong Admin; mọi thứ ngoài chế độ preview.

**Ràng buộc dùng chung không được đổi:** giao thức thông điệp (`hdl:*-preview`, `hdl:preview-ready`, `hdl:preview-rendered`, `sequence`); ngân sách bundle (JS 115 kB, CSS 27,0 kB gzip); không dependency mới. Liệt kê ở mục 5 mọi file đã đổi.

## 3b. Các bước (mỗi bước: test liên quan + commit `wip(GD3-06 bước k): …`)

1. Hàm thuần chọn ảnh cần chờ + test; dùng trong `waitForPreviewAssets`.
2. Ngắt lúc chờ khi có tin mới.
3. `verify:admin`; chạy `tools/preview-language-check.mjs`; đo thêm độ trễ khi gõ; điền mục 5.

## 4. Tiêu chí nghiệm thu

- [ ] `node tools/preview-language-check.mjs` ra **All PASS** (ca "two quick clicks" của Website ≤ 1,5 giây thay vì 3.880 ms; các ca khác không xấu đi).
- [ ] Đo độ trễ khi gõ: trên Website, chọn trang preview **Projects**, sửa một trường hiện trên trang đó (không lưu) và đo thời gian từ lúc gõ tới lúc preview đổi, **trước và sau** sửa (số trong mục 5); sau sửa ≤ 1 giây.
- [ ] Test thuần của hàm chọn ảnh: ảnh `loading="lazy"` chưa `complete` bị bỏ qua; ảnh `eager` chưa `complete` được chờ; ảnh đã `complete` giải mã bình thường; danh sách rỗng.
- [ ] Preview vẫn báo "Synced" **sau** bản vẽ cuối (không báo sớm ở bản trung gian): bấm EN / VI hai lần liên tiếp, trạng thái cuối là "Synced" và chỉ một lần cho `sequence` mới nhất.
- [ ] `npm run verify:admin` đạt một lần ở cuối (chạy từ `D:\…`, E-006); bundle trong ngân sách.
- [ ] Trang công khai (không có `?preview=1`) không đổi: `npm run build` đạt và không có thay đổi ở đường dẫn không-preview (ghi cách kiểm).

## 5. Báo cáo của người code

- Đã xong bước:
- Người code: · đã dùng trước / sau:
- Nhánh, commit cuối:
- File đã đổi (ghi rõ file dùng chung):
- `verify:admin`: số test đạt / tổng; bundle JS / CSS:
- `tools/preview-language-check.mjs` (số PASS / FAIL, ms của ca "two quick clicks"):
- Độ trễ khi gõ trước / sau:
- Ghi chú vận hành cho docs:
- Chỗ làm khác đề bài và lý do:
- Câu hỏi:

## 6. Review của Claude

- Ngày, commit đã review:
- **Phải sửa:**
- **Nên sửa:**
- **Cần người vận hành chốt:**
- Kết luận:
