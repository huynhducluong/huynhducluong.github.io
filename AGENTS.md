# AGENTS.md — Quy tắc làm việc cho mọi AI Agent

> Áp dụng cho Claude Code, Codex và mọi Agent khác. `CLAUDE.md` chỉ import file này.
> Người vận hành (chủ dự án) là người duy nhất được chốt quyết định.
> Quy trình lấy từ dự án BIM Classification Engine (BCE), điều chỉnh cho dự án này ([ADR-016](decisions/ADR-REGISTER.md)).

Dự án: website portfolio Vite + TypeScript (không framework) có Admin CMS chạy trên Supabase, deploy lên GitHub Pages. Gồm Website công khai, CV A4, Portfolio A4 ngang, Cover Letter riêng tư và Admin chỉnh sửa tất cả.

## 1. Chế độ dự án hiện tại

```text
MODE = IMPLEMENTATION
Ghi chú: 2026-11-15 người vận hành chốt chuyển sang quy trình nhiều Agent (ADR-016); GĐ 2 đang làm (MASTER_PLAN §3)
```

| Chế độ | Được làm | Không được làm |
|---|---|---|
| `DESIGN_ONLY` | Phân tích, phản biện, đề xuất; sửa tài liệu khi được yêu cầu; script thử dùng một lần ngoài `src/` | Sửa `src/`, `supabase/`; chốt thay người vận hành |
| `IMPLEMENTATION` | Code **chỉ** theo đề bài `GIAO CODE` trong `docs/tasks/` | Code phần còn `[ĐỀ XUẤT]` / `[MỞ]` mà không hỏi lại |

Chỉ người vận hành đổi dòng `MODE`.

## 1.1 Vai trò các Agent và quy trình mỗi bước

| Vai trò | Agent | Được làm | Không được làm |
|---|---|---|---|
| Thiết kế, viết đề bài, review | **Claude** (phiên Claude Code chính) | Bàn và soạn thiết kế với người vận hành; sửa `docs/`, `decisions/`, `MASTER_PLAN.md`, `AGENTS.md`; viết đề bài `docs/tasks/`; review (verify, đọc diff, chụp và đo giao diện); gộp khi đạt sạch (ADR-018) | Sửa `src/`, `supabase/`, `scripts/` (lỗi tìm thấy → viết đề bài sửa); chốt thay người vận hành |
| Code | **Codex** | Code và test trong `src/`, `supabase/migrations/`, `scripts/` **đúng đề bài**; chạy `verify:admin`; báo theo mục 5 của đề bài | Sửa tài liệu thiết kế, ADR, `MASTER_PLAN.md`; tự thêm / bỏ / đổi phạm vi; làm khác thiết kế (không làm được → **dừng, báo**); gộp vào `main`; push |
| Code dự phòng | **Claude — cửa sổ code** (phiên Claude Code **riêng**: VS Code → Terminal mới → `claude`) | Như Codex, khi người vận hành giao (chọn theo bảng token, hoặc Codex dừng giữa chừng) | Như Codex; code khi Codex đang giữ nhánh; review hay gộp chính việc mình code |

```text
1. Thiết kế   người vận hành + Claude bàn, chốt; Claude sửa docs mô tả đích  → commit docs trên main
2. Giao việc  Claude viết docs/tasks/<GĐ>-<số>-<tên>.md                      → người vận hành dán prompt một dòng cho người code
3. Code       người code làm trên nhánh <gđ>/<số>-<tên>, mỗi bước commit wip, verify, báo mục 5
4. Review     người vận hành báo "xong" → Claude review trong git worktree riêng
5. Sửa        có "Phải sửa" → Claude ghi mục 6 → người code sửa trên cùng nhánh → review lại
6. Chốt       đạt sạch và đủ điều kiện ADR-018 → Claude gộp + push (= deploy); còn lại người vận hành duyệt
```

- **Một người ghi tại một thời điểm.** Trong lúc người code làm đề bài, Claude không sửa file trong thư mục repo chính; review trong `git worktree` riêng ở đường dẫn ngắn (ví dụ `D:\wt\pf-review`, chạy `npm ci` một lần mỗi worktree).
- **Docs trước, code sau (ADR-020).** Claude sửa tài liệu thiết kế (guideline, architecture, ADR) **trước khi giao**, để docs mô tả đích cần đạt. Người code không sửa docs; ghi chú vận hành phát sinh (bước migration, ngân sách bundle tăng) ghi vào mục 5 của đề bài, Claude chuyển vào docs khi review.
- **Chọn / đổi người code.** Mỗi lúc **một** bên giữ nhánh (dòng "Người đang code" của đề bài), chọn theo **Cỡ** và token còn lại ([docs/tasks/README.md](docs/tasks/README.md)). Đề bài **chia bước**; mỗi bước verify + commit `wip(<đề bài> bước k): …` và ghi "Đã xong bước" ở mục 5, để bị ngắt (hết token) chỉ mất phần dở của một bước. Đổi giữa chừng: bên nhận commit phần dở thành `wip` rồi làm tiếp. Đề bài do Claude code: khi Codex có token lại, Codex xem diff và ghi nhận xét vào mục 5 trước khi Claude review.
- **Giảm token.** Người code **chỉ đọc `AGENTS.md`, đề bài và đúng các mục đề bài dẫn**; test liên quan mỗi bước (`npx vitest run <file>`), `verify:admin` **một lần** ở cuối; chỉ chụp màn hình mình sửa. Kiểm nặng (chạy lại nhiều lần, chụp đủ ba màn hình, đo dữ liệu dài) do Claude làm khi review. Báo cáo ghi trong file, chat vài dòng. Theo dõi: [docs/96](docs/96-token-log.md).
- **Nhánh:** mỗi đề bài một nhánh từ `main`; `main` chỉ chứa thứ đã review. Không force push. **Push `main` là deploy ra web thật** (CI chạy `verify:admin` rồi đẩy GitHub Pages).
- **Gộp (ADR-018).** Claude tự gộp (`--no-ff`) và push chỉ khi đủ **cả bốn**: review không còn "Phải sửa", "Nên sửa" chưa làm hay "Cần người vận hành chốt"; đề bài **không có migration** hay bước thủ công; **không đổi giao diện** trang công khai hoặc PDF (CV, Portfolio, Cover Letter); không phải đề bài cuối giai đoạn. Thiếu một điều → chờ người vận hành duyệt.
- **Migration (ADR-019).** Đề bài có migration: gộp chỉ sau khi người vận hành đã chạy migration trên Supabase production và Admin Overview báo health tốt ([docs/admin-operations.md](docs/admin-operations.md)).
- **Kết quả review** chia ba loại: **Phải sửa** (sai thiết kế, thiếu / sai test, lỗi, vi phạm quy tắc §5) · **Nên sửa** (chất lượng, quy tắc giao diện) · **Cần người vận hành chốt** (làm khác thiết kế, quy tắc mới).

## 2. Đọc gì trước khi làm

> Mục 2.1 dành cho Claude thiết kế / review. Người code chỉ đọc theo mục 1.1 (đề bài đã trích đủ).

### 2.1 Bối cảnh

1. [MASTER_PLAN.md](MASTER_PLAN.md): trạng thái, giai đoạn đang làm, vấn đề mở.
2. [decisions/ADR-REGISTER.md](decisions/ADR-REGISTER.md): mọi quyết định và trạng thái.
3. [docs/91-error-bank.md](docs/91-error-bank.md): sai lầm đã gặp, để không lặp lại.
4. [docs/92-ui-rules.md](docs/92-ui-rules.md): lỗi giao diện → quy tắc UI-xx; đọc trước khi sửa giao diện.
5. [docs/93-workflow-friction.md](docs/93-workflow-friction.md): chỗ rườm rà người vận hành gặp khi dùng thật; đọc trước khi thiết kế thao tác mới.

### 2.2 Theo phần đang sửa

| Đang sửa | Đọc trước |
|---|---|
| `src/admin/**`, `src/styles/admin*.css` | `docs/admin-ui-guidelines.md` |
| Website công khai (`src/main.ts`, `src/pages/`, `src/site/`, `home.css`, `content.css`, `global.css`) | `docs/ui-guidelines.md` §1–§5 |
| Render CV, Portfolio, Cover Letter hoặc CSS in | `docs/ui-guidelines.md` §6–§8, `docs/cover-letter.md` |
| Layout Portfolio (`src/portfolio/`, `portfolio-screen.css`) | `docs/ui-guidelines.md` §8.1–§8.4 (lưới trang, chrome, vùng an toàn, quy tắc nội dung) |
| Màu tài liệu hoặc `src/themes/` | `docs/ui-guidelines.md` §7 |
| TypeScript, dạng dữ liệu, test, migration | `docs/coding-conventions.md` |
| Sở hữu dữ liệu, publish, preview, media | `docs/architecture.md` |
| Migration, health check, ngân sách bundle | `docs/admin-operations.md` |
| Dùng lại UI này cho dự án khác | `docs/ui-kit/README.md` |

Quy tắc trong tài liệu phải đổi → sửa tài liệu đó **trong cùng thay đổi** (do Claude, ADR-020) và ghi lý do.

Không dựa vào trí nhớ hội thoại hay memory riêng của Agent. File trong Git là nguồn tham chiếu duy nhất.

## 3. Nhãn trạng thái (bộ nhãn duy nhất của dự án)

| Nhãn | Tương đương | Ý nghĩa | Agent được phép |
|---|---|---|---|
| `[CHỐT]` | APPROVED | Người vận hành đã xác nhận | Tuân thủ; chỉ được nêu xung đột, không tự đổi |
| `[ĐỀ XUẤT]` | PROPOSED | Đang thảo luận | Phân tích, phản biện, đề xuất thay thế |
| `[MỞ]` | OPEN | Chưa có phương án | Nêu rõ vấn đề trước khi làm phần phụ thuộc |
| `[THAY ĐỔI]` | SUPERSEDED | Bị quyết định mới thay thế | Giữ nguyên lịch sử; ghi lý do và trỏ tới quyết định mới |

Thuộc tính đi kèm: `[CẦN KIỂM THỬ]` — đã chốt thiết kế nhưng chưa nghiệm thu.

**Agent không bao giờ tự gán `[CHỐT]`.** Chỉ ghi `[CHỐT]` khi người vận hành nói rõ đồng ý, và ghi ngày chốt.

## 4. Quy trình cho mỗi chủ đề thiết kế

1. **Yêu cầu:** người vận hành nêu chủ đề (hoặc một dòng W-xx / UI-xx tới lượt).
2. **Phân tích:** Claude đọc tài liệu (mục 2), kiểm tra xung đột với ADR, xem code và giao diện thật, rồi đưa phương án kèm **một khuyến nghị**.
3. **Quyết định:** người vận hành chốt, sửa, hoặc hoãn.
4. **Cập nhật tài liệu:** tài liệu chuyên đề + ADR + bảng trạng thái và changelog trong `MASTER_PLAN.md`.
5. **Review nhất quán:** checklist mục 7.
6. **Commit:** mỗi quyết định một commit (mục 8), rồi viết đề bài nếu cần code.

Mỗi đề xuất phải nêu: tác động tới Website / CV / Portfolio / Cover Letter / Admin / Supabase; phương án đã cân nhắc và lý do không chọn; **một khuyến nghị rõ ràng**; bằng chứng (ảnh, số đo, file và dòng cụ thể). **Mọi câu hỏi gửi người vận hành** (kể cả câu hỏi ngắn cuối tin nhắn, câu hỏi trong báo cáo mục 5) theo mẫu: ví dụ cụ thể → các phương án → **khuyến nghị chọn phương án nào và vì sao** (lợi ích, rủi ro, cái giá của phương án bỏ) → mẫu trả lời ngắn. Không hỏi trống "bạn muốn A hay B?" (người vận hành nhắc 2026-11-15).

## 5. Quy tắc bắt buộc về code và UI/UX

Đây là các quy tắc hay bị vi phạm nhất; bản chi tiết ở các tài liệu mục 2.2. Vi phạm một quy tắc là mục **Phải sửa** khi review.

1. **Token, không giá trị cứng.** Website dùng `--color-*`, `--space-*`, `--font-*`, `--radius-*` (`src/styles/tokens.css`). Admin dùng `--admin-*` (`admin-ui.css`, `admin-typography.css`). Tài liệu dùng `--document-*` từ `src/themes/documentThemes.ts`. Không viết cứng giá trị đã có token, không trộn ba họ token.
2. **Dùng lại renderer chung.** Admin: `src/admin/ui.ts`, `confirmAdmin`, `requestAdminText`, `showAdminToast`, `setAdminDirty`. Website: `src/site/shell.ts` (`siteHeader`, `siteFooter`) và `src/site/renderers.ts` (card, tag, media). Tài liệu: `src/shared/documentPrintPreview.ts`. Tách ra module chung trước khi một mẫu có bản sao thứ ba.
3. **Escape mọi thứ.** HTML dựng bằng template string; mọi giá trị động đi qua `escapeHtml` hoặc `localize` (`src/shared/format.ts`), đúng một lần.
4. **Song ngữ EN/VI.** Nội dung dùng `LocalizedText { en, vi }`; form hiện EN trước, VI sau. Trang công khai đọc `?lang=vi` và đặt `document.documentElement.lang`. Tiếng Anh bắt buộc, tiếng Việt thiếu thì dùng tiếng Anh.
5. **Một hành động chính** mỗi header Admin (`admin-action-publish`); hành động phá hủy nằm trong More và xác nhận với `tone: "danger"`.
6. **Accessibility là một phần của "xong".** `:focus-visible` thấy rõ, tên truy cập cho nút icon, `aria-pressed` / `aria-expanded` cho toggle, dùng được bằng bàn phím, `alt` cho ảnh, chuyển động ≤ 150 ms (Admin) / 180 ms (website) và tắt khi `prefers-reduced-motion`.
7. **Dùng lại breakpoint có sẵn.** Không tạo độ rộng mới (danh sách trong từng guideline).
8. **Tài liệu in có kích thước cố định.** A4 (210 × 297 mm) cho CV và Cover Letter, A4 ngang (297 × 210 mm) cho Portfolio, với `@page { margin: 0 }`, `overflow: hidden` và phát hiện tràn. Nội dung không bao giờ âm thầm tràn trang hay lấn vào dải header / footer (`findPortfolioLayoutIssues`).
   - Layout Portfolio bám token lưới trang `--pf-*`. Header và footer không bao giờ nằm trên rail màu (rail khai báo `--pf-rail-left/right`), không bao giờ hiện mã layout.
   - Mọi chuỗi in ra được dịch qua `copy` (không tiếng Anh trong PDF tiếng Việt). Giá trị không biết thì bỏ, không in "—". Một thông tin không in hai lần trên một trang.
   - Màu tài liệu lấy từ `buildDocumentThemeTokens` (bảo đảm 4.5:1). Không dùng accent làm màu chữ, không làm mờ chữ bằng `opacity`.
9. **Output chọn, Profile sở hữu.** Website / CV / Portfolio không lưu bản sao hay thứ tự riêng của nội dung Profile, Project, Tool dùng chung (`docs/architecture.md`).
10. **Chỉ theme sáng.** Mọi bề mặt khai báo `color-scheme: light`; không thêm quy tắc dark mode lẻ tẻ.

**Supabase.** Không đưa secret hay service-role key vào frontend. Hàm `security definer` mới phải kiểm `public.is_portfolio_admin()` (hoặc chỉ cho service-role) và thu hồi rõ EXECUTE khỏi `anon` (và `authenticated` khi là hàm nội bộ), vì Supabase mặc định cấp EXECUTE cho các vai trò đó ([E-004](docs/91-error-bank.md#e-004)). Migration mới đặt tên `supabase/migrations/YYYYMMDDNNNN_snake_case.sql` và được liệt kê trong `docs/admin-operations.md` khi cần bước tay.

## 6. Điều cấm

- Đổi quyết định `[CHỐT]` khi chưa có xác nhận; xóa lịch sử quyết định.
- Đánh dấu một bước là xong khi chưa có tiêu chí nghiệm thu; ghi "đã kiểm" khi mới chỉ đọc code.
- Đưa vào Git: secret, service-role key, `.auth/`, ảnh chụp có dữ liệu riêng tư (`tmp/`), tài liệu gốc riêng tư (bằng cấp, chứng chỉ).
- Lặp một nội dung ở nhiều nơi. Mỗi thông tin chỉ có một chỗ chính (mục 9), chỗ khác trỏ link.
- Code ngoài đề bài `GIAO CODE`; gộp hoặc push `main` khi chưa đủ điều kiện mục 1.1.
- Gộp đề bài có migration khi migration chưa chạy trên production.

## 7. Checklist review nhất quán

- [ ] Nội dung mới có mâu thuẫn ADR `[CHỐT]` nào không?
- [ ] Có ghi `[CHỐT]` cho thứ người vận hành chưa duyệt không?
- [ ] Thuật ngữ khớp phần Thuật ngữ trong `MASTER_PLAN.md`?
- [ ] Bảng trạng thái, changelog, phiên bản trong `MASTER_PLAN.md` đã cập nhật?
- [ ] Lỗi / sai giả định mới đã ghi vào `docs/91`? Lỗi giao diện mới đã thành UI-xx trong `docs/92`?
- [ ] Có sửa giao diện: đã chạy checklist `docs/92` §2?
- [ ] Có điểm dùng được cho dự án khác: đã thêm vào `docs/95`?

## 8. Quy ước commit

Tóm tắt tiếng Việt; mã đề bài làm phạm vi khi có.

```text
docs(<chủ đề>): <tóm tắt>         ví dụ: docs(quy-trinh): áp dụng quy trình nhiều Agent
feat(<đề bài>): <tóm tắt>         ví dụ: feat(GD3-02): đếm "đã chọn" trong thư viện CV
fix(<đề bài hoặc phần>): <tóm tắt> ví dụ: fix(portfolio): khung minh chứng theo tỉ lệ 4:3
wip(<đề bài> bước k): <tóm tắt>   chỉ trên nhánh đề bài
refactor(...) · chore: …
```

Thân commit ghi lý do, ngân sách bundle tăng, migration mới, và kết quả đã kiểm. Kết thúc bằng dòng `Co-Authored-By` của Agent nếu có.

## 9. Bản đồ nguồn tham chiếu (mỗi thông tin chỉ có một chỗ chính)

| Thông tin | Nơi duy nhất |
|---|---|
| Trạng thái, lộ trình, vấn đề mở, thuật ngữ, changelog | `MASTER_PLAN.md` |
| Danh sách quyết định ADR | `decisions/ADR-REGISTER.md` |
| Quy tắc làm việc của Agent, quy tắc bắt buộc | `AGENTS.md` (file này) |
| Đề bài, báo cáo của người code, kết quả review | `docs/tasks/` (mẫu: `docs/tasks/README.md`) |
| Kiến trúc, sở hữu dữ liệu, publish, media, bảo mật | `docs/architecture.md` |
| Quy ước code, test, thư mục | `docs/coding-conventions.md` |
| Vận hành: migration, health, ngân sách bundle | `docs/admin-operations.md` |
| Quy tắc UI Admin, màn hình mục tiêu, checklist Admin | `docs/admin-ui-guidelines.md` |
| Quy tắc UI Website và tài liệu in, checklist | `docs/ui-guidelines.md` |
| Cover Letter | `docs/cover-letter.md` |
| Thiết lập Supabase, đăng nhập Admin, SMTP | `docs/supabase-setup.md`, `docs/admin-password-login.md`, `docs/custom-smtp.md` |
| Bộ UI dùng lại cho dự án khác | `docs/ui-kit/` |
| Lỗi / sai giả định đã gặp | `docs/91-error-bank.md` |
| Lỗi giao diện → quy tắc UI-xx | `docs/92-ui-rules.md` (quy tắc gốc vẫn ở guideline, ADR-021) |
| Vướng mắc khi người vận hành dùng thật | `docs/93-workflow-friction.md` |
| Kinh nghiệm dùng lại cho dự án khác | `docs/95-reusable-playbook.md` |
| Theo dõi token mỗi lần giao code | `docs/96-token-log.md` |

## 10. Lệnh

- `npm run dev` — Vite dev server.
- `npm run test:watch` — Vitest khi đang code.
- `npm run verify:admin` — typecheck, test, build, ngân sách bundle Admin. Chạy trước khi báo xong; CI chạy đúng cổng này trước khi deploy.
- `npm run shots` — chụp Admin ở ba màn hình mục tiêu (`docs/admin-ui-guidelines.md` §11).
- **Windows:** chạy lệnh từ thư mục có ổ đĩa **viết hoa** (`D:\…`). Từ `d:\…` mọi file test lỗi `Cannot read properties of undefined (reading 'config')` ([E-006](docs/91-error-bank.md#e-006)).

## 11. Định nghĩa "xong"

1. `npm run verify:admin` đạt.
2. Checklist guideline liên quan đạt (Admin §14, `docs/ui-guidelines.md` §9) và checklist `docs/92` §2 khi có giao diện.
3. Docs cập nhật cùng thay đổi khi hành vi, quy tắc, migration hay ngân sách đổi (Claude làm, ADR-020).
