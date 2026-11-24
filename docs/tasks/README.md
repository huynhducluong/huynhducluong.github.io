# Đề bài giao code (ADR-016)

> Quy trình và vai trò: [AGENTS.md §1.1](../../AGENTS.md). Mỗi đề bài một file `<GĐ>-<số>-<tên>.md`, ví dụ `GD3-01-credentials-dual-align.md`.
> Claude viết mục 1–4; người code điền mục 5; Claude ghi review vào mục 6. File là nguồn duy nhất của đề bài: đổi phạm vi thì sửa ở đây và ghi lý do.

## Trạng thái

| Trạng thái | Nghĩa |
|---|---|
| `NHÁP` | Claude đang soạn; chưa được code |
| `GIAO CODE` | Người vận hành đã duyệt; người code được làm |
| `CHỜ REVIEW` | Người code báo xong; Claude review |
| `PHẢI SỬA` | Review có mục "Phải sửa"; sửa trên cùng nhánh |
| `CHỜ DUYỆT` | Review đạt nhưng cần người vận hành duyệt gộp (ADR-018) hoặc chạy migration (ADR-019) |
| `ĐẠT` | Đã gộp vào `main` và push (= deploy) |

## Mẫu

```markdown
# <GĐ>-<số> — <tên ngắn>

> **Trạng thái:** NHÁP · **Nhánh:** `<gđ>/<số>-<tên>` (từ `main` tại `<hash>`) · **Ngày giao:** YYYY-MM-DD · **Cỡ:** Nhỏ / Vừa / Lớn · **Người đang code:** Codex / Claude — cửa sổ code
> **Gộp (ADR-018):** tự gộp được / cần người vận hành duyệt — lý do: <migration · đổi giao diện công khai / PDF · cuối giai đoạn>

## 1. Mục tiêu
<một đoạn: bước này làm gì, giải quyết dòng W-xx / UI-xx nào>

## 2. Căn cứ (chỉ làm đúng các chỗ này, đã trích đủ ở mục 3)
- ADR: … · Quy tắc: docs/…§… · Sổ: UI-xx, W-xx, E-xxx
- File liên quan: src/…

## 3. Phạm vi
**Làm:**
- …

**Không làm (để sau):**
- …

**Ràng buộc dùng chung không được đổi:** breakpoint, token, kích thước trang in, `admin-ui.css` chung, ngân sách bundle (nếu đề bài không cho); không sửa `docs/`, `decisions/`, `AGENTS.md`, `MASTER_PLAN.md`; không thêm dependency. Mọi thay đổi ở file dùng chung phải liệt kê ở mục 5.

**Phép tính chỗ** (khi có yêu cầu "không cắt", "một hàng", "thẳng hàng"): kích thước có sẵn ở màn hình / trang nhỏ nhất, tổng các phần, phần dư.

## 3b. Các bước (mỗi bước: test liên quan + commit `wip(<đề bài> bước k): …`, ghi vào mục 5)
1. …
2. …

## 3c. Bước thủ công của người vận hành (nếu có)
- Migration `supabase/migrations/…sql`: chạy trên production trước khi gộp (ADR-019); kiểm Admin Overview health.

## 4. Tiêu chí nghiệm thu
- [ ] Test Vitest: <tên test / ca bắt buộc và kết quả mong đợi>
- [ ] `npm run verify:admin` đạt **một lần ở cuối** (chạy từ `D:\`, E-006)
- [ ] Chuỗi mới có đủ EN / VI (UI chrome qua `copy`, nội dung qua `LocalizedText`)
- [ ] Giao diện: <màn hình / trang> đã chụp ở <màn hình mục tiêu / EN + VI>; checklist docs/92 §2
- [ ] …

## 5. Báo cáo của người code
- Đã xong bước: (ví dụ 1, 2, 3 — hash từng bước)
- Người code: · token trước / sau (nếu biết):
- Nhánh, commit cuối:
- File đã đổi (ghi rõ file dùng chung):
- `verify:admin`: số test đạt / tổng; bundle JS / CSS:
- Giao diện đã chụp / đo (nếu có):
- **Checklist giao diện (bắt buộc khi đổi giao diện, UI-16):** từng mục của guideline (Admin §14 / Website §9) và `docs/92` §2 là đạt / không áp dụng / không đạt, kèm số đo **so cạnh màn anh em** (ví dụ hàng Portfolio so với hàng CV) cho mọi trạng thái (bật / tắt, Draft, mở / đóng):
- Ghi chú vận hành cho docs (migration, ngân sách, quy tắc mới) — Claude chuyển vào docs:
- Chỗ làm khác đề bài và lý do:
- Câu hỏi cần người vận hành / Claude trả lời:

## 6. Review của Claude
- Ngày, commit đã review:
- **Checklist giao diện (UI-16):** Claude chạy lại **từng mục** guideline §14 / §9 và `docs/92` §2, ghi đạt / không đạt, so cạnh màn anh em:
- **Phải sửa:** …
- **Nên sửa:** …
- **Cần người vận hành chốt:** …
- Kết luận: ĐẠT / PHẢI SỬA / CHỜ DUYỆT
```

## Prompt người vận hành dán cho Codex

```text
Đọc AGENTS.md (nhất là mục 1.1) và docs/tasks/<file>.md. Làm đúng đề bài trên nhánh ghi trong đề bài.
Mỗi bước commit wip. Xong thì điền mục 5, commit, và trả lời tôi vài dòng theo mục 5. Trả lời bằng tiếng Việt.
```

Prompt sửa sau review:

```text
Đọc mục 6 (Review của Claude) trong docs/tasks/<file>.md. Sửa mọi mục "Phải sửa" trên cùng nhánh,
cập nhật mục 5, commit, và trả lời tôi vài dòng theo mục 5 mới. Trả lời bằng tiếng Việt.
```

## Chọn người code và đổi giữa chừng

Mỗi lúc **một** bên code. Trước khi dán prompt, người vận hành xem token còn lại và chọn theo **Cỡ** (Nhỏ: 1–3 file, sửa hẹp · Vừa: 4–10 file · Lớn: > 10 file, nhiều màn hình, hoặc có migration). Bảng là mốc ban đầu; Claude chỉnh theo [docs/96](../96-token-log.md).

| Codex còn | Nhỏ | Vừa | Lớn |
|---|---|---|---|
| > 50 % | Codex | Codex | Codex |
| 20 – 50 % | Codex | Codex | Claude — cửa sổ code |
| < 20 % | Codex | Claude — cửa sổ code | Claude — cửa sổ code |

**Prompt cố định cho cửa sổ Claude code** (VS Code → Terminal → New Terminal → `claude` → dán):

```text
Bạn là cửa sổ code dự phòng (AGENTS §1.1). Đọc AGENTS.md và đề bài đang "GIAO CODE" trong docs/tasks/; commit phần dở còn trong thư mục (nếu có) thành wip, rồi làm tiếp từ bước chưa xong theo mục 5; mỗi bước test + commit; xong báo theo mẫu mục 5. Trả lời và ghi báo cáo bằng tiếng Việt.
```

**Tạo nhánh đề bài:** `git fetch; git switch -c <nhánh> origin/main`.

## Giảm token

**Claude khi viết đề bài:** trích đủ vào đề bài (giá trị, quy tắc, tên test và kết quả bắt buộc) để người code khỏi đọc tài liệu chung; không bắt người code chụp đủ mọi màn hình.

**Người code:** chỉ đọc `AGENTS.md`, đề bài và đúng các mục được dẫn. Mỗi bước chạy test liên quan (`npx vitest run src/…test.ts`); `verify:admin` một lần cuối. Có sửa giao diện: chỉ chụp màn hình mình sửa (`npm run shots -- --views=… --screens=laptop`). Báo cáo ghi mục 5; chat chỉ: đã xong, commit cuối, kết quả test, chỗ làm khác, câu hỏi.

**Theo dõi token, không thêm lượt nhắn:** người vận hành ghi `token: N%` khi giao và `token sau: N%` khi báo xong; Claude ghi vào [docs/96](../96-token-log.md).

## Danh sách đề bài

| Đề bài | Tên | Trạng thái |
|---|---|---|
| [GD2-01](GD2-01-dich-tai-lieu.md) | Dịch tài liệu sang tiếng Việt | `ĐẠT` |
| [GD3-01](GD3-01-admin-sua-nhanh.md) | Admin sửa nhanh (N1: UI-10, W-02, UI-12) | `ĐẠT` |
| [GD3-02](GD3-02-credentials-khung-giay.md) | Credentials: khung tờ giấy trên nền trắng, Dual thẳng hàng (N3a: UI-11, UI-08) | `ĐẠT` |
| [GD3-03](GD3-03-credentials-layout-chon-crop.md) | Credentials: layout chọn crop, bỏ "Print as" (N3b: W-05) | `ĐẠT` |
| [GD3-04](GD3-04-card-profile-thu-gon.md) | Card Profile thu gọn, chống chữ dài tràn, việc nhỏ (N2: W-03, W-04, UI-13, UI-14) | `ĐẠT` |
| [GD3-05](GD3-05-hop-thoai-quet-chu-dai.md) | Hộp thoại đóng khi bấm ra ngoài, quét chữ dài (N5: W-07, UI-15) | `ĐẠT` |
| [GD3-06](GD3-06-preview-cap-nhat-ngay.md) | Preview cập nhật ngay, không chờ ảnh tải lười (N7: W-09) | `ĐẠT` |
| [GD3-07](GD3-07-link-video-portfolio.md) | Link "▶ Video" trong Portfolio (N6: W-08) | `ĐẠT` (gộp 2026-11-15, người vận hành duyệt) |
| [GD3-08](GD3-08-nut-len-dau-xuong-cuoi.md) | Nút lên đầu / xuống cuối trong danh sách Projects / Tools (N8: W-11) | `ĐẠT` |
| [GD3-09](GD3-09-but-chi-sua-tu-preview.md) | Bút chì "sửa ở đâu" trên preview Portfolio (N4a: W-06) | `ĐẠT` |
| [GD3-10](GD3-10-chi-tiet-portfolio-n11.md) | Chi tiết trình bày Portfolio: nút Video, số đóng góp, khung ảnh Automation, meta index, thẻ công nghệ (N11: W-12, 14, 15, 16, 20, 21) | `ĐẠT` (gộp 2026-11-15, người vận hành duyệt) |
| [GD3-11](GD3-11-chi-so-du-an-n9.md) | Chỉ số dự án: số lớn + đơn vị nhỏ (N9: W-13, 14, 17, 18) | `ĐẠT` (gộp 2026-11-15, người vận hành duyệt) |
| [GD3-12](GD3-12-trang-chu-blueprint-nen-hero.md) | Trang chủ Blueprint: nền lưới liền, hero BP2 vừa màn hình đầu, tối ưu điện thoại (N12: W-23) | `ĐẠT` (gộp 2026-11-24 cùng GD3-13) |
| [GD3-13](GD3-13-trang-chu-the-du-an-chip.md) | Trang chủ: thẻ dự án SHEET có ảnh + chip lọc (N12) | `ĐẠT` (gộp 2026-11-24 cùng GD3-12) |
| [GD3-14](GD3-14-trang-chu-hero-tagline.md) | Ô Hero tagline EN / VI trong Admin, **có migration** (N12) | `CHỜ giao` (có migration; GD3-12 và GD3-13 đã gộp) |
| [GD3-15](GD3-15-trang-chu-subgrid-menu-luoi.md) | Trang chủ: thẻ dự án subgrid, menu 2 × 2, lưới nhạt và nút hero đều nhau trên điện thoại (N13: W-27, W-28) | `ĐẠT` (gộp 2026-11-24) |
| [GD3-16](GD3-16-admin-hang-du-an-portfolio-gon.md) | Admin Portfolio: hàng dự án / công cụ gọn, công tắc cùng hàng với tên (N14: W-26) | `ĐẠT` (gộp 2026-11-24, tự gộp theo ADR-018) |
| [GD3-17](GD3-17-admin-hang-portfolio-dung-quy-tac.md) | Admin Portfolio: hàng dự án / công cụ đúng quy tắc (Draft nét đứt, chevron vuông; N15: W-29, UI-16) | `ĐẠT` (gộp 2026-11-24, tự gộp theo ADR-018) |
| [GD3-18](GD3-18-admin-o-chon-dong-bo.md) | Admin Portfolio: ô chọn "In Portfolio" 16 px đồng bộ với cả Admin, vùng bấm 24 px bằng đệm (N16: W-31, UI-17) | `ĐẠT` (gộp 2026-11-24, tự gộp theo ADR-018) |
| [GD3-19](GD3-19-trang-chu-menu-dien-thoai-co-o.md) | Trang chủ: menu điện thoại 2 × 2 có ô viền như bảng tên bản vẽ (N17: W-30, ADR-038) | `ĐẠT` (gộp 2026-11-24) |
| [GD3-20](GD3-20-trang-chu-menu-mot-hang-phang.md) | Trang chủ: menu ≤ 900 px một hàng phẳng không lướt ngang, vừa EN và VI ở 320 – 430 px (N18: W-32, ADR-039) | `ĐẠT` (gộp 2026-11-24) |
| [GD3-21](GD3-21-admin-checkbox-16px-chung.md) | Admin: mọi checkbox 16 px bằng một quy tắc chung (gồm checkbox trách nhiệm 13 px), CSS không tăng (N19: W-31, UI-17) | `ĐẠT` (gộp 2026-11-24, tự gộp theo ADR-018) |
| [GD3-22](GD3-22-trang-chu-header-dinh-sheet.md) | Trang chủ: header dính ≤ 900 px, bỏ đường kẻ, ô SHEET cả VI (N21 + N22: W-34, W-35, ADR-040) | `ĐẠT` (gộp 2026-11-24) |
| [GD3-24](GD3-24-admin-meta-hang-cat-gon.md) | Admin Portfolio: dòng meta của hàng cắt "…" có tooltip ở mọi độ rộng (stress UI-14; N23: UI-18) | `GIAO CODE` (Nhỏ; tự gộp được nếu review sạch) |
| [GD3-23](GD3-23-admin-mau-tu-logo.md) | Admin: "Lấy màu từ logo" trong Appearance (N20: W-33, ADR-040) | `CẦN SỬA` (review 2: lưới cặp màu, Sổ #38) |
