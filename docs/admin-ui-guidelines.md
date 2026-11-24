# Hướng dẫn UI/UX Admin

Các quy tắc này giữ mọi workspace Admin nhất quán. Đọc chúng trước khi thay đổi bất kỳ thứ gì trong `src/admin/` hoặc `src/styles/admin*.css`. Khi thay đổi cần phá vỡ một quy tắc, hãy cập nhật file này trong cùng thay đổi và giải thích lý do.

Liên quan: website công khai và tài liệu có thể in theo `docs/ui-guidelines.md`; style code, test và migration theo `docs/coding-conventions.md`; bộ dùng lại cho dự án khác nằm trong `docs/ui-kit/README.md`.

## 1. Một hệ thống, component dùng chung

Admin có một hệ thống hình ảnh. Workspace kết hợp các renderer dùng chung từ `src/admin/ui.ts` thay vì tự viết markup cho cùng một mẫu.

| Mẫu | Cách dùng |
|---|---|
| Header workspace tài liệu (Homepage, Profile, CV, Portfolio, Cover Letter) | `renderAdminDocumentHeader` |
| Header trình chỉnh sửa mục chính (Project, Automation Tool) | `renderAdminEditorHeader` |
| Card section form | `renderAdminSectionCard` |
| Label trường, dấu bắt buộc | `renderAdminFieldLabel(label, required)` |
| Toolbar preview và các điều khiển | `renderAdminPreviewToolbar`, `renderAdminPreviewSelect`, `renderAdminPreviewLanguageToggle`, `renderPreviewZoomControls` |
| Điều khiển select, chevron dropdown | `renderAdminSelectControl`, `adminChevronIcon` (xem §6.1) |
| Header dialog và nút đóng | `renderAdminDialogHeader`, `adminCloseIcon` (xem §8.1) |
| Text người dùng bị cắt, icon di chuyển lên/xuống | `renderAdminTruncatedText`, `adminArrowUpIcon`, `adminArrowDownIcon` (xem §6.2) |
| Menu More trên card (⋯) | `renderAdminMoreMenu`, `installAdminMoreMenus` (xem §6.4) |
| Scroll một phần tử vào vùng nhìn thấy | `revealAdminElement` (xem §12) |
| Hàng media (pending và đã lưu), bộ chọn file, lựa chọn segmented | `renderPendingMediaRow`, `renderSavedMediaRow` (`mediaRows.ts`), `renderAdminFilePicker` + `bindAdminFilePickers`, `renderAdminSegmented` (xem §6.5) |
| Tiêu đề và số đếm nhóm lựa chọn | `renderAdminSelectionHeading`, `bindAdminSelectionCounts`, `adminSelectionCountText` (xem §6.6) |
| Hàng lựa chọn có tùy chọn in (Project CV) | `renderCvProjectRow`, `bindCvProjectRows`, `cvProjectStateText` (`cvProjectSelection.ts`, xem §6.7) |
| Hàng media Portfolio, nhóm override layout | `renderPortfolioMediaRow`, `syncPortfolioMediaRow`, `portfolioMediaRowState` (`portfolioMediaSelection.ts`, xem §6.8); `layoutOverrideGroup` (xem §6.6) |
| Hàng label trường, checkbox inline, trường tĩnh, hint | `.admin-field-label-row`, `.admin-inline-check`, `.admin-field-static`, `.admin-field-hint` (xem §6.3) |
| Cropper ảnh | `cropGeometry.ts` (phép tính thuần), `bindCropStage` / `waitForCropImage` (`cropStage.ts`), `renderAdminCropZoomControls` (xem §7.1) |
| Trạng thái loading, empty và error | `renderAdminWorkspaceState` |
| Xác nhận | `confirmAdmin` (`confirmDialog.ts`) |
| Prompt text | `requestAdminText` (`textInputDialog.ts`) |
| Thông báo phản hồi | `showAdminToast` (`toast.ts`) |
| Thay đổi chưa lưu | `setAdminDirty` / `isAdminDirty` (`dirtyState.ts`) |

Nếu mẫu mới xuất hiện trong hai workspace, hãy tách nó vào `ui.ts` trước khi thêm bản sao thứ ba.

## 2. Cấu trúc trang

Mọi workspace dùng cùng các lớp từ trên xuống dưới:

1. **Top bar Admin** (`.admin-header`): breadcrumb bên trái; hành động toàn cục bên phải (toggle mật độ header, View website). Hành động riêng của workspace không bao giờ nằm ở đây.
2. **Header workspace**: nhận diện bên trái (eyebrow, title hoặc bộ chuyển title, meta) và hành động bên phải.
3. **Body**: workspace tài liệu dùng bố cục hai cột `--admin-document-columns` (editor 44 / preview 56). Cột editor bắt đầu bằng tab (`.admin-document-tabs`, `role="tablist"`); cột preview bắt đầu bằng toolbar preview.

Eyebrow nêu loại workspace (Website, CV document, Portfolio document, Applications, Shared content). Title là tên tài liệu; khi có nhiều tài liệu, title là bộ chuyển tài liệu (`.admin-document-title-switcher`) mở library drawer.

## 3. Hành động header

Các hành động xuất hiện theo thứ tự cố định từ trái sang phải qua các slot của `renderAdminDocumentHeader`:

`saveState` → `utilityActions` (History) → `moreActions` (More) → `saveActions` (Save draft) → `primaryActions` (Publish / Finalize)

- Mỗi header có đúng một nút primary với class `admin-action-publish`. Save dùng `admin-action-save`, History và hành động tương tự dùng `admin-action-utility`, create dùng `admin-action-new`.
- Hành động phá hủy hoặc ít dùng (archive, delete, duplicate, rename) nằm trong More, không bao giờ là nút header riêng. Cùng quy tắc áp dụng cho mọi card (Experience, Education, Language, Credential, file bằng chứng, ảnh); xem §6.4.
- Mọi hành động phá hủy yêu cầu xác nhận qua `confirmAdmin` với `tone: "danger"`.
- Label nút là động từ ngắn theo sentence case: "Save draft", "Publish", "History (4)".

## 4. Mật độ header

Toggle top bar (`headerDensity.ts`) chuyển mọi header tài liệu giữa comfortable và compact. Đây là một preference toàn cục được lưu trong `localStorage` và áp dụng bằng `data-header-density="compact"` trên `<html>`.

Chế độ compact chỉ được ẩn eyebrow và chi tiết meta phụ. Không bao giờ được ẩn:

- title hoặc bộ chuyển tài liệu,
- chip trạng thái và dấu phiên bản đang hoạt động,
- trạng thái lưu ("Saved" / chưa lưu),
- bất kỳ hành động header nào.

Meta bị ẩn vẫn đọc được qua tooltip meta (`adminDocumentMetaText`). Vì vậy, nội dung meta mới dùng các span `.status`, `.admin-document-meta__active` hoặc `.admin-document-meta__detail` để chế độ compact và tooltip tự động xử lý.

## 5. Trạng thái

- Chip trạng thái dùng `.status` với một modifier được định nghĩa trong `admin-ui.css`: `status--draft`, `status--published`, `status--final`, `status--archived` hoặc `status--new` (mục cần người chỉnh sửa chú ý, như mục Profile chưa được chọn trong tài liệu). Thêm modifier tại đó trước khi dùng loại mới. Trong copy Admin, giá trị backend `published` của mục chính được trình bày là **Ready**.
- **Bộ lọc trạng thái chỉ đưa lựa chọn có thể có kết quả** ([W-02](93-workflow-friction.md)). Project / Tool không có thao tác Archive (chỉ Mark ready, Return to draft, Move to Trash), nên chip **Archived** của danh sách Content chỉ hiện khi có ít nhất một mục archived thuộc loại đang xem. Đang chọn Archived mà mục cuối rời trạng thái đó thì bộ lọc về **All**.
- Mọi workspace có thể chỉnh sửa báo thay đổi chưa lưu qua `dirtyState.ts`. Rời workspace dirty phải hỏi xác nhận; đóng tab được `bindAdminBeforeUnload` bảo vệ.
- Text trạng thái lưu là live region (`aria-live="polite"`).
- Trạng thái preview ("Synced", "Ready", "N issues") nằm trong meta toolbar preview. Issues mở dialog kiểm tra pre-publish.

### Dữ liệu dùng chung và output

- Professional Profile là nguồn duy nhất cho nhận diện, ảnh, Experience, Education, Credential, Skill và Language cùng thứ tự của chúng. Project và Automation Tool là nguồn duy nhất cho nội dung và thứ tự riêng.
- Output (Website, CV, Portfolio, Cover Letter) chỉ **chọn** các mục dùng chung. Chúng không bao giờ lưu thứ tự riêng hoặc bản sao nội dung dùng chung có thể chỉnh sửa; các trường riêng theo vai trò (title và summary CV/Portfolio) là ngoại lệ duy nhất và chỉ làm mới qua hành động "Sync from …" rõ ràng.
- Mọi mutation dữ liệu dùng chung phải refresh các workspace sử dụng nó (ví dụ `onProfessionalProfileSaved`, `onProfessionalCredentialsChanged`). Không thêm nút "Sync latest" thủ công để né việc thiếu refresh.
- Lựa chọn Background dùng một mẫu ở mọi nơi: section `backgroundGroup` với checkbox `backgroundRow`, số đếm "N of M shown", chip **New** cho mục chưa chọn được thêm sau lần lưu Draft gần nhất, và hành động "Edit Professional Profile".

## 6. Form

- Nhóm các trường trong `renderAdminSectionCard` với title và note một dòng. Note bị cắt còn một dòng, vì vậy giữ ở 60 ký tự trở xuống (phải vừa card bên hẹp trên laptop 1440px) và không lặp title.
- Trường bắt buộc dùng `renderAdminFieldLabel(label, true)` cùng thuộc tính `required` / `aria-required` tương ứng.
- Cặp trường đã bản địa hóa luôn hiển thị tiếng Anh trước, sau đó tiếng Việt, với label `(EN)` và `(VI)`.
- Lỗi validation xuất hiện cạnh trường tương ứng; lỗi chặn publish cũng được liệt kê trong dialog kiểm tra pre-publish. Không dùng toast làm nơi duy nhất hiển thị lỗi.

### 6.1 Chevron dropdown

Mọi mũi tên dropdown trong Admin dùng cùng glyph ở cùng vị trí, để một cột select, picker và combobox thẳng hàng theo chiều dọc.

- **Glyph.** Dùng `adminChevronIcon` từ `ui.ts` (viewBox 16×16, `m4 6 4 4 4-4`, stroke 1.75, `currentColor`, màu text muted). Không bao giờ dán SVG, dùng hình mũi tên khác, Unicode `▾` hoặc mũi tên CSS `background-image`.
- **Native select.** Luôn render qua `renderAdminSelectControl`. `<select>` trần hiển thị mũi tên riêng của trình duyệt, nằm ở offset khác và trông khác nhau trên từng trình duyệt. Toolbar preview dùng cùng điều khiển qua `renderAdminPreviewSelect`.
- **Hình học.** Chevron được căn giữa trong slot sát mép phải điều khiển. Dùng token trong `admin-ui.css`, không bao giờ dùng chiều rộng literal:

  | Token | Mặc định | Compact (`.admin-select-control--compact`, toolbar preview) |
  |---|---|---|
  | `--admin-chevron-size` (icon) | `1rem` | `.875rem` |
  | `--admin-chevron-slot` (chiều rộng slot; tâm icon cách mép phải một nửa chiều rộng này) | `2.5rem` | `1.5rem` |
  | `--admin-chevron-reserve` (`padding-right` của text để giá trị dài không bao giờ chạy dưới icon) | `3rem` | `1.75rem` |

- **Custom picker** (year picker, profile photo, location combobox) dùng lại cùng slot: hoặc `.admin-select-chevron` có position absolute bên trong điều khiển `position: relative` với `padding-right: var(--admin-chevron-reserve)`, hoặc cột grid cuối `var(--admin-chevron-slot)` và điều khiển không có padding phải.
- **Trạng thái.** Chevron xoay 180° khi điều khiển có `aria-expanded="true"` (140 ms, tắt khi `prefers-reduced-motion`). Select disabled làm chevron mờ còn 50 %.
- **Khác biệt được phép.** Bộ chuyển title tài liệu giữ tile icon có màu vì đây là nút header, không phải trường form, nhưng vẫn dùng `adminChevronIcon` và stroke dùng chung.
- Quy tắc glyph và xoay chỉ nằm trong `admin-ui.css`. `adminStyles.test.ts` thất bại nếu workspace render `<select>` trần, sao chép SVG chevron, restyle glyph chevron ngoài `admin-ui.css` hoặc viết cứng `padding-right: 3rem`.

### 6.2 Text người dùng dài cạnh điều khiển

Dữ liệu người dùng không có giới hạn độ dài; copy giao diện cố định thì có. Layout phải nhường chỗ ở dữ liệu người dùng, không bao giờ ở giao diện.

- **Copy cố định không bao giờ co hoặc wrap.** Label, title section, số đếm và nút hành động dùng `white-space: nowrap` cùng `flex: 0 0 auto` (hoặc track grid `auto`). Không bao giờ đặt copy cố định trong track `minmax(0, 1fr)` cạnh track `auto` chứa dữ liệu người dùng. Chính lỗi đó đã ép "Credentials & evidence" thành hai dòng.
- **Chỉ dữ liệu người dùng bị cắt.** Nó nằm trong track `minmax(0, 1fr)` (hoặc flex item có `min-width: 0`), trên một dòng với dấu chấm lửng và luôn có toàn bộ giá trị làm tooltip. Dùng `renderAdminTruncatedText(text)` (`.admin-truncate` cộng `title`); heading bị cắt nhận thuộc tính `title`. Cắt mà không có tooltip là lỗi.
- **Không bao giờ nối dữ liệu người dùng và meta vào một label.** Không thể cắt "Engineer Degree … · 1 file" hợp lý. Số đếm, ngày hoặc trạng thái là phần tử riêng không co.
- **Danh sách 0..n mục người dùng xếp dọc.** Render một hàng toàn chiều rộng cho mỗi mục (mẫu `.admin-linked-credential`: badge loại, title có thể cắt, trạng thái, meta, chevron), không dùng các nút inline cạnh label. Các hàng giữ thẳng hàng với cột badge chiều rộng cố định.
- **Layout hẹp xếp chồng với `align-items: stretch`.** `flex-direction: column` cùng `align-items: flex-start` đặt kích thước mỗi phần tử con theo toàn bộ chiều rộng text, nên dấu chấm lửng không bao giờ áp dụng và card bị tràn.
- **Cả chuỗi tổ tiên phải cho phép co, không chỉ phần tử bị cắt** ([UI-14](92-ui-rules.md#ui-14)). `text-overflow: ellipsis` chỉ có tác dụng khi chính phần tử chứa chữ bị cha giới hạn bề rộng. Mọi tầng flex hoặc grid từ phần tử đó lên tới card phải là flex item `min-width: 0` hoặc track `minmax(0, 1fr)`: mặc định `min-width: auto` cho phép item rộng bằng nội dung, nên thiếu **một** tầng là chữ dài đẩy cả card ra ngoài.
- **`<button>`, `<summary>` và `<a>` dùng làm khung chứa chữ không tự giãn đầy bề ngang của cha** ([UI-14](92-ui-rules.md#ui-14)): chúng co theo độ dài chữ (shrink-to-fit), nên chữ dài làm khung rộng hơn cha dù đã có `min-width: 0`. Khung đó phải có `width: 100%` (hoặc là flex item `flex: 1 1 0; min-width: 0`). Muốn cả hàng bấm được thì đặt khung này làm phần tử con trực tiếp của hàng, không đặt chữ trực tiếp trong button.
- **Kiểm bằng máy, không chỉ bằng mắt.** `npm run shots -- --stress` (từ GD3-04) thay chữ dữ liệu người dùng bằng chuỗi dài 130 ký tự rồi báo **overflows its container** (phần tử vượt mép card / panel mà không có tổ tiên nào cắt nó) và **NO TOOLTIP**. Mọi thành phần mới có chữ người dùng phải không còn hai cảnh báo này ở 1440 px và 1180 px (§11, §14).
- **Phản ứng theo container, không theo viewport.** Layout bên trong card form dùng `@container admin-form` (40rem, như các card entry), không bao giờ dùng `@media`. Cột editor chỉ chiếm khoảng 44% màn hình.
- **Nút chỉ có icon dùng SVG dùng chung.** Di chuyển lên/xuống dùng `adminArrowUpIcon` / `adminArrowDownIcon` với `aria-label` và `title`, không bao giờ gõ `↑` hoặc `&#8593;`.

### 6.3 Hàng trường và trạng thái trường

- **Mọi hàng theo form grid.** Một hàng trường dùng `.admin-form-grid` (hai cột bằng nhau) hoặc `.admin-site-bilingual`. Không bao giờ cho một hàng số cột riêng (hàng ngày ba cột cũ không thẳng với trường phía trên và dưới).
- **Option thay đổi một trường nằm trong hàng label của trường đó.** Dùng `.admin-field-label-row`: label bên trái, checkbox `.admin-inline-check` bên phải ("Expiry date … ☑ Does not expire"). Không bao giờ biến nó thành điều khiển hoặc trường có box riêng.
- **Trường không áp dụng phải trông disabled hoặc được thay thế.** Trường disabled nhận nền muted (quy tắc disabled lặp selector trường cơ sở để luôn thắng). Khi một giá trị hoàn toàn không thể áp dụng, ẩn input và hiển thị box `.admin-field-static` với lý do ("No expiry"), có style như trường disabled. Bật lại trường sẽ chuyển focus vào đó.
- **Điều khiển theo locale trình duyệt cần hint.** Input ngày native hiển thị định dạng riêng của trình duyệt (mm/dd/yyyy), còn Admin hiển thị "14 Sept 2021". Thêm `.admin-field-hint` dưới input lặp lại giá trị qua `formatAdminDate`. Giữ input native; nó thân thiện với bàn phím và screen reader.
- **Hoán đổi, không đổi kích thước.** Khi trường được thay bằng phần tử đại diện ("No expiry"), bọc cả hai trong `.admin-field-swap`. Input vẫn trong layout, vô hình và disabled, còn phần tử đại diện phủ chính xác lên nó để hàng không bao giờ đổi chiều cao. Không bao giờ dùng `hidden` trên một phần tử rồi hiển thị phần tử kia: chiều cao của chúng lệch vài pixel trên từng trình duyệt và hàng sẽ không đều.

#### Hàng không được nhảy (hợp đồng căn chỉnh)

Hàng không đều và label đột ngột wrap là lỗi hồi quy Admin thường gặp nhất. Chúng gần như luôn đến từ component trông đúng ở một nơi nhưng bị restyle ở nơi khác. Các quy tắc này áp dụng cho mọi trường, hàng form và dialog:

1. **Các trường trong một hàng grid căn theo điều khiển.** Dòng label của mỗi cell có chiều cao bằng label thường (một dòng `--admin-text-xs`), để input bên dưới bắt đầu cùng tọa độ y. Mọi thứ đặt trong hàng label (option checkbox, counter, link trợ giúp) phải vừa chiều cao đó. Checkbox dùng block margin âm để box 1rem không bao giờ làm hàng cao hơn.
2. **Component không phụ thuộc nơi được render.** Quy tắc container rộng (`.admin-document-editor`, `.admin-form-section`, `.admin-dialog`, workspace) chỉ được style label trường và trường text. Chúng chọn `label:where(:not(.admin-inline-check))` và `input:where(:not([type="checkbox"], [type="radio"], [type="range"], [type="color"], [type="file"]))`, không bao giờ chọn `input` hoặc `label` trần. Quy tắc trần từng biến checkbox "Does not expire" thành grid toàn chiều rộng xếp trên text. `:where()` giữ nguyên specificity. Component hàng trường dùng chung trong `admin-ui.css` có tiền tố `html.admin-app` để không quy tắc container nào ưu tiên hơn chúng.
3. **Dialog tự đo chính nó.** `.admin-dialog` khai báo `container: admin-form / inline-size`, để container query bên trong modal dùng chiều rộng dialog, không phải panel phía sau. Nếu thiếu, dialog rộng trên editor hẹp sẽ thu về một cột.
4. **Test trong ngữ cảnh thật.** Kiểm tra component tại nơi nó thực sự được render (dialog mở từ bên trong editor Profile, không phải trên trang trống), với cả hai trạng thái của mọi toggle, ở 1440px và khoảng 1180px. `npm run shots` báo *uneven field row* và *checkbox stacked above its text* cho mọi form grid nhìn thấy (§11).

### 6.4 Card mục

Card Profile (Experience, Education, Language, Credential, ảnh) và các hàng bên trong dùng chung một cấu trúc:

| Phần | Quy tắc |
|---|---|
| **Nhận diện (trái)** | Eyebrow (loại) với chip trạng thái bên cạnh, sau đó title rồi subtitle muted. Trạng thái thuộc về nhận diện, không bao giờ nằm giữa các nút hành động. Giá trị bị cắt mang `title` (§6.2). |
| **Hành động (phải)** | Theo thứ tự: di chuyển lên/xuống → một hành động thường dùng ("Edit", "Open") → More (⋯, `renderAdminMoreMenu`) với hành động ít dùng hoặc phá hủy (Delete, Archive, Rename), đánh dấu `tone: "danger"` khi phá hủy. Card không bao giờ hiển thị nút phá hủy rời. Mục archived hiển thị "Restore as draft" thay cho Edit; More chỉ chứa "Delete permanently" khi mục hỗ trợ xóa cứng (Credential: xóa row và các file bằng chứng riêng tư). Không bao giờ cho phép xóa vĩnh viễn mục đang active — phải archive trước. |
| **Fact** | Một dòng meta phân tách bằng `·` (`.admin-credential-card__meta`), không dùng tile có box. Trong card hẹp, các fact xếp mỗi dòng một mục, không có dấu phân tách. Fact trỏ tới entry khác là link mở entry đó (`showRelatedEntry`). |
| **Mô tả** | Tối đa hai dòng (`line-clamp`), toàn bộ text nằm trong `title`. |
| **Danh sách con** | Một hàng header (tên, số đếm, "+ Add …"), sau đó một hàng cho mỗi mục con. Ẩn số đếm 0 khi dòng empty-state đã nêu rõ. Upload được xếp tạm trong hàng pending (file, loại, Upload, Cancel), giống media Project pending; chỉ chọn file không làm upload bất kỳ thứ gì. |

- **Tối đa hai cấp box:** card và các hàng bên trong. Section trong card được phân tách bằng divider, không bằng box có viền khác. Nhóm disclosure (`.admin-disclosure-group`: override layout, media Portfolio) chính là card: các hàng nằm trên màu surface và được phân tách bằng divider, không bao giờ thêm box.
- **Nhóm disclosure cùng cấp là accordion** ([UI-12](92-ui-rules.md#ui-12)). Các nhóm anh em trong một khối (Project / Automation / Credentials overrides; Cover & closing / Projects / Automation tools của Portfolio media) **mở một nhóm thì đóng các nhóm khác** trong cùng khối. Sau khi đóng, tiêu đề nhóm vừa mở được giữ trong tầm nhìn bằng `revealAdminElement(summary, { align: "start" })` sau một animation frame (nhóm phía trên co lại làm nội dung nhảy lên). Đóng nhóm đang mở không mở nhóm nào khác. Dùng một helper chung cho mọi khối, không viết lại theo từng khối.
- **Card entry thu gọn được** (Experience, Education; ADR-027, từ GD3-04). Card có form dài giữ phần đầu (nhận diện + hành động) luôn thấy và cho thu gọn phần form (`.admin-profile-entry-card__fields`, đặt `hidden`, có `id`):
  - **Nút ⌄ là hành động thường dùng** của card: `button.button--secondary.admin-icon-button` với `adminChevronIcon`, `aria-expanded`, `aria-controls` trỏ tới phần form, `aria-label` "Expand / Collapse <tên>" và `title`; đặt **sau ↑ ↓ và trước ⋯**. Chỉ nút này đóng / mở card. Các card mở **độc lập** (không accordion): người chỉnh sửa hay đối chiếu hai mục, và form dài nên đóng mục đang soạn là mất ngữ cảnh (khác nhóm disclosure nhỏ ở UI-12).
  - **Mặc định thu gọn.** Chỉ mở sẵn: card vừa thêm (focus ô đầu tiên) và card có lỗi kiểm tra; khi thông báo lỗi hoặc liên kết "mở mục" (`showRelatedEntry`) trỏ tới một card thì card tự mở rồi `revealAdminElement` giữ **tiêu đề card dưới thanh tab**. Trạng thái mở / đóng sống qua thêm, xóa, chuyển lên / xuống (bảng được dựng lại) trong cùng phiên, không lưu vào `localStorage`.
  - **Thu gọn không làm mất dữ liệu đang soạn.** Các trường chỉ bị ẩn nhưng vẫn nằm trong form: `FormData` và dirty state không đổi.
  - **Dòng tóm tắt** là subtitle muted của card (`.admin-profile-entry-card__summary`): một dòng, các phần ngăn cách bằng `·`, cắt bằng dấu chấm lửng và `title` đầy đủ (§6.2), **cập nhật trực tiếp khi gõ** và **ẩn khi card đang mở** (mỗi fact một lần trong card). Experience: `Position · Country · MM/YYYY – MM/YYYY` (hoặc `Present`). Education: `Field · yyyy–yyyy · N credential(s)` (chỉ khi N > 0). Phần trống bị bỏ, không in "—".
  - Khi thu gọn, phần đầu card không còn gạch chân và đệm dưới. Chuyển động duy nhất là xoay mũi tên 180° trong ≤ 120 ms, tắt khi `prefers-reduced-motion`; không animate chiều cao. Một thành phần dùng chung cho Experience và Education (Language, Credential dùng lại khi cần; không có bản sao thứ ba, AGENTS §5.2).
- **Mỗi fact xuất hiện một lần trong mỗi card.** Số đếm, ghi chú riêng tư và trạng thái không lặp đồng thời trong tile, heading và hàng.
- **Mục archived trông muted bằng màu và viền nét đứt,** không bao giờ bằng `opacity`.
- **Hàng bằng chứng Credential** theo hàng media (§6.5) ở mật độ card: thumbnail là crop Landscape công khai nếu có (không thì crop còn lại), nếu không là badge `IMG` / `PDF`; dòng meta là "Type · size", cộng "In Portfolio" cho file được hiển thị hoặc "Not printed in Portfolio" cho PDF. Hành động: Open → "Adjust crops" (chỉ ảnh, quy tắc 13 §7.1) → More với "Hide from Portfolio" (chỉ khi đang hiển thị) và "Delete file" (`danger`). PDF không bao giờ có hành động crop.
- **Menu More dùng chung một hành vi** (`installAdminMoreMenus`, cài một lần trong `main.ts`): mỗi lúc chỉ mở một menu, menu đóng khi click bên ngoài, nhấn Escape và sau khi chọn hành động, rồi focus trở lại trigger ⋯ để dialog xác nhận khôi phục focus vào thứ nhìn thấy được. Phần tử tổ tiên của card có menu More không được dùng `overflow: hidden`, nếu không menu bị cắt (card ảnh bo chính ảnh thay thế).
- **Sắp xếp mục trong danh sách Projects / Tools** (W-11, GD3-08): cụm điều khiển ở đầu thẻ là tay kéo + **lưới 2×2** `⇈ ↑ / ⇊ ↓` (lên đầu, lên một, xuống cuối, xuống một), mỗi nút một lần bấm, **không menu ⋯**. Mỗi nút có `aria-label` nêu tên mục; nút không áp dụng được (đã ở đầu / cuối, chỉ một mục) `disabled`; kéo thả giữ nguyên. Cụm này không rộng hơn cụm ↑ ↓ ⋯ cũ (khoảng 48 px so với 66 px) để tên dài không bị cắt thêm; kiểm ở ba màn hình mục tiêu và `shots --stress`.

### 6.5 Hàng media và upload file

Media Project và Tool (`mediaRows.ts`) dùng cùng một cấu trúc hàng cho upload pending và ảnh đã lưu, để cả hai được hiểu là cùng component. Chỉ dòng trạng thái và hành động khác nhau.

```
[thumb 4:3]  File name or "Image 01" (truncated, title)        [↑][↓] [primary] [⋯]
             JPEG · 0.44 MB · Not uploaded yet
             Use as [Cover | Gallery]   (pending)   /   COVER chip (saved)
Alt text (EN) *        | Alt text (VI)
Caption (EN)           | Caption (VI)
```

- **Cặp song ngữ dùng chung một hàng.** `.admin-form-grid` chỉ chứa cặp EN | VI theo thứ tự (Alt EN, Alt VI, Caption EN, Caption VI). Điều khiển không phải cặp song ngữ ("Use as") không bao giờ nằm trong grid đó, nếu không các cặp sẽ lệch chéo. Dưới 40rem, grid xếp thành một cột theo cùng thứ tự EN rồi VI.
- **Role xuất hiện một lần.** Hàng pending dùng `renderAdminSegmented` (Cover | Gallery, radio native để phím mũi tên hoạt động). Hàng đã lưu hiển thị chip role. Không có badge phủ thumbnail. Chọn Cover làm alt text tiếng Anh trở thành bắt buộc và chỉ một ảnh pending có thể là cover.
- **Hành động theo §6.4.** Pending: di chuyển và More → Remove from upload. Đã lưu: di chuyển (chỉ gallery), "Adjust crops", và More → Set as cover, Download original, Delete image. **Save chỉ xuất hiện khi hàng có chỉnh sửa chưa lưu**, cùng chip *Unsaved*.
- **Không bao giờ hiển thị file input của trình duyệt.** Upload hàng loạt dùng `renderAdminFilePicker` (drop zone, kéo thả, input native ẩn về hình ảnh, focus ring trên zone) với `bindAdminFilePickers`. Hành động một file dùng nút click input có thuộc tính `hidden` (ảnh Profile, bằng chứng Credential). `adminStyles.test.ts` thất bại khi có file input nhìn thấy được.
- **Footer upload nói rõ điều sẽ xảy ra.** Nó hiển thị "N images ready" với Clear và "Upload N images". Upload giữ trạng thái disabled và lý do hiển thị trong footer khi cover pending thiếu alt text tiếng Anh; trường đó được đánh dấu `aria-invalid`.
- **`hidden` luôn thắng.** `html.admin-app [hidden] { display: none !important; }`: class đặt `display` (`.button`, `.status`) không bao giờ được giữ phần tử hidden nhìn thấy được. Component không thêm quy tắc `[hidden]` riêng.

### 6.6 Số đếm lựa chọn ("shown" và "selected")

Mọi danh sách đưa vào hoặc loại mục đều có heading kèm chip số đếm, được render bằng `renderAdminSelectionHeading` và cập nhật trực tiếp bằng `bindAdminSelectionCounts`. Từ ngữ theo tác dụng của checkbox:

| Từ ngữ | Khi nào | Ở đâu |
|---|---|---|
| **N of M shown** | Toggle điều khiển việc entry đã thuộc nguồn có xuất hiện trong output hay không. | Background CV (Experience, Education, Credential, Skill, Language); nội dung Website ("On website", cộng "· K on Homepage") |
| **N of M selected** | Chọn mục từ thư viện để đưa vào tài liệu hoặc thư. | Nội dung CV (Project: display không phải "Off"; Tool), nội dung Portfolio (Project, Tool), bằng chứng Cover Letter (Project, Tool) |

- **M chỉ đếm mục đủ điều kiện.** Không thể chọn mục Draft hoặc archived, nên chúng không nằm trong tổng và không có `data-selection-count-item`. Thư đã Final làm disabled input nhưng vẫn giữ chúng đủ điều kiện.
- **Trạng thái trống dùng từ ngữ, không dùng số 0.** "Hidden" (danh sách shown), "None selected" (danh sách selected), "None available" khi nguồn trống. Chip dùng màu muted qua `data-empty`.
- **Một hàm định dạng từ ngữ.** `adminSelectionCountText` là nơi duy nhất viết các chuỗi này; workspace không tự format text "… selected". `adminStyles.test.ts` kiểm tra mọi danh sách lựa chọn dùng heading chung.
- **Kiểm tra pre-publish có hai section.** CV và Portfolio dùng cấu trúc Website (`.admin-site-validation`): *Required fixes* (chặn publish) và *Recommendations* (không bao giờ chặn). Trong dialog, chúng xếp thành một cột; recommendation dùng màu text muted, không dùng warning. Chip preview ghi "N issues", "Ready · N recommendations" hoặc "Ready". Mỗi recommendation là một dòng cho mỗi mục, nêu tên mọi thứ còn thiếu.
- Summary disclosure trên tập con đã chọn (media Portfolio, override layout) hiển thị số thường vì chỉ liệt kê các mục đã chọn.
- **Trang Profile** (Portfolio › Background) dùng cùng cấu trúc nhóm: *Capability cards* (số đếm "N of M selected"; khi đạt giới hạn, các hàng còn lại disabled và trông muted bằng màu) và *Figures* (hai select vì mỗi lựa chọn có bốn option; §6.7 giữ điều khiển segmented cho ba option trở xuống).
- **Override layout mục** (Portfolio › Appearance) là một nhóm cho mỗi family mục, tất cả render bằng `layoutOverrideGroup`: override Project, Automation và Credentials. Nhóm chỉ liệt kê các mục được chọn cho Portfolio (Credential còn cần bật trang Credentials), option đầu là "Use … default", và hàng chưa chọn vẫn hidden trong form để override đã lưu tồn tại qua việc bỏ chọn mục. Thêm family mới qua cùng helper, không bao giờ viết tay bản sao thứ tư.
- **Heading nhóm chỉ là title và số đếm.** Không có note riêng cho nhóm dưới heading: note của card section giải thích toàn bộ danh sách ("Choose what appears. Order follows Professional Profile."). Fact về cách output phân trang nằm cùng layout nó mô tả (Appearance › Credentials: "· 2 per page", từ `PORTFOLIO_CREDENTIALS_PER_PAGE`). Nhóm Background CV và Portfolio dùng cùng `renderAdminSelectionHeading` như mọi danh sách khác.
- Mục đếm là checkbox, hoặc `<select>` hay radiogroup (`renderAdminSegmented({ groupAttributes })`) có giá trị `data-selection-off` nghĩa là "not included".

### 6.7 Hàng lựa chọn có option (Project CV)

Khi output chọn một mục **và** đặt cách in (Project CV: Off, Compact hoặc Detailed, cộng summary và trách nhiệm), mỗi mục là một hàng được triển khai trong `cvProjectSelection.ts`:

```
Duong giao thong ra dao Hon Khoai                [Off | Compact | Detailed] [⌄]
Ca Mau · Summary · 3 of 4 responsibilities
─────────────────────────────────────────────────────────────── (open only)
☑ Show summary
Responsibilities * · 3 of 4
☑ …
```

- **Lựa chọn là điều khiển segmented, không bao giờ là select** (`renderAdminSegmented`, giữ legend cho screen reader bằng `hideLegend`). Với ba option trở xuống, mọi trạng thái đều nhìn thấy và cách một click. "Off" là option đầu và mặc định.
- **Hàng nói rõ nội dung sẽ in.** Dòng muted là địa điểm rồi đến trạng thái: "Not in this CV", "Name and year only" (Compact) hoặc "Summary · N of M responsibilities" (Detailed). Nó được suy ra từ input bằng `cvProjectStateText` và cập nhật trực tiếp; workspace không tự viết text trạng thái.
- **Option chỉ xuất hiện nơi áp dụng.** Compact chỉ in tên và năm, nên chỉ hàng Detailed có nút disclosure (`aria-expanded`, `aria-controls`, `adminChevronIcon` xoay trong 150 ms). Option mặc định collapsed, mở khi người dùng chọn Detailed và đóng khi hàng rời Detailed. Input hidden vẫn submit nên collapse không bao giờ đổi payload.
- **Vấn đề không bao giờ bị collapse để ẩn.** Hàng Detailed không có trách nhiệm render ở trạng thái mở và mở lại sau mỗi thay đổi khi vấn đề còn tồn tại. Số đếm ghi "0 of M" và dòng trạng thái ghi "Choose at least one responsibility", cả hai dùng `--admin-color-warning`, nên đóng option bằng tay vẫn để warning nhìn thấy được.
- **Hàng không bao giờ nhảy.** Điều khiển segmented dành sẵn chiều cao nút disclosure, nên chuyển Detailed ↔ Compact ↔ Off giữ mọi điều khiển ở cùng tọa độ y (§6.3).
- **Chip chỉ dành cho ngoại lệ.** Ready là trạng thái bình thường và không có chip. Project Draft hoặc archived hiển thị chip cạnh tên, dùng card muted nét đứt của §6.4, giữ hàng, bị disabled và không được đếm (§6.6). Hàng Off dùng surface nhẹ và title muted; không có gì bị làm mờ bằng `opacity`.
- **Một cấp box.** Option nằm dưới divider bên trong hàng, không nằm trong box viền lồng nhau (§6.4).
- **Thứ tự theo thư viện nguồn.** Không sắp xếp lại tại đây: Project sở hữu thứ tự (§5).
- Dưới chiều rộng container `cv-selection` 44rem, điều khiển segmented chuyển xuống dòng riêng dưới nhận diện; disclosure vẫn ở góc trên bên phải.

### 6.8 Hàng media Portfolio

Portfolio › Appearance › Portfolio media gán hình Primary và Supporting cho mọi Project và Tool đã chọn. Mỗi mục là một hàng từ `renderPortfolioMediaRow` (`portfolioMediaSelection.ts`), dùng lại cấu trúc hàng media của §6.5 để trông giống danh sách media trong Projects:

```
[preview 4:3]  Duong Vanh Dai 3                        (clipped, title)
               Technical · 2 images · Wide + Wide · Only 1 image in Media
Primary visual *                 Supporting visual *
[Cover · Image 01          ⌄]   [Gallery · Image 02          ⌄]
```

- **Dùng hàng, không dùng box.** Các hàng được nhóm trong disclosure group Projects và Automation tools (số đếm = mục đã chọn) và phân tách bằng divider (§6.4).
- **Preview là hình Primary đã chọn** và theo select trực tiếp (`syncPortfolioMediaPreview`); mục không có ảnh hiển thị "No image", không bao giờ hiển thị ảnh hỏng.
- **Dòng meta giải thích vì sao trường có hình thức đó:** tên layout (từ override hoặc mặc định), yêu cầu của nó (`mediaRequirementLabel`) và, bằng `--admin-color-warning`, "Only N images in Media" khi mục có ít ảnh hơn layout yêu cầu. `portfolioMediaRowState` là nơi duy nhất viết dòng này.
- **Label dùng field label dùng chung.** Dấu bắt buộc theo ngay sau text (cấu trúc `renderAdminFieldLabel`) và được toggle, không bao giờ di chuyển; không có text trạng thái trong hàng label, nên label giữ một dòng và cả hai điều khiển bắt đầu cùng tọa độ y (§6.3).
- **Hình layout không dùng được thay thế, không disabled tại chỗ.** Select vẫn nằm trong `.admin-field-swap` (disabled, vô hình) và `.admin-field-static` "Not used by this layout" phủ nó ở cùng kích thước, để cả hai cột giữ cùng chiều cao và chiều rộng. Trường disabled không bao giờ được hiển thị giá trị cũ.
- Hai select dùng chung một hàng cho đến container `admin-form` 22rem rồi xếp chồng; quy tắc song ngữ 32rem của §6.5 không áp dụng cho chúng.
- **Cover & closing** là nhóm đầu: một hàng (`renderPortfolioFeatureRow`) với Project ("First selected project" + các Project đã chọn) và Image ("Its primary visual" + ảnh của Project đó). Có một image select cho mỗi Project; chỉ mục nhìn thấy được enabled, nên đúng một giá trị được submit và preview theo nó (`syncPortfolioFeatureRow`, cũng chạy khi lựa chọn Project thay đổi).
- **Vị trí có cấu trúc** (Project › Key facts, Tool › Workflow steps) là các vị trí cố định có đánh số (`structuredSlots` trong `main.ts`): mỗi vị trí là nhóm có label (`role="group"` với title "Fact 1"), cặp EN | VI nằm trên form grid dùng chung, các vị trí được chia bằng đường kẻ bên trong một card và vị trí trống không được lưu. Vị trí điền một nửa chặn Ready ("Key fact 1 needs an English value and label"); thiếu tiếng Việt là recommendation.
- **Hàng gọn (ADR-037, W-26).** Hàng dự án / công cụ đã thu gọn cao **≤ 72 px** ở ba màn hình mục tiêu: dòng 1 là tên (cắt gọn có `title`), **công tắc "In Portfolio" nhỏ bên phải cùng hàng với tên**, cạnh chevron; dòng 2 là "địa điểm · trạng thái" (meta). Hộp chọn **16 px như mọi checkbox khác của Admin** ([UI-17](92-ui-rules.md#ui-17)); vùng bấm ≥ 24 px đạt bằng đệm của nhãn / hàng, không bằng cách phóng to hộp. Chevron cao ≥ 24 px, có tên truy cập (`aria-label` nêu tên dự án). **Hàng Draft / archived vẫn viền nét đứt và nền muted như hàng CV** (`.is-unavailable`, không bị quy tắc của hàng gọn đè); **chevron là nút vuông** bằng chiều cao công tắc (24 × 24, `padding: 0`, icon ở giữa), không bóp chiều cao mà giữ đệm ngang ([UI-16](92-ui-rules.md#ui-16)). **Hàng hẹp (container `pf-row` ≤ 22 rem, không breakpoint viewport):** chữ "In Portfolio" ẩn kiểu sr-only (ô chọn và `aria-label` giữ nguyên), chip trạng thái xuống dòng meta, tên luôn hiện ≥ 8 rem. Đo bằng `node tools/portfolio-selection-check.mjs` (gồm `name-width` ở 1024 / 768 / 390).
- **Hàng Project Portfolio** (Projects & tools) dùng lại cấu trúc hàng Project CV của §6.7 (`portfolioProjectSelection.ts`): nhận diện và dòng trạng thái ("Technical · 2 of 4 responsibilities"), switch "In Portfolio" và disclosure chứa các trách nhiệm sẽ in. Dòng trạng thái theo layout được chọn trong Appearance và cảnh báo khi không chọn gì hoặc chọn nhiều hơn số layout in.
- **Project pages** (Appearance) là một lựa chọn segmented, *Summary* | *Challenge · Approach · Outcome*, cho Technical và Editorial.
- **Trường chứa nhiều điều khiển là nhóm có label, không bao giờ là `<label>`.** `<label>` chỉ liên kết với điều khiển đầu tiên (ở đây là select hidden, disabled), nên click không làm gì và công nghệ hỗ trợ đọc sai điều khiển. Dùng `role="group"` + `aria-labelledby` trên wrapper có style như field label và cho mỗi điều khiển `aria-label` riêng.
- Thay đổi mặc định hoặc override layout gọi `syncPortfolioMediaRow` cho mọi hàng; chọn cùng một ảnh hai lần sẽ xóa hình Supporting.

## 7. Preview

- Thứ tự toolbar là: select trang → select thiết bị → toggle ngôn ngữ → zoom (Fit, −, +).
- Preview trao đổi payload form chưa lưu qua giao thức cùng origin trong `src/shared/previewProtocol.ts`; không reload iframe để hiển thị chỉnh sửa.
- Thay đổi layout quanh preview phải giữ zoom Fit hoạt động; `previewZoom.ts` quan sát kích thước frame.

### 7.1 Trình chỉnh sửa crop ảnh và preview

Được triển khai bằng `cropGeometry.ts` (thuần, có unit test trong `cropGeometry.test.ts`) và `cropStage.ts`; cả cropper media Portfolio và ảnh Profile đều dùng chúng.

Preview crop là lời cam kết về file đã lưu. Các quy tắc này áp dụng cho mọi cropper (media Portfolio, ảnh Profile và mọi loại trong tương lai).

1. **Một nguồn dữ liệu duy nhất.** Editor giữ một crop chuẩn hóa cho mỗi format: `{ x, y, width, height }`, là tỉ lệ trên ảnh gốc. Preview, row crop đã lưu và file export đều được tính từ cùng object đó. Không bao giờ để preview tự đọc DOM của cropper hoặc widget thư viện (`cropper-viewer`). Nó dùng timing và hệ tọa độ khác nên sẽ bị lệch.
2. **Cùng phép tính ở mọi nơi.** Preview và export dùng một hàm thuần (trạng thái crop + kích thước output → hình chữ nhật nguồn). Unit test với ảnh nguồn không vuông ở mọi format.
3. **Thấy gì lưu nấy.** Box lựa chọn nhìn thấy được, preview và file đã lưu hiển thị chính xác cùng vùng. Giá trị được clamp *trước khi* người dùng nhìn thấy, không bao giờ âm thầm clamp lúc lưu.
4. **Không có pixel trống.** Ảnh luôn phủ kín vùng lựa chọn. Giới hạn pan và zoom-out bằng phép tính, không dò DOM, để checkerboard không bao giờ xuất hiện trong vùng lựa chọn.
5. **Preview theo tỉ lệ output, không trang trí.** Frame Portfolio in dùng cùng tỉ lệ (hợp đồng tỉ lệ crop, `docs/ui-guidelines.md` §8.4), nên crop không bao giờ bị layout crop lại. Frame preview dùng aspect ratio output và chỉ hiển thị nội dung output chứa. Chrome mà output thật thêm phía trên (ví dụ tile số trang) chỉ hiển thị khi layout thật đặt nó tại đó, ở cùng vị trí và kích thước.
6. **Tab format mang thông tin riêng.** Mỗi tab hiển thị thumbnail trực tiếp của crop, tên và tỉ lệ ("Wide 21:9"), cùng trạng thái chỉ khi có ích: *Auto* (không có crop tùy chỉnh đã lưu) hoặc *Edited* (đã thay đổi trong phiên này, chưa lưu). Crop tùy chỉnh đã lưu không có label. Không lặp cùng một từ trên mọi tab. Tab theo §10: `role="tab"`, `aria-selected`, `aria-controls` trỏ tới một `role="tabpanel"`, cùng phím Arrow, Home và End. Vì thumbnail hiển thị mọi format, preview bên có thể ẩn trên màn hình hẹp.
7. **Điều khiển zoom khớp zoom preview.** Render bằng `renderAdminCropZoomControls` và cập nhật bằng `setAdminCropZoomValue`. Chúng dùng cùng icon − / + như `renderPreviewZoomControls` (`adminZoomOutIcon`, `adminZoomInIcon`), không bao giờ gõ `-` hoặc `+`. Zoom 100% nghĩa là ảnh vừa phủ vùng lựa chọn, slider hiển thị và thông báo phần trăm.
8. **Reset rõ ràng.** "Reset to auto" chỉ ảnh hưởng format đang active và là một phần của thay đổi chưa lưu mà Cancel loại bỏ.
9. **Kéo ở bất kỳ đâu.** `cropper-handle action="move"` thuần là phần tử con cuối của vùng lựa chọn, để kéo bên trong vùng lựa chọn sẽ di chuyển ảnh thay vì rơi vào grid hoặc crosshair.
10. **Chờ ảnh.** Gọi `waitForCropImage` trước khi đặt crop. Chỉ `$ready()` sẽ resolve sớm với source đã cache, rồi phần tử tự căn lại lên crop vừa đặt.
11. **Dispose trước khi destroy.** Gọi `CropStage.dispose()` trước `cropper.destroy()` để transform lúc teardown không bao giờ ghi đè crop đã lưu.
12. **Xoay là một phần của dialog crop.** Rotate ↺ / ↻ (`renderAdminCropZoomControls({ rotate: true })`, `adminRotateLeftIcon` / `adminRotateRightIcon`) nằm sau zoom trong nhóm có label riêng, với `[` và `]` làm phím tắt (`aria-keyshortcuts`, bỏ qua khi đang nhập trong trường). Mọi cropper đều có: media Portfolio, ảnh Profile và bằng chứng Credential.
    - Mỗi lần xoay là một phần tư vòng, luôn vẽ lại từ bản gốc chưa chạm tới (`imageRotation.ts`), nên xoay bốn lần không bao giờ encode lại ảnh.
    - Một lần xoay tự động crop lại mọi format và đánh dấu *Edited*; dòng meta ghi "Rotated 90° clockwise · all formats re-cropped". Xoay về hướng đã lưu khôi phục crop đã lưu. Xoay là thay đổi chưa lưu mà Cancel sẽ hỏi để loại bỏ.
    - Nút xoay không bao giờ disabled khi đang xoay (nút disabled làm focus rời khỏi dialog); thay vào đó guard bỏ qua lần nhấn lặp.
    - **Media Project và Tool:** Save thay bản gốc bằng file đã xoay (PNG vẫn là PNG, JPEG vẫn là JPEG), để Website cũng hiển thị đúng chiều. File đã xoay được upload cạnh file cũ, crop được lưu, sau đó row ảnh trỏ tới nó; file cũ chỉ bị xóa khi không Release đã publish nào tham chiếu. Lưu thất bại xóa file đã upload và giữ ảnh nguyên trạng.
    - **Bằng chứng Credential:** bản gốc riêng tư không bao giờ bị ghi lại. Lượt xoay được lưu thành `credential_assets.preview_rotation`, và dialog mở lại ở hướng đó với các crop đã lưu.
13. **Bằng chứng Credential dùng cùng dialog** (`PortfolioMediaCropTarget.evidence`). Chỉ có các khác biệt sau:
    - Chỉ cung cấp format mà layout Credentials in (Landscape và Portrait). Tab Wide bị hidden, không phải disabled.
    - Header ghi "Credential evidence · Adjust evidence crops · Crop a public preview; the original file stays private."
    - Dưới preview format: "Show in Portfolio" (`.admin-inline-check`, mặc định tắt) với hint "Visible to anyone with the Portfolio link." và một dòng nhắc ngay dưới: "Check the crop for ID numbers and dates of birth before showing it." ([E-008](91-error-bank.md#e-008)). **Không có lựa chọn "Print as"** (ADR-026, từ GD3-03): layout Credential quyết định crop nào được in ([ui-guidelines §8.4](ui-guidelines.md)). Dialog mở ở tab Landscape. Bật nó sẽ hỏi xác nhận (không phải `danger`: không có gì bị phá hủy). Chỉ một file mỗi Credential được hiển thị; bật một file sẽ tắt các file khác.
    - Khi được hiển thị, mọi hướng khung mà layout Credential khai báo (`credentialsLayoutDocumentProfile`, hiện chỉ Landscape) luôn có crop đã lưu: Save ghi crop khi thiếu, còn "Reset to auto" lưu crop tự động thay vì xóa.

### 7.2 Bút chì "sửa ở đâu" trên preview Portfolio (ADR-030, W-06)

- **Phạm vi.** Chỉ chữ lấy từ **form của chính Portfolio** (tab Content): kicker, tiêu đề tài liệu, tagline và khối highlight của bìa; kicker, heading, chức danh, tóm tắt của trang giới thiệu; câu Automation; kicker, heading, nội dung trang kết; chân trang. Chữ đến từ Project, Tool, Profile, Credential, ảnh, số đếm **không có** bút chì (nó có đường vào riêng; thêm sẽ rối). Khối không có bút chì nghĩa là "sửa ở màn khác".
- **Công tắc.** Một nút `aria-pressed` "Edit markers" trên thanh preview Portfolio (chỉ Portfolio), **mặc định tắt**, nhớ lựa chọn (`localStorage` bọc `try/catch`). Tắt thì preview giống hệt trước đây.
- **Chỉ trong preview nhúng.** Bút chì và thuộc tính `data-edit-field` chỉ tồn tại khi renderer được bật `editMarkers` bởi preview nhúng của Admin; trang công khai, `?mode=print` và PDF **không bao giờ** có (test so markup từng byte). Bút chì là chrome Admin (token `--admin-*`), `position: absolute`, không chiếm chỗ trong layout, không tính vào `findPortfolioLayoutIssues`, `@media print` ẩn.
- **Cỡ bấm được mọi mức zoom.** Admin gửi hệ số `--preview-scale` vào preview để bút chì luôn khoảng 22 px trên màn hình, không co theo zoom. Chuyển động ≤ 150 ms, tắt khi `prefers-reduced-motion`; `:focus-visible` thấy rõ; `aria-label` "Edit <khối>".
- **Khối lặp.** Chân trang và câu Automation lặp trên nhiều trang: chỉ lần xuất hiện đầu tiên có bút chì.
- **Bấm → ô.** Chuyển sang tab Content, mở thẻ thu gọn chứa ô, đưa vào tầm nhìn bằng `revealAdminElement` **không bị header dính che**, focus và làm sáng ô ~1,2 giây. Ô theo **ngôn ngữ preview đang xem** (preview VI → ô VI). Chọn layout từng trang (tab Appearance) chưa nằm trong bút chì.

## 8. Phản hồi

- Thông báo thành công và thông tin dùng `showAdminToast`. Lỗi chặn hành động dùng `showAdminToast(..., "error")` cùng chi tiết cấp trường hoặc dialog.
- Dialog dùng `<dialog class="admin-dialog">` với eyebrow, heading được `aria-labelledby` tham chiếu và một hàng `.admin-actions`. Xem §8.1.

### 8.1 Cấu trúc dialog

Mọi dialog Admin có cùng ba dải để trông như một family bất kể kích thước.

| Dải | Quy tắc |
|---|---|
| **Header** | Eyebrow (`.section-kicker`, nêu tên khu vực) → title (`h2`, `--admin-title-sm` trong mọi dialog) → note một dòng tùy chọn (`--admin-text-xs`, muted, ≤ 80 ký tự, hidden dưới chiều cao 680px). Nút đóng nằm góc trên phải, căn giữa theo chiều dọc với **dòng title**, và gutter phải bằng gutter trái. Một divider bên dưới. |
| **Body** | Cùng gutter ngang như header. Tab, nếu có, nằm ngay dưới header với cùng gutter. |
| **Footer** | Một divider phía trên. Công cụ cho nội dung (zoom, reset) bên trái; hành động bên phải theo thứ tự §3: **Cancel, sau đó một hành động primary duy nhất ở ngoài cùng bên phải**. |

- **Nút đóng:** một component cho mọi dialog, được render bằng `renderAdminDialogHeader`: `.admin-dialog__close`, nút icon vuông ở `--admin-control-height-sm` với `--admin-control-radius` và `adminCloseIcon`. Không bao giờ dùng ký tự `×`, vì nó nằm trên baseline text và trông lệch tâm. Nút đóng library drawer (`.admin-drawer-close`) dùng cùng icon. Tên truy cập: "Close <dialog name>".
- **Gutter:** `--admin-dialog-gutter` (1rem, .75rem dưới 560px) cho header, tab, body và footer. Dialog không bao giờ trộn gutter giữa các dải.
- **Không có CSS header riêng theo dialog.** Khác biệt kích thước giữa các dialog đến từ chiều rộng dialog, không bao giờ từ header đã restyle. Mọi dialog có nút đóng dùng `renderAdminDialogHeader`. Dialog form nhỏ (confirm, text input, rename) không có nút đóng và giữ header form compact.
- **Đóng:** Escape, bấm ra ngoài vùng hộp (backdrop), nút đóng và Cancel đều đi qua **một hàm đóng duy nhất** của dialog (`requestClose`); không dialog nào có đường đóng riêng ([W-07](93-workflow-friction.md)). Mọi `<dialog class="admin-dialog">` gắn `bindAdminDialogBackdropClose(dialog, requestClose)` (`ui.ts`) và `adminStyles.test.ts` báo lỗi nếu một dialog trong `src/admin/` thiếu nó. Bấm ngoài chỉ tính khi **nhấn và thả đều nằm trên nền**: nhấn trong ô nhập rồi kéo ra ngoài (bôi đen chữ) không đóng. Dialog có **form nhiều trường chưa lưu** (hộp crop, Add credential) trước tiên hỏi qua `confirmAdmin` ("Keep editing" / "Discard changes", `tone: "danger"`) trên mọi đường đóng; form còn nguyên vẹn thì đóng thẳng. Dialog chỉ đọc (History, Pre-publish check, Check) và dialog một ô ngắn (đổi tên, mật khẩu, xác nhận) đóng thẳng. Kiểm bằng `node tools/dialog-backdrop-check.mjs`.

## 9. Token thiết kế

Dùng token `--admin-*` từ `admin-ui.css` và `admin-typography.css`; không viết cứng giá trị đã có token bao phủ.

- Màu: `--admin-color-*` (canvas, surface, border, text, focus, success, warning, danger).
- Điều khiển: `--admin-control-height` (2.5rem), `-sm`, `-lg`, `--admin-control-radius`, `--admin-control-padding-x`.
- Radius và shadow: `--admin-radius-sm|md|lg`, `--admin-shadow-card`.
- Thang type: `--admin-text-2xs` … `--admin-text-lg`, `--admin-title-sm|md|lg`, `--admin-weight-*`.
- Layout: `--admin-workspace-gutter`, `--admin-workspace-header-min-height`, `--admin-document-columns`, `--admin-tabs-height`.

Icon là SVG inline trên viewBox 16×16 (điều khiển) hoặc 24×24 (navigation), được vẽ với `stroke: currentcolor`, không fill, đầu và điểm nối bo tròn.

## 10. Accessibility

- Nút chỉ có icon có `aria-label` và tooltip `title` tương ứng.
- Toggle dùng `aria-pressed`; disclosure, menu và drawer dùng `aria-expanded` cùng `aria-controls`.
- Focus luôn nhìn thấy được (outline `:focus-visible` bằng `--admin-color-focus`). Không bao giờ xóa outline khi chưa có thay thế.
- Mọi hành động dùng được bằng bàn phím. Tab theo `bindAdminTablists` (phím Arrow, Home, End).
- Chuyển động không quá 150 ms và bị tắt khi `prefers-reduced-motion: reduce`. Không animate chiều cao.

## 11. Hành vi responsive

Các breakpoint hiện có: `1280px`, `1180px`, `900px` (chuyển rail/mobile; `901px` cho quy tắc chỉ desktop), `720px`, `560px` và container query `64rem` trên header tài liệu. Dùng lại chúng thay vì thêm giá trị mới.

Dưới breakpoint container, nhận diện header xếp trên các hành động và hành động wrap; thứ tự hành động không bao giờ đổi.

### Frame shell

- **Một chiều cao top bar.** `--admin-topbar-height` (4rem) đặt kích thước brand rail, header workspace và hàng đầu của `.admin-main` trên mọi màn hình và ở cả hai mật độ header, để viền dưới brand và viền dưới header thành một đường. Dưới 900px, hàng rail và hàng header đều dùng nó. Toast được định vị từ đó. Không bao giờ đặt chiều cao riêng cho một trong các phần này.
- **Frame không bao giờ thay đổi theo chiều cao màn hình.** Bookmark bar trình duyệt, taskbar hoặc cửa sổ thấp chỉ thay đổi chiều cao viewport; điều đó không được di chuyển viền hoặc reflow điều khiển. Quy tắc `max-height` chỉ được làm navigation list chặt hơn (chiều cao mục, khoảng cách nhóm, kích thước icon); không bao giờ chạm `.admin-brand`, `.admin-header`, `.admin-main` hoặc `.admin-rail__footer`.
- **Footer rail: một hàng.** Security và Sign out luôn dùng chung một hàng thành hai cột bằng nhau (cao ≥ 2rem, không wrap), trên desktop và trong rail mobile.
- **Mọi cột chạm đáy cửa sổ.** Rail, collection list, frame workspace và preview đều kết thúc trên cùng một đường. Workspace chứa frame (editor shell, thư viện tài liệu, shell Cover Letter, workspace tài liệu, site hoặc Profile) giữ `--admin-workspace-gutter` trên và hai bên nhưng **không có gutter dưới**; frame đứng trên mép cửa sổ, không viền dưới và góc dưới vuông. Quy tắc chỉ tồn tại một lần ở cuối `admin-ui.css`; workspace không bao giờ tự đặt padding dưới lần nữa.
- **Khoảng thở nằm bên trong vùng scroll.** Mỗi vùng scroll kết thúc với khoảng một gutter (20 px) sau mục cuối: panel qua padding riêng, collection list qua `padding-bottom: var(--admin-workspace-gutter)`. Preview scroll ngoài (CV, Homepage, Cover Letter) giữ padding riêng để zoom Fit không đổi. Preview Portfolio scroll trong không có padding frame dưới (`embeddedPreview` đọc giá trị này) và kết thúc bằng `calc(1.25rem / var(--embedded-preview-scale))` bên trong tài liệu, để khoảng trống sau trang cuối là 20 px trên màn hình ở mọi mức zoom. Card bên trong cột (ví dụ usage Profile) giữ margin; chỉ cột chạm mép.
- **Nhận diện rail.** Brand hiển thị tên sản phẩm và bên dưới là tên tiếng Anh (ASCII) của người vận hành, suy ra từ Professional Profile › Full name. Nó theo trường trực tiếp khi chỉnh sửa (cùng lệnh gọi `updateAdminIdentity` cập nhật avatar), trở lại tên đã lưu khi bỏ chỉnh sửa. **Chữ không đổi sau khi tải** ([UI-10](92-ui-rules.md#ui-10)): tên đã lưu lần trước được nhớ trong `localStorage` (khóa `hdl-admin-identity-name`, đọc / ghi trong `try/catch`, §13) và hiện ngay khi shell dựng; khi Profile tải xong mà tên khác thì thay. Chưa từng có tên (lần đầu trên máy, private window) thì dòng này để **trống nhưng giữ chiều cao một dòng**, không hiện chữ dự phòng nào. Đây là text phụ nhẹ: `--admin-text-2xs`, weight regular, tracking `.02em` (tên thường toàn chữ hoa), bằng màu muted rail, để không cạnh tranh với tên sản phẩm phía trên.
- **Dòng brand không bao giờ wrap.** Block text chiếm toàn bộ chỗ cạnh avatar. Tên không vừa sẽ bỏ tracking và co tỉ lệ (`fitAdminIdentityLabel`, chạy lại khi chỉnh sửa, resize và tải font) xuống 10 px; chỉ tên vẫn tràn mới bị ellipsis, với tên đầy đủ làm tooltip. Ở ba màn hình mục tiêu 1440/1920/2560, tên bốn từ (khoảng 23 ký tự) vừa đầy đủ. Trên rail 12rem (≤ 1180px), avatar là 2.15rem và tên sản phẩm dùng `--admin-text-xs` để "Career Hub Admin" nằm trên một dòng. Cột rail là `minmax(0, 1fr)` để tên dài ellipsis với tooltip thay vì làm rail rộng ra; avatar không bao giờ co.
- `adminStyles.test.ts` khóa các quy tắc này.

### Màn hình mục tiêu

Người vận hành làm việc trên ba màn hình này. Mọi thay đổi layout Admin phải hiển thị đúng ở cả ba CSS viewport (độ phân giải ÷ tỉ lệ Windows, trừ taskbar và chrome trình duyệt). Chiều cao là gần đúng cho cửa sổ Chrome tối đa; xác nhận bằng `innerWidth`/`innerHeight` khi cần.

| Màn hình | Vật lý | Tỉ lệ | CSS viewport | Dải |
|---|---|---|---|---|
| Laptop | 2880×1800 | 200% (DPR 2) | 1440 × 731 có bookmark bar, ≈ 763 khi không có (đã đo) | rộng 1281–1480; chiều cao trong dải 621–760 (chỉ navigation chặt hơn) |
| Monitor 1 | 2560×1440 | 100% | 2560 × ≈1300 | desktop rộng (không có quy tắc trên 1480) |
| Monitor 2 | 1920×1080 | 100% | 1920 × ≈940 | desktop rộng (không có quy tắc trên 1480) |

Breakpoint mobile (`900px` trở xuống) vẫn được hỗ trợ nhưng không phải mục tiêu hằng ngày.

Thay đổi shell được kiểm tra trên cả ba màn hình và trên laptop có/không có bookmark bar (1440 × 731 và 1440 × 763): đáy brand và header khớp từng pixel, footer rail là một hàng và navigation không scroll. `npm run shots` bao phủ ba màn hình; trường hợp có bookmark bar là chiều cao 731 mà lệnh đã dùng.

### Kiểm tra hình ảnh

Sau mọi thay đổi layout Admin, chụp các view bị ảnh hưởng ở ba màn hình mục tiêu và xem ảnh trước khi gọi thay đổi là xong. `scripts/admin-screenshots.mjs` chứa cùng viewport như bảng trên; giữ chúng đồng bộ.

- `npm run shots:login` — một lần trên mỗi máy (và khi session hết hạn): mở Chromium, đăng nhập, session được lưu vào `.auth/admin.json` (Git bỏ qua).
- `npm run shots` — khởi động Vite trên port 5199 và ghi `tmp/screenshots/<screen>/<view>.png` cho mọi view.
- `npm run shots -- --views=cv,portfolio --screens=laptop` — giới hạn lần chạy.
- `npm run shots -- --path="/admin/?view=projects&item=new" --name=new-project` — chụp route cụ thể.

Lần chạy mở mọi tab workspace và cảnh báo khi trang scroll ngang, phần tử vượt mép phải hoặc text một dòng bị cắt. Mỗi text bị cắt được đánh dấu **with tooltip** hoặc **NO TOOLTIP**. Copy cố định bị cắt (note, meta, mô tả health) phải được rút ngắn. Dữ liệu người dùng bị cắt (tên Project dài, slug) chỉ chấp nhận được khi có nhãn *with tooltip* (§6.2). Mọi dòng *NO TOOLTIP* đều là lỗi.

Trước khi thay đổi layout của bất kỳ thứ gì hiển thị dữ liệu người dùng, test một lần với dữ liệu dài tối đa: tên, title và tên file khoảng 120 ký tự, cùng ít nhất ba mục liên kết (ví dụ ba Credential trên một entry Education). Làm ở 1440px và khoảng 1180px. Phần lớn lỗi "wraps badly" chỉ xuất hiện với dữ liệu dài. **Từ GD3-04 máy làm hộ phần này:** `npm run shots -- --stress` thay chữ dữ liệu người dùng bằng chuỗi 130 ký tự rồi báo *overflows its container* (phần tử vượt mép card hoặc panel mà không có tổ tiên nào cắt nó) và *NO TOOLTIP*; cả hai đều là lỗi (§6.2, UI-14).

Lần chạy cũng báo **uneven field row** khi các trường dùng chung một hàng `.admin-form-grid` hoặc `.admin-site-bilingual` bắt đầu điều khiển lệch nhau hơn 1px. Nó báo **checkbox stacked above its text** khi box `.admin-inline-check` và text không nằm trên một dòng. Cả hai đều là lỗi (§6.3, "Rows must not jump"). Lần chạy không mở form trong dialog, vì vậy hãy mở chúng bằng tay ở cả hai trạng thái toggle.

Collection list cạnh editor (Content, thư viện CV/Portfolio, Cover Letter) dùng `--admin-collection-width`, tăng từ 21.5rem trên laptop lên 30rem trên monitor rộng; quy tắc `1280px` và `1180px` vẫn thu hẹp nó.

## 12. Quy tắc CSS và bundle

- Thứ tự tải stylesheet được `adminStyles.test.ts` khóa; `admin-ui.css` là lớp chuẩn hóa cuối cùng và chứa chrome dùng chung.
- Style riêng workspace nằm trong stylesheet của workspace đó; mẫu dùng chung nằm trong `admin-ui.css`.
- **Scroll và frame layout.** Frame shell, workspace và layout hai cột dùng `overflow: clip`, không dùng `hidden`. Frame `hidden` vẫn có thể bị script scroll, nên `element.scrollIntoView()` (hoặc `focus()` vào trường ở xa) có thể scroll toàn bộ workspace lên và để lại dải trống phía dưới (lỗi link "Language: English"). Chỉ pane editor, preview và list được scroll (`overflow-y: auto`). Để đưa thứ gì đó vào vùng nhìn thấy, gọi `revealAdminElement(element, { align })`. Hàm chỉ scroll container thật gần nhất. Sau khi chuyển tab hoặc panel, chờ một animation frame trước khi reveal, và focus với `{ preventScroll: true }`. Không bao giờ gọi `scrollIntoView` trong Admin; `adminStyles.test.ts` bắt buộc điều này.
- `npm run check:admin-bundle` bắt buộc ngân sách Admin ban đầu (JS 115 kB, CSS 27 kB gzip). Xóa CSS thừa trước khi tăng ngân sách và giải thích mọi mức tăng trong commit message.

## 13. Preference UI được lưu lâu dài

Tiện ích theo từng người xem (mật độ header, tài liệu mở gần nhất) dùng `localStorage`. Mọi lượt đọc và ghi được bọc trong `try/catch` và dùng mặc định làm dự phòng, để Admin vẫn hoạt động trong cửa sổ riêng tư. Nội dung và bất kỳ thứ gì phải dùng chung không bao giờ được đưa vào `localStorage`.

## 14. Checklist trước khi hoàn tất thay đổi UI Admin

1. `npm run verify:admin` đạt.
2. Thay đổi có hình thức và hành vi giống nhau trong Homepage, Professional Profile, CV, Portfolio và Cover Letter (hoặc khác biệt là có chủ ý và được ghi tại đây).
3. Đã kiểm tra với mật độ header comfortable và compact.
4. Đã kiểm tra ở chiều rộng desktop, khoảng 1180px và dưới 900px.
5. Mọi điều khiển mới dùng được bằng bàn phím và có tên truy cập.
6. Mọi dropdown mới dùng `renderAdminSelectControl` hoặc slot chevron dùng chung (§6.1); mũi tên thẳng hàng với select phía trên và dưới.
7. Dialog mới hoặc đã thay đổi theo §8.1 (header, nút đóng, gutter, thứ tự footer). So sánh cạnh một dialog hiện có.
8. Mọi preview file được tạo (crop, PDF, ảnh) được tính từ cùng trạng thái và hàm như output đã lưu (§7.1). Thay đổi một giá trị và kiểm tra preview khớp kết quả đã lưu.
9. Mọi thứ hiển thị dữ liệu người dùng được kiểm tra với dữ liệu dài tối đa (§6.2, §11). Label cố định giữ một dòng và mọi giá trị bị cắt đều có tooltip. `npm run shots -- --stress` không còn *overflows its container* (chuỗi tổ tiên đều `min-width: 0`, khung `<button>` có `width: 100%`).
10. Trường mới nằm trên form grid và trạng thái disabled trông disabled (§6.3). Card mới theo cấu trúc card mục: trạng thái cùng nhận diện, hành động phá hủy trong More, fact thành một dòng meta, tối đa hai cấp box (§6.4).
11. Mọi thứ nhảy sang vị trí khác (link tới entry, sắp xếp lại, focus validation) dùng `revealAdminElement` và giữ shell, header cùng tab nguyên vị trí (§12).
12. Mọi hàng form đã chạm tới được kiểm tra trong container thật và ở từng trạng thái toggle: điều khiển trong một hàng bắt đầu cùng chiều cao, label giữ một dòng và không checkbox nào xếp trên text (§6.3 "Rows must not jump"). `npm run shots` không hiển thị dòng *uneven field row*.
13. Danh sách mục đã upload hoặc pending theo §6.5: một cấu trúc hàng, cặp EN | VI trên cùng hàng, hành động trong More, không có file input native nhìn thấy được và Save chỉ xuất hiện khi hàng có chỉnh sửa. Bất kỳ thứ gì ẩn bằng thuộc tính `hidden` đều thực sự vô hình.
14. Mọi danh sách đưa vào hoặc loại mục có số đếm `renderAdminSelectionHeading` với đúng từ: *shown* cho toggle hiển thị, *selected* cho lựa chọn thư viện (§6.6). Tổng chỉ đếm mục đủ điều kiện.
15. Lựa chọn giữa ba option trở xuống được lặp trên mọi hàng là điều khiển segmented, không phải select; option chỉ áp dụng cho một lựa chọn được disclosure riêng cho lựa chọn đó, và hàng có vấn đề giữ trạng thái mở (§6.7).
16. Hàng trong disclosure group được phân chia, không đóng box. Trường không áp dụng được thay bằng `.admin-field-static` cùng kích thước có lý do, và dấu bắt buộc nằm ngay sau text label (§6.4, §6.8).
