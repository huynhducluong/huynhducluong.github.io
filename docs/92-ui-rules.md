# 92 — Sổ lỗi giao diện → quy tắc UI-xx

> **Mục đích:** mỗi lần giao diện sai, lệch hoặc chưa đồng bộ, ghi một dòng UI-xx để lần sau không lặp lại. Agent đọc file này **trước khi** sửa giao diện và chạy checklist §2 trước khi báo xong.
> **Một quy tắc một chỗ (ADR-021):** quy tắc chi tiết nằm trong guideline (`admin-ui-guidelines.md`, `ui-guidelines.md`). Ở đây chỉ ghi lỗi đã gặp, tóm tắt quy tắc một dòng và **link tới mục guideline**. Lỗi mới chưa có quy tắc → Claude thêm vào guideline cùng lúc ghi UI-xx.
> **Khác với:** [docs/91](91-error-bank.md) (sai lầm về cách làm, test, môi trường); [docs/93](93-workflow-friction.md) (cảm nhận "rườm rà" khi dùng, chưa phải lỗi).

## 0. Quy trình bắt lỗi giao diện (ba lớp)

| Lớp | Ai | Khi nào | Làm gì |
|---|---|---|---|
| 1. Tự kiểm | Người code | Mỗi lần sửa giao diện, **trước khi** báo xong | Chụp màn hình mình sửa (`npm run shots -- --views=…`), xem ảnh, chạy §2 |
| 2. Review | Claude | Mỗi đề bài có giao diện | Chụp đủ ba màn hình mục tiêu; Website / tài liệu: EN + VI; đo bằng số (vị trí, tỉ lệ, tràn), không chỉ nhìn |
| 3. Dùng thật | Người vận hành | GĐ 3 và cuối mỗi nhóm nâng cấp | Gửi **một lần** mọi chỗ chưa ưng (ảnh + một câu); Claude ghi UI-xx / W-xx |

- Lỗi nhỏ trong lúc code một nhóm: gom vào lượt duyệt cuối nhóm, không báo từng cái.
- **Chụp đúng phạm vi** (người vận hành 2026-11-15): chỉ chụp và xem **màn hình bị thay đổi** (`npm run shots -- --views=…`), ở ba màn hình mục tiêu. Ngoại lệ: thay đổi chạm **file dùng chung** (`admin-ui.css`, `ui.ts`, `tokens.css`, theme, khung shell) thì chụp **mọi** view một lần và chỉ xem kỹ ảnh khác thường (báo *uneven field row*, *NO TOOLTIP*, cuộn ngang). Màn hình không bị ảnh hưởng không review lại.

### 0.1 Đồng bộ với bộ quy tắc (mọi đề xuất)

Trước khi đề xuất hay viết đề bài có giao diện, Claude **tự đối chiếu** với guideline (`admin-ui-guidelines.md`, `ui-guidelines.md`) và §1 của sổ này, không chờ người vận hành nhắc:

1. Tìm quy tắc đang áp cho thành phần / màn hình đó; đề xuất **dẫn mục** (ví dụ "admin-ui §6.4") và làm theo.
2. Ý người vận hành trái một quy tắc → đề xuất theo quy tắc và nói rõ chỗ khác, vì sao (vd. W-03: nút ⌄ sau ↑ ↓ theo §6.4).
3. Chưa có quy tắc (mẫu mới) → ghi `[ĐỀ XUẤT] quy tắc mới` trong đề xuất để người vận hành duyệt; duyệt xong thì ghi vào guideline **trước khi** giao code (ADR-020).
4. Sửa xong một lỗi giao diện → quy tắc nằm trong guideline + dòng UI-xx trỏ tới; áp cho **mọi** màn hình cùng loại, không chỉ màn hình gây lỗi.
- Test so chuỗi CSS / HTML chứng minh "đã sửa file", **không** chứng minh "người dùng thấy đúng". Yêu cầu hiển thị (không cắt, một hàng, thẳng hàng, không tràn) phải đo trên trình duyệt thật.

## 1. Danh sách

> UI-01 … UI-07 ghi bù 2026-11-15; ngày là commit đầu tiên ghi quy tắc vào guideline.

| Mã | Ngày | Lỗi đã gặp | Quy tắc (tóm tắt) | Nguồn quy tắc | Trạng thái |
|---|---|---|---|---|---|
| <a id="ui-01"></a>UI-01 | 2026-10-31 | Hộp Credential đúng trên trang trống, sai trong editor thật: ô "Does not expire" chồng lên chữ ([E-001](91-error-bank.md#e-001)) | Kiểm trong **container thật**, **mọi trạng thái toggle**, ở 1440 px và ~1180 px; các ô cùng hàng bắt đầu cùng y, nhãn một dòng | admin-ui §6.3 "Rows must not jump", §11 Visual check | Có quy tắc |
| <a id="ui-02"></a>UI-02 | 2026-10-30 | "Credentials & evidence" bị ép xuống hai dòng cạnh dữ liệu người dùng | Chữ giao diện cố định không co, không xuống dòng; chỉ dữ liệu người dùng được cắt, luôn có tooltip | admin-ui §6.2 | Có quy tắc |
| <a id="ui-03"></a>UI-03 | 2026-10-31 | Thay ô nhập bằng chữ "No expiry" bằng `hidden` làm hàng cao thấp lệch vài px | **Đổi chỗ, không đổi cỡ**: `.admin-field-swap`, ô gốc giữ chỗ, chữ thay phủ đúng ô | admin-ui §6.3 | Có quy tắc |
| <a id="ui-04"></a>UI-04 | 2026-10-31 | Ô "Use as" chen vào lưới EN \| VI làm các cặp lệch chéo | Lưới song ngữ chỉ chứa cặp EN \| VI theo thứ tự | admin-ui §6.5 | Có quy tắc |
| <a id="ui-05"></a>UI-05 | 2026-10-31 | Link "Language: English" cuộn cả workspace, để trống đáy ([E-005](91-error-bank.md#e-005)) | Khung dùng `overflow: clip`; `revealAdminElement`, không `scrollIntoView` | admin-ui §12 | Có quy tắc + test |
| <a id="ui-06"></a>UI-06 | 2026-10-31 | Mũi tên dropdown mỗi chỗ một kiểu, lệch với select trên dưới | Một glyph `adminChevronIcon`, một slot có token | admin-ui §6.1 | Có quy tắc |
| <a id="ui-07"></a>UI-07 | 2026-10-31 | Hàng ngày tháng ba cột không thẳng với các ô trên dưới | Mọi hàng theo `.admin-form-grid` (hai cột) hoặc `.admin-site-bilingual` | admin-ui §6.3 | Có quy tắc |
| <a id="ui-08"></a>UI-08 | 2026-11-15 | Portfolio `credentials.dual`: tiêu đề credential **ba dòng** (vd. "Autodesk Certified Professional: Revit for Structural Design and Coordination") làm khung minh chứng thẻ trái thấp hơn thẻ phải **4,5 mm** (87,2 so với 82,7 mm), dòng meta cũng lệch. `header { min-height: 15mm }` chỉ đủ hai dòng | Các thẻ cạnh nhau trên một trang in phải thẳng hàng **theo hàng**, không theo chiều cao đoán trước. Hướng sửa `[ĐỀ XUẤT]`: lưới cha có hàng tiêu đề / khung / meta dùng chung (`grid-template-rows: subgrid`), tiêu đề dài nhất quyết định chiều cao hàng; đo lại không tràn trang | ui-guidelines §8.4 (cần thêm) | `MỞ` — MASTER_PLAN vấn đề mở #3 |
| <a id="ui-10"></a>UI-10 | 2026-11-15 | Rail Admin: dòng tên dưới "Career Hub Admin" hiện chữ khác lúc mới mở, rồi đổi thành tên thật khi Profile tải xong (Sổ #1). Code: `brand.ts` có chữ dự phòng "Career workspace", `updateAdminIdentity` thay sau | Chữ cố định của khung (shell) **không đổi nội dung sau khi tải**. Hướng `[ĐỀ XUẤT]`: nhớ tên lần trước trong `localStorage` (try/catch, §13) và hiện ngay; lần đầu tiên thì để dòng trống giữ chiều cao, không hiện chữ dự phòng | admin-ui §11 "Nhận diện rail" | Đã sửa `7c387b8` (GD3-01) |
| <a id="ui-11"></a>UI-11 | 2026-11-15 | Portfolio Credentials (Dual, Bands): ảnh minh chứng trông "lạc" trong thẻ — ảnh chụp giấy còn nền bàn / bóng, viền mảnh sát nền thẻ xám, bo 1 mm khác thẻ 2 mm (Sổ #7) | Ảnh tài liệu trình bày như **giấy trên nền trắng** (mat), tách khỏi nền thẻ; bo góc theo một thang; crop sát mép giấy. Hướng `[ĐỀ XUẤT]`: dựng 2–3 kiểu demo thật để người vận hành chọn | ui-guidelines §8.4 (cần thêm) | `MỞ` — N3 |
| <a id="ui-12"></a>UI-12 | 2026-11-15 | Portfolio › Appearance: mở "Automation overrides" thì "Project overrides" (≈ 20 dòng) vẫn mở, đẩy nhóm vừa mở xuống xa (Sổ #8) | Các nhóm disclosure cùng cấp trong một khối: **mở một cái thì đóng cái khác** (accordion), và giữ tiêu đề nhóm vừa mở trong tầm nhìn bằng `revealAdminElement` (nhóm trên co lại làm nội dung nhảy lên) | admin-ui §6.4 "Nhóm disclosure cùng cấp là accordion", §12 | Đã sửa `7c387b8` (GD3-01) |
| <a id="ui-13"></a>UI-13 | 2026-11-15 | `npm run shots` (review GD3-01) báo **NO TOOLTIP**: slug "Slug: …" trong Homepage › Content selection (laptop); dòng meta "BIM Coordinator · Royal HaskoningDHV" và nhãn `.admin-document-title-switcher__label` của bộ chọn Cover Letter (cả ba màn hình). Có từ trước, không do GD3-01 | Chỉ dữ liệu người dùng được cắt, và **luôn có tooltip** (`renderAdminTruncatedText`) | admin-ui §6.2, §11 Visual check | `MỞ` — gộp vào đề bài Admin kế tiếp |
| <a id="ui-09"></a>UI-09 | 2026-11-15 | Khung tài liệu Credentials có chiều cao mm cố định (84 / 51 mm) nên crop Landscape bị viền / co | Khung ảnh chỉ đặt **một chiều**, chiều kia theo tỉ lệ crop; không chiều cao mm cố định | ui-guidelines §8.4 (crop ratio contract) | Đã sửa `7ffffdb` + test |

## 2. Checklist trước khi báo xong một thay đổi giao diện

Chạy checklist của guideline trước, rồi các mục bổ sung dưới đây.

1. **Admin:** [admin-ui-guidelines §14](admin-ui-guidelines.md) (16 mục). **Website / tài liệu in:** [ui-guidelines §9](ui-guidelines.md) (10 mục).
2. Đã đọc §1 và áp mọi UI-xx liên quan tới màn hình vừa sửa (không chỉ màn hình gây ra lỗi gốc).
3. Kiểm trong container thật, mọi trạng thái toggle (UI-01).
4. Có dữ liệu người dùng: thử dữ liệu dài nhất (tên ~120 ký tự, tiêu đề ba dòng, ba mục liên kết).
5. Có yêu cầu thẳng hàng / không cắt / không tràn: có **số đo** trong báo cáo (vị trí, tỉ lệ, `findPortfolioLayoutIssues`), không chỉ "đã xem ảnh".
6. Liệt kê mọi file dùng chung đã đổi (`admin-ui.css`, `tokens.css`, theme, `vite.config.ts`).
7. Lỗi giao diện mới tìm thấy (do ai tìm) → thêm dòng UI-xx; quy tắc mới → báo Claude ghi vào guideline.

## Mẫu dòng

```markdown
| <a id="ui-xx"></a>UI-xx | YYYY-MM-DD | <lỗi đã gặp, màn hình, số đo> | <quy tắc một dòng> | <guideline §> | Có quy tắc / MỞ / Đã sửa <hash> |
```
