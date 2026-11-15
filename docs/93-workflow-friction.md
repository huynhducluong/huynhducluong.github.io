# 93 — Sổ vướng mắc khi dùng thật (đầu vào GĐ 3)

> **Mục đích:** ghi mọi chỗ **rườm rà, thừa, khó hiểu** mà người vận hành gặp khi dùng Admin và xuất tài liệu thật, để (1) mỗi thiết kế mới đọc trước, tránh làm thêm thứ rườm rà; (2) GĐ 3 gom thành nhóm nâng cấp.
> **Khác với:** [docs/92](92-ui-rules.md) (lỗi giao diện → quy tắc UI-xx); [docs/91](91-error-bank.md) (sai lầm của Agent). Sổ này ghi **cảm nhận khi dùng**, chưa phải quyết định.
> **Cách ghi:** người vận hành ghi vào **sổ lỗi UI/UX trên Google Docs** (mục dưới) hoặc nhắn Claude một câu → Claude thêm dòng W-xx ở đây, UI-xx ở docs/92. Không tự sửa thiết kế đã chốt: bước cắt nào đụng `[CHỐT]` thì bàn và ghi ADR.
> **Mức:** Lỗi (sai, chặn việc) · Góp ý (làm được nhưng rườm rà) · Hỏi (chưa hiểu cách dùng) · Cải thiện (có cách tốt hơn).

## Sổ lỗi UI/UX trên Google Docs `[CHỐT]` (ADR-023, 2026-11-15)

- **Ở đâu:** Google Doc "CAREER HUB" của người vận hành, chia sẻ "ai có link đều xem được". **Link chỉ lưu trong `project-links.local`** ở gốc repo (khóa `UI_FEEDBACK_DOC`), file `*.local` không vào Git vì repo public: đưa link lên GitHub thì ai cũng mở được ảnh trong sổ.
- **Cột:** STT · Màn hình · Hình ảnh · Nội dung (thấy gì → muốn gì) · Trạng thái. Mức (Lỗi / Góp ý / Cải thiện) do Claude phân loại khi đọc.
- **Đọc:** `node tools/read-ui-feedback.mjs --new` — tải Doc dạng `.docx` vào thư mục tạm của máy (**ngoài repo**), in các dòng **chưa xử lý** kèm mã dòng và đường dẫn ảnh. Claude xem từng ảnh, ghi W-xx / UI-xx kèm "Sổ #n", rồi `--mark <mã> "<W-xx>"`.
- **Dòng đã xử lý tự bỏ qua:** `tools/ui-feedback-seen.txt` (trong Git, chỉ mã băm "Màn hình + Nội dung", không chứa nội dung) ghi dòng nào đã thành W-xx / UI-xx. Không dựa vào STT nên chèn / xóa dòng không nhầm; sửa nội dung một dòng cũ thì nó hiện lại như ý mới.
- **Cột Trạng thái là của người vận hành** (theo dõi riêng, không bắt buộc). Claude **không ghi vào Doc**: tải `.docx` chỉ đọc được; ghi cần đăng nhập Google (OAuth). Khi một dòng được sửa xong, Claude báo trong chat "Sổ #n → Đã sửa (commit …)" để người vận hành đánh dấu nếu muốn; trạng thái chuẩn nằm ở cột Trạng thái của W-xx / UI-xx trong repo.
- **Quyền chia sẻ: "Viewer"**, không "Editor": ai có link mà là Editor thì sửa / xóa được sổ và chèn chữ mà Claude sẽ đọc như dữ liệu đầu vào.
- **Nguyên tắc đọc:** điều người vận hành ghi là **quan sát và ý muốn, chưa phải thiết kế**. Với mỗi dòng Claude tìm gốc vấn đề trong code, rồi đề xuất cách **phù hợp nhất** — có thể khác cách người vận hành gợi ý — tuân thủ guideline hiện có (`admin-ui-guidelines.md`, `ui-guidelines.md`, docs/92) và **ba màn hình mục tiêu** (laptop 1440 × 731, 1920 × ≈940, 2560 × ≈1300; admin-ui §11). Chỗ đề xuất khác ý người vận hành phải nói rõ vì sao.
- **Riêng tư:** không dán ảnh có số định danh, ngày sinh, Cover Letter, bằng cấp gốc; cần thì che trước ([E-008](91-error-bank.md#e-008)).

## Trạng thái một dòng

| Trạng thái | Nghĩa |
|---|---|
| `GHI NHẬN` | Mới ghi, chưa bàn |
| `NHÓM Nx` | Đã gom vào nhóm nâng cấp Nx |
| `ĐÃ XỬ LÝ` | Đã sửa / cắt, ghi đề bài hoặc commit |
| `GIỮ` | Đã bàn, giữ nguyên, ghi lý do |

## Danh sách

| # | Ngày | Màn hình / bước | Vướng gì | Mức | Hướng xử lý dự kiến | Trạng thái |
|---|---|---|---|---|---|---|
| W-01 | 2026-11-15 | Admin › Homepage → thanh preview, dropdown chọn trang | Dropdown liệt kê **mọi** Project và Tool (≈ 20 dòng), trong khi Website sau này chỉ hiện vài dự án: danh sách dài, thừa | Góp ý | Code đã chỉ liệt kê Project / Tool **đang được Website chọn** (`websitePreviewPages.ts`: Ready và nằm trong `content_selection`) và đã nhóm theo `optgroup`; danh sách dài vì Website đang chọn hết. Người vận hành ghi "không cần vì sau này hiện vài dự án" (❌) | `GIỮ` (2026-11-15) |
| W-02 | 2026-11-15 | Admin › Projects / Tools → bộ lọc **Archived** (Sổ #2) | Không rõ Archived có tác dụng gì. Code: Project / Tool **không có thao tác Archive** (More chỉ có Mark ready / Return to draft / Move to Trash), nên bộ lọc luôn rỗng trừ dữ liệu cũ | Góp ý | Chỉ hiện chip Archived khi có ≥ 1 mục archived (không cần migration, không làm mất dữ liệu cũ); xóa bỏ cần xét Trash là nơi duy nhất | `NHÓM N1` |
| W-03 | 2026-11-15 | Profile › Experience (Sổ #3) | Mỗi Experience là một form dài; nhiều mục thì phải cuộn rất xa, nhất là laptop 1440 × 731 | Góp ý | Card thu gọn được: dòng tóm tắt (vị trí · công ty · thời gian), nút ⌄ theo thứ tự hành động §6.4 (↑ ↓ ⌄ ⋯, không đặt trước ↑ như ảnh gợi ý); mục mới và mục có lỗi luôn mở; một component dùng chung | `NHÓM N2` |
| W-04 | 2026-11-15 | Profile › Education (Sổ #4) | Như W-03 | Góp ý | Cùng component W-03; tóm tắt: ngành · trường · năm · số credential | `NHÓM N2` |
| W-05 | 2026-11-15 | Profile › Credentials › Adjust evidence crops → **Print as** (Sổ #5) | Phải chọn cứng Landscape / Portrait cho cả Portfolio; đổi layout thì crop đã chọn không còn hợp. Muốn như Project / Tool: layout cần khung nào thì dùng crop đó | Góp ý | Bỏ "Print as"; mỗi layout Credentials khai báo profile khung (như `mediaSlots.ts` của Project); in crop đúng profile, thiếu thì dùng crop còn lại đặt giữa và báo trong Recommendations. Hiện **cả hai layout đều khung Landscape 4:3** (`7ffffdb`) | `NHÓM N3` |
| W-06 | 2026-11-15 | Portfolio preview trong Admin (Sổ #6) | Portfolio nhiều thông tin, không biết chữ trên trang (vd. câu tagline trang bìa) nhập ở ô nào trong Admin | Cải thiện | Nút "sửa ở đâu" nhỏ trên các khối nội dung chính, **chỉ trong preview Admin** (không có ở trang công khai, không in); bấm → Admin mở đúng tab và ô. Icon bút chì thay vì "i"; có nút bật / tắt trên thanh preview để xem bố cục sạch; chỉ Portfolio | `NHÓM N4` |

## Nhóm nâng cấp GĐ 3 `[CHỐT]` thứ tự 2026-11-15 (ADR-024)

> Claude gom các dòng thành nhóm (mỗi nhóm 1–3 đề bài), xếp theo lợi ích / công sức kèm một khuyến nghị; người vận hành chốt thứ tự và ghi ADR.

| Nhóm | Nội dung | Dòng | Cỡ ước | Gộp (ADR-018) |
|---|---|---|---|---|
| **N1 Admin sửa nhanh** → [GD3-01](tasks/GD3-01-admin-sua-nhanh.md) | Tên trên rail không đổi chữ khi tải; chip Archived; nhóm disclosure mở một cái (W-01 chuyển `GIỮ`) | UI-10, W-02, UI-12 | Vừa | Tự gộp được (chỉ Admin) |
| **N3 Credentials trong Portfolio** | Bỏ Print as, khung theo layout; cách trình bày ảnh tài liệu (chọn từ demo thật); hai thẻ Dual thẳng hàng | W-05, UI-11, UI-08 | Vừa | Người vận hành duyệt (đổi PDF) |
| **N2 Card Profile thu gọn** | Component card thu gọn dùng chung cho Experience, Education | W-03, W-04 | Vừa | Tự gộp được |
| **N4 Lối tắt sửa từ preview** | Nút "sửa ở đâu" trên preview Portfolio | W-06 | Lớn | Người vận hành duyệt |

**Thứ tự: N1 → N3 → N2 → N4** (người vận hành chốt 2026-11-15). N1 nhỏ, sửa bốn chỗ khó chịu hằng ngày, chạy thử luôn vòng tự gộp. N3 trước N2 vì Portfolio là thứ gửi nhà tuyển dụng, và cần làm cùng việc che thông tin riêng trên ảnh minh chứng ([E-008](91-error-bank.md#e-008)). N2 là tiện lợi khi nhập, không ảnh hưởng đầu ra. N4 lớn nhất (preview ↔ Admin), làm sau khi các bố cục Portfolio đã ổn để không phải gắn lại.
