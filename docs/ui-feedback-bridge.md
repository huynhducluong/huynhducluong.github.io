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

Tên nút dưới đây theo **giao diện tiếng Anh của Google** (tiếng Việt ghi trong ngoặc).

1. Mở sổ (Google Doc). Menu **Extensions → Apps Script** (Tiện ích mở rộng → Apps Script).
2. Xóa mã mẫu, dán **toàn bộ** nội dung file [`tools/ui-feedback-bridge.gs`](../tools/ui-feedback-bridge.gs) (gồm cả hàm `authorize` ở cuối). Bấm **Save project** (Lưu).
3. Bên trái bấm **Project Settings** (biểu tượng bánh răng) → kéo xuống **Script Properties** → **Add script property**, hai dòng:
   - `DOC_ID` = mã tài liệu: đoạn giữa `/document/d/` và `/edit` trong link sổ.
   - `TOKEN` = một chuỗi dài ngẫu nhiên (ít nhất 32 ký tự). Tạo ngay trên máy để không lộ trong chat: `node -e "console.log(require('crypto').randomBytes(24).toString('hex'))" | clip` rồi dán (Ctrl+V). **Không chia sẻ cho ai khác.** Bấm **Save script properties**.
4. **Xin quyền Docs (bước hay bị bỏ sót):** ở ô chọn hàm (dropdown cạnh nút **Run**) chọn **`authorize`**, bấm **Run**. Khi hiện **Authorization required** → **Review permissions** → chọn tài khoản → **Advanced** → **Go to … (unsafe)** → **Allow**. Nhật ký **Execution log** phía dưới phải in **tên tài liệu sổ**. (Google cảnh báo "unverified app" vì đây là script của chính bạn.)
5. **Deploy → New deployment** (Triển khai → Triển khai mới) → bánh răng cạnh "Select type" → **Web app**. **Execute as: Me** (Thực thi bằng: Tôi) và **Who has access: Anyone** (Ai có quyền truy cập: Bất kỳ ai) → **Deploy**.
6. Chép **Web app URL** (kết thúc bằng `/exec`; link `/dev` là bản kiểm thử, không dùng được).
7. Mở file `project-links.local` ở gốc dự án (**không** vào Git), thêm hai dòng:

```text
UI_FEEDBACK_BRIDGE_URL=<URL /exec>
UI_FEEDBACK_BRIDGE_TOKEN=<TOKEN ở bước 3>
```

8. Nhắn Claude "đã cài cầu". Claude chạy `node tools/write-ui-feedback-status.mjs --list` để thử, ghi thử một dòng, rồi `--sync` cho mọi dòng đã xử lý.

### Nếu báo "Các quyền được chỉ định không đủ để gọi DocumentApp.openById"

Cầu hoạt động (TOKEN đúng) nhưng bản triển khai chưa có quyền Docs. Kiểm theo thứ tự:

1. **Deploy → Manage deployments** (Quản lý triển khai): bản đang bật phải là **Execute as: Me** và **Who has access: Anyone**. Nếu là "User accessing the web app" thì cầu chạy bằng quyền người gọi và sẽ luôn lỗi này: bấm bút chì (**Edit**) sửa lại.
2. Chạy hàm `authorize` như bước 4 ở trên (chạy `doPost` không đủ vì nó trả "unauthorized" trước khi chạm tới Docs).
3. **Deploy → Manage deployments → pencil (Edit) → Version: New version → Deploy.** Không chọn "New version" thì bản chạy thật vẫn là bản cũ với quyền cũ. URL không đổi.
4. Vẫn lỗi: bật **Project Settings → Show "appsscript.json" manifest file in editor**, mở `appsscript.json`: nếu có `oauthScopes` thì phải có `https://www.googleapis.com/auth/documents`.

## Cách dùng sau khi cài

- `node tools/write-ui-feedback-status.mjs --plan`: xem trước sẽ ghi gì (không cần mạng, không ghi).
- `--sync`: ghi trạng thái của mọi dòng đã có mã trong `tools/ui-feedback-seen.txt`; trạng thái lấy từ bảng W-xx của docs/93 (`ĐÃ XỬ LÝ` → ✅, `GIAO CODE` → 🛠, `CHỜ DUYỆT` → ⏳, `GHI NHẬN` → 📝). Dòng đã đúng thì giữ nguyên.
- Ghi tay một dòng: `node tools/write-ui-feedback-status.mjs talking #25 "bàn xong, chờ bạn chọn"`.
- Claude chạy `--sync` mỗi lần **gộp một đề bài** hoặc **đọc sổ xong**, nên bạn mở sổ là thấy.

## Rủi ro và cách giảm

- **Ai có TOKEN và URL thì sửa được cột Trạng thái** (không xóa được dòng, không đổi nội dung): giữ chúng trong `project-links.local`, không đưa vào Git, không dán vào chat công khai. Nếu lộ: vào Apps Script đổi `TOKEN`, hoặc **Triển khai → Quản lý triển khai → Lưu trữ** để tắt cầu.
- Cầu chỉ sửa **chữ** trong ô Trạng thái nên mất định dạng cũ của ô đó (biểu tượng ✅ xanh dạng nhãn sẽ thành ký tự emoji); các cột khác không đổi.
- Mã dòng tính từ "Màn hình + Nội dung": sửa nội dung một dòng thì dòng đó coi như ý mới và `--sync` bỏ qua cho tới khi được xử lý lại.
