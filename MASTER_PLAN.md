# PORTFOLIO PLATFORM — MASTER PLAN

> **Phiên bản:** 1.7.0 · **Cập nhật:** 2026-11-15 · **Chế độ:** `IMPLEMENTATION` — chỉ code theo đề bài `GIAO CODE` ([AGENTS.md](AGENTS.md))
> **Giai đoạn hiện tại:** **GĐ 3** (dùng thật và sửa) — bắt đầu 2026-11-15. Sổ lỗi UI/UX trên Google Docs đọc lần đầu: 8 dòng → W-02…06, UI-10…12; 4 nhóm, thứ tự chốt N1 → N3 → N2 → N4 (ADR-024). **N1 xong:** [GD3-01](docs/tasks/GD3-01-admin-sua-nhanh.md) ĐẠT, tự gộp `7c387b8`. **N3 (Credentials trong Portfolio)** tách hai đề bài: [GD3-02](docs/tasks/GD3-02-credentials-khung-giay.md) (kiểu B, ADR-025) ĐẠT, gộp `d87934f`; [GD3-03](docs/tasks/GD3-03-credentials-layout-chon-crop.md) (bỏ Print as, ADR-026) `GIAO CODE` cho cửa sổ Claude code. GĐ 2 HOÀN THÀNH 2026-11-15 (GD2-01 ĐẠT, `9a6b65d`).
> **Vai trò của file này:** mục lục + trạng thái + vấn đề mở + thuật ngữ + changelog. Chi tiết nằm trong `docs/` và `decisions/`, **không chép lại ở đây**.

## 1. Tóm tắt dự án

Nền tảng hồ sơ nghề nghiệp của một BIM Coordinator: Website công khai (song ngữ EN/VI), CV A4, Portfolio A4 ngang, Cover Letter riêng tư, cùng một Admin CMS trên Supabase chỉnh sửa tất cả. Deploy GitHub Pages từ `main`. Người vận hành vừa là chủ dự án vừa là người dùng Admin duy nhất.

## 2. Bản đồ tài liệu

Xem [AGENTS.md §9](AGENTS.md#9-bản-đồ-nguồn-tham-chiếu-mỗi-thông-tin-chỉ-có-một-chỗ-chính).

## 3. Lộ trình `[CHỐT]` 2026-11-15 (ADR-022)

| GĐ | Nội dung | Trạng thái | Kết thúc khi |
|---|---|---|---|
| **1** | Dựng khung: Website, Project / Tool, CV, Portfolio, Cover Letter, Admin CMS, publish, media, crop | **HOÀN THÀNH** (tới commit `7ffffdb`, 2026-11-15) | Đã có khung trình bày cơ bản cho mọi output |
| **2** | Quy trình làm việc: `AGENTS.md`, ADR, đề bài, các sổ 91 / 92 / 93 / 95 / 96; dịch tài liệu sang tiếng Việt (GD2-01) | **HOÀN THÀNH** 2026-11-15 (GD2-01 gộp `9a6b65d`) | ADR nhập lại được duyệt; GD2-01 ĐẠT; chạy trọn một vòng giao → code → review |
| **3** | **Dùng thật và sửa.** Người vận hành nhập nội dung thật, xuất CV / Portfolio / Cover Letter, dùng Admin hằng ngày. Chỗ vướng ghi vào [docs/93](docs/93-workflow-friction.md) (W-xx), lỗi giao diện vào [docs/92](docs/92-ui-rules.md) (UI-xx). Claude gom thành **nhóm nâng cấp** (N1, N2…), người vận hành chốt thứ tự, mỗi nhóm 1–3 đề bài | **ĐANG LÀM** từ 2026-11-15 | Hai – ba vòng liền không còn W-xx / UI-xx mức "Lỗi"; người vận hành chốt hết |
| **4** | Sẵn sàng công khai `[MỞ]`: nội dung thật đủ EN / VI, SEO và thẻ chia sẻ, hiệu năng trang công khai, kiểm PDF cuối, sao lưu Supabase | Chưa bắt đầu | Danh sách chốt ở cuối GĐ 3 |

**Cách chạy GĐ 3** (như GĐ 8b của BCE):

- Gặp vướng thì **ghi ngay** vào sổ lỗi UI/UX trên Google Docs (ADR-023, cách đọc ở [docs/93](docs/93-workflow-friction.md)) rồi nhắn Claude "đọc sổ", không sửa lẻ tẻ, trừ lỗi chặn công việc (lỗi dữ liệu, không publish được) → đề bài sửa ngay.
- Sau mỗi đợt dùng (vài ngày hoặc một hồ sơ nộp), Claude gom W-xx / UI-xx thành nhóm, xếp theo lợi ích / công sức, kèm một khuyến nghị.
- Ngoài sửa lỗi, mỗi nhóm có thể kèm **cải thiện** (cách làm tốt hơn) nếu người vận hành chốt.

## 4. Vấn đề còn mở

| # | Vấn đề | Nhãn | Ghi chú |
|---|---|---|---|
| 1 | ~~Duyệt ADR-001…015 (nhập lại) và ADR-019…022~~ | Xong | Người vận hành chốt hết 2026-11-15 |
| 2 | Nhánh cũ `feature/*` (6 nhánh) còn giữ hay xóa | `[MỞ]` | Kiểm đã gộp hết vào `main` chưa trước khi xóa |
| 3 | ~~Layout Portfolio Dual: tiêu đề credential ba dòng làm hai khung lệch nhau 4,5 mm~~ | Xong | [UI-08](docs/92-ui-rules.md#ui-08); cách sửa chốt ADR-025, làm ở GD3-02 |
| 9 | ~~ADR-026: bỏ "Print as", layout chọn crop~~ | Xong | `[CHỐT]` 2026-11-15; docs đã sửa; GD3-03 giao sau khi GD3-02 gộp |
| 4 | Danh sách việc của GĐ 4 | `[MỞ]` | Chốt cuối GĐ 3 |
| 5 | ~~Sổ lỗi UI/UX dùng chung~~ | Xong | ADR-023 |
| 6 | Ảnh minh chứng có số định danh, ngày sinh | `[GIỮ]` | [E-008](docs/91-error-bank.md#e-008): người vận hành tự quản việc công khai (2026-11-15, không cắt lại); lời nhắc trong hộp crop làm ở GD3-03; công cụ che vùng (redact) chỉ xét nếu người vận hành muốn |
| 7 | ~~Thứ tự nhóm nâng cấp GĐ 3~~ | Xong | ADR-024: N1 → N3 → N2 → N4; N1 = [GD3-01](docs/tasks/GD3-01-admin-sua-nhanh.md) |
| 8 | ~~Phiên đăng nhập cho `npm run shots`~~ | Xong | `.auth/admin.json` có 2026-11-15 |

## 5. Thuật ngữ

| Thuật ngữ | Nghĩa |
|---|---|
| Người vận hành | Chủ dự án; người duy nhất chốt quyết định và dùng Admin |
| Người code | Codex hoặc Claude — cửa sổ code, làm theo đề bài |
| Đề bài | File `docs/tasks/<GĐ>-<số>-<tên>.md`; nguồn duy nhất của một lần giao code |
| Output | Website, CV, Portfolio (và Cover Letter): nơi **chọn** nội dung từ Profile / Project / Tool |
| Profile | Professional Profile: sở hữu Experience, Education, Credentials, Skill Groups, Languages |
| Ready | Giá trị `published` của Project / Tool: được phép chọn vào output, chưa phải đã lên trang |
| Draft / Release | Bản nháp đang sửa / bản đã publish, bất biến, trang công khai đọc |
| Layout | Kiểu trình bày một họ trang Portfolio (`cover.classic`, `credentials.dual`…) |
| Crop profile | Tỉ lệ crop dùng lại: `wide` 21:9, `landscape` 4:3, `portrait` 3:4 |
| Ba màn hình mục tiêu | Laptop 1440 × 731, Monitor 2560 × ≈1300, Monitor 1920 × ≈940 (`docs/admin-ui-guidelines.md` §11) |
| W-xx / UI-xx / E-xxx | Dòng trong sổ vướng mắc (93) / quy tắc giao diện (92) / sổ lỗi (91) |

## 6. Changelog

| Phiên bản | Ngày | Thay đổi |
|---|---|---|
| 1.7.0 | 2026-11-15 | GD3-02 ĐẠT, gộp `d87934f` (người vận hành duyệt): UI-08, UI-11 đã sửa; E-008 hạ khỏi việc gấp (người vận hành tự quản); GD3-03 `GIAO CODE` cho Claude — cửa sổ code (Codex còn 27 %, cỡ Lớn) |
| 1.6.0 | 2026-11-15 | Người vận hành duyệt ADR-026 (`[CHỐT]`): docs sửa trước (ui-guidelines §8.4, admin-ui §6.4 / §7.1, architecture, admin-operations); GD3-03 đủ điều kiện giao, không migration (`preview_profile` có default) |
| 1.5.0 | 2026-11-15 | Demo N3 trên dữ liệu thật; người vận hành chọn kiểu B (ADR-025 `[CHỐT]`); ADR-026 `[ĐỀ XUẤT]`; tách N3 thành GD3-02 (Nhỏ, `GIAO CODE`) và GD3-03 (Lớn, `NHÁP`); công cụ đo `tools/portfolio-credentials-check.mjs` (mốc trước khi sửa: 2 FAIL); ui-guidelines §8.3, §8.4 sửa trước |
| 1.4.0 | 2026-11-15 | GD3-01 (N1) ĐẠT, Claude tự gộp lần đầu theo ADR-018 (`7c387b8`): UI-10, UI-12, W-02 đã sửa. UI-13 (NO TOOLTIP có từ trước) ghi mới |
| 1.3.0 | 2026-11-15 | ADR-024 (thứ tự nhóm, sổ để Viewer, dòng đã xử lý nhớ bằng mã băm, chụp đúng phạm vi, tự đối chiếu bộ quy tắc docs/92 §0.1); W-01 `GIỮ`; guideline Admin §5, §6.4, §11 sửa trước cho N1; GD3-01 `GIAO CODE` |
| 1.2.0 | 2026-11-15 | GD2-01 ĐẠT, gộp `9a6b65d`: GĐ 2 HOÀN THÀNH, GĐ 3 bắt đầu. Sổ lỗi UI/UX trên Google Docs (ADR-023, `tools/read-ui-feedback.mjs`, link trong `project-links.local`). Đọc sổ lần đầu: W-02…06, UI-10…12, E-008 (lộ thông tin cá nhân); đề xuất nhóm N1…N4 |
| 1.1.0 | 2026-11-15 | Người vận hành chốt ADR-001…015, 019…022 và lộ trình; mọi câu hỏi gửi người vận hành kèm khuyến nghị (AGENTS §4); GD2-01 `GIAO CODE` (Codex, token 95 %); W-01 đầu tiên vào docs/93 |
| 1.0.0 | 2026-11-15 | Tạo file. Áp dụng quy trình nhiều Agent từ BCE (ADR-016); docs tiếng Việt (ADR-017); quy tắc gộp vì push = deploy (ADR-018); nhập lại ADR-001…015 chờ duyệt; lộ trình GĐ 1–4 (ADR-022). Thêm `AGENTS.md`, `decisions/`, `docs/tasks/`, `docs/91`, `92`, `93`, `95`, `96`; `CLAUDE.md` chỉ còn `@AGENTS.md` |
