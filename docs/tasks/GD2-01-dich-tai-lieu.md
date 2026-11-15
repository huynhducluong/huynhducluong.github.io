# GD2-01 — Dịch tài liệu sang tiếng Việt

> **Trạng thái:** ĐẠT (gộp `9a6b65d`, 2026-11-15) · **Nhánh:** `gd2/01-dich-tai-lieu` (tạo từ `origin/main` mới nhất: `git fetch; git switch -c gd2/01-dich-tai-lieu origin/main`) · **Ngày giao:** 2026-11-15 · **Cỡ:** Vừa (11 file docs, không code) · **Người đang code:** Codex (token 95 %)
> **Gộp (ADR-018):** tự gộp được — chỉ đổi `docs/`, không migration, không đổi giao diện.

## 1. Mục tiêu

Dịch các tài liệu tiếng Anh có sẵn sang tiếng Việt theo ADR-017, **không đổi nội dung quy tắc**. Đề bài cũng là vòng chạy thử đầu tiên của quy trình giao → code → review.

## 2. Căn cứ

- ADR-017 (docs tiếng Việt; code, UI, tên định danh giữ nguyên).
- File: `docs/architecture.md`, `docs/coding-conventions.md`, `docs/admin-operations.md`, `docs/admin-ui-guidelines.md`, `docs/ui-guidelines.md`, `docs/cover-letter.md`, `docs/supabase-setup.md`, `docs/admin-password-login.md`, `docs/custom-smtp.md`, `docs/ui-kit/README.md`, `docs/ui-kit/CLAUDE.template.md`.

## 3. Phạm vi

**Làm:**
- Dịch toàn văn từng file trên sang tiếng Việt, câu ngắn, rõ, giọng như `AGENTS.md`.
- **Giữ nguyên tên file** và **giữ nguyên số mục** (`## 6.`, `### 8.4`…): code và test trỏ tới chúng (19 chỗ trong `src/`, `scripts/`, ví dụ `docs/ui-guidelines.md §8.4` trong `layouts.test.ts`).
- Giữ nguyên tiếng Anh: tên hàm, class CSS, token, đường dẫn, lệnh, khối code, tên trường dữ liệu, **nhãn giao diện Admin** đang hiện bằng tiếng Anh (viết "nút **Show in Portfolio**", không dịch nhãn nút), giá trị như `wide` / `landscape` / `portrait`.
- Thuật ngữ theo `MASTER_PLAN.md` §5 (Output, Profile, Ready, Draft / Release…).
- Anchor link nội bộ trong các file đổi theo tiêu đề mới; sửa mọi link trỏ vào anchor đó (kể cả trong `AGENTS.md`, `decisions/ADR-REGISTER.md`, ví dụ `architecture.md#data-ownership`) — **ngoại lệ ADR-020 của đề bài này**: được sửa link trong hai file đó, không sửa nội dung khác.

**Không làm:**
- Đổi, thêm, bỏ quy tắc; sắp xếp lại mục; "sửa cho đúng" chỗ thấy lạ → ghi vào mục 5 "Câu hỏi".
- Đụng `src/`, `scripts/`, `supabase/`, `docs/ui-kit/tokens.css`.

**Ràng buộc:** sửa file bằng công cụ Edit / Write, **không** `.Replace` trong Windows PowerShell 5.1 (chuỗi có dấu sai mã hóa mà không báo lỗi, docs/95 §5). Lưu UTF-8.

## 3b. Các bước (mỗi bước commit `wip(GD2-01 bước k): …`)

1. `architecture.md`, `coding-conventions.md`, `admin-operations.md`.
2. `ui-guidelines.md`, `cover-letter.md`.
3. `admin-ui-guidelines.md` (dài nhất, 394 dòng).
4. `supabase-setup.md`, `admin-password-login.md`, `custom-smtp.md`, `docs/ui-kit/README.md`, `docs/ui-kit/CLAUDE.template.md`.
5. Sửa link anchor; kiểm (mục 4).

## 4. Tiêu chí nghiệm thu

- [ ] Mỗi file: số tiêu đề `#`/`##`/`###` và số mục đánh số **bằng** bản gốc; số khối code ```` ``` ```` bằng bản gốc, nội dung khối code giống hệt.
- [ ] `grep -rn "§[0-9]" src scripts` — mọi `§x.y` được trỏ tới vẫn tồn tại trong file đích.
- [ ] Mọi link `](...md#...)` trong repo trỏ tới anchor có thật.
- [ ] Không còn đoạn văn tiếng Anh (trừ phần giữ nguyên ở mục 3).
- [ ] `npm run verify:admin` đạt (bảo đảm không đụng code).

## 5. Báo cáo của người code

- Đã xong bước: 1, 2, 3, 4, 5.
- Người code: Codex · token trước / sau: 95 % / không có chỉ số % khả dụng trong phiên Codex API.
- Nhánh, commit cuối: `gd2/01-dich-tai-lieu` · `9f063c0` (`wip(GD2-01 bước 5): cập nhật anchor và kiểm tra`); commit báo cáo mục 5 nối sau.
- File đã đổi: 11 file tài liệu trong mục 2; `decisions/ADR-REGISTER.md` (chỉ link anchor); file đề bài này (mục 5).
- `verify:admin`: đạt bằng `npm.cmd run verify:admin` — typecheck đạt; 29 file test / 187 test đạt; build đạt; Admin JS 92,6 / 115,0 kB gzip, CSS 26,5 / 27,0 kB gzip. Kiểm thêm: 24 link anchor hợp lệ; 15 tham chiếu mục duy nhất trong `src/`, `scripts/` vẫn tồn tại; số tiêu đề, số mục và code block của 11 file khớp bản gốc.
- Chỗ làm khác đề bài và lý do: Không.
- Câu hỏi (chỗ bản gốc mâu thuẫn / khó hiểu): Không.

## 6. Review của Claude

- Ngày, commit đã review: 2026-11-15, `a2251bf` (worktree riêng `D:\wt\pf-review`, `npm ci` sạch).
- Đã kiểm (script so `main` với nhánh, không dựa vào báo cáo):
  - `verify:admin` đạt: 29 file / 187 test, Admin JS 92,6 / 115 kB, CSS 26,5 / 27 kB gzip.
  - 11 file: số dòng, tiêu đề và số mục, danh sách, hàng bảng **khớp**; mọi khối code **giống hệt**; inline code và con số khớp (lệch duy nhất: `Adjust crops` thành **Adjust crops** theo quy ước nhãn nút; "0" thêm do dịch "zero count" thành "số đếm 0"; một `localize` thêm khi diễn đạt lại — đều đúng nghĩa).
  - 25 link anchor trong repo hợp lệ; 19 dòng `src/`, `scripts/` trỏ `docs/…§x.y` vẫn tồn tại.
  - `decisions/ADR-REGISTER.md` chỉ đổi link anchor (đúng ngoại lệ mục 3). Không đụng `src/`, `scripts/`, `supabase/`.
  - Đọc đối chiếu nghĩa: admin-ui §6.3 "Rows must not jump", §6.4, §11, ui-guidelines §8.4: đúng nghĩa, không mất ý.
- **Phải sửa:** không.
- **Nên sửa:** không.
- **Ghi nhận (không cần sửa):** bản dịch giữ nhiều thuật ngữ tiếng Anh trong câu (label, wrap, card, component, render…). Chấp nhận: là từ chuyên ngành, khớp tên trong code; nếu đọc thấy khó thì ghi W-xx để dịch lại theo cụm.
- **Cần người vận hành chốt:** không.
- Token: Codex 95 % → 61 % (~34 %, Vừa).
- Kết luận: **ĐẠT** — người vận hành duyệt gộp 2026-11-15 (lúc review: đây là đề bài **cuối GĐ 2** nên theo ADR-018 chờ người vận hành).
