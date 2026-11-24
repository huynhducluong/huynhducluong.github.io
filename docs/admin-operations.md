# Vận hành Admin

## Kích hoạt Giai đoạn 4

Áp dụng các migration theo thứ tự qua Supabase SQL Editor hoặc quy trình migration thông thường. Giai đoạn 4 yêu cầu các grant service-role `202610050004` và lịch Cron `202610050005` hiện có, sau đó đến:

```text
supabase/migrations/202610060001_admin_operational_health.sql
```

Migration thay thế `admin_schema_health()` bằng phản hồi health chỉ đọc, chỉ dành cho admin. Nó không làm lộ secret Edge Function, dữ liệu Vault hoặc service-role key.

Sau khi áp dụng, đăng nhập `/admin/` và mở Overview. `System health` phải hiển thị `Healthy`, và panel Operational health phải hiển thị:

- Publishing database: Ready
- Purge database access: Ready
- Daily Trash cleanup: Active
- Latest scheduled run: Passed, hoặc Pending cho đến lần chạy 02:15 Asia/Bangkok đầu tiên

Refresh một lần sau khi áp dụng migration để cả PostgREST và trang Admin tải phản hồi schema mới.

## Credential và tài liệu riêng tư

Áp dụng `supabase/migrations/202610060002_professional_credentials.sql` sau migration Giai đoạn 4. Migration này tạo thư viện Credential, metadata bằng chứng riêng tư, hàm lưu Professional Profile theo transaction và bucket Storage riêng tư `portfolio-private-documents` với policy chỉ dành cho admin.

Sau khi áp dụng:

1. Tải lại Admin và mở Professional Profile → Credentials.
2. Tạo thông tin Credential ở trạng thái Draft.
3. Upload bằng chứng PDF, JPEG, PNG hoặc WebP, tối đa 10 MB mỗi file.
4. Chuyển Credential thành Ready sau khi có bằng chứng hoặc URL xác minh HTTPS.
5. Trong Draft CV, dùng **Sync latest** để sao chép metadata Credential Ready vào CV. File riêng tư không bao giờ được sao chép vào Release.

Card Education và Language liên kết tới cùng thư viện Credential. Lưu mục Education hoặc Language mới tạo trước khi liên kết Credential với mục đó.

## Crop profile media Portfolio

Áp dụng `supabase/migrations/202610150001_portfolio_media_crop_profiles.sql` trước khi deploy bản frontend tương ứng. Migration tạo các crop `wide`, `landscape` và `portrait` dùng lại cho media của cả Project và Tool. Bảng crop cover Project trước đây vẫn nguyên vẹn để Release cũ và crop portrait kế thừa tiếp tục render.

Redeploy `supabase/functions/purge-admin-trash` cùng Release đó để tác vụ xóa vĩnh viễn theo lịch cũng dọn các asset crop Project và Tool mới.

Sau khi áp dụng, refresh Admin và kiểm tra Media của cả Projects và Automation Tools hiển thị **Adjust crops**. Một crop giữ trạng thái `Auto` cho đến khi người chỉnh sửa thay đổi profile đó; chỉ profile đã sửa mới được tạo và lưu. Đưa một profile về crop tự động sẽ xóa row crop có thể chỉnh sửa mà không xóa file nào đang được Release đã publish tham chiếu.

## Key fact Project và bước Workflow Tool

Áp dụng `supabase/migrations/202611010001_project_key_facts_tool_workflow_steps.sql` (sau `202610270001`). Migration thêm `projects.key_facts` và `automation_tools.workflow_steps` (`jsonb`, mặc định `[]`, tối đa 3 mục mỗi trường, được constraint kiểm tra). Migration không tạo hàm nên không có grant EXECUTE cần thu hồi. Các row hiện có tiếp tục in nội dung như trước.

Cho đến khi migration được áp dụng, Admin vẫn lưu Project và Tool: `upsertWithOptionalColumns` thử lại mà không có cột Supabase chưa biết, và chỉ dừng với thông báo "Apply the latest database migration before saving key facts / workflow steps" khi người chỉnh sửa đã điền các trường đó, nhờ vậy không có nội dung đã nhập nào âm thầm bị bỏ. Refresh Admin một lần sau khi áp dụng.

## Preview bằng chứng Credential

Áp dụng `supabase/migrations/202611010002_credential_portfolio_previews.sql` (sau `202611010001`). Migration thêm `credential_media_crops` (crop WebP công khai của ảnh bằng chứng, RLS chỉ dành cho admin, thu hồi quyền `anon`) và ba cột trên `credential_assets`: `show_in_portfolio` (mặc định tắt; chỉ ảnh; tối đa một ảnh mỗi Credential), `preview_rotation` (0–3 phần tư vòng) và `preview_profile` (landscape hoặc portrait, mặc định landscape; **từ GD3-03 không còn được đọc hay ghi**, cột giữ nguyên trong DB, không cần migration). Migration không tạo hàm nên không có grant EXECUTE cần thu hồi. File crop được đưa vào bucket công khai hiện có dưới `portfolio-media-crops/credentials/`; bản gốc bằng chứng nằm trong bucket riêng tư và không bao giờ bị sửa.

Cho đến khi migration được áp dụng, Credentials tải mà không có preview và thao tác lưu preview dừng với thông báo "Apply the latest database migration before saving credential previews." Refresh Admin một lần sau khi áp dụng, rồi dùng **Adjust crops** trên một ảnh bằng chứng và bật **Show in Portfolio**. Xóa file bằng chứng hoặc Credential cũng xóa các file crop của nó, trừ khi một Release đã publish vẫn tham chiếu chúng.

## Quyền EXECUTE của RPC

Áp dụng `supabase/migrations/202610270001_revoke_rpc_default_execute.sql` sau `202610150002_professional_credential_order.sql`. Supabase cấp trực tiếp quyền EXECUTE trên hàm public mới cho `anon` và `authenticated`, vì vậy chỉ `revoke ... from public` không thu hồi các quyền đó. Migration xóa quyền truy cập của anon tới mọi RPC Admin và giới hạn helper Cover Letter nội bộ cùng các kiểm tra secret/Cron của trash-purge cho những nơi gọi đáng tin cậy.

Kiểm tra kết quả trong SQL Editor; chỉ `is_portfolio_admin` được cho phép anon:

```sql
select p.oid::regprocedure as function_name,
       has_function_privilege('anon', p.oid, 'execute') as anon_execute,
       has_function_privilege('authenticated', p.oid, 'execute') as authenticated_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prosecdef
order by 1;
```

## Cổng chất lượng Release

Chạy tại máy cục bộ cùng lệnh GitHub Actions chạy trước khi deploy:

```powershell
npm run verify:admin
```

Lệnh thực hiện kiểm tra TypeScript, bộ test hồi quy Vitest, production build Vite và kiểm tra ngân sách bundle ban đầu của Admin. Bất kỳ bước nào thất bại đều trả về exit code khác 0 và ngăn deploy GitHub Pages.

Ngân sách ban đầu hiện tại là 115 kB gzip cho JavaScript và 27 kB gzip cho CSS (sau GD3-16 CSS đã dùng 26,9 kB: **sau GD3-17 đã hết dư địa: 27,0 / 27,0 kB**, đề bài Admin kế tiếp phải làm gọn CSS hoặc xin nâng ngân sách). Ngân sách CSS được tăng từ 26 kB vào 2026-11-01 vì preview Cover Letter render inline trong Admin nên cần `document-typography.css` (các font face Be Vietnam Pro và token kiểu chữ tài liệu, khoảng 0,6 kB gzip); trước đó, quá trình quét CSS thừa không tìm thấy gì có thể bỏ. CSS workspace Admin được tải sớm theo thứ tự xác định để lớp chuẩn hóa UI cuối cùng không thể bị đảo ngược do tải theo route. Chỉ chạy kiểm tra bundle sau khi đã có production build hiện tại bằng:

```powershell
npm run check:admin-bundle
```

Các module JavaScript Website/Profile, CV/Portfolio, Cover Letter và crop media Portfolio tải khi cần. CSS workspace chủ ý nằm trong bundle Admin ban đầu để giữ layout và hành vi responsive xác định.

Dùng `npm run test:watch` khi phát triển hành vi Admin. Dùng `npm run test` cho một lần chạy xác định theo kiểu CI.

## Khi health cần xử lý

- `Update migration`: áp dụng migration mới nhất và refresh Admin.
- `Check grants`: áp dụng lại `202610050004_purge_admin_trash_service_role.sql`, rồi xác nhận kiểm tra health service-role có thể đọc Project và Automation Tool.
- `Check Cron`: xác minh `purge-admin-trash-daily` đang active với `15 19 * * *`, rồi áp dụng lại `202610050005_schedule_admin_trash_purge.sql` nếu cần.
- `Latest scheduled run: Review`: kiểm tra log Edge Function `purge-admin-trash` và mục `cron.job_run_details` mới nhất. Một lần POST thủ công thành công không thay thế việc kiểm tra request theo lịch đang thất bại.

Không đưa `ADMIN_TRASH_PURGE_SECRET`, JWT service-role cũ hoặc giá trị Vault vào code frontend, test, log, ảnh chụp hoặc Git.
