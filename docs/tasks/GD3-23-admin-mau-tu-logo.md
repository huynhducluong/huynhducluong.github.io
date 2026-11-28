# GD3-23 — Admin › Appearance: "Lấy màu từ logo" (nhóm N20)

> **Trạng thái:** CẦN SỬA (review 2: 1 Phải sửa, Sổ #38 cặp màu không thẳng hàng) · **Nhánh:** `gd3/23-admin-mau-tu-logo` từ `main` · **Ngày giao:** 2026-11-24 · **Cỡ:** Vừa (~5 file) · **Người đang code:** Claude — cửa sổ code (hoặc Codex)
> **Gộp (ADR-018):** chỉ Admin, không migration, không đổi giao diện công khai hay PDF **hiện có** (chỉ thêm khả năng chọn màu) → Claude tự gộp được nếu review sạch.

## 1. Mục tiêu

[ADR-040](../../decisions/ADR-REGISTER.md) (Sổ #34, W-33): trong Appearance của CV, Portfolio, Cover Letter (và nơi khác dùng `renderDocumentThemeFields`) thêm nút **"Lấy màu từ logo"**: chọn ảnh logo công ty ứng tuyển, gợi ý 2 – 3 cặp **Primary / Accent**, bấm một cặp thì chuyển preset sang **Custom** và điền hai màu. Màu lưu theo từng tài liệu như hiện nay; UI / tài liệu vẫn đạt tương phản 4,5 : 1.

## 2. Căn cứ

- `src/themes/documentThemes.ts` (`buildDocumentThemeTokens`, `resolveDocumentTheme`, `getContrastRatio`, `DOCUMENT_TEXT_CONTRAST` = 4,5), `src/admin/documentThemeFields.ts` (`renderDocumentThemeFields`; hai `<input type="color">` `theme_primary`, `theme_accent`; `<select>` preset), `src/admin/profileDocumentWorkspace.ts` (`readTheme` ~dòng 362), `coverLetterWorkspace.ts`, `siteWorkspace.ts`.
- `docs/admin-ui-guidelines.md` (§6.1 select / chevron, §6.3 trường, §14), [AGENTS §5](../../AGENTS.md) mục 1, 2, 3, 6 (token, renderer chung, escape, a11y); `docs/ui-guidelines.md` §7 (màu tài liệu: không dùng accent làm màu chữ).
- **Không lưu logo** (riêng tư / không thêm dữ liệu): chỉ đọc màu bằng `createImageBitmap` hoặc `Image` + `canvas` thu nhỏ (≤ 128 px cạnh dài), rồi bỏ ảnh. Không tải lên Supabase, không migration.
- **Ngân sách CSS Admin đã hết dư địa (27,0 / 27,0 kB; GD3-21 đang làm giảm):** dùng lại tối đa class có sẵn (`button--secondary`, `admin-field-hint`, chip, `.admin-document-theme`); nếu CSS vẫn vượt, **dừng và báo** số cần thêm để Claude và người vận hành quyết nâng ngân sách; JS ngân sách còn dư (92,8 / 115,0 kB), ưu tiên nạp lười (`import()`) phần trích màu.

## 3. Phạm vi

**Làm:**

1. **Hàm thuần `extractLogoPalette(pixels)`** (file mới, ví dụ `src/shared/logoPalette.ts`): nhận mảng RGBA đã thu nhỏ; bỏ điểm trong suốt, gần trắng, gần đen và xám (độ bão hòa thấp); gom màu (lượng tử hóa 5 bit mỗi kênh hoặc k-means nhỏ); xếp theo diện tích × độ bão hòa; **Primary** = màu nổi bật nhất; **Accent** = màu nổi bật kế tiếp **khác sắc rõ** (khác Primary theo khoảng cách màu / sắc độ ≥ ngưỡng, ghi ngưỡng); nếu logo chỉ một màu thì Accent = biến thể sáng / tối của Primary (hàm đã có hoặc tự viết, ghi rõ). Trả tối đa **3 cặp** có thứ tự; logo đơn sắc đen / trắng trả danh sách rỗng (UI nói "không tìm thấy màu nổi bật").
2. **UI trong `renderDocumentThemeFields`:** nút **"Lấy màu từ logo"** (`button--secondary`) mở `<input type="file" accept="image/*">` ẩn (không file input native nhìn thấy, như §6.5); sau khi chọn, hiển thị **tối đa 3 nút cặp màu** (hai ô màu + mã hex, `aria-label` "Use <primary> and <accent>"); bấm một cặp: đặt `<select>` = `custom`, điền `theme_primary` / `theme_accent`, phát `input` / `change` để dirty-state và preview cập nhật; dòng gợi ý `aria-live="polite"` ghi kết quả tương phản của bộ màu vừa chọn lấy từ `buildDocumentThemeTokens` (ví dụ "Text on primary 5.1 : 1, passes") và, nếu hệ thống phải điều chỉnh màu để đạt 4,5 : 1, ghi "Adjusted for contrast". Hộp thoại lỗi / thông báo qua `showAdminToast` (không `alert`). Chuỗi EN (Admin chỉ tiếng Anh).
3. **Hành vi:** không đổi dữ liệu cho đến khi người dùng bấm một cặp; không tự lưu (vẫn Save draft / Publish như mọi thay đổi theme); file không phải ảnh hoặc quá lớn (> 5 MB) báo lỗi gọn; SVG được đọc qua `Image`; trạng thái disabled (tài liệu đã phát hành, khi `disabledAttribute` có) vô hiệu hóa cả nút.
4. **Test:** (a) `extractLogoPalette` với dữ liệu tổng hợp: logo hai màu (đỏ + xanh) → Primary / Accent đúng và khác sắc; logo chủ yếu trắng + một màu → Primary là màu đó, Accent là biến thể; logo đen trắng → rỗng; điểm trong suốt bị bỏ; thứ tự ổn định; (b) markup: nút có tên truy cập, không file input nhìn thấy, `disabled` khi tài liệu khóa, thoát chuỗi một lần (E-003); (c) test CSS dương nếu thêm CSS.
5. **Công cụ đo mới `tools/theme-from-logo-check.mjs`** (theo mẫu các tool Playwright có `.auth`): tạo ba logo tổng hợp (PNG vẽ bằng canvas: đỏ + xanh dương; trắng + một màu lục; đen trắng), vào Appearance của CV và Cover Letter, chọn từng file, kiểm gợi ý (số cặp, `aria-live`), bấm cặp đầu: `<select>` = Custom, hai `<input type="color">` đổi đúng, dòng tương phản ≥ 4,5. **Mốc trước khi làm: FAIL** (nút chưa có; ghi số). Mục tiêu All PASS.
6. **Kiểm kê điều khiển (UI-17 điều 2) và checklist từng mục (§14 × 16, docs/92 §2):** bảng kích thước nút mới so với nút Appearance / More hiện có, ảnh ở 1440, 1180, 768, 390; thử logo thật (ví dụ ảnh có chữ, nền trong suốt).

**Không làm:** lưu logo; thư viện bảng màu đặt tên (phương án B, làm sau nếu cần); đổi `buildDocumentThemeTokens`; đổi giao diện công khai; migration; dependency mới (viết trích màu thuần, không thêm thư viện).

## 3b. Các bước

1. `extractLogoPalette` + test thuần.
2. UI nút + cặp màu + điền Custom + dòng tương phản.
3. `tools/theme-from-logo-check.mjs`; kiểm kê; `verify:admin` một lần (CSS không vượt 27,0 kB); điền mục 5.

## 4. Tiêu chí nghiệm thu

- [ ] `node tools/theme-from-logo-check.mjs` All PASS (mốc FAIL → 0).
- [ ] Chọn logo → tối đa 3 cặp; bấm cặp → preset Custom, hai màu đổi, preview đổi, dirty-state bật; tải lại sau Save draft vẫn giữ màu.
- [ ] Tương phản của bộ màu hiển thị và đạt 4,5 : 1 (hoặc ghi "Adjusted for contrast").
- [ ] Logo không được lưu / tải lên đâu cả (đo: không có request mạng mới khi chọn file).
- [ ] `npm run verify:admin` đạt (từ `D:\…`), CSS / JS Admin không vượt ngân sách.

## 5. Báo cáo của người code

- Đã xong bước: 1 – 3
- Người code · đã dùng trước / sau: Claude — cửa sổ code · chưa ghi token
- Nhánh, commit cuối: gd3/23-admin-mau-tu-logo (commit feat(GD3-23))
- File đã đổi (ghi rõ file dùng chung): mới: src/shared/logoPalette.ts (+ test), src/admin/themeFromLogo.ts (nạp lười), src/admin/documentThemeFields.test.ts, tools/theme-from-logo-check.mjs. Sửa: **src/admin/documentThemeFields.ts (dùng chung: CV, Portfolio, Cover Letter, Homepage)**, src/styles/admin-documents.css, src/admin/adminStyles.test.ts. Không đổi `buildDocumentThemeTokens`, workspace nào, hay dữ liệu.
- `verify:admin` (CSS / JS gzip trước / sau): đạt. **CSS 27 638 → 27 647 byte gzip, ngân sách 27 648: còn dư đúng 1 byte** (GD3-21 đã đưa CSS xuống 26,9 kB trước; ~0,3 kB thêm cho khối nút / cặp màu, tôi gọn thêm bằng cách bỏ `gap` / `border-radius` của ô màu). JS khởi đầu **92,8 → 92,8 kB** (phần trích màu và đọc ảnh là chunk nạp lười `themeFromLogo`, không vào ngân sách đầu). Lần thêm CSS Admin sau chắc chắn vượt: cần nâng ngân sách hoặc gỡ CSS chết.
- `tools/theme-from-logo-check.mjs` (mốc FAIL → sau): mốc **2 FAIL** (chạy thật trên `main`: nút chưa có ở CV và Cover Letter; các phép còn lại bị bỏ qua) → **All PASS** (16 dòng: nút, số cặp, không request mạng, bấm cặp đầu → Custom, hai màu đúng, "Text on primary 6.3 : 1, passes", cho cả CV và Cover Letter). Phép `no-network` chỉ đếm request không phải script / stylesheet / font (chunk nạp lười của Vite là script, không phải logo).
- **Bảng kiểm kê điều khiển** (1440, 1180, 768, 390 đều đo, kết quả giống nhau: cột form hẹp nên bố cục không đổi theo viewport):

  | Điều khiển | Kích thước | So với có sẵn |
  |---|---|---|
  | Nút "Pick colors from logo" (`button--secondary`) | 173 × 40 | cùng cao 40 với nút Save / More (112 × 40) |
  | Nút cặp màu (hai ô 16 × 16 + mã hex) | 120 – 123 × 40 | cùng kiểu `button--secondary`, cao 40 |
  | Ô màu `type="color"` có sẵn | không đổi | |
  | Ô file ẩn | không nhìn thấy (hidden) | không có file input native nhìn thấy (§6.5) |

  Logo thử: chữ "ACME" xanh ngọc trên nền trong suốt + ô vuông cam → 2 cặp (#0e766e / #f59e0b và đảo lại), không cuộn ngang ở cả bốn độ rộng. Tôi thấy ảnh khối theme ở 1440 (nút, hai cặp, dòng gợi ý); ảnh 390 chụp lệch khung (đã xem, không đọc được khối theme) nên **chưa có ảnh 390 dùng được**, chỉ có số đo.

  Thuật toán (ngưỡng ghi trong `logoPalette.ts`): bỏ điểm alpha < 128, bão hòa HSV < 0,2, độ sáng < 0,2; gom 5 bit mỗi kênh rồi hợp màu cách nhau < 64 (khoảng cách RGB); xếp theo diện tích × (0,5 + bão hòa); Accent = màu kế tiếp lệch sắc ≥ 30°, nếu không có thì biến thể sáng (màu tối) hoặc tối (màu sáng) 30 – 35 %; tối đa 3 cặp (Primary lần lượt là ba màu nổi nhất).
- **Checklist giao diện từng mục (§14 × 16, docs/92 §2):**

  §14: 1 đạt. 2 đạt về dùng chung (một renderer cho mọi nơi có theme) nhưng **chỉ đo CV và Cover Letter**; Portfolio dùng cùng `themeFields` của CV; **Homepage (siteWorkspace) chưa đo**. 3 không kiểm. 4 đã đo ở 1440 / 1180 / 768 / 390 (số). 5 đạt về markup: nút có chữ, cặp màu có `aria-label` "Use #… and #…", dòng gợi ý `aria-live="polite"`; **chưa thử Tab / Enter thật**. 6 – 9, 11, 13 – 16 không áp dụng (9: tên cặp màu cố định). 10 đạt (không đổi card). 12 không áp dụng.

  Kiểm theo tiêu chí nghiệm thu: bấm cặp → Custom, hai màu đổi, tương phản ≥ 4,5 (đã đo). **Chưa kiểm:** preview đổi màu và dirty-state bật (tôi phát `input` và `change` trên hai ô màu như người dùng đổi tay nên các trình nghe có sẵn chạy, nhưng không đo từng cái); **tải lại sau Save draft vẫn giữ màu** (không bấm Save để khỏi ghi dữ liệu thật); logo SVG và logo thật của công ty; trạng thái `disabled` (tài liệu khóa) trong trình duyệt (chỉ có test markup); file không phải ảnh / > 5 MB trong trình duyệt (có mã và toast, chưa thử).

  docs/92 §2: 2 đã áp UI-17 (nút cao 40 như nút Admin khác). 3 mọi trạng thái nút: chưa chọn, có cặp, rỗng ("No prominent color found in this logo."). 4 không dữ liệu dài. 5 có số đo. 6 file dùng chung: `documentThemeFields.ts`. 7 không UI mới.
- Chỗ làm khác đề bài và lý do: nhãn nút là "Pick colors from logo" (Admin chỉ tiếng Anh; đề bài ghi "Lấy màu từ logo" là tên tính năng). Gắn hành vi bằng **trình nghe `document` dùng chung** trong `documentThemeFields.ts` (một chỗ, không sửa ba workspace); sự kiện `input` / `change` của chính ô file bị chặn ở pha capture để không đánh dấu form bẩn (chỉ bấm cặp mới đánh dấu). Dòng tương phản đo `primary đã chỉnh` / `onPrimary` (chữ trên màu chính), vì đó là cặp thật sự in ra; hệ thống đã có quy tắc làm tối màu chính, nên thường là "passes" và chỉ ghi "Adjusted for contrast" khi màu chính bị đổi. Ô màu giữ mã gốc của logo, không thay bằng màu đã chỉnh.
- Câu hỏi:

### 5b. Sửa sau review 1 (Nên sửa 1, 2 và ngân sách ADR-041)

- **Nên sửa 1 (gợi ý rác ở viền khử răng cưa):** `LOGO_MIN_ALPHA` 128 → **250** (bỏ điểm nửa trong suốt); gom màu xong, một màu **cùng họ sắc (< 30°) với màu lớn hơn và có diện tích < 50 % của nó** bị coi là viền (`LOGO_EDGE_SHARE`) và bỏ; logo **một họ sắc** trả đúng **2 cặp** (màu chính + biến thể nhạt, màu chính + biến thể đậm, `logoAccentVariant(rgb, opposite)`). Test mới: ảnh có lõi lục, viền pha trắng, viền pha đen và điểm nửa trong suốt → đúng 2 cặp, không có `#8ecfa7` / `#10552c`; và một logo hai sắc xanh thật (đậm + nhạt, diện tích gần nhau) vẫn giữ cả hai. Công cụ đo thêm logo hình tròn khử răng cưa trên nền trắng (`green-circle`) → đúng 2 cặp; logo lục ô vuông cũng đổi từ 1 → 2 cặp theo quy tắc mới.
- **Nên sửa 2 (trạng thái cặp màu):** mỗi nút cặp có `aria-pressed` (true chỉ ở cặp vừa áp dụng, false ở cặp khác); chữ nhìn thấy ghi **cả hai mã** ("#0f766e + #f59e0b"), tên truy cập là chính chữ đó (bỏ `aria-label` "Use … and …" để tên khớp chữ nhìn thấy); trạng thái pressed có viền `--color-primary` và nền `--admin-color-selected`. Công cụ đo thêm phép `pressed`. Đã xem ảnh: cặp thứ hai bấm → viền xanh, nền nhạt, cặp thứ nhất không. Nếu người dùng chỉnh tay ô màu sau đó, `aria-pressed` vẫn giữ cặp cũ (chưa xử lý).
- **Ngân sách (ADR-041):** `scripts/check-admin-bundle.mjs` CSS 27 → **28 kB** và dòng chú thích. CSS hiện **27,0 / 28,0 kB** (thêm quy tắc pressed ~ 0,1 kB).
- Chạy lại: `theme-from-logo-check` **All PASS** (CV và Cover Letter, cả bốn logo + `pressed`), `admin-checkbox-size-check` **All PASS**, `verify:admin` đạt.

### 5c. Sửa sau review 2 (Phải sửa 1: cặp màu thẳng hàng, Sổ #38)

- **Đã sửa (`admin-documents.css`, chỉ CSS):** khối logo là lưới một cột; nút "Pick colors from logo" ở hàng riêng (`justify-self: start`); các cặp màu là lưới `repeat(auto-fit, minmax(min(100%, 12.5rem), 1fr))`, `grid-auto-rows: 1fr`, gap `.75rem` như lưới theme; danh sách rỗng thì ẩn; dòng `aria-live` ở dưới. Test CSS trong `adminStyles.test.ts` đổi theo.
- **Làm khác gợi ý:** cột tối thiểu **12,5rem** thay vì 11,5rem, vì nút rộng tự nhiên 199 px (> 184 px) nên ở khung 380 – 410 px chữ sẽ bị ép.
- **`pairs-aligned` (mới trong `theme-from-logo-check`, logo ba màu, CV và Cover Letter):** mốc **6 FAIL** → **All PASS**. 1440: 2 cột 209 – 212 × 40 (cặp thứ ba ở hàng hai, cùng cột trái); 1180: 1 cột 338 – 342 × 40; 768: 1 cột 241 – 245 × 40; không nút nào tràn chữ. Đo thêm ở 390 (CV): 1 cột 270 × 40, không tràn.
- **Ảnh:** đã xem khối theme ở 1440 (thẳng hàng). Ảnh 390 vẫn chụp lệch sang bản xem trước, **chỉ có số đo**; không xem ảnh 1180 / 768.
- **`verify:admin`:** đạt; Admin CSS 27,0 / 28,0 kB, JS 92,8 / 115,0 kB.
- **`admin-checkbox-size-check`:** bản gốc **không chạy hết**: `page.goto` quá 30 s khi chờ `networkidle` ở `?view=portfolio` (hai lần). Chạy bản tạm (chờ `load` + 4 s): 6 PASS, 1 FAIL "không có checkbox" ở Homepage › Content selection (1440×731), màn này đạt (42 ô) ở lần chạy bản gốc; bản tạm dừng ở độ rộng đầu. Vậy **chưa có lượt All PASS** cho công cụ này, cần Claude chạy lại khi review.
- Không làm mục ghi nhận (bỏ `aria-pressed` khi chỉnh tay ô màu).

## 6. Review của Claude

- Ngày, commit đã review: 2026-11-24, `d61d038` (đo trên dev server cổng 5173 của người vận hành, thư mục chính ở nhánh này; `.auth` chép sang 5173, tệp tạm đã xóa).
- **Dự báo token đối chiếu:** dự báo 10 % (8 – 14 %); người vận hành báo **80 % → 84 % = ~4 %** (thấp hơn dự báo).
- **Checklist giao diện (UI-16, UI-17, §14 × 16), Claude chạy lại từng mục, gồm các mục coder chưa làm:**
  - §14 mục 1 đạt: `verify:admin` 47 file / **355** test; Admin JS 92,8 / 115,0 kB (chunk nạp lười), CSS **27 647 / 27 648 byte** gzip: **dư đúng 1 byte**.
  - **Bốn nơi dùng chung đều có nút** (coder chỉ đo CV và Cover Letter): CV, Portfolio, Homepage, Cover letters ở Appearance; chọn logo hai màu cho đúng 2 cặp ở cả bốn.
  - **Bảy logo tổng hợp qua giao diện thật** (CV): hai màu đỏ + xanh → 2 cặp (`#0033a0 + #c8102e`, hoán đổi); chữ đen + vạch cam → 3 cặp, đầu `#ff6a00 + #b34a00`; nền trong suốt hai màu → 2 cặp đúng; nền vàng nhạt → 1 cặp, dòng "Adjusted for contrast"; gradient tím – ngọc → 3 cặp; **logo đen trắng → 0 cặp, "No prominent color found in this logo."**; logo xanh lục một màu → 3 cặp (xem Nên sửa 1).
  - **Bấm một cặp:** preset → Custom, hai ô màu đổi đúng, bản xem CV đổi màu ngay (ảnh đã xem: sọc tím / vàng), trạng thái "Unsaved" bật, dòng `aria-live` ghi "Text on primary 9.4 : 1, passes." (các bộ có điều chỉnh ghi thêm "Adjusted for contrast", tương phản 5,2 – 5,4 : 1).
  - **Lỗi (coder chưa thử):** file .txt → toast "Choose an image file…"; ảnh > 5 MB → toast "That logo is larger than 5 MB…"; **SVG** đọc được (2 cặp đúng `#6a1b9a` / `#f9a825`).
  - **Bàn phím (coder chưa thử):** Tab / Enter trên nút cặp màu áp dụng đúng (`custom`, hiện tương phản); viền focus rõ; nút "Pick colors from logo" 173 × 40, chữ 14 px như nút phụ khác.
  - **Logo không rời máy (mục 4 của tiêu chí):** trong lúc chọn logo và bấm cặp chỉ có đúng một request `blob:` cục bộ, **không** request mạng nào mang ảnh (đã đo bằng trình nghe `request`); không có chunk nạp lười nào gửi dữ liệu.
  - **Chưa kiểm được:** lưu rồi tải lại giữ màu (không bấm Save để khỏi ghi dữ liệu thật; đường lưu là `readTheme` đọc hai ô `theme_primary` / `theme_accent` có tên không đổi, nên giữ được theo thiết kế); trạng thái disabled của bản đã phát hành (có test markup).
- **Phải sửa:** không.
- **Nên sửa:**
  1. **Gợi ý rác ở logo gần một màu:** logo xanh lục một màu cho cặp 2 và 3 là `#339c63 + #236d45` và `#94cbad + #688e79`: màu pha ở **viền khử răng cưa** (xám xanh), người dùng chọn nhầm sẽ ra màu bẩn. Sửa: bỏ điểm ảnh có độ trong suốt từng phần hoặc pha lẫn (chỉ giữ điểm có alpha ≥ 250 và nằm trong cụm màu chủ đạo), và **nếu chỉ còn một sắc thì trả tối đa 2 cặp** (màu chính + một biến thể đậm / nhạt), không phải 3; thêm test với ảnh có viền khử răng cưa.
  2. **Cặp đang dùng không có trạng thái:** sau khi bấm, nút cặp không đánh dấu nào là đang chọn (AGENTS §5.6: toggle phải có `aria-pressed`). Sửa: `aria-pressed` true cho cặp vừa áp dụng, false cho các cặp khác, và nhãn nhìn thấy ghi cả hai mã hex (hoặc hai ô màu có chữ ẩn đủ), vì hiện nhãn chỉ ghi mã Primary.
- **Đã chốt (2026-11-24, ADR-041, "nâng 28"):** nâng ngân sách CSS Admin **27 → 28 kB gzip**. Việc của lượt sửa: **đổi `scripts/check-admin-bundle.mjs`** (`css: 27 * 1024` → `28 * 1024`) và dòng chú thích; docs đã cập nhật (`admin-operations.md`, `admin-ui-guidelines.md` §14). **Không** dùng phần nâng cho việc khác; vẫn không thêm CSS thừa. Văn bản gốc của mục chờ chốt:
- **Cần người vận hành chốt (ngân sách CSS Admin):** CSS Admin còn dư **1 byte** (27 647 / 27 648). Khuyến nghị **nâng 27 → 28 kB gzip**: cái giá chỉ thêm ≤ 1 kB tải ban đầu cho Admin (gói JS 92,8 / 115 vẫn dư 22 kB), lợi ích là các đề bài Admin tiếp theo (GD3-24, N10, GD3-14) không phải dừng giữa chừng; phương án thay thế là một đề bài riêng gỡ CSS chết / tách CSS preview Cover Letter, mất nhiều token hơn và vẫn chỉ hoãn được vài lần. Nếu bạn đồng ý, Claude đổi `docs/admin-operations.md` (ADR mới) và coder đổi `scripts/check-admin-bundle.mjs` ở lượt sửa.
- Kết luận: **CẦN SỬA** (không có lỗi chặn; hai mục Nên sửa phải làm trước khi tự gộp theo ADR-018; chờ quyết định ngân sách).
- **Dự báo token cho lượt sửa:** ~2 – 3 % (hai chỗ nhỏ trong `logoPalette.ts`, `themeFromLogo.ts` + test; thêm 1 dòng ngân sách nếu bạn đồng ý).

### Chỉ thị sửa (review 1, sau khi người vận hành chốt)

Làm **ba** việc trên cùng nhánh rồi chạy lại `node tools/theme-from-logo-check.mjs`, `node tools/admin-checkbox-size-check.mjs` và `verify:admin` (CSS ≤ 28 kB):

1. **Nên sửa 1:** bỏ điểm ảnh khử răng cưa / pha lẫn khi trích màu; logo một sắc trả tối đa 2 cặp; thêm test ảnh có viền khử răng cưa (logo lục một màu không còn cặp xám xanh).
2. **Nên sửa 2:** `aria-pressed` cho cặp màu đang dùng; nhãn nhìn thấy ghi cả hai mã hex (hoặc hai ô màu kèm chữ ẩn đủ).
3. **Ngân sách:** đổi `scripts/check-admin-bundle.mjs` 27 → 28 kB (ADR-041).
- **Dự báo token cho lượt sửa:** ~2 – 3 % (khoảng 2 – 4 %).

### Review 2 (2026-11-24, `29947cc`)

- **Token:** người vận hành quên ghi (lượt sửa 1); dự báo 2 – 3 %.
- **Đã đạt (đo trên dev server 5173):** `verify:admin` 47 file / **357** test, Admin CSS **27,0 / 28,0** kB, JS 92,8 / 115,0 kB; hai Nên sửa của review 1 **đúng**: logo lục tròn khử răng cưa → 2 cặp (`#00843d + #59af81`, `#00843d + #005c2b`), không còn màu xám xanh; logo chữ đen + vạch cam → 2 cặp; logo hai màu → 2 cặp hoán đổi; `aria-pressed` `true` chỉ ở cặp vừa bấm (`true,false`), nhãn nhìn thấy ghi cả hai mã.
- **Phải sửa 1 (Sổ #38 / W-37, người vận hành báo: "sắp xếp không ngay hàng thẳng lối"):** các nút cặp màu **không nằm trên lưới**: ở 1440 cặp 1 nằm **cạnh nút** "Pick colors from logo" (x = 467, y = 398) còn cặp 2 xuống hàng dưới ở x = 286 (y = 446); độ rộng khác nhau (197 / 204 / 199 / 187 px) tùy chữ. Ở 1180 và 768 (cột form 337 và 241 px) chúng xếp dọc, nhưng vẫn rộng khác nhau. Sai UI-17 / `admin-ui-guidelines` §6.3 (mọi hàng điều khiển theo lưới form). Sửa: nút "Pick colors from logo" ở **hàng riêng**; các cặp màu ở hàng bên dưới là **lưới `repeat(auto-fit, minmax(min(100%, 11.5rem), 1fr))`** (hoặc `repeat(3, minmax(0, 1fr))` khi đủ rộng, xuống 1 – 2 cột khi hẹp) có khoảng cách bằng khoảng cách của lưới form (`--admin-*`), nút cặp **rộng 100 % cột và cao bằng nhau**, mép trái / phải thẳng với khung Appearance; không `inline` tự xuống dòng; hàng gợi ý `aria-live` nằm dưới. Thêm phép **`pairs-aligned`** vào `tools/theme-from-logo-check.mjs` ở **1440, 1180, 768**: các nút cặp cùng độ rộng ±1 px trong cùng một hàng, mép trái thẳng theo cột, nằm trong khung thẻ, và nút "Pick colors from logo" không cùng hàng với cặp nào. **Mốc: FAIL** (đã đo: cặp 1 cạnh nút ở 1440). Giữ CSS Admin ≤ 28,0 kB (đang 27,0).
- **Nên sửa:** không. **Cần người vận hành chốt:** không.
- **Ghi nhận:** (1) chỉnh tay ô màu sau khi bấm một cặp thì `aria-pressed` vẫn giữ cặp cũ (coder đã ghi); chấp nhận, hoặc bỏ `pressed` khi ô màu đổi bằng tay nếu rẻ. (2) Token lượt sửa 2: dự báo **~2 %** (1 – 3 %).
- Kết luận: **CẦN SỬA** (một mục: lưới cặp màu).
