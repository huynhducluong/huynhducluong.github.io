# Thiết lập Supabase

Website dùng public publishable key trong `src/config/supabase.ts`. Không bao giờ thêm secret hoặc service-role key vào repository này.

## Thiết lập một lần

1. Mở SQL editor của project Supabase và chạy `supabase/migrations/202609270001_portfolio_cms.sql`.
2. Chạy `supabase/migrations/202609280001_cover_letters.sql`.
3. Chạy `supabase/migrations/202609290001_unified_admin_cv.sql` để bật Admin thống nhất, nội dung CV, Release CV và quản lý media Cover/Gallery.
4. Áp dụng mọi migration có timestamp sau đó theo thứ tự, gồm `202610150001_portfolio_media_crop_profiles.sql` cho crop profile Project/Tool dùng chung.
5. Trong thiết lập Authentication, giữ email enabled và thêm URL GitHub Pages production cùng URL `/admin/` vào danh sách redirect URL được phép.
6. Tắt đăng ký người dùng công khai. Trong Authentication > Users, mời `huynhluong321998@gmail.com`.
7. Sau khi người dùng đó tồn tại, chạy `supabase/bootstrap-admin.sql` trong SQL editor.
8. Mở `/admin/`, yêu cầu magic link và đăng nhập.

Mọi Project và Tool mới tạo mặc định là `draft` ở cả cấp cơ sở dữ liệu và UI. Upload ảnh không publish record cha. Trang công khai chỉ có thể đọc metadata ảnh khi Project/Tool của nó đã publish.

## An toàn media

Bucket `portfolio-public` phục vụ ảnh đã duyệt, sẵn sàng công khai. Không upload bản vẽ nguồn, ảnh chụp chứa tài khoản project, tên file nội bộ, dữ liệu khách hàng, tọa độ hoặc tài liệu mật khác. Làm sạch/export ảnh trước khi upload. Dùng tên file Storage được tạo; tên file cục bộ gốc không được lưu trong đường dẫn công khai.

## Sao lưu

Export cơ sở dữ liệu định kỳ từ Supabase và sao lưu bucket Storage riêng. Bản sao lưu cơ sở dữ liệu không tạo thành bản sao lưu các object ảnh đã upload.
