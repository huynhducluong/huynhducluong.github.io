# Đăng nhập Admin bằng password

Trang Admin hỗ trợ hai phương thức Supabase Auth:

- Password là phương thức chính và không cần gửi email.
- Magic Link vẫn dùng làm phương án dự phòng và cần email provider hoạt động.

Không password hay Supabase secret key nào được phép nằm trong repository này. Trình duyệt gửi password trực tiếp tới Supabase Auth qua HTTPS; allowlist `portfolio_admins` hiện có cùng Row Level Security tiếp tục kiểm soát quyền truy cập CMS.

## Đặt password ban đầu

Cần có session Admin đã xác thực trước khi người dùng có thể tự đặt password an toàn.

1. Nếu session Admin vẫn active trong bất kỳ trình duyệt nào, mở `/admin/`.
2. Chọn **Account security**.
3. Nhập và xác nhận password ít nhất 12 ký tự.
4. Save, đăng xuất và kiểm tra phương thức đăng nhập **Password**.

Nếu không còn session đã xác thực, dùng lệnh thiết lập cục bộ một lần:

1. Trong Supabase Dashboard, mở **Project Settings > API Keys** và sao chép Secret key (`sb_secret_...`) hoặc key `service_role` cũ.
2. Mở terminal VS Code trong thư mục project.
3. Chạy `npm run setup:admin-password`.
4. Dán Secret key, sau đó nhập và xác nhận password mới. Cả ba prompt đều được ẩn.
5. Sau thông báo thành công, đóng terminal và kiểm tra đăng nhập Password tại `/admin/`.

Utility thiết lập đọc URL project và email Admin từ cấu hình project dùng chung. Nó không lưu hoặc in Secret key hay password. Không bao giờ làm lộ Secret key trong code trình duyệt, commit nó hoặc gửi cho người khác. Không sửa trực tiếp `auth.users` và không xóa/tạo lại người dùng hiện có, vì ID của họ liên kết với allowlist Admin và có thể sở hữu object Storage đã upload.
