# Kiến trúc nền tảng portfolio

## Các route

- `/`: website portfolio responsive và tổng quan nghề nghiệp.
- `/projects/`, `/project/?id=slug`: danh sách project đã publish và bài phân tích tình huống.
- `/tools/`, `/tool/?id=slug`: các công cụ tự động hóa BIM đã publish.
- `/cv/`: CV tiếng Anh A4 hai trang đã tuyển chọn.
- `/portfolio/`: bản xem trước Portfolio tiếng Anh A4 ngang và chức năng in/xuất PDF.
- `/admin/`: CMS Magic Link riêng tư.

## Quyền sở hữu dữ liệu

Supabase là nguồn chính thức cho nội dung dùng chung của Website, CV, Portfolio, Project, Tool và media. Các file dữ liệu đi kèm dùng để tạo dữ liệu ban đầu cho bản cài đặt mới và vẫn là phương án dự phòng khi phát triển nếu schema từ xa không dùng được. Các output công khai đọc Release bất biến; bản xem trước Admin đã xác thực đọc Draft hiện có thể chỉnh sửa.

Project và Automation Tool là các thư viện nội dung chính. Trình chỉnh sửa của chúng sở hữu dữ kiện, mô tả, trách nhiệm, công nghệ và media, nhưng không sở hữu vị trí trên output. Giá trị backend `published` được trình bày là **Ready** trong Admin: nghĩa là mục đó có thể được một output chọn, không có nghĩa việc thay đổi mục sẽ lập tức thay đổi trang công khai.

Mỗi output sở hữu cấu trúc của mình:

- Project và Automation Tool sở hữu `display_order` chuẩn dùng chung giữa các kênh; các danh sách chính trong Admin có điều khiển sắp xếp kéo thả cùng bàn phím/cảm ứng.
- Draft nội dung Website sở hữu việc đưa nội dung vào Website và làm nổi bật trên Homepage trong `website_content.content_selection`; output này theo thứ tự Project/Tool dùng chung.
- Professional Profile sở hữu nội dung và thứ tự của Experience, Education, Skill Group và Language (thứ tự mảng trong `professional_profile`) cùng Credential (`display_order`). Các output chọn từ đó; chúng không bao giờ lưu thứ tự riêng.
- Mỗi Draft tài liệu CV sở hữu lựa chọn Background (các mục Profile xuất hiện), lựa chọn project chi tiết/thu gọn, trạng thái hiển thị summary, các gạch đầu dòng trách nhiệm và lựa chọn tool. Mỗi Draft Portfolio sở hữu lựa chọn Credential, layout, việc gán media Primary/Supporting, ảnh Cover & closing, lựa chọn trang Profile, các trách nhiệm in theo từng project (`projectResponsibilities`, chỉ id; Project sở hữu nội dung và thứ tự của chúng) và việc trang Technical/Editorial in summary hay câu chuyện project (`projectText`). Key fact và bước Workflow là nội dung Project và Tool (`key_facts`, `workflow_steps`), không bao giờ là bản sao trong Portfolio. Cả hai dùng thứ tự Project/Tool dùng chung và thứ tự Professional Profile.
- Cover Letter giữ các tham chiếu bằng chứng độc lập.

Các cột phân phối Project/Tool cũ vẫn đọc được để phục vụ migration và tương thích Release cũ, nhưng trình chỉnh sửa Admin hiện tại không còn ghi vào đó. Các Release đã publish hiện có vẫn là snapshot bất biến.

## Quy trình publish

1. Tạo/import nội dung Project hoặc Tool dùng chung: trạng thái là `draft`.
2. Chỉnh sửa văn bản và upload ảnh đã làm sạch, sẵn sàng công khai.
3. Xử lý kiểm tra Ready trong Admin, rồi đánh dấu mục dùng chung là **Ready**. Nội dung chi tiết tiếng Anh bắt buộc, công nghệ, ảnh cover và alt text của cover sẽ chặn Ready nếu thiếu; độ đầy đủ tiếng Việt là khuyến nghị. Crop Portfolio tùy chỉnh vẫn là tùy chọn vì mọi vị trí media đều có phương án dự phòng tự động.
4. Chọn các mục Ready cho từng kênh; chỉ đổi thứ tự dùng chung một lần trong Projects hoặc Automation Tools.
5. Xem lại bản preview của output đó và publish Release.

Chuyển một mục dùng chung về Draft sẽ ngăn mục đó được chọn vào Draft output mới. Release đã publish không đổi cho đến khi output đó được publish lại.

Khi lưu nội dung Project/Tool, một mục Ready tự động trở về Draft nếu không còn đạt kiểm tra Ready bắt buộc. Publish Website chạy preflight riêng đối với các trường Website/Profile và mọi Project/Tool đã chọn. Publish Website, sắp xếp lại danh sách chính/media và ghi Draft/bằng chứng Cover Letter dùng transaction cơ sở dữ liệu để không thể commit trạng thái nhiều hàng mới chỉ hoàn tất một phần.

## Vòng đời media

JSON của Release lưu nội dung bất biến cùng đường dẫn Storage có phiên bản. Xóa media khỏi Draft sẽ xóa metadata có thể chỉnh sửa của nó, nhưng object đã lưu vẫn được giữ nếu bất kỳ Release Website, CV hoặc Portfolio nào còn tham chiếu đường dẫn đó. Thay crop và xóa vĩnh viễn khỏi Trash dùng cùng cơ chế kiểm tra tham chiếu Release. Object không được tham chiếu có thể bị xóa ngay; object được tham chiếu vẫn còn để Release lịch sử và đang hoạt động không bao giờ mất ảnh.

Các layout Portfolio yêu cầu vị trí media theo ngữ nghĩa thay vì file riêng cho từng layout. Một Draft gán hình Primary và chỉ khi cần mới gán một hình Supporting khác. Mỗi vị trí yêu cầu một trong ba crop profile dùng lại: `wide` (21:9), `landscape` (4:3) hoặc `portrait` (3:4). Project và Tool dùng cùng mô hình. Renderer ưu tiên crop profile đã lưu, nếu không thì dùng ảnh gốc với hành vi `object-fit` của layout, vì vậy người chỉnh sửa chỉ crop những ảnh cần bố cục thủ công.

Professional Credential là một thư viện dùng chung đã chuẩn hóa. Một Credential có thể đứng độc lập hoặc liên kết với một mục Education/Language; các file bằng chứng nằm trong bucket riêng tư `portfolio-private-documents`. Chứng chỉ, bằng cấp, bảng điểm và phiếu điểm gốc chỉ dành cho người dùng Admin đã xác thực qua URL ký có thời hạn ngắn. Đồng bộ CV chỉ sao chép metadata Credential Ready vào Draft và Release — không bao giờ sao chép đường dẫn file riêng tư hoặc URL ký. Ảnh Credential duy nhất có thể công khai là crop do người chỉnh sửa tạo: **Adjust crops** trên ảnh bằng chứng ghi crop WebP vào bucket công khai (`credential_media_crops`), và snapshot Credential chỉ mang các crop của file được hiển thị (`previews`: tối đa một crop mỗi hướng; Release cũ chỉ có `preview` vẫn được đọc) sau khi người chỉnh sửa bật **Show in Portfolio** cho file đó. Layout Credential của Portfolio quyết định in crop hướng nào (ADR-026). Góc xoay bằng chứng được lưu (`preview_rotation`), không bao giờ ghi vào bản gốc riêng tư. Ngược lại, thao tác xoay Project và Tool thay thế bản gốc để Website hiển thị đúng chiều; file trước đó chỉ bị xóa khi không còn Release nào tham chiếu.

## Hợp đồng preview Admin

- Bản preview Website, chi tiết Project, chi tiết Tool, CV và Portfolio trao đổi payload form chưa lưu mới nhất qua quy trình bắt tay ready/rendered cùng origin. Iframe thông báo sẵn sàng sau khi Admin xác thực quyền, nhờ đó payload đầu tiên không thể bị mất trong lúc khởi động bất đồng bộ.
- Professional Profile vẫn là trình chỉnh sửa dữ liệu dùng chung. Draft CV và Portfolio luôn kế thừa tên, email, điện thoại, ảnh và địa điểm từ Professional Profile đã lưu, còn mỗi tài liệu sở hữu title và summary riêng theo vai trò, đồng thời có thể chủ động làm mới hai trường đó từ Profile dùng chung. Nội dung cover và narrative của Portfolio dùng cùng dạng localized text EN/VI như nội dung Website. Draft CV và Portfolio tái cấu trúc Experience, Education, Credential, Skill Group và Language từ Professional Profile hiện tại mỗi khi workspace tải, chỉ giữ lại lựa chọn đã lưu; lưu Professional Profile hoặc thay đổi một Credential sẽ tải lại cả hai workspace. Mục được thêm vào Profile sau lần lưu Draft gần nhất không tự động được chọn và được đánh dấu **New** trong tab Background của Draft đó cho đến khi Draft được lưu. Bản preview Website, CV, Portfolio và Cover Letter nằm trong workspace riêng, còn Release đã publish vẫn đóng băng.
- Thay đổi Project và automation tool đánh dấu các workspace phụ thuộc là cũ. Chúng tải lại ở lần truy cập kế tiếp mà không bỏ chỉnh sửa trong workspace khác đang mở.
- Draft CV và Portfolio kết hợp record Project/Tool dùng chung hiện tại với thiết lập tài liệu đã lưu. Release đã publish vẫn là snapshot bất biến.
- Draft Cover Letter render trực tiếp từ form hiện tại. Thư ở trạng thái Final và archived giữ snapshot người gửi đã lưu.
- Phiên bản Release Website được tạo tự động lúc publish. Lịch sử Release vẫn truy cập được từ header Homepage mà không chiếm vùng preview.

## Mô hình hiệu năng Admin

Admin shell và style workspace tải sớm theo thứ tự cascade xác định, trong đó `admin-ui.css` luôn là lớp chuẩn hóa cuối cùng. JavaScript của Website/Profile, CV/Portfolio, Cover Letter và crop media Portfolio vẫn tải theo route. Khởi tạo route chỉ yêu cầu dữ liệu cần cho workspace được chọn; các lượt đọc Profile, Credential, Profile Photo và health dùng chung được khử trùng lặp request trong bộ nhớ thời gian ngắn. Mutation thành công sẽ thay thế hoặc vô hiệu hóa mục cache tương ứng; file tài liệu riêng tư và URL ký không bao giờ được lưu lâu trong cache.

Media Admin ngoài viewport dùng cơ chế lazy decode ảnh có sẵn của trình duyệt. Hàng và card tương tác không dùng chiều cao nội tại ước đoán, tránh dịch chuyển scroll và layout khi nội dung đi vào viewport. CI đo JavaScript và CSS đã nén được HTML `/admin/` sau build tham chiếu để việc tăng bundle ngoài ý muốn không thể âm thầm làm giảm hiệu năng khởi động.

## Ranh giới bảo mật

Trình duyệt chỉ chứa Supabase publishable key. Row Level Security và allowlist `auth.uid()` bất biến bảo vệ thao tác ghi và đọc Draft. Service-role key tuyệt đối không được thêm vào code frontend hoặc repository.

Bucket Storage là công khai vì ảnh đã duyệt phải render trên GitHub Pages. Do đó, URL object trực tiếp bị lộ vẫn có thể mở được ngay cả khi record cơ sở dữ liệu đang là Draft. Chỉ media đã làm sạch, sẵn sàng công khai mới được đưa vào bucket này.

## Health vận hành Admin và cổng Release

Admin Overview đọc `admin_schema_health()` khi workspace đã xác thực khởi động. Phản hồi không chứa thông tin xác thực; nó báo phiên bản schema hiện tại, cơ chế bảo vệ publish bằng transaction, dọn media có xét Release, grant `service_role` theo nguyên tắc đặc quyền tối thiểu, lịch Trash Cron hằng ngày và trạng thái lần chạy theo lịch gần nhất. Cron job chưa đến lần chạy đầu tiên theo lịch được hiển thị là pending và riêng điều đó không làm hệ thống thành unhealthy.

Mọi lần deploy GitHub Pages đều chạy `npm run verify:admin`. Cổng này dừng deploy nếu kiểm tra TypeScript, test hồi quy Admin hoặc production build thất bại. Bộ test hồi quy bảo vệ chuẩn hóa deep link, hành vi dirty-state dùng chung, mức sẵn sàng nội dung, lưu Draft Website/payload publish và phân tích health vận hành.

Xem `docs/admin-operations.md` để biết cách kiểm tra deploy và sự cố.
