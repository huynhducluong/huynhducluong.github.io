# Quy ước code

Cách viết code trong repository này. Tuân theo file xung quanh nếu file đó có quy định cụ thể hơn trang này.

## 1. Stack và ranh giới

- Ứng dụng Vite nhiều trang, TypeScript, không dùng UI framework. Mỗi route là một `index.html` được đăng ký trong `vite.config.ts` tại `rollupOptions.input`; thêm route mới tại đó.
- Cố ý giữ ít runtime dependency (`@supabase/supabase-js`, `cropperjs`, `@fontsource-variable/inter`). Thêm dependency cần có lý do và phải giữ `npm run check:admin-bundle` trong ngân sách.
- `tsconfig.json` dùng `verbatimModuleSyntax`, `erasableSyntaxOnly`, `noUnusedLocals`, `noUnusedParameters`. Vì vậy: dùng `import type` cho import chỉ dùng làm type; không dùng `enum`, `namespace` hoặc property trong tham số constructor; xóa code không dùng thay vì thêm tiền tố cho nó (tham số `_content` hiện có là ngoại lệ, được giữ để ổn định chữ ký).

## 2. Vai trò thư mục

| Thư mục | Chứa | Được import |
|---|---|---|
| `src/types/` | Chỉ dạng dữ liệu | không có gì ở runtime |
| `src/shared/` | Helper thuần dùng cho nhiều hơn một bề mặt (format, validation, giao thức preview, sắp xếp) | `types` |
| `src/data/` | Nội dung seed và dự phòng | `types` |
| `src/services/` | Repository Supabase (`*Repository.ts`) và cache | `types`, `shared`, `config` |
| `src/site/`, `src/pages/`, `src/main.ts` | Website công khai | `shared`, `services`, `themes`, `site`, `admin/auth` |
| `src/cv/`, `src/portfolio/`, `src/cover-letter/` | Renderer tài liệu và entry point tương ứng | `shared`, `services`, `themes`, `admin/auth` |
| `src/themes/` | Engine theme tài liệu | `types` |
| `src/admin/` | Admin CMS | mọi thứ phía trên |

Code công khai và tài liệu chỉ import `auth.ts` (`getAdminAccess`, `requireAdminAccess`, dùng cho preview Draft) từ `src/admin/`; tuyệt đối không import module UI Admin vì sẽ kéo code Admin vào bundle công khai. Chuyển helper sang `src/shared/` khi bề mặt thứ hai cần dùng. `src/shared/`, `src/themes/` và `src/types/` không import gì từ `services`, `site` hoặc `admin`.

## 3. Style

- Dùng arrow function `export const name = (…) => …`; chỉ dùng class cho utility có trạng thái (`MemoryRequestCache`).
- Dấu nháy kép, dấu chấm phẩy, thụt lề hai khoảng trắng, dấu phẩy cuối trong literal nhiều dòng.
- Tên file: `camelCase.ts`; repository kết thúc bằng `Repository`, workspace bằng `Workspace`, test là `<file>.test.ts` đặt cạnh source.
- File CSS: `kebab-case.css` theo từng bề mặt (`home.css`, `cv-screen.css`, `cv-print.css`, `admin-*.css`). Tên class theo kiểu BEM: `.block`, `.block__element`, `.block--modifier`; class Admin bắt đầu bằng `admin-`.
- Ít dùng comment; comment giải thích lý do, không giải thích code đang làm gì.
- Specificity CSS: reset cấp trang như `.portfolio-page ol { padding: 0 }` (0,1,1) ưu tiên hơn một class đơn. Khi quy tắc layout phải thắng reset hoặc quy tắc chung nằm sau, thêm tiền tố class trang (`.portfolio-page :is(...)`) thay vì thêm `!important` hoặc đổi thứ tự file.

## 4. Render HTML

- Renderer trả về chuỗi HTML và được chèn bằng `innerHTML`. Mọi giá trị động đều được escape bằng `escapeHtml`, hoặc `localize` cho `LocalizedText` (`localize` có escape). Tuyệt đối không nội suy trực tiếp nội dung từ người dùng, cơ sở dữ liệu hoặc URL.
- Escape đúng một lần tại điểm output. Không bọc `localize(...)` trong `escapeHtml` (sẽ render `&amp;` trên trang). Hàm riêng `localized` của renderer Portfolio trả về text thô và nơi gọi hàm phải escape.
- Fragment có điều kiện dùng `${cond ? `…` : ""}`; danh sách dùng `.map(...).join("")`.
- Gắn hành vi sau khi chèn bằng các hàm `bind…(root)` (`bindAdminTablists`, `bindPreviewZoom`, `bindDocumentPrintButton`). Ưu tiên thuộc tính `data-*` thay cho class khi làm hook JavaScript.
- Nội dung hiển thị cho người dùng trong UI chrome nằm trong object cục bộ `copy = { en: {...}, vi: {...} } as const`.

## 5. Dữ liệu và Supabase

- Repository ánh xạ row thành domain type bằng các hàm `…FromRow` / `toRow`; phần còn lại của ứng dụng không bao giờ thấy tên cột.
- Lượt đọc dùng chung cho nhiều workspace sử dụng `MemoryRequestCache` (TTL ngắn, khử trùng lặp request); mọi mutation gọi `set` hoặc vô hiệu hóa cache.
- Thao tác ghi nhiều hàng (publish, sắp xếp lại, Draft + bằng chứng) đi qua hàm cơ sở dữ liệu để bảo đảm transaction.
- Không bao giờ lưu URL ký hoặc đường dẫn file riêng tư trong cache, Release hoặc `localStorage`.
- Tên migration: `YYYYMMDDNNNN_snake_case.sql`; tuyệt đối không sửa migration đã áp dụng, hãy thêm migration mới. Tuân theo quy tắc `security definer` trong `CLAUDE.md`.

## 6. Test

- Vitest chạy trong môi trường Node mặc định (không DOM). Test hàm thuần và chuỗi đã render: render markup rồi assert trên HTML (xem `ui.test.ts`), đồng thời giữ code phụ thuộc DOM thật mỏng.
- Contract test đọc source bằng import `?raw` để khóa invariant như thứ tự stylesheet (`adminStyles.test.ts`) hoặc các dải chrome Portfolio (`safeArea.test.ts`). Thêm contract test khi một quy tắc dễ bị âm thầm phá vỡ. Import CSS `?raw` chỉ hoạt động vì `vite.config.ts` đặt `test: { css: true }`. Nếu thiếu, Vitest trả về chuỗi rỗng và mọi assert `not.toContain` đều đạt giả, vì vậy hãy giữ thiết lập đó và ưu tiên có ít nhất một `toContain` dương cho mỗi file CSS được test.
- Code layout cần trình duyệt phải giữ một core thuần có thể test trong Node: `countSafeAreaViolations` nhận các box thuần, còn `findPortfolioLayoutIssues` chỉ thu thập hình chữ nhật DOM và gọi core đó.
- Code chạm tới `localStorage` phải có phương án dự phòng an toàn; test assert phương án này (xem `headerDensity.test.ts`).
- Mỗi lần sửa bug phải thêm test thất bại khi chưa có bản sửa nếu logic có thể test mà không cần trình duyệt.

## 7. Commit

Dùng phong cách Conventional Commits như trong lịch sử: `feat: …`, `feat(portfolio): …`, `fix: …`, `docs: …`, `refactor: …`. Ghi mức tăng ngân sách bundle và migration mới trong phần thân commit.
