# GD3-14 — Ô "Hero tagline" (EN / VI) trong Admin › Homepage (nhóm N12)

> **Trạng thái:** CHỜ GD3-12 (giao sau khi GD3-12 gộp; độc lập với GD3-13) · **Nhánh:** `gd3/14-trang-chu-hero-tagline` (`git fetch; git switch -c gd3/14-trang-chu-hero-tagline origin/main`) · **Ngày giao:** (chưa) · **Cỡ:** Vừa (~7 file, **có migration**) · **Người đang code:** Claude — cửa sổ code (hoặc Codex)
> **Gộp (ADR-018, ADR-019):** **có migration và bước thủ công**: gộp **chỉ sau khi người vận hành chạy migration trên Supabase production** và Admin Overview báo health tốt ([docs/admin-operations.md](../admin-operations.md)); cần người vận hành duyệt.

## 1. Mục tiêu

ADR-033 (b): câu giới thiệu dưới tên ở hero trang chủ do người vận hành tự sửa trong Admin, song ngữ, thay cho hằng cứng `copy.heroTagline` của GD3-12. Bản đã publish không đổi hiển thị khi chưa sửa (giá trị mặc định chính là câu đang hiện).

## 2. Căn cứ

- ADR-033 (b); `docs/admin-ui-guidelines.md` (§6 form, §6.2 chữ dài); `docs/architecture.md` (sở hữu dữ liệu, publish); `docs/coding-conventions.md` (§5 migration, §6 test); `AGENTS.md` §5 Supabase (hàm `security definer`, E-004).
- Mô hình dữ liệu: nội dung Website lưu **theo cột** ở bảng `public.website_content` (`hero_eyebrow` …, `src/services/websiteRepository.ts` dòng ~15–60 ánh xạ hàng ↔ `WebsiteContent`, ~183 ghi hàng); bản publish là `payload` jsonb nguyên khối của `publish_website(p_version, p_payload)` (migration `202610050003_admin_consistency_phase_1_2.sql` dòng ~236–270), cũng upsert hàng nháp: **thêm trường thì phải thêm cột và cập nhật hàm**.
- Admin: `src/admin/siteWorkspace.ts` (form Homepage: `bilingual("Hero eyebrow", "hero_eyebrow", …)` ~dòng 311; đọc form ~417); `src/admin/contentValidation.ts` ~99; `src/types/website.ts`; `src/data/websiteSeed.ts`; `src/main.ts` (nguồn tagline của hero; từ GD3-12 là `copy.heroTagline`).

## 3. Phạm vi

**Làm:**

1. **Migration** `supabase/migrations/202611170001_website_hero_tagline.sql`: `alter table public.website_content add column if not exists hero_tagline jsonb;` (cho phép null: hàng cũ dùng giá trị mặc định ở mã, như `projects_page`); `create or replace function public.publish_website(...)` **giữ nguyên toàn bộ thân hàm hiện có** (kiểm `public.is_portfolio_admin()`, `security definer`, `set search_path = ''`) và chỉ thêm `hero_tagline` vào cột chèn / `content->'heroTagline'` / `on conflict … set`. `create or replace` giữ quyền EXECUTE hiện có; vẫn ghi lệnh `revoke execute … from anon` nếu migration gốc có (E-004). Nếu hàm `admin_schema_health` kiểm danh sách cột mong đợi thì thêm cột mới vào đó trong cùng migration.
2. **Kiểu và mặc định:** `WebsiteContent.heroTagline: LocalizedText` (`src/types/website.ts`); `websiteContentSeed.heroTagline` = EN "I coordinate BIM models so infrastructure gets built right, starting from the drawing." / VI "Tôi điều phối mô hình BIM để công trình hạ tầng được xây đúng ngay từ bản vẽ."
3. **Repository:** `hero_tagline` ↔ `heroTagline` ở cả hai chiều; hàng null → `structuredClone(seed.heroTagline)` (như `projectsPage`); `publishWebsite` đưa trường vào payload; test ánh xạ và payload.
4. **Admin › Homepage:** ô song ngữ "Hero tagline" (EN trước, VI sau, `bilingual(...)`) đặt ngay sau Hero eyebrow; ghi chú ngắn "Shown under your name on the homepage"; **không bắt buộc** (trống thì hero không in tagline, bố cục không vỡ); giới hạn mềm ≤ 110 ký tự mỗi ngôn ngữ (cảnh báo trong `contentValidation.ts`, không chặn lưu) để hero vừa ba dòng; không thêm chuỗi Admin ngoài ô và ghi chú này.
5. **Preview và trang công khai:** hero (`src/main.ts`) đọc `content.heroTagline` (tiếng Việt thiếu thì dùng tiếng Anh, `localize(value, lang) || localize(value, "en")`), bỏ hằng `copy.heroTagline`; preview nhúng cập nhật ngay khi gõ (đi qua đường preview sẵn có).
6. **Test:** ánh xạ hàng, giá trị mặc định khi null, payload publish có `heroTagline`, đọc form, cảnh báo độ dài, hero không in tagline khi cả EN và VI trống, escape đúng một lần.

**Không làm:** các ô hero khác; thẻ dự án (GD3-13); trang công khai ngoài hero; dữ liệu cũ (không cần backfill vì hàng null dùng mặc định).

**Ràng buộc:** không đổi quyền, không `security definer` mới; ngân sách bundle Admin (JS 115 kB, CSS 27,0 kB gzip). **Ghi ở mục 5** tên file migration và mọi file dùng chung đã đổi.

## 3b. Các bước

1. Kiểu, seed, repository + test ánh xạ.
2. Migration (viết, **chưa chạy**; người vận hành chạy sau).
3. Ô Admin, validation, preview, hero đọc từ dữ liệu + test.
4. `verify:admin` một lần; ghi vào mục 5 **bước thủ công cho người vận hành** (chạy file migration trong Supabase SQL editor rồi xem Admin Overview).

## 4. Tiêu chí nghiệm thu

- [ ] `npm run verify:admin` đạt (từ `D:\…`); bundle trong ngân sách.
- [ ] Với dữ liệu hiện có (cột null) trang chủ vẫn in câu mặc định EN / VI.
- [ ] Sửa ô Hero tagline trong Admin: preview đổi ngay; lưu nháp rồi publish thì trang công khai đổi (Claude kiểm khi review sau khi người vận hành chạy migration).
- [ ] Hàm `publish_website` sau migration vẫn từ chối người không phải admin (đọc SQL đối chiếu bản gốc: chỉ thêm cột).
- [ ] Mục 5 ghi rõ tên migration và các bước thủ công.

## 5. Báo cáo của người code

- Đã xong bước:
- Người code: · đã dùng trước / sau:
- Nhánh, commit cuối:
- File đã đổi (ghi rõ file dùng chung):
- Migration (tên file; bước thủ công cho người vận hành):
- `verify:admin`: số test đạt / tổng; bundle JS / CSS:
- Chỗ làm khác đề bài và lý do:
- Câu hỏi:

## 6. Review của Claude

- Ngày, commit đã review:
- **Phải sửa:**
- **Nên sửa:**
- **Cần người vận hành chốt:**
- Kết luận:
