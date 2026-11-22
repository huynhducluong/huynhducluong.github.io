# Cầu ghi cột "Trạng thái" của sổ lỗi UI/UX (Google Docs)

> **Trạng thái:** `[ĐỀ XUẤT]` (2026-11-22), chờ người vận hành cài đặt và đồng ý. Liên quan [ADR-023](../decisions/ADR-REGISTER.md) và [docs/93](93-workflow-friction.md).

## Mục tiêu

Người vận hành mở sổ là thấy ngay **dòng nào đã sửa, đang làm, đang chờ duyệt hay đã bàn xong**, ngắn gọn, ngay trong cột "Trạng thái": một biểu tượng, 2 – 3 chữ, dòng thứ hai là mã đề bài hoặc W-xx.

| Biểu tượng | Ý nghĩa | Ví dụ |
|---|---|---|
| ✅ Đã sửa | đã xong và đã gộp | `✅ Đã sửa` / `GD3-10` |
| 🛠 Đang làm | đã giao code, chưa gộp | `🛠 Đang làm` / `GD3-12` |
| ⏳ Chờ bạn duyệt | đã đạt review, chờ người vận hành duyệt gộp | `⏳ Chờ bạn duyệt` / `GD3-12` |
| 💬 Đang bàn | đang trao đổi, chưa chốt | |
| 📝 Đã ghi nhận | đã ghi vào sổ W-xx, chưa có đề bài | `📝 Đã ghi nhận` / `W-19` |
| ⏸ Hoãn · ❌ Không làm | hoãn hoặc đã quyết không làm | |

## Vì sao cần "cầu"

- Đọc sổ chỉ cần link "ai có link đều xem được" (đang dùng). **Ghi** thì Google bắt đăng nhập (OAuth); Claude không có kết nối Google Drive trong phiên này.
- Cách tránh việc đổi sổ sang "Editor" (ADR-023: ai có link là Editor thì sửa, xóa được sổ và chèn chữ vào chỗ Claude đọc): dán một đoạn **Apps Script** vào chính Google Doc. Script chạy bằng **tài khoản của bạn**, chỉ nhận lệnh có đúng **TOKEN** bí mật, và chỉ làm hai việc: đọc bảng và sửa chữ trong ô Trạng thái. Sổ vẫn là "Viewer" với người khác.

## Cài đặt (một lần, khoảng 5 phút, do người vận hành làm)

1. Mở sổ (Google Doc). Menu **Tiện ích mở rộng → Apps Script**.
2. Xóa mã mẫu, dán **toàn bộ** nội dung file [`tools/ui-feedback-bridge.gs`](../tools/ui-feedback-bridge.gs). Bấm **Lưu**.
3. **Cài đặt dự án (bánh răng) → Thuộc tính tập lệnh → Thêm thuộc tính**, hai dòng:
   - `DOC_ID` = mã tài liệu: đoạn giữa `/document/d/` và `/edit` trong link sổ.
   - `TOKEN` = một chuỗi dài ngẫu nhiên do bạn tự đặt (ít nhất 32 ký tự chữ và số). **Không chia sẻ cho ai khác.**
4. **Triển khai → Triển khai mới → Loại: Ứng dụng web.** "Thực thi bằng": **Tôi**. "Ai có quyền truy cập": **Bất kỳ ai**. Bấm Triển khai, đồng ý cấp quyền (Google sẽ cảnh báo "ứng dụng chưa xác minh": chọn Nâng cao → Tiếp tục, vì đây là script của chính bạn).
5. Chép **URL ứng dụng web** (kết thúc bằng `/exec`).
6. Mở file `project-links.local` ở gốc dự án (file này **không** vào Git) và thêm hai dòng:

```text
UI_FEEDBACK_BRIDGE_URL=<URL /exec>
UI_FEEDBACK_BRIDGE_TOKEN=<TOKEN đã đặt ở bước 3>
```

7. Nhắn Claude "đã cài cầu". Claude chạy `node tools/write-ui-feedback-status.mjs --list` để thử, rồi `--sync` để ghi trạng thái cho mọi dòng đã xử lý.

## Cách dùng sau khi cài

- `node tools/write-ui-feedback-status.mjs --plan`: xem trước sẽ ghi gì (không cần mạng, không ghi).
- `--sync`: ghi trạng thái của mọi dòng đã có mã trong `tools/ui-feedback-seen.txt`; trạng thái lấy từ bảng W-xx của docs/93 (`ĐÃ XỬ LÝ` → ✅, `GIAO CODE` → 🛠, `CHỜ DUYỆT` → ⏳, `GHI NHẬN` → 📝). Dòng đã đúng thì giữ nguyên.
- Ghi tay một dòng: `node tools/write-ui-feedback-status.mjs talking #25 "bàn xong, chờ bạn chọn"`.
- Claude chạy `--sync` mỗi lần **gộp một đề bài** hoặc **đọc sổ xong**, nên bạn mở sổ là thấy.

## Rủi ro và cách giảm

- **Ai có TOKEN và URL thì sửa được cột Trạng thái** (không xóa được dòng, không đổi nội dung): giữ chúng trong `project-links.local`, không đưa vào Git, không dán vào chat công khai. Nếu lộ: vào Apps Script đổi `TOKEN`, hoặc **Triển khai → Quản lý triển khai → Lưu trữ** để tắt cầu.
- Cầu chỉ sửa **chữ** trong ô Trạng thái nên mất định dạng cũ của ô đó (biểu tượng ✅ xanh dạng nhãn sẽ thành ký tự emoji); các cột khác không đổi.
- Mã dòng tính từ "Màn hình + Nội dung": sửa nội dung một dòng thì dòng đó coi như ý mới và `--sync` bỏ qua cho tới khi được xử lý lại.
