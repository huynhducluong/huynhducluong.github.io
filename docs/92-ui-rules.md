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
