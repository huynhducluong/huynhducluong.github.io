# GD3-27 — CV và Portfolio: dòng link web kèm icon (nhóm N28)

> **Trạng thái:** GIAO CODE (làm **sau** GD3-25) · **Nhánh:** `gd3/27-link-web-trong-cv-portfolio` từ `main` · **Ngày giao:** 2026-11-28 · **Cỡ:** Vừa (~5 file) · **Người đang code:** Claude — cửa sổ code (hoặc Codex)
> **Gộp (ADR-018):** đổi đầu ra PDF và trang công khai `/cv/` → **cần người vận hành duyệt**. Không có migration.

## 1. Mục tiêu

[ADR-045](../../decisions/ADR-REGISTER.md) (Sổ #42): thêm **một dòng link chữ kèm icon nhỏ** vào CV (trang chủ, Portfolio) và Portfolio (CV, trang chủ), để người đọc PDF vào được web.

## 2. Căn cứ

- `docs/ui-guidelines.md` §6, §8 (đoạn "Link web"), §8.0 (thang chữ), §8.3 (vùng an toàn), [AGENTS §5](../../AGENTS.md) mục 3, 4, 6, 8.
- Đường công khai (vite input): trang chủ `/`, CV `/cv/`, Portfolio `/portfolio/` trên `https://huynhducluong.github.io` (dùng một hằng số / `BASE_URL` + origin, không rải chuỗi). VI thêm `?lang=vi`.
- Code: `src/cv/renderDynamicCv.ts` (đầu trang, link tel / mailto ~dòng 98; `renderCv.ts` nếu còn dùng), `src/portfolio/renderPortfolioV2.ts` (bìa; `renderClosing` ~dòng 325: classic, blue, white), CSS in `cv*.css`, `portfolio-screen.css`; token `--document-*`; mẫu link video của Portfolio (`videoLink`) để tham khảo cách đặt link trong PDF (`/URI`).

## 3. Phạm vi

**Làm:**

1. Một hàm dựng dòng link dùng chung (không tạo bản sao thứ ba): `[icon web] huynhducluong.github.io` · `[icon folder / document] Portfolio` (CV) và `CV` · trang chủ (Portfolio). Chữ nhãn qua `copy` EN / VI; icon SVG inline `aria-hidden`; `href` đầy đủ, thoát chuỗi một lần.
2. **CV:** đặt dưới tên / vai trò (trang 1), không làm tràn trang 1 và không đẩy nội dung sang trang 3 (đo với dữ liệu thật và dữ liệu dài).
3. **Portfolio:** bìa (mọi layout cover) và trang kết (classic, blue, white): vị trí đẹp, không đè ảnh / rail; ở nền màu đậm chữ theo token on-primary; không đè chrome header / footer (`findPortfolioLayoutIssues` sạch).
4. **PDF:** link thành `/URI` bấm được (kiểm như `portfolio-video-link-check`); chữ hiện đủ trên giấy.
5. **Công cụ đo mới `tools/document-web-links-check.mjs`:** dựng CV và Portfolio (mọi layout cover × closing, EN / VI) bằng trình dựng thật: có đúng link, đúng href (VI có `?lang=vi`), không tràn, `/URI` trong PDF. **Chạy trên mốc trước khi sửa, ghi số FAIL.**
6. Test thuần + snapshot cập nhật có chủ ý; checklist `ui-guidelines` §9 và `docs/92` §2 từng mục; ảnh bìa / trang kết / đầu CV.

**Không làm:** Cover Letter (đã có `portfolioUrl`); công tắc ẩn / hiện trong Admin; QR code; đổi trang chủ; migration; dependency mới.

## 4. Tiêu chí nghiệm thu

- [ ] `node tools/document-web-links-check.mjs` All PASS; không tràn, CV vẫn 2 trang, Portfolio không thêm vấn đề.
- [ ] Link bấm được trong PDF; VI dẫn tới bản VI.
- [ ] `npm run verify:admin` đạt (từ `D:\…`).

## 5. Báo cáo của người code

- Đã xong bước:
- Người code · đã dùng trước / sau:
- Nhánh, commit cuối:
- File đã đổi (ghi rõ file dùng chung):
- `verify:admin`:
- Công cụ đo (mốc FAIL trước → sau):
- **Checklist giao diện từng mục:**
- Chỗ làm khác đề bài và lý do:
- Câu hỏi:

## 6. Review của Claude

(chưa review)
