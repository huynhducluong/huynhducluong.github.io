# GD3-04 — Card Profile thu gọn, chống chữ dài tràn, việc nhỏ (nhóm N2)

> **Trạng thái:** CHỜ REVIEW · **Nhánh:** `gd3/04-card-profile-thu-gon` (`git fetch; git switch -c gd3/04-card-profile-thu-gon origin/main`) · **Ngày giao:** 2026-11-15 · **Cỡ:** Lớn (~9–11 file) · **Người đang code:** Claude — cửa sổ code (đã dùng 56 %)
> **Gộp (ADR-018):** tự gộp được — chỉ Admin và script, không migration, không đổi trang công khai hay PDF, không phải đề bài cuối giai đoạn.

## 1. Mục tiêu

1. **W-03, W-04 (ADR-027):** card Experience và Education thu gọn được (kiểu A đã chọn từ demo thật).
2. **UI-14:** máy tự phát hiện chữ dài tràn khỏi card (`npm run shots -- --stress`), để lỗi này không phải chờ người vận hành nhìn thấy.
3. **UI-13** và một việc đặt tên (vấn đề mở #10 của MASTER_PLAN).

## 2. Căn cứ (đã sửa sẵn, đọc đúng các đoạn này)

- `docs/admin-ui-guidelines.md` §6.4 gạch "**Card entry thu gọn được**" (toàn bộ hành vi ở đó là yêu cầu của đề bài); §6.2 ba gạch mới ("Cả chuỗi tổ tiên…", "`<button>`, `<summary>` và `<a>`…", "Kiểm bằng máy…"); §11 đoạn "Từ GD3-04 máy làm hộ"; §12 (`revealAdminElement`, cấm `scrollIntoView`); §13 (không `localStorage` cho trạng thái này).
- Sổ: UI-13, UI-14 (`docs/92-ui-rules.md`); W-03, W-04.
- Code: `src/admin/siteWorkspace.ts` — `experienceCard` (~dòng 512), `educationCard` (~564), `renderExperiencePanel` / bảng được **dựng lại** sau mỗi lần thêm / chuyển / xóa (dòng ~1156–1260), `showRelatedEntry` (~1350), hàm kiểm tra trả nhãn "Experience n / Education n" (~751, ~764); `src/admin/ui.ts` (`adminChevronIcon`, `renderAdminMoreMenu`, `revealAdminElement`, `renderAdminTruncatedText`); `src/styles/admin-site.css` (`.admin-profile-entry-card__*` quanh dòng 64–110); `scripts/admin-screenshots.mjs` (`inspect`, `pastEdge`, `truncated`).
- Số đo từ demo (laptop 1440 × 731, dữ liệu thật): card thu gọn cao **92 px** (Experience trước đây 600, Education 518–539); bốn card Experience thu gọn nằm vừa khung nhìn. Cấu trúc demo: dòng tóm tắt `<p>` nằm trong khối nhận diện, nút ⌄ là `button.button--secondary.admin-icon-button` chèn trước menu ⋯.

## 3. Phạm vi

**Làm:**

1. **Hàm tóm tắt thuần** `src/admin/profileEntrySummary.ts` (+ test): `experienceSummary(item)` → `Position · Country · MM/YYYY – MM/YYYY` (hoặc `Present` khi `endDate` rỗng); `educationSummary(item, linkedCredentialCount)` → `Field · yyyy–yyyy · N credential(s)` (cụm cuối chỉ khi N > 0). Dùng `position.en`, `location.en`, `field.en`; phần trống **bỏ** (không in "—", không `·` thừa). Test: đủ dữ liệu; thiếu position; thiếu quốc gia; `endDate` null; tháng sai định dạng không làm vỡ; N = 0, 1, 2.
2. **Card thu gọn** theo §6.4, một thành phần dùng chung cho hai loại card (đặt helper trong `ui.ts` hoặc module riêng; không chép hai bản): nút ⌄ sau ↑ ↓ và trước ⋯ với `aria-expanded`, `aria-controls`, `aria-label` "Expand/Collapse <tên>", `title`; phần form `hidden` khi thu gọn; dòng tóm tắt `.admin-profile-entry-card__summary` (một dòng, ellipsis, `title` đầy đủ, **cập nhật khi gõ**, ẩn khi card mở). Trạng thái mở nằm trong state của workspace (một `Set` theo id) để **sống qua việc dựng lại bảng**. Mặc định thu gọn; card vừa thêm mở sẵn và focus ô đầu tiên; `showRelatedEntry` mở card trước khi `revealAdminElement`; nếu đường hiển thị lỗi kiểm tra hiện có cuộn tới một card thì làm card đó tự mở (chưa có đường cuộn tới card lỗi thì **không thêm**, ghi vào mục 5).
3. **CSS** (`admin-site.css`, chỉ token `--admin-*`, không giá trị cứng): phần đầu card thu gọn bỏ `padding-bottom` và gạch chân; tóm tắt một dòng muted (`--admin-color-text-muted`, `--admin-text-xs`) với `·` bằng `::before`; chevron xoay 180° trong **≤ 120 ms**, tắt trong `@media (prefers-reduced-motion: reduce)`; khung nhận diện và mọi tầng bên trong có `min-width: 0` (UI-14).
4. **Bộ phát hiện (UI-14)** trong `scripts/admin-screenshots.mjs`:
   - Thêm vào `inspect` mục **"overflows its container"**: phần tử nhìn thấy có mép phải vượt mép phải của tổ tiên gần nhất **vẽ khung** (viền phải > 0 hoặc nền không trong suốt) hoặc **cắt** (`overflow-x` khác `visible`) quá 1 px, **và** không có tổ tiên nào nằm giữa cắt nó. Chỉ báo phần tử **trên cùng** của chuỗi (cha nó không vượt). Báo dạng `overflows its container → button.n2-identity` (cùng định dạng `describe`).
   - Thêm tùy chọn `--stress`: trước `inspect`, thay chữ của các phần tử có `title` trùng đúng chữ của chính nó (quy ước dữ liệu người dùng có tooltip) và của phần tử có `data-stress-text` (dòng tóm tắt) bằng chuỗi 130 ký tự có khoảng trắng, đồng thời cập nhật `title`; chỉ đổi DOM, **không gõ vào ô nhập, không lưu**.
   - Thêm tùy chọn `--viewport=<W>x<H>` (ví dụ `1180x731`) chạy một cỡ riêng ngoài ba màn hình mục tiêu; **không** thêm vào danh sách `screens` mặc định.
   - Cập nhật phần chú thích đầu file.
5. **UI-13:** thêm tooltip đầy đủ cho ba chỗ báo *NO TOOLTIP* ở `npm run shots`: dòng "Slug: …" trong Homepage › Content selection; dòng meta "Chức danh · Công ty" và nhãn `.admin-document-title-switcher__label` của bộ chọn Cover Letter (dùng `renderAdminTruncatedText` hoặc thuộc tính `title`).
6. **Đặt tên:** đổi `credentialPreviews` trong `src/services/credentialRepository.ts` thành `credentialSnapshotPreviews` (và nơi gọi), vì trùng tên với `src/shared/credentialPreviews.ts` (review GD3-03).

**Không làm:** accordion; lưu trạng thái mở vào `localStorage`; card Language / Credential (dùng lại sau); animate chiều cao; sửa **các view khác** theo kết quả `--stress` (chỉ liệt kê, xem mục 4); đổi trang công khai, CV, Portfolio, PDF; migration; dependency mới.

**Ràng buộc dùng chung không được đổi:** breakpoint, `--admin-topbar-height`, chiều cao rail, cấu trúc `admin-ui.css` chung; ngân sách bundle **JS 115 kB, CSS 27,0 kB gzip** — hiện CSS 26,5: phần thêm phải nhỏ; nếu vượt, **dọn CSS thừa trước** rồi mới báo; không nâng ngân sách. Liệt kê ở mục 5 mọi thay đổi trong `ui.ts`, `admin-site.css`, `siteWorkspace.ts`, `scripts/`.

**Phép tính chỗ:** 4 card × 92 px + khoảng cách ≈ 410 px, vừa vùng soạn thảo của laptop 1440 × 731 (đã đo ở demo); Education 3 card × 92 px.

## 3b. Các bước (mỗi bước: test liên quan + commit `wip(GD3-04 bước k): …`)

1. Hàm tóm tắt + test.
2. Card thu gọn (markup, state, `showRelatedEntry`, CSS) cho Experience và Education.
3. UI-13 và đổi tên hàm.
4. Bộ phát hiện + `--stress` + `--viewport` trong `scripts/admin-screenshots.mjs`.
5. `verify:admin` + đo + chứng minh bộ phát hiện (mục 4) + điền mục 5.

## 4. Tiêu chí nghiệm thu

- [ ] Test hàm tóm tắt như mục 3.1; test CSS / markup có khẳng định **dương** (E-002): có `prefers-reduced-motion` cho chevron, có nút ⌄ đứng sau hai nút di chuyển và trước menu More, phần form có `hidden` khi thu gọn.
- [ ] `npm run verify:admin` đạt một lần ở cuối (chạy từ `D:\…`, E-006); **CSS ≤ 27,0 kB gzip**, JS ≤ 115 kB.
- [ ] Đo bằng Playwright trên Admin thật (mở, không lưu; phiên `.auth/` đã có), laptop 1440 × 731: mọi card thu gọn cao đều nhau (±1 px, khoảng 92 px) và cả bốn card Experience nằm trong khung nhìn không cần cuộn; mặc định tất cả thu gọn; **+ Add company** thêm một card **mở** ở đầu và focus ô đầu; bấm ↓ trên một card đang mở thì card đó **vẫn mở** ở vị trí mới; mở hai card cùng lúc được.
- [ ] Dữ liệu không mất: sửa tên công ty một card, thu gọn, rồi `new FormData(form).get(<tên trường>)` trả đúng giá trị mới; dòng tóm tắt đổi theo khi gõ.
- [ ] Bàn phím: Tab đi theo thứ tự ↑ ↓ ⌄ ⋯; Enter và Space đóng / mở; `aria-expanded` đúng; vòng focus thấy rõ. `showRelatedEntry` (mở mục Education từ tab Credentials) mở card và tiêu đề card nằm **dưới thanh tab** (mép trên tiêu đề ≥ mép dưới thanh tab).
- [ ] **Chứng minh bộ phát hiện** (không commit phần dựng lỗi): trong một script tạm, đặt khối tên card vào `<button>` không có `width: 100%`, chạy `inspect` với `--stress` → báo `overflows its container → button…` ở 1180 và 1440; thêm `width: 100%` → hết cảnh báo; card Experience, Education **thật của đề bài** sạch ở `--stress` tại `--viewport=1180x731` và laptop.
- [ ] `npm run shots -- --views=profile,homepage,cover-letters --screens=laptop`: không còn *NO TOOLTIP* của UI-13; không *uneven field row*, không cuộn ngang.
- [ ] **Danh sách phát hiện toàn Admin:** chạy `npm run shots -- --stress --screens=laptop` (mọi view) và dán vào mục 5 danh sách *overflows its container* và *NO TOOLTIP* còn lại, **không sửa** (Claude sẽ tạo đề bài riêng).
- [ ] Không chuỗi giao diện song ngữ mới (chuỗi Admin tiếng Anh).

## 5. Báo cáo của người code

- Đã xong bước: 1, 2, 3, 4, 5 (toàn bộ).
- Người code: Claude — cửa sổ code · đã dùng trước / sau: 56 % / không đo được trong phiên.
- Nhánh, commit cuối: `gd3/04-card-profile-thu-gon` (commit cuối là `wip(GD3-04 bước 5)` có bản sửa `showRelatedEntry` và báo cáo này).
- File đã đổi (**dùng chung** in đậm):
  - Mới: `src/admin/profileEntrySummary.ts` (+ test), `src/admin/profileEntryCard.ts` (+ test).
  - `src/admin/siteWorkspace.ts` (card Experience / Education, `state.expandedProfileEntries`, `showRelatedEntry`, tooltip Slug), `src/admin/coverLetterWorkspace.ts` (tooltip meta và nhãn bộ chọn), `src/services/credentialRepository.ts` (đổi tên `credentialSnapshotPreviews`), **`src/styles/admin-site.css`** (+27 dòng), **`scripts/admin-screenshots.mjs`** (overflow, `--stress`, `--viewport`). **`src/admin/ui.ts` không đổi** (helper nằm ở module riêng `profileEntryCard.ts`).
- `verify:admin`: 211 / 211 test đạt; JS 92,8 / 115,0 kB, CSS 26,6 / 27,0 kB gzip.
- Số đo laptop 1440 × 731 (Playwright, Admin thật, không lưu):
  - Experience: 4 card đều cao 92 px; đáy card thứ tư ở 722 px (< 731), không cần cuộn. Education: 3 card × 92 px. Mặc định cả 4 đều thu gọn.
  - Tab từ ↓: ⌄ rồi ⋯ rồi ↑ của card sau. Enter mở, Space đóng, `aria-expanded` đúng. Mở hai card cùng lúc được (2).
  - Sửa Company + Position rồi thu gọn: `FormData` trả "ZZ Company"; tóm tắt đổi thành "ZZ Test Position · Vietnam · 02/2026 – Present".
  - ↓ trên card đang mở: card vẫn mở ở vị trí mới. **+ Add company**: card mới ở đầu, mở, focus vào ô Company.
  - `showRelatedEntry` (Credentials → Education): card mở; mép trên tiêu đề 270 px ≥ đáy thanh tab 225 px (trước khi sửa là 217 < 225 vì thanh tab dính che mất; đã bù chiều cao thanh tab vào `inset`).
- Chứng minh bộ phát hiện: script tạm (đã xóa) bọc khối tên card vào `button.n2-identity` nhiều chữ `white-space: nowrap`: **không** `width: 100%` → báo `overflows its container → button.n2-identity` ở 1180 × 731 và 1440 × 731 (tab Experience, Education, Credentials, Languages); **có** `width: 100%` + `min-width: 0` + ellipsis → hết cảnh báo. Card thật sạch ở `--stress` cả hai cỡ.
- Danh sách `--stress` toàn Admin (laptop, chưa sửa): **không có** dòng *overflows its container* nào. *NO TOOLTIP* còn lại (3 chỗ, đều ở thẻ chọn dự án / tool): `span "Summary · 3 of 3 responsibilities"` (cv-projects-tools), `span "Available once the project is Ready"` (cv-projects-tools, portfolio-projects-tools), `span "Technical · 3 of 3 responsibilities"` (portfolio-projects-tools). `shots` thường: hết NO TOOLTIP của UI-13, không uneven row, không cuộn ngang.
- Ghi chú vận hành cho docs: `--stress` làm đổi DOM ngay trước khi chụp nên ảnh tạo ra có chữ giả (chỉ trong `tmp/`). Bộ phát hiện bỏ qua phần tử `position: absolute / fixed` và vùng cuộn ngang (`overflow-x: auto/scroll`). Trước đây không có đường nào cuộn tới card lỗi kiểm tra (lưu hồ sơ chỉ hiện toast), nên **không thêm** tự mở card lỗi.
- Chỗ làm khác đề bài và lý do: (1) không dùng `::before` cho dấu `·` vì hàm tóm tắt đã ghép sẵn `·` trong chuỗi (một nguồn, và `title` có đủ dấu); (2) tiêu đề card chưa đổi theo khi gõ (hành vi cũ, ngoài đề bài); (3) tooltip Slug chỉ sửa ở `siteWorkspace.ts` (hai dòng); dòng cùng mẫu ở `profileDocumentWorkspace.ts:901` chưa sửa vì shots không báo.
- Câu hỏi: Có nên cho thanh tab dính (`.admin-document-tabs`) vào `revealAdminElement` như tham số mặc định, vì mọi chỗ cuộn tới mục trong editor đều có thể bị che? Khuyến nghị: để Claude cân nhắc khi review; lợi là hết lỗi lặp lại, cái giá là đổi helper dùng chung ngoài phạm vi đề bài này.

## 6. Review của Claude

- Ngày, commit đã review:
- **Phải sửa:**
- **Nên sửa:**
- **Cần người vận hành chốt:**
- Kết luận:
