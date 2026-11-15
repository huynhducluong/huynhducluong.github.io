# Bộ UI cho dự án tiếp theo

Thư mục này đóng gói các phần dùng lại được của hệ thống UI trong repository: token thiết kế, component TypeScript không framework và các quy tắc giữ chúng nhất quán. Dùng nó để bắt đầu project Vite + TypeScript mới (portfolio khác, CMS nhỏ, trình tạo tài liệu) với cùng hình thức và UX.

Nội dung:

- `tokens.css`: cả ba họ token (Website, Admin, tài liệu), cộng baseline focus và reduced-motion, với chính xác các giá trị dùng tại đây.
- `CLAUDE.template.md`: file `CLAUDE.md` khởi đầu cho project mới. Sao chép, điền chỗ trống và sao chép các tài liệu hướng dẫn mà nó trỏ tới.
- README này: nội dung cần sao chép, yêu cầu của từng module và cách điều chỉnh.

## 1. Nguyên tắc thiết kế mang sang

1. **Token trước tiên.** Mọi màu, kích thước, radius, shadow và thời lượng là CSS custom property. Mỗi loại bề mặt (Website, Admin, tài liệu) có họ riêng và không bao giờ trộn các họ.
2. **Một hành động primary mỗi view.** Hành động secondary đứng trước nó, còn hành động phá hủy hoặc ít dùng nằm sau menu More với xác nhận danger.
3. **Renderer dùng chung thay cho markup sao chép.** Mẫu dùng hai lần trở thành hàm trong module dùng chung trước khi được dùng lần thứ ba.
4. **Chuỗi vào, chuỗi ra.** Component là hàm thuần trả về chuỗi HTML đã escape, cộng các hàm `bind…(root)` gắn hành vi. Nhờ đó có thể test chúng trong Node mà không cần DOM.
5. **Song ngữ theo dạng.** Nội dung là `{ en, vi }`; UI chrome đọc từ object `copy`; tiếng Anh là dự phòng.
6. **Mặc định accessible.** Focus nhìn thấy được, tên truy cập trên nút icon, tab và dialog hoàn chỉnh bằng bàn phím, chuyển động ≤150–180 ms và tắt khi reduced motion.
7. **In là một hợp đồng.** Trang `mm` kích thước cố định, `@page { margin: 0 }`, phát hiện overflow và export qua engine in trình duyệt.
8. **Chỉ theme sáng.** Mọi bề mặt đặt `color-scheme: light`.
9. **Preview chính là output.** Mọi preview artifact được tạo (crop, trang PDF, export) được tính từ cùng trạng thái và hàm thuần như file đã lưu, không bao giờ từ widget riêng. Xem `docs/admin-ui-guidelines.md` §7.1.
10. **Một glyph, một nơi.** Mỗi icon lặp lại (chevron dropdown, close, zoom − / +) là một hằng SVG dùng chung với một bộ token kích thước và vị trí. Không bao giờ dùng ký tự gõ tay hoặc SVG sao chép (§6.1, §8.1).
11. **Một cấu trúc dialog.** Header (eyebrow, title, note, close), body, footer (công cụ bên trái; Cancel rồi primary ngoài cùng bên phải), với một token gutter trên mọi dải (§8.1).
12. **Dữ liệu người dùng nhường chỗ, copy giao diện thì không.** Label và hành động cố định không bao giờ co hoặc wrap. Chỉ dữ liệu người dùng bị cắt, luôn có tooltip đầy đủ giá trị, và không bao giờ nối với meta trong một label. Danh sách mục người dùng là các hàng dọc. Layout phản ứng theo container, không theo viewport (§6.2).
13. **Form giữ một grid và trạng thái nhìn thấy được.** Mọi hàng trường theo form grid. Option thay đổi một trường nằm trong hàng label của trường đó. Trường disabled hoặc không áp dụng trông disabled (§6.3).
14. **Một cấu trúc card.** Nhận diện và trạng thái bên trái; di chuyển, một hành động thường dùng và menu More bên phải. Hành động phá hủy luôn nằm trong More. Fact tạo thành một dòng meta, mỗi fact xuất hiện một lần và có tối đa hai cấp box (§6.4).
15. **Chỉ pane được scroll.** Frame layout dùng `overflow: clip`, và code reveal phần tử bằng cách scroll pane scroll thật gần nhất (`revealAdminElement`), không bao giờ dùng `scrollIntoView` vì nó còn scroll frame đã clip và làm dịch toàn ứng dụng (§12).
16. **Hàng không bao giờ nhảy.** Các trường dùng chung một hàng căn theo điều khiển, còn hàng label giữ chiều cao một dòng label. Component trông giống nhau ở mọi nơi được render: quy tắc container chỉ style trường text (`:where(:not(...))` cho toggle), component trường dùng chung ưu tiên hơn, và dialog là container riêng. Trường đổi sang phần tử đại diện giữ kích thước. Xác minh trong container thật và mọi trạng thái toggle (§6.3 "Rows must not jump").
17. **Upload trông giống kết quả đã lưu.** Upload pending và mục đã lưu dùng chung một component hàng; chỉ dòng trạng thái và hành động khác nhau. Trường song ngữ giữ cặp EN | VI. File input trình duyệt không bao giờ nhìn thấy được; dùng drop zone hoặc nút. Save chỉ xuất hiện khi có thay đổi. Thuộc tính `hidden` luôn ưu tiên hơn CSS component (§6.5).
18. **Số đếm nói rõ tác dụng checkbox.** "N of M shown" khi toggle điều khiển khả năng hiển thị của entry nguồn đã sở hữu; "N of M selected" khi chọn mục từ thư viện. Tổng chỉ đếm mục có thể chọn. Trạng thái trống dùng từ ngữ ("Hidden", "None selected"). Một hàm viết cách diễn đạt (§6.6).

## 2. Danh mục component

Mọi đường dẫn tính tương đối từ repository này. "Dependency" liệt kê nội dung file import; file được đánh dấu standalone có thể sao chép riêng.

### Nền tảng

| File | Cung cấp | Dependency |
|---|---|---|
| `src/styles/reset.css`, `global.css`, `tokens.css` | Reset, kiểu chữ cơ sở, `.container`, `.section`, `.section-heading`, `.button`, `.tag`, skip link, reduced motion | không có |
| `src/shared/format.ts` | `escapeHtml`, `localize`, `formatDate`, `vietnameseToAscii`, `assetUrl` | `types/career` (`LocalizedText`, `Profile`); với project mới, giữ `escapeHtml` / `localize` và bỏ helper Profile |

### Component Admin / back-office

| File | Cung cấp | Dependency |
|---|---|---|
| `src/admin/ui.ts` | Header tài liệu/editor, header dialog có nút đóng, card section, field label có dấu bắt buộc, toolbar preview, điều khiển select, text bị cắt có tooltip, menu More trên card và icon dùng chung (chevron, close, zoom, arrow, more), điều khiển zoom crop, year picker, trạng thái workspace, tablist accessible, `setButtonBusy` | `shared/format` (`escapeHtml`) |
| `src/admin/cropGeometry.ts` | Phép tính crop thuần: crop tự động, hình chữ nhật export, style preview, constraint phủ kín, zoom. Standalone và có unit test | standalone |
| `src/admin/cropStage.ts` | Liên kết ảnh và vùng chọn cropperjs v2 với `cropGeometry`, báo một trạng thái crop | `cropperjs`, `cropGeometry` |
| `src/admin/toast.ts` | `showAdminToast(text, "info" \| "success" \| "error")` với tạm dừng khi hover và giới hạn theo dialog | standalone |
| `src/admin/confirmDialog.ts` | `confirmAdmin({ title, message, tone: "warning" \| "danger" \| "primary" })` → `Promise<boolean>`, trả focus | standalone |
| `src/admin/textInputDialog.ts` | `requestAdminText(...)` → `Promise<string \| null>` | standalone |
| `src/admin/dirtyState.ts` | Theo dõi thay đổi chưa lưu theo scope, guard `beforeunload` | standalone (sửa union `AdminDirtyScope`) |
| `src/admin/headerDensity.ts` | Toggle header Comfortable/compact được lưu trong `localStorage` với dự phòng an toàn | standalone |
| `src/admin/adminIcons.ts` | Icon navigation SVG inline (24×24, stroke, điểm nối tròn) | standalone |
| `src/admin/previewZoom.ts` | Zoom Fit / − / + cho frame preview kích thước cố định | standalone |
| `src/admin/embeddedPreview.ts` | Binding preview iframe | standalone |
| `src/shared/previewProtocol.ts` | Quy trình bắt tay ready/rendered cùng origin để đẩy dữ liệu form chưa lưu vào iframe preview | standalone (sửa `PreviewKind`) |
| `src/styles/admin.css`, `admin-typography.css`, `admin-ui.css` (tải theo thứ tự này, `admin-ui.css` cuối) | Shell Admin, token và chrome dùng chung: nút, chip trạng thái, dialog, toast, tab, header, focus | `tokens.css` (`--color-primary` cho toast) |

### Component tài liệu

| File | Cung cấp | Dependency |
|---|---|---|
| `src/themes/documentThemes.ts` (+ `documentThemes.test.ts`) | Engine theme hai màu: token suy ra, primary tự làm tối đến độ tương phản 4.5:1, `getContrastRatio`, preset, `applyDocumentTheme` | `types/theme` (sao chép cả file này) |
| `src/portfolio/safeArea.ts` (+ test) | Phát hiện nội dung chạy vào dải header/footer cố định, không chỉ vượt mép trang; dùng lại được cho mọi tài liệu phân trang có chrome | standalone |
| `src/themes/themeController.ts` | Điều khiển theme picker | `documentThemes` |
| `src/shared/documentPrintPreview.ts` + `src/styles/document-print-preview.css` | Toolbar in, trạng thái sẵn sàng ("checking" / "success" / "error"), nút in | `shared/format` |
| `src/styles/cv-print.css`, `portfolio-print.css`, `cover-letter-print.css` | Hợp đồng in A4 dọc / ngang | không có |

## 3. Bắt đầu project mới

1. Chạy `npm create vite@latest <name> -- --template vanilla-ts`, sau đó thêm `vitest`.
2. Sao chép `docs/ui-kit/tokens.css` tới `src/styles/tokens.css`, cùng `reset.css` và `global.css`. Đổi **giá trị** token cho thương hiệu mới; giữ tên để component tiếp tục hoạt động.
3. Sao chép component cần dùng từ danh mục cùng dependency của chúng. Chỉ đổi prefix `admin` nếu đổi ở mọi nơi, gồm class CSS và contract test.
4. Sao chép `docs/ui-kit/CLAUDE.template.md` sang repo mới thành `CLAUDE.md`. Sao chép `docs/admin-ui-guidelines.md`, `docs/ui-guidelines.md` và `docs/coding-conventions.md` vào `docs/` mới rồi xóa section không áp dụng.
5. Sao chép các test tương ứng (`ui.test.ts`, `headerDensity.test.ts`, `dirtyState.test.ts`, `adminStyles.test.ts`) và điều chỉnh. Chúng giữ các quy tắc được bắt buộc.
6. Thêm script `verify` (`tsc --noEmit && vitest run && vite build`) và chạy trong CI trước khi deploy. Nếu có bundle back-office, sao chép `scripts/check-admin-bundle.mjs` và đặt ngân sách.

## 4. Điều chỉnh thương hiệu

- **Website:** đổi `--color-primary`, `-dark`, `-light`, `--color-accent`, `--color-dark` và hai font stack. Giữ độ tương phản của text trắng trên `--color-primary` ≥ 4.5:1.
- **Admin:** đổi `--admin-color-focus` / `-focus-ring` thành primary mới; giữ nguyên các màu ngữ nghĩa success, warning và danger trừ khi không đạt tương phản.
- **Tài liệu:** thêm preset bằng `createPreset(id, name, primary, accent)`; mọi màu tài liệu khác được suy ra. Kiểm tra `onPrimary` vẫn dễ đọc bằng test nhanh `getContrastRatio`.

## 5. Khoảng trống đã biết cần sửa khi dùng lại

- Không có dark theme. Thêm theme này cần một block `prefers-color-scheme` cho mỗi họ token, không phải mỗi component.
- Toast Admin đọc `--color-primary` từ token Website, nên cũng tải `tokens.css` trong entry Admin.
- Helper header trong `ui.ts` giả định tên class CSS Admin; sao chép `admin-ui.css` cùng chúng.
