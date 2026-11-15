# Workspace Cover Letter

Tính năng Cover Letter là workspace riêng tư dựa trên Supabase. Nội dung thư không được đóng gói vào site công khai và người dùng anonymous không có quyền truy cập cơ sở dữ liệu.

## Thiết lập Supabase một lần

Chạy `supabase/migrations/202609280001_cover_letters.sql` trong Supabase SQL Editor sau migration Portfolio CMS. Migration tạo các bảng thư riêng tư, quan hệ Project/Tool, policy Row Level Security và quy tắc vòng đời Draft → Final → Archived.

Không đưa thư ứng tuyển, thông tin người nhận, access token hoặc tài liệu mật của công ty vào file source hay dữ liệu seed công khai.

## Các route

- `/admin/cover-letters/` — danh sách thư riêng tư và bộ lọc trạng thái.
- `/admin/cover-letter/` — tạo Draft mới.
- `/admin/cover-letter/?id=...` — chỉnh sửa Draft hoặc xem/nhân bản thư Final đã khóa.
- `/cover-letter/?id=...` — preview A4 đã xác thực và chức năng Print / Save PDF của trình duyệt.

Nếu mở route được bảo vệ khi chưa đăng nhập, trang đăng nhập Admin dùng chung đưa người dùng trở lại route đó sau khi xác thực bằng Password hoặc Magic Link.

## Quy trình

1. Tạo Draft và chỉ nhập thông tin công ty cùng người nhận đã xác minh.
2. Có thể liên kết Project và Automation Tool hiện có làm tham chiếu viết riêng tư.
3. Chọn preset hoặc cặp màu riêng của công ty. Màu được lưu cùng thư.
4. Xử lý kiểm tra trường bắt buộc, placeholder và overflow một trang.
5. Đánh dấu thư là Final. Thông tin người gửi và theme được chụp snapshot, nội dung trở thành bất biến.
6. Dùng chế độ xem in riêng tư và đích **Save as PDF** của trình duyệt. Cách này giữ text có thể chọn và tìm kiếm.
7. Nhân bản thư Final để điều chỉnh thành Draft mới; archive thư Final cũ khi không còn hoạt động.

Chỉ Draft chưa từng Final mới có thể bị xóa. Thư Final có thể được archive nhưng không thể chỉnh sửa hoặc xóa qua ứng dụng.

## Mặc định người gửi

Mặc định người gửi nằm trong `src/cover-letter/defaults.ts` và hiện dùng:

- Title: `BIM Coordinator - Infrastructure`
- Location: `Ho Chi Minh City, Viet Nam`
- Định dạng hiển thị số điện thoại Việt Nam
- Sign-off: `Sincerely,`
- Tên đánh máy; không có ảnh chữ ký
- Không có dòng `Subject / Re:`
- URL Portfolio: chưa đặt (`null`)

Khi có URL Portfolio, cập nhật `portfolioUrl` trong file đó. Preview mới và chưa Final sẽ dùng URL này; thư đã Final giữ snapshot người gửi ban đầu.

## Hợp đồng in

Stylesheet in đặt A4 dọc với margin layout trình duyệt bằng 0, bỏ toolbar và shadow màn hình, giữ màu và render một trang HTML. Export dùng engine in của trình duyệt thay vì ảnh chụp hoặc canvas, nên text PDF vẫn có thể tìm kiếm và chọn.
