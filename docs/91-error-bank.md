# 91 — Error Bank: sai lầm và sai giả định đã gặp

> Mục đích: để Agent và người vận hành không lặp lại. Mỗi mục ghi: hiện tượng, nguyên nhân, bài học, phòng ngừa.
> Lỗi giao diện thì thêm quy tắc UI-xx ở [docs/92](92-ui-rules.md); mục ở đây ghi sai lầm về cách làm, dữ liệu, test, bảo mật, môi trường.
> E-001 … E-005 ghi bù ngày 2026-11-15 từ quy tắc đã có trong docs và memory của Agent; ngày trong ngoặc là commit đầu tiên ghi quy tắc đó vào docs (ngày gặp lỗi có thể sớm hơn).

<a id="e-001"></a>
## E-001 — Kiểm thành phần ngoài container thật nên không thấy lỗi bố cục (2026-10-31)

- **Hiện tượng:** hộp Credential trông đúng khi dựng trên trang trống; trong app thật, quy tắc rộng `.admin-document-editor label/input` biến ô "Does not expire" thành lưới toàn chiều ngang nằm trên chữ; container query đo panel phía sau modal.
- **Nguyên nhân:** test và harness dựng thành phần **ngoài** nơi nó thật sự hiển thị; quy tắc CSS của container cha không áp vào.
- **Bài học:** hàng không đều / chữ nhảy dòng là lỗi tái phát nhiều nhất người vận hành báo. Chỉ kiểm trong container thật, mọi trạng thái toggle, mới thấy.
- **Phòng ngừa:** [UI-01](92-ui-rules.md#ui-01); `admin-ui-guidelines.md` §6.3 "Rows must not jump"; `npm run shots` báo *uneven field row*; hộp thoại mở bằng tay ở cả hai trạng thái.

<a id="e-002"></a>
## E-002 — Test đọc CSS bằng `?raw` đạt "giả" khi Vitest không xử lý CSS (2026-10-28)

- **Hiện tượng:** test hợp đồng CSS (`not.toContain(...)`) đạt dù quy tắc sai.
- **Nguyên nhân:** không có `test: { css: true }` trong `vite.config.ts`, Vitest trả chuỗi rỗng cho CSS `?raw`; mọi `not.toContain` đều đúng.
- **Bài học:** test chỉ có khẳng định phủ định có thể đạt vì đọc nhầm đầu vào rỗng.
- **Phòng ngừa:** giữ `css: true`; mỗi file CSS được test có ít nhất một `toContain` khẳng định ([coding-conventions §6](coding-conventions.md)).

<a id="e-003"></a>
## E-003 — Escape hai lần làm trang hiện `&amp;` (2026-10-28)

- **Hiện tượng:** chữ "R&D" hiện `R&amp;D` trên trang.
- **Nguyên nhân:** bọc `localize(...)` (đã escape) trong `escapeHtml` thêm lần nữa.
- **Bài học:** escape **đúng một lần**, tại chỗ xuất ra HTML.
- **Phòng ngừa:** [coding-conventions §4](coding-conventions.md); test "escapes localized text exactly once" trong `layouts.test.ts`.

<a id="e-004"></a>
## E-004 — Hàm `security definer` mặc định gọi được bởi `anon` (2026-10-28)

- **Hiện tượng:** hàm RPC chỉ dành cho Admin có thể được gọi bằng publishable key.
- **Nguyên nhân:** Supabase mặc định cấp EXECUTE cho `anon` và `authenticated` trên mọi hàm mới.
- **Bài học:** quyền mặc định của nền tảng không phải quyền tối thiểu; phải thu hồi rõ.
- **Phòng ngừa:** hàm mới kiểm `public.is_portfolio_admin()` và `revoke execute … from anon` (và `authenticated` khi nội bộ); [AGENTS §5](../AGENTS.md); `admin-operations.md` "RPC execute privileges"; Admin health báo grant thừa.

<a id="e-005"></a>
## E-005 — Khung `overflow: hidden` vẫn bị script cuộn, để lại dải trống (2026-10-31)

- **Hiện tượng:** bấm link "Language: English" làm cả workspace cuộn lên, dưới đáy trống một dải.
- **Nguyên nhân:** `scrollIntoView()` cuộn cả khung `overflow: hidden` (vẫn cuộn được bằng script).
- **Phòng ngừa:** khung dùng `overflow: clip`; đưa phần tử vào tầm nhìn bằng `revealAdminElement`; cấm `scrollIntoView` trong Admin (`adminStyles.test.ts`); `admin-ui-guidelines.md` §12; [UI-05](92-ui-rules.md#ui-05).

<a id="e-006"></a>
## E-006 — Chạy test từ ổ đĩa viết thường (`d:\`) làm mọi file test lỗi (2026-11-15)

- **Hiện tượng:** `npm run verify:admin` báo 29/29 file test lỗi `TypeError: Cannot read properties of undefined (reading 'config')`, "no tests"; chạy một file thì "No test files found".
- **Nguyên nhân:** thư mục làm việc của VS Code / shell là `d:\…` (viết thường) còn Vitest giải đường dẫn thành `D:/…`; trên Windows hai đường dẫn khác chữ hoa nạp hai bản module Vitest.
- **Bài học:** lỗi đồng loạt ở **mọi** file test, kể cả file không liên quan, là dấu hiệu môi trường chứ không phải code; kiểm môi trường trước khi sửa code.
- **Phòng ngừa:** chạy lệnh từ `D:\…` ([AGENTS §10](../AGENTS.md#10-lệnh)); đề bài ghi điều này ở tiêu chí `verify:admin`.

<a id="e-007"></a>
## E-007 — Hết token giữa chừng, phần sửa dở nằm im không ai nhớ (2026-11-15)

- **Hiện tượng:** ba file (`ui-guidelines.md`, `layouts.test.ts`, `portfolio-screen.css`) sửa xong nhưng chưa commit từ phiên trước; người vận hành không nhớ đã xong chưa. Phải kiểm lại toàn bộ (verify + đo trình duyệt) mới dám commit.
- **Nguyên nhân:** làm thẳng trên `main`, không chia bước, không commit `wip`, không ghi đã làm tới đâu.
- **Bài học:** công việc bị ngắt phải để lại dấu vết đủ để người khác làm tiếp.
- **Phòng ngừa:** đề bài chia bước, mỗi bước commit `wip` trên nhánh riêng và ghi "Đã xong bước" ở mục 5 (ADR-016, [docs/tasks/README.md](tasks/README.md)).

<a id="e-008"></a>
## E-008 — Ảnh minh chứng công khai để lộ số định danh và ngày sinh (2026-11-15)

- **Hiện tượng:** crop Landscape của phiếu điểm TOEIC đang bật "Show in Portfolio" cho thấy rõ họ tên, **số định danh cá nhân** và **ngày sinh**; cùng ảnh được dán vào sổ lỗi UI/UX trên Google Docs (ai có link đều xem được). Claude phát hiện khi đọc sổ lần đầu.
- **Nguyên nhân:** thiết kế coi "crop do người vận hành tạo" là đủ an toàn để công khai (ADR-015), nhưng không có bước nào nhắc kiểm thông tin cá nhân trong vùng crop; Admin không có công cụ che vùng.
- **Bài học:** tài liệu chứng chỉ thường in số giấy tờ, ngày sinh, mã thí sinh. "Riêng tư bằng cách chỉ công khai bản crop" chỉ đúng khi vùng crop không chứa các thông tin đó.
- **Phòng ngừa:**
  - Ngay: người vận hành crop lại tránh vùng số định danh / ngày sinh (hoặc tắt Show in Portfolio), và xóa / che ảnh đó trong sổ Google Docs. **Quyết định 2026-11-15:** người vận hành tự quản việc công khai (chỉ bật Show in Portfolio và publish khi chủ động muốn), không cắt lại ảnh hiện có; Claude không nhắc lại như việc gấp. Lời nhắc trong hộp crop (GD3-03) vẫn giữ làm lưới an toàn.
  - Thiết kế (N3): hộp Adjust crops nhắc "kiểm số giấy tờ, ngày sinh trước khi công khai"; xét công cụ che vùng (redact) ghi thẳng vào bản crop WebP.
  - Sổ lỗi UI/UX: quy tắc riêng tư ở [docs/93](93-workflow-friction.md#sổ-lỗi-uiux-trên-google-docs-chốt-adr-023-2026-11-15).

<a id="e-009"></a>
## E-009 — Báo động nhầm vì mở thẳng đường dẫn nội bộ, bỏ qua bước của luồng thật (2026-11-15)

- **Hiện tượng:** khi làm demo N6, Claude mở trực tiếp `/portfolio/?mode=print&document=<id>` và thấy 3 ảnh vỡ, rồi báo người vận hành "bấm Save draft trước khi xuất PDF" và đề xuất nhóm N8 (W-10). Sau đó đọc mã mới thấy nút Print / PDF và Publish **luôn lưu bản dựng từ form hiện tại** trước khi mở trang in / xuất bản, nên PDF thật không bị ảnh vỡ.
- **Nguyên nhân:** phép thử bỏ qua bước trung gian mà giao diện làm (lưu bản đang xem) và dữ liệu đọc ra là bản đã lưu cũ; kết luận được đưa ra trước khi đọc mã của luồng thật.
- **Bài học:** muốn khẳng định "người dùng sẽ gặp lỗi" phải tái hiện bằng **đúng thao tác của người dùng** (bấm nút) hoặc đọc mã của luồng đó, không mở thẳng URL nội bộ; và không đưa lời khuyên thao tác cho người vận hành trước khi xác minh.
- **Phòng ngừa:** mọi phát hiện kiểu "PDF / bản xuất sai" kèm một dòng "đã đi qua nút nào"; nếu thao tác thật ghi vào dữ liệu thì đọc mã trước, nói rõ phần chưa chạy thử. Xem [W-10](93-workflow-friction.md) (đã rút lại).

## Mẫu

```markdown
<a id="e-xxx"></a>
## E-xxx — <tiêu đề> (YYYY-MM-DD)
- **Hiện tượng:**
- **Nguyên nhân:**
- **Bài học:**
- **Phòng ngừa:**
```
