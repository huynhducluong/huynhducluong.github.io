# 96 — Sổ theo dõi token

> Mục đích: biết khoảng token mỗi lần giao code tốn để chọn người code, tránh bị ngắt giữa chừng ([E-007](91-error-bank.md#e-007)). Số do người vận hành đọc trên giao diện Codex / Claude nên chỉ gần đúng; **xem xu hướng**, không xem từng dòng.
> **Không thêm lượt nhắn:** người vận hành ghi % **trong tin nhắn sẵn có**: lúc giao (`token: N%`) và lúc báo xong (`token sau: N%`). Claude ghi vào đây khi review. Ngưỡng chọn người code ở [docs/tasks/README](tasks/README.md#chọn-người-code-và-đổi-giữa-chừng) chỉnh theo sổ này.
> **Hai hạn mức khác nhau, theo dõi riêng:** Codex hiện **% còn lại**, Claude hiện **% đã dùng**. Cột "Tốn" chỉ so được **trong cùng một bảng**.
> **Mốc từ BCE** (cùng cách giảm token): đề bài Nhỏ ~5–15 %, Vừa ~25–35 %, Lớn ~30 % trở lên mỗi lượt. Đề bài Vừa nên giao Claude khi còn ≤ ~60 % đã dùng.

## Codex (% còn lại)

| Ngày | Đề bài / lượt | Cỡ | Còn trước | Còn sau | Tốn | Ghi chú |
|---|---|---|---|---|---|---|
| 2026-11-15 | GD2-01 | Vừa | 95 % | 61 % | **~34 %** | Đề bài đầu theo quy trình mới; dịch 11 file docs (~780 dòng), 5 bước wip, không lượt sửa |
| 2026-11-15 | GD3-01 | Vừa | 61 % | 36 % | **~25 %** | N1: 3 sửa Admin, 12 file, 4 bước wip, không lượt sửa |
| 2026-11-15 | GD3-02 | Nhỏ | 36 % | 27 % | **~9 %** | N3a: CSS 2 file + test, 3 bước wip, không lượt sửa; đo bằng tools/portfolio-credentials-check.mjs |

## Claude — cửa sổ code (% đã dùng)

| Ngày | Đề bài / lượt | Cỡ | Đã dùng trước | Đã dùng sau | Tốn | Ghi chú |
|---|---|---|---|---|---|---|
| 2026-11-15 | GD3-03 | Lớn | 53 % | 56 % | **~3 %** | N3b: 13 file, 1 lượt (3 bước gộp một commit wip), không chạy đo trình duyệt (làm ở review); không lượt sửa |
