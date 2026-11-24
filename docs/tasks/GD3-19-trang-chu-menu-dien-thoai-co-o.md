# GD3-19 — Trang chủ: menu điện thoại 2 × 2 có ô viền như bảng tên bản vẽ (nhóm N17)

> **Trạng thái:** GIAO CODE (làm **sau** GD3-18, một thư mục làm việc) · **Nhánh:** `gd3/19-trang-chu-menu-dien-thoai-co-o` từ `main` · **Ngày giao:** 2026-11-24 · **Cỡ:** Nhỏ (~3 file) · **Người đang code:** Claude — cửa sổ code (hoặc Codex)
> **Gộp (ADR-018):** đổi giao diện công khai → **cần người vận hành duyệt** trước khi gộp. Không có migration.

## 1. Mục tiêu

Sổ #31 / W-30 / [ADR-038](../../decisions/ADR-REGISTER.md) (phương án A): menu 2 × 2 của GD3-15 đúng ADR-037 nhưng bốn chữ canh giữa **nổi lơ lửng**, không thấy ô. Làm thành **bốn ô nhìn thấy được**, giống bảng tên bản vẽ của hero.

## 2. Căn cứ

- `docs/ui-guidelines.md` §2.1, §2.2 (menu ô viền, quy tắc điện thoại); [UI-16, UI-17](../92-ui-rules.md) (đo **mọi nơi dùng cùng loại điều khiển**); breakpoint có sẵn 900 / 650 (không tạo mới); token `--color-*`, `--space-*`.
- **Công cụ đo:** `node tools/home-viewport-check.mjs` có phép mới `nav-cells` (mỗi ô có viền ≥ 1 px rõ, nền không trong suốt, chữ canh trái, ô kề nhau không khe). **Mốc trước khi làm: 8 FAIL** (7 điện thoại + preview 390, đều `nav-cells`: 4 ô thiếu viền, 4 ô nền trong suốt, 4 ô canh giữa, 2 cặp ô còn khe). Mục tiêu: **All PASS**; `nav-fit`, `first-screen`, `tap`, `buttons-equal`, `no-hscroll`… không xấu đi.
- Code: `src/styles/home.css` (`.site-nav__links`, `.site-nav__links li`, `.site-nav__links a`; khối ≥ 651 px chuyển menu về dòng ngang và **không đổi**).

## 3. Phạm vi

**Làm:**

1. Ở ≤ 650 px mỗi mục menu là một ô: `border` liền màu `--color-primary`, **độ dày bằng viền nút phụ của hero** (đo nút "View CV" rồi dùng cùng giá trị, ghi vào mục 5), nền `--color-surface`, chữ **canh trái** (`justify-content: flex-start`), đệm ngang `--space-3`, cao ≥ 44 px, `:hover` / `:focus-visible` thấy rõ (focus-visible không bị viền ô che).
2. Bốn ô **dùng chung đường kẻ, không khe**: lưới `gap: 0`, viền chồng nhau không thành đường đôi (ví dụ `margin: 0 -1px -1px 0` hoặc viền chỉ ở hai cạnh rồi đóng khung bằng `ul`); khung ngoài là một hình chữ nhật liền như bảng tên bản vẽ. Không giá trị cứng ngoài token; không `!important`.
3. Header không cao thêm đến mức đẩy nút chính ra khỏi màn hình đầu: `first-screen` vẫn PASS ở 320 × 568 (nếu cần giảm đệm header, **không** giảm cỡ chạm 44 px).
4. **Test CSS dương** (E-002): ô có `border` màu `--color-primary`, nền `--color-surface`, `justify-content: flex-start` ở ≤ 650 px; khối ≥ 651 px không đổi; không `!important`.
5. **Kiểm kê điều khiển (UI-17 điều 2):** mục 5 có bảng độ dày viền / bo góc / nền của mọi điều khiển có viền trên trang chủ điện thoại (nút hero, chip, ô menu, thẻ dự án) và nêu chỗ lệch kèm lý do; checklist `docs/ui-guidelines.md` §9 và `docs/92` §2 từng mục (so cạnh nút hero, ở 320, 360, 390).

**Không làm:** máy tính (≥ 651 px); nội dung menu; hamburger; đổi nút hero; migration; dependency mới.

## 3b. Các bước

1. Ô viền chung đường kẻ + `nav-cells` PASS.
2. `first-screen`, `nav-fit` PASS ở 320 × 568; xem ảnh 320, 360, 393 (đầu trang).
3. Test CSS, kiểm kê, `verify:admin` một lần, điền mục 5.

## 4. Tiêu chí nghiệm thu

- [ ] `node tools/home-viewport-check.mjs` **All PASS** (mốc 8 FAIL → 0).
- [ ] Bốn ô nhìn rõ là ô, chung đường kẻ, chữ canh trái; không cuộn ngang; `first-screen` đạt ở 320 × 568.
- [ ] Máy tính (≥ 651 px) không đổi (đo hoặc chụp 1440 để chứng minh).
- [ ] Mục 5 có bảng kiểm kê và checklist từng mục.
- [ ] `npm run verify:admin` đạt (từ `D:\…`).

## 5. Báo cáo của người code

- Đã xong bước: 1 – 3
- Người code · đã dùng trước / sau: Claude — cửa sổ code · chưa ghi token
- Nhánh, commit cuối: gd3/19-trang-chu-menu-dien-thoai-co-o (commit feat(GD3-19))
- File đã đổi (ghi rõ file dùng chung): src/styles/home.css (chỉ trong khối ≤ 650 px), src/site/homeHero.test.ts. Không file dùng chung.
- `verify:admin`: đạt (CSS Admin 27,0 / 27,0 kB; trang chủ không nằm trong ngân sách này).
- `tools/home-viewport-check.mjs` (PASS / FAIL, mốc 8 FAIL): lần chạy đầu 8 FAIL (nav-cells, 2 cặp ô còn khe do `gap` ngang của lưới cũ `--space-1`); đặt `gap: 0` → **All PASS** (`nav-fit`, `first-screen`, `tap`, `buttons-equal`, `no-hscroll` giữ PASS).
- **Bảng kiểm kê điều khiển trên trang chủ điện thoại** (`getComputedStyle`, 320 / 360 / 393 cho cùng số đo):

  | Điều khiển | Viền | Bo góc | Nền |
  |---|---|---|---|
  | Ô menu (mới) | 1 px liền `--color-primary` | 0 | `--color-surface` (trắng) |
  | Nút hero phụ ("View CV"…) | 1 px liền `--color-primary` | 5,6 px | trong suốt |
  | Nút hero chính | 1 px liền `--color-primary` | 5,6 px | `--color-primary` |
  | Công tắc ngôn ngữ (VI) | 1 px liền | 999 px (tròn) | trắng |
  | Thẻ dự án | **2 px** liền | 0 | trắng |
  | Tag công nghệ | 1 px liền (`--color-border`) | 999 px | muted |
  | Chip lọc | không có trên trang chủ hiện tại (chip chỉ hiện khi lọc có tác dụng) | | |

  Độ dày viền ô menu = viền nút phụ hero = **1 px** (đã đo). Lệch có chủ ý: bo góc 0 ở ô menu (ô chung đường kẻ như bảng tên bản vẽ; bo góc làm hở góc giữa các ô); thẻ dự án 2 px là khung bản vẽ (guideline §2); tag và công tắc ngôn ngữ tròn theo kiểu pill sẵn có.
- **Checklist giao diện từng mục (ui-guidelines §9, docs/92 §2), so cạnh nút hero:**

  §9: 1 đạt. 2 đã đo EN ở 320 – 430 px và preview 390 (`home-viewport-check`); **chưa kiểm `?lang=vi`** (nhãn menu không đổi, chỉ chiều rộng ô) và **chưa thử chỉ bằng bàn phím**; ~900 px không đổi (khối ≤ 650 px). 3 đạt: `no-hscroll` PASS ở 320 – 430 (gồm 360); không đổi alt / link. 4 – 10 không áp dụng (tài liệu, Portfolio, Admin).

  docs/92 §2: 2 đã áp UI-16, UI-17 (bảng kiểm kê). 3 trạng thái: ô menu thường, hover / `:focus-visible` (nền nhạt + `position: relative`, outline mặc định của site nằm trên viền); **chưa thử trạng thái focus bằng ảnh**. 4 dữ liệu dài: nhãn menu cố định, không áp dụng. 5 có số đo (bảng, `nav-cells`, `nav-fit`). 6 không file dùng chung. 7 không lỗi UI mới.

  So cạnh nút hero: cùng viền 1 px primary, cao ≥ 44 px (`tap` PASS), cùng hàng 2 × 2; đã xem ảnh 320 × 568 và 393 × 852: bốn ô thành khung chữ nhật liền, chữ canh trái, các nút hero ngay dưới thẳng cột với menu. Máy tính: ô menu ở 1440 vẫn `border 0 none`, nền trong suốt, `justify-content: center` (không đổi).
- Chỗ làm khác đề bài và lý do: viền chồng bằng `margin: 0 -1px -1px 0` trên `li` + `padding: 0 1px 1px 0` trên `ul` (đề bài cho phép); thêm `gap: 0` vì lưới cũ còn khe ngang. `:hover` / `:focus-visible` đổi nền nhạt `color-mix` 8 % từ `--color-primary` (cùng dạng đã dùng ở `home.css`).
- Câu hỏi:

## 6. Review của Claude

(chưa review)
