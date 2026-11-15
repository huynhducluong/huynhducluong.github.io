# GD2-01 — Dịch tài liệu sang tiếng Việt

> **Trạng thái:** GIAO CODE · **Nhánh:** `gd2/01-dich-tai-lieu` (tạo từ `origin/main` mới nhất: `git fetch; git switch -c gd2/01-dich-tai-lieu origin/main`) · **Ngày giao:** 2026-11-15 · **Cỡ:** Vừa (11 file docs, không code) · **Người đang code:** Codex (token 95 %)
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

- Đã xong bước:
- Người code: · token trước / sau:
- Nhánh, commit cuối:
- File đã đổi:
- `verify:admin`:
- Chỗ làm khác đề bài và lý do:
- Câu hỏi (chỗ bản gốc mâu thuẫn / khó hiểu):

## 6. Review của Claude

- Ngày, commit đã review:
- **Phải sửa:**
- **Nên sửa:**
- **Cần người vận hành chốt:**
- Kết luận:
