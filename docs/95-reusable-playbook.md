# 95 — Sổ kinh nghiệm dùng lại cho dự án khác

> Rút từ dự án này (và BCE) để **chép sang dự án mới**: cách làm việc với nhiều Agent, chia việc, kiểm. Không chứa dữ liệu riêng của dự án.
> **Nguồn gốc:** chép từ `docs/95-reusable-playbook.md` của BCE ngày 2026-11-15, bỏ phần chỉ dành cho WPF / Google, thêm bài học web. Khi một bên thêm điểm dùng chung, gợi ý người vận hành chép sang repo kia.
> **Cập nhật:** mỗi khi thiết kế, code hay review ra một điểm dùng được cho dự án khác (AGENTS §7). Chi tiết riêng vẫn ở sổ gốc: lỗi [docs/91](91-error-bank.md), giao diện [docs/92](92-ui-rules.md), quyết định [ADR](../decisions/ADR-REGISTER.md). Bộ UI web dùng lại: [docs/ui-kit/](ui-kit/README.md).

## 1. Khởi đầu dự án mới

- Chép và sửa: `AGENTS.md` (vai trò, nhãn, điều cấm, quy tắc bắt buộc, bản đồ nguồn), `CLAUDE.md` = `@AGENTS.md`, `docs/tasks/README.md`, file này, sổ lỗi, sổ quy tắc giao diện, sổ vướng mắc, sổ token.
- **Quy tắc cho mọi Agent đặt trong `AGENTS.md`**: Codex không đọc `CLAUDE.md`, memory riêng của một Agent không nằm trong Git.
- **Một thông tin một chỗ**: bản đồ trong `AGENTS.md`; chỗ khác chỉ trỏ link. Sổ lỗi giao diện trỏ tới guideline thay vì chép quy tắc.
- Nhãn `[CHỐT]` / `[ĐỀ XUẤT]` / `[MỞ]` / `[THAY ĐỔI]`, thêm `[CẦN KIỂM THỬ]`. **Agent không tự gán `[CHỐT]`.**
- ADR ghi cả phương án **không chọn**. Áp quy trình vào dự án đã chạy: **nhập lại** quyết định cũ dưới nhãn `[ĐỀ XUẤT]`, người vận hành duyệt một lượt.

## 2. Vai trò nhiều Agent

| Vai trò | Việc | Không làm |
|---|---|---|
| Người vận hành | Chốt mọi quyết định, dùng thật, nghiệm thu | |
| Agent thiết kế / review | Bàn thiết kế, sửa docs trước, viết đề bài, review, gộp khi đủ điều kiện | Sửa mã nguồn |
| Agent code | Code đúng đề bài trên nhánh riêng | Sửa docs thiết kế, đổi phạm vi, gộp, push |

- **Một người ghi một lúc**; mỗi đề bài một nhánh; nhánh chính chỉ chứa thứ đã review. Review trong `git worktree` riêng, đường dẫn ngắn.
- **Điều kiện tự gộp phụ thuộc cách deploy.** Nhánh chính deploy thẳng (GitHub Pages, Vercel…) thì tự gộp chỉ khi không migration, không đổi giao diện công khai, không phải đề bài cuối giai đoạn. Có bộ cài riêng thì có thể nới hơn.
- **Migration trước, gộp sau**: người vận hành chạy migration trên production và kiểm health rồi mới gộp code dùng nó.
- Kết quả review ba loại: Phải sửa · Nên sửa · Cần người vận hành chốt.
- Hỏi quyết định theo mẫu: ví dụ cụ thể, các phương án, **một khuyến nghị**, mẫu trả lời ngắn.

## 3. Đề bài cho Agent code

- Một file mỗi đề bài: mục tiêu · căn cứ · phạm vi làm / không làm · ràng buộc · các bước · bước thủ công · tiêu chí · báo cáo · review.
- **Trích đủ vào đề bài** để người code không phải đọc tài liệu chung.
- **Chia bước**, mỗi bước test + commit `wip`: bị ngắt (hết token) chỉ mất một bước; bên khác làm tiếp được. Phần dở không commit sẽ bị quên ([E-007](91-error-bank.md#e-007)).
- Ghi **Cỡ**; chọn người code theo cỡ và token còn lại. Có **prompt bàn giao cố định**.
- Ghi rõ **ràng buộc dùng chung không được đổi**; báo cáo liệt kê mọi thay đổi dùng chung.
- Yêu cầu hiển thị ("không cắt", "một hàng", "thẳng hàng") phải kèm **phép tính chỗ** và **đo trên trình duyệt thật**.

## 4. Tiết kiệm token

- Người code **chỉ đọc đề bài và đúng các mục được dẫn**; người thiết kế chịu trách nhiệm trích đủ.
- Kiểm nặng làm **một lần ở review**: chụp đủ màn hình, dữ liệu dài, chạy lại khi nghi ngờ.
- Người code: test liên quan mỗi bước, toàn bộ một lần cuối; chỉ chụp màn hình mình sửa.
- Báo cáo ghi trong file; chat vài dòng. **Ghi sổ token** trong tin nhắn sẵn có, không thêm lượt.

## 5. Review

- Tự chạy cổng kiểm tra, không tin báo cáo; đọc diff các **file dùng chung** dù báo cáo không nhắc.
- Test chứng minh "đã sửa file" khác test chứng minh "người dùng thấy đúng": bố cục phải đo trên trình duyệt thật, trong container thật, mọi trạng thái toggle.
- Số test lệch hay lỗi không tái hiện là **tín hiệu phải tìm gốc**.
- **Lỗi đồng loạt ở mọi file test** → nghi môi trường trước (Windows: chữ hoa ổ đĩa, [E-006](91-error-bank.md#e-006)).
- Test đọc file nguồn (`?raw`) phải có ít nhất một khẳng định dương, kẻo đạt vì đọc chuỗi rỗng ([E-002](91-error-bank.md#e-002)).
- Khi kết quả lạ, kiểm tra trước khi giải thích.
- Sửa tài liệu tiếng Việt bằng công cụ sửa file, **không** bằng `.Replace` trong Windows PowerShell 5.1: chuỗi có dấu bị sai mã hóa mà không báo lỗi.

## 6. Tích hợp dịch vụ ngoài

- **Thử dịch vụ thật bằng script nhỏ trước khi chốt thiết kế.**
- Lõi chạy trên cổng giao tiếp + bản giả để test không cần mạng.
- Bí mật ngoài repo; frontend chỉ có khóa công khai. **Quyền mặc định của nền tảng không phải quyền tối thiểu** (Supabase cấp EXECUTE cho `anon`, [E-004](91-error-bank.md#e-004)): thu hồi rõ và có kiểm health.
- Ghi nhiều dòng một lúc (publish, sắp xếp) qua một hàm transaction.

## 7. Giao diện

- Ba tầng: token + bộ UI chung · guideline của dự án (mẫu, thành phần, mỗi thứ một kiểu) · sổ lỗi → quy tắc.
- Có test hợp đồng (thứ tự stylesheet, token, cấm API nguy hiểm như `scrollIntoView`) để không lệch lại.
- Làm bộ UI dùng chung **sớm**, trước khi có nhiều màn hình; tách module chung trước bản sao thứ ba.
- Người dùng thật soi rất kỹ: thẳng hàng, ô cùng cao, không nhảy dòng, không cắt chữ thiếu tooltip, thao tác lâu có tiến độ.
- Tài liệu in (PDF): kích thước trang cố định, phát hiện tràn tự động, khung ảnh theo tỉ lệ crop (đặt một chiều), thẻ cạnh nhau thẳng theo hàng chung.
- Cho người dùng chọn từ **bản demo thật** thay vì mô tả.

## 8. Vận hành thực tế

- Giai đoạn riêng để người dùng chạy thật rồi cắt gọn; sổ vướng mắc ghi ngay khi gặp; gom thành nhóm, chốt thứ tự theo lợi ích / công sức.
- Hướng dẫn nghiệm thu phải **chạy được với dữ liệu thật** và ghi kết quả mong đợi theo quy tắc đã chốt.
