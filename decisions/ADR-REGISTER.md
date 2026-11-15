# ADR REGISTER — Danh sách quyết định

> Nguồn duy nhất về trạng thái quyết định. Nhãn theo [AGENTS.md §3](../AGENTS.md#3-nhãn-trạng-thái-bộ-nhãn-duy-nhất-của-dự-án).
> Không xóa dòng. Khi thay thế: đổi trạng thái thành `[THAY ĐỔI]`, ghi "→ ADR-xxx" và lý do, thêm ADR mới.
> ADR cần lập luận dài thì tách thành `decisions/ADR-xxx-<slug>.md` và đặt link ở đây.
> **Cột "Không chọn"** ghi phương án đã cân nhắc và lý do bỏ, để không bàn lại.

## Nhập lại quyết định đã có

> ADR-001 … ADR-015 là các quyết định **đã áp dụng trong code và docs** trước khi có sổ này (lấy từ `CLAUDE.md` cũ và `docs/architecture.md`). Người vận hành chốt cả lượt ngày 2026-11-15 ("chốt hết", cùng ADR-019 … 022). Cột Ngày là ngày quyết định áp dụng, ước theo lịch sử commit.

| ID | Quyết định | Trạng thái | Ngày | Không chọn | Tài liệu |
|---|---|---|---|---|---|
| ADR-001 | Vite multi-page + TypeScript, **không UI framework**; renderer trả chuỗi HTML | `[CHỐT]` 2026-11-15 | 2026-09-25 | React / Vue: thêm bundle, không cần cho site nội dung | [coding-conventions §1](../docs/coding-conventions.md) |
| ADR-002 | Deploy GitHub Pages từ `main`; CI chạy `verify:admin` trước khi deploy | `[CHỐT]` 2026-11-15 | 2026-09-25 | | [architecture](../docs/architecture.md#admin-operational-health-and-release-gate) |
| ADR-003 | Supabase là nguồn gốc nội dung; dữ liệu bundle chỉ là seed / dự phòng khi dev | `[CHỐT]` 2026-11-15 | 2026-09-27 | | [architecture](../docs/architecture.md#data-ownership) |
| ADR-004 | Trang công khai đọc **release bất biến**; preview Admin đọc bản nháp | `[CHỐT]` 2026-11-15 | 2026-09-27 | | [architecture](../docs/architecture.md#publishing-workflow) |
| ADR-005 | **Output chọn, Profile sở hữu**: Website / CV / Portfolio không lưu bản sao hay thứ tự riêng của Profile, Project, Tool | `[CHỐT]` 2026-11-15 | 2026-10-02 | Mỗi output tự lưu bản sao: lệch nội dung giữa các output | [architecture](../docs/architecture.md#data-ownership) |
| ADR-006 | Project / Tool là thư viện gốc; `published` hiện là **Ready** = được phép chọn, không phải đã lên trang | `[CHỐT]` 2026-11-15 | 2026-10-02 | | [architecture](../docs/architecture.md#data-ownership) |
| ADR-007 | Ba họ token `--color-*` / `--admin-*` / `--document-*`, không trộn | `[CHỐT]` 2026-11-15 | 2026-09-30 | | [ui-guidelines §1](../docs/ui-guidelines.md) |
| ADR-008 | Song ngữ `LocalizedText { en, vi }`; EN bắt buộc, VI thiếu dùng EN; `?lang=vi` | `[CHỐT]` 2026-11-15 | 2026-10-04 | | [ui-guidelines §4](../docs/ui-guidelines.md) |
| ADR-009 | Chỉ theme sáng (`color-scheme: light`) | `[CHỐT]` 2026-11-15 | 2026-09-30 | Dark mode: gấp đôi việc kiểm tương phản, tài liệu in luôn sáng | [AGENTS §5.10](../AGENTS.md) |
| ADR-010 | Tài liệu in cố định A4 / A4 ngang, `@page { margin: 0 }`, phát hiện tràn; không tràn âm thầm | `[CHỐT]` 2026-11-15 | 2026-09-27 | | [ui-guidelines §6](../docs/ui-guidelines.md) |
| ADR-011 | Màu tài liệu từ `buildDocumentThemeTokens` (≥ 4.5:1); accent không làm màu chữ; không mờ chữ bằng `opacity` | `[CHỐT]` 2026-11-15 | 2026-09-27 | | [ui-guidelines §7](../docs/ui-guidelines.md) |
| ADR-012 | Admin đăng nhập Magic Link + mật khẩu; frontend chỉ có publishable key; RLS + allowlist `auth.uid()`; `security definer` kiểm `is_portfolio_admin()` và thu hồi EXECUTE của `anon` | `[CHỐT]` 2026-11-15 | 2026-09-28 | | [architecture](../docs/architecture.md#security-boundary), [E-004](../docs/91-error-bank.md#e-004) |
| ADR-013 | Ngân sách bundle Admin ban đầu: JS 115 kB, CSS 27 kB gzip | `[CHỐT]` 2026-11-15 | 2026-10-06 | | [admin-ui-guidelines §12](../docs/admin-ui-guidelines.md) |
| ADR-014 | Một hành động chính mỗi header Admin; phá hủy nằm trong More, xác nhận `tone: "danger"` | `[CHỐT]` 2026-11-15 | 2026-10-02 | | [admin-ui-guidelines §3](../docs/admin-ui-guidelines.md) |
| ADR-015 | Tài liệu gốc riêng tư (bằng cấp, chứng chỉ) chỉ ở bucket private, signed URL ngắn hạn; ảnh công khai duy nhất là crop do người vận hành tạo và bật "Show in Portfolio" | `[CHỐT]` 2026-11-15 | 2026-10-15 | | [architecture](../docs/architecture.md#media-lifecycle) |

## Quy trình làm việc (từ 2026-11-15)

| ID | Quyết định | Trạng thái | Ngày | Không chọn | Tài liệu |
|---|---|---|---|---|---|
| ADR-016 | Áp dụng quy trình nhiều Agent của BCE: Claude thiết kế / review, Codex code, cửa sổ Claude code dự phòng; một người ghi một lúc; đề bài chia bước, commit `wip`; review ba loại; sổ 91 / 92 / 93 / 95 / 96; ADR; `MASTER_PLAN` | `[CHỐT]` | 2026-11-15 | Chép nguyên BCE (`samples/`, `spikes/`, `docs/08`, chạy test 10 lần, chụp 3 DPI): không hợp dự án web, tốn token | [AGENTS §1.1](../AGENTS.md) |
| ADR-017 | Tài liệu `.md` viết **tiếng Việt**; code, UI, nội dung song ngữ, tên định danh giữ như cũ. Tài liệu tiếng Anh có sẵn dịch trong **một đề bài riêng** (GD2-01), giữ tên file và số mục | `[CHỐT]` | 2026-11-15 | Dịch cùng lúc dựng khung: diff lớn, khó review, dễ sót quy tắc | [GD2-01](../docs/tasks/GD2-01-dich-tai-lieu.md) |
| ADR-018 | Claude tự gộp + push chỉ khi: đạt sạch **và** không migration / bước tay **và** không đổi giao diện trang công khai hay PDF **và** không phải đề bài cuối giai đoạn; còn lại người vận hành duyệt. Lý do: push `main` là deploy | `[CHỐT]` | 2026-11-15 | Luôn tự gộp khi đạt sạch (như BCE ADR-138): đưa thay đổi lên web thật không qua người vận hành. Luôn chờ duyệt: chậm với đề bài nhỏ chỉ ở Admin | [AGENTS §1.1](../AGENTS.md) |
| ADR-019 | Đề bài có migration: người vận hành chạy migration trên production và kiểm health **trước** khi gộp; đề bài ghi mục "Bước thủ công" | `[CHỐT]` | 2026-11-15 | Gộp trước, chạy sau: web live lỗi trong khoảng giữa | [AGENTS §1.1](../AGENTS.md) |
| ADR-020 | Docs trước, code sau: Claude sửa tài liệu thiết kế trước khi giao; người code không sửa docs, ghi chú vận hành vào mục 5, Claude chuyển vào docs khi review. Thay quy tắc cũ "người code cập nhật docs cùng thay đổi" | `[CHỐT]` | 2026-11-15 | Người code tự sửa docs: hai Agent cùng sửa một nguồn quy tắc, review khó thấy quy tắc bị đổi | [AGENTS §1.1](../AGENTS.md) |
| ADR-021 | `docs/92` chỉ ghi lỗi → mã UI-xx → **link tới mục guideline** chứa quy tắc; quy tắc gốc vẫn ở guideline, checklist vẫn là Admin §14 / ui-guidelines §9 | `[CHỐT]` | 2026-11-15 | Chép quy tắc sang 92 như BCE: một quy tắc ở hai nơi | [docs/92](../docs/92-ui-rules.md) |
| ADR-022 | Lộ trình: GĐ 1 (dựng khung) xong; GĐ 2 chuyển quy trình + dịch tài liệu; **GĐ 3 dùng thật và sửa** theo nhóm từ sổ 92 / 93; GĐ 4 sẵn sàng công khai | `[CHỐT]` | 2026-11-15 | Thiết kế trước toàn bộ tính năng mới: chưa có dữ liệu dùng thật để biết chỗ nào cần | [MASTER_PLAN §3](../MASTER_PLAN.md) |
