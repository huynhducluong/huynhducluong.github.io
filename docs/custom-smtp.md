# Custom SMTP cho Career Hub Admin

Career Hub Admin hỗ trợ đăng nhập Supabase bằng password, với Magic Link làm phương án dự phòng tùy chọn. Thông tin xác thực SMTP chỉ được nằm trong Supabase Dashboard và không bao giờ được commit vào repository này.

Custom SMTP là tùy chọn khi tài khoản Admin dùng đăng nhập password. Nó vẫn bắt buộc để gửi Magic Link tin cậy và khôi phục password qua email.

## Gmail SMTP cho tài khoản Admin duy nhất

1. Bật 2-Step Verification cho `huynhluong321998@gmail.com`.
2. Trong thiết lập bảo mật Google Account, tạo App Password tên `Supabase Portfolio`.
3. Sao chép App Password 16 ký tự được tạo. Không dùng password Gmail thông thường.
4. Trong Supabase, mở **Authentication > Emails > SMTP Settings** và bật Custom SMTP.
5. Nhập:
   - Sender name: `Huynh Duc Luong Portfolio`
   - Sender email: `huynhluong321998@gmail.com`
   - Host: `smtp.gmail.com`
   - Port: `587`
   - Username: `huynhluong321998@gmail.com`
   - Password: Google App Password
6. Lưu thiết lập.
7. Giữ Site URL và redirect allowlist được cấu hình cho:
   - `https://huynhducluong.github.io/`
   - `https://huynhducluong.github.io/admin/`
8. Yêu cầu một Magic Link và kiểm tra Supabase Auth Logs nếu gửi thất bại.

Frontend bắt buộc thời gian chờ gửi lại 60 giây. Nên giữ rate limit Supabase enabled. Thu hồi Google App Password ngay nếu bị lộ.

Khi có custom domain hoặc nhiều người dùng trong tương lai, thay Gmail SMTP bằng provider giao dịch như Resend, Postmark, SendGrid hoặc Brevo và cấu hình SPF, DKIM cùng DMARC.
