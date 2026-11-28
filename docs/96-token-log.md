# 96 — Sổ theo dõi token

> Mục đích: biết khoảng token mỗi lần giao code tốn để chọn người code, tránh bị ngắt giữa chừng ([E-007](91-error-bank.md#e-007)). Số do người vận hành đọc trên giao diện Codex / Claude nên chỉ gần đúng; **xem xu hướng**, không xem từng dòng.
> **Không thêm lượt nhắn:** người vận hành ghi % **trong tin nhắn sẵn có**: lúc giao (`token: N%`) và lúc báo xong (`token sau: N%`). Claude ghi vào đây khi review. Ngưỡng chọn người code ở [docs/tasks/README](tasks/README.md#chọn-người-code-và-đổi-giữa-chừng) chỉnh theo sổ này.
> **Hai hạn mức khác nhau, theo dõi riêng:** Codex hiện **% còn lại**, Claude hiện **% đã dùng**. Cột "Tốn" chỉ so được **trong cùng một bảng**.
> **Mốc từ BCE** (cùng cách giảm token): đề bài Nhỏ ~5–15 %, Vừa ~25–35 %, Lớn ~30 % trở lên mỗi lượt. Đề bài Vừa nên giao Claude khi còn ≤ ~60 % đã dùng.

## Dự báo token cho đề bài sắp giao (Claude ghi khi giao, đối chiếu khi người vận hành báo "xong")

> Cách ước: lấy **trung vị theo cỡ** của các lượt Claude — cửa sổ code đã đo ở bảng dưới (Nhỏ ~1 – 5 %, trung vị ~4 %; Vừa ~4 – 12 %, trung vị ~9 %; Lớn ~6 – 15 %), cộng **~2 – 4 % cho mỗi lượt sửa** nếu review có "Phải sửa" (khoảng 1 trên 2 đề bài giao diện), và **cộng thêm khi đề bài có công cụ đo mới, nhiều màn hình hoặc nhiều ngôn ngữ**. Đây là **ước lượng**, không phải cam kết; dự báo của Claude (phiên review / thiết kế) **không đo được** từ phía Claude, người vận hành đọc % hạn mức trước / sau một lượt review nếu muốn biết.

| Đề bài | Cỡ | Dự báo tốn (Claude — cửa sổ code) | Lượt sửa dự kiến | Vì sao |
|---|---|---|---|---|
| GD3-23 màu từ logo | Vừa | **~10 % (8 – 14 %)** | +3 % nếu có sửa | hàm trích màu + UI + công cụ đo + test; ràng buộc CSS không tăng có thể thêm việc |
| GD3-26 Project index phân trang | Vừa | **~10 % (7 – 13 %)** | +4 % | phân trang ba layout, công cụ đo mới, Admin / bút chì, snapshot |
| GD3-27 link web CV / Portfolio | Vừa | **~7 % (5 – 10 %)** | +3 % | hai trình dựng, nhiều layout bìa / kết, công cụ đo mới + PDF |
| GD3-25 ô SHEET + header kính mờ | Nhỏ | **~4 % (3 – 6 %)** | +2 % | CSS `home.css`, một trình nghe cuộn, test; phép đo có sẵn |
| GD3-24 meta hàng cắt gọn | Nhỏ | **~3 % (2 – 5 %)** | +2 % | một khối CSS + phép đo ở 6 độ rộng + `shots --stress` |
| GD3-14 Hero tagline + migration | Vừa | **~9 % (7 – 12 %)** | +3 % | field Admin + migration + test; có bước tay của người vận hành (không tính token) |
| N10 chữ bị cắt "…" (chưa có đề bài) | Vừa | **~8 – 10 %** | +3 % | phụ thuộc phương án (bộ đếm ký tự trong Admin) |
| Thay email trong bootstrap-admin.sql (chưa giao) | Nhỏ | **~1 – 2 %** | 0 | một file SQL |

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
| 2026-11-15 | GD3-04 | Lớn | 70 % | 76 % | **~6 %** | N2: 10 file, 5 bước wip, đo trên Admin thật; không lượt sửa. "Đã dùng trước" 70 % (không phải 56 %) vì % của Claude tính chung cả tài khoản: gồm cả phiên thiết kế / review chạy giữa hai đề bài |
| 2026-11-15 | GD3-05 | Vừa | 16 % | 28 % | **~12 %** | N5: 16 file, 5 bước wip, không lượt sửa; "trước" 16 % thấp hơn "sau" 76 % của GD3-04 vì hạn mức tài khoản đã làm mới giữa hai đề bài |
| 2026-11-15 | GD3-06 | Nhỏ | 37 % | 38 % | **~1 %** | N7: 3 file, 2 commit, không lượt sửa; Website bấm nhanh 3.880 → 22 ms |
| 2026-11-15 | GD3-07 | Vừa | 43 % | 50 % | **~7 %** | N6: link "▶ Video" Portfolio; đo bằng tools/portfolio-video-link-check.mjs |
| 2026-11-15 | GD3-08 | Nhỏ | 52 % | 53 % | **~1 %** | N8: lưới 2×2 lên đầu / xuống cuối, bỏ menu ⋯ ở Projects / Tools |
| 2026-11-15 | GD3-09 | Vừa | 60 % | 69 % | **~9 %** | N4a: bút chì sửa từ preview Portfolio (chỉ ô của form Portfolio) |
| 2026-11-15 | GD3-10 | Vừa | 6 % | 10 % | **~4 %** | N11: chi tiết trình bày Portfolio; đo bằng tools/portfolio-detail-check.mjs |
| 2026-11-15 | GD3-11 | Nhỏ | 12 % | 17 % | **~5 %** | N9: chỉ số dự án (số lớn + đơn vị nhỏ) |
| 2026-11-17 | GD3-12 | Lớn | 16 % | 31 % | **~15 %** | N12: trang chủ Blueprint (nền, hero, điện thoại); đo bằng tools/home-viewport-check.mjs |
| 2026-11-17 | GD3-13 | Vừa | 15 % | 24 % | **~9 %** | N12: thẻ dự án SHEET + chip lọc |
| 2026-11-24 | GD3-15 | Vừa | | | |
| 2026-11-24 | GD3-16 | Nhỏ | | | |
| 2026-11-24 | GD3-17 | Nhỏ | 43 % | 47 % | **~4 %** |
| 2026-11-24 | GD3-18 | Nhỏ | | | |
| 2026-11-24 | GD3-19 | Nhỏ | | | |
| 2026-11-24 | GD3-20 | Nhỏ | | | |
| 2026-11-24 | GD3-21 | Nhỏ | | | |
| 2026-11-24 | GD3-22 | Nhỏ | | | |
| 2026-11-24 | GD3-23 | Vừa | 80 % | 84 % | **~4 %** (dự báo 10 %); lượt sửa 2: 4 % → 9 % (~5 %, dự báo 2 %) |
| 2026-11-24 | GD3-24 | Nhỏ | | | |
| 2026-11-24 | GD3-25 | Nhỏ | | | |
| 2026-11-28 | GD3-26 | Vừa | 13 % | 18 % | **~5 %** (dự báo 10 %) |
| 2026-11-28 | GD3-27 | Vừa | | | |
| 2026-11-17 | GD3-14 | Vừa | | | | N12: ô Hero tagline Admin + migration |
