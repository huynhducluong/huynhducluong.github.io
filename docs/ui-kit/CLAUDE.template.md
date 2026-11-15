# Ghi chú project

<!-- Template từ docs/ui-kit của huynhducluong.github.io. Thay mọi <…>, xóa các hàng không áp dụng. -->

<Một câu: stack, sản phẩm là gì, deploy ở đâu.> Được xây dựng trên bộ UI từ huynhducluong.github.io: renderer TypeScript không framework, các họ token CSS, tài liệu sẵn sàng để in.

## Đọc trước khi thay đổi

| Phần đang thay đổi | Đọc trước |
|---|---|
| UI back-office (`src/admin/**`, `src/styles/admin*.css`) | `docs/admin-ui-guidelines.md` |
| Trang công khai | `docs/ui-guidelines.md` §1–§5 |
| Tài liệu có thể in | `docs/ui-guidelines.md` §6–§8 |
| Mọi code, dạng dữ liệu, test hoặc migration | `docs/coding-conventions.md` |
| Kiến trúc và quyền sở hữu dữ liệu | `docs/architecture.md` |

Nếu thay đổi buộc phải phá vỡ quy tắc đã ghi, hãy cập nhật tài liệu đó trong cùng thay đổi và nêu lý do.

## Lệnh

- `npm run dev`: server phát triển.
- `npm run test:watch`: Vitest khi đang phát triển.
- `npm run verify`: typecheck, test, build<, ngân sách bundle>. Chạy trước khi hoàn tất mọi thay đổi; CI chạy cùng cổng.

## Quy tắc UI/UX bắt buộc

1. **Dùng token, không dùng literal.** Website `--color-*` / `--space-*` / `--font-*`; back office `--admin-*`; tài liệu `--document-*`. Không viết cứng giá trị đã có token bao phủ, không trộn các họ.
2. **Dùng lại renderer chung** (`src/admin/ui.ts`, toast, confirm, text prompt, dirty state, `src/site/*`, print preview). Tách ra trước bản sao thứ ba của một mẫu.
3. **Escape mọi thứ** được nội suy vào HTML (`escapeHtml`, `localize`).
4. **Nội dung bản địa hóa** là `{ <en>, <vi> }`; form hiển thị ngôn ngữ chính trước; trang đặt `<html lang>`; bản dịch thiếu dùng <en> làm dự phòng.
5. **Một hành động primary** mỗi header; hành động phá hủy nằm sau More với xác nhận danger.
6. **Accessibility là một phần của hoàn tất:** focus nhìn thấy được, tên truy cập, `aria-pressed` / `aria-expanded`, hỗ trợ đầy đủ bàn phím, alt text ảnh, chuyển động ≤150–180 ms và tắt khi reduced motion.
7. **Dùng lại breakpoint hiện có:** <liệt kê>.
8. **Tài liệu in là trang `mm` kích thước cố định** với `@page { margin: 0 }`, `overflow: hidden`, phát hiện overflow và export bằng chức năng in trình duyệt.
9. **Chỉ theme sáng** trừ khi thêm bộ token dark đầy đủ.

## Backend

<Policy secret, mô hình auth, cách đặt tên migration và quy tắc quyền. Với Supabase: không có service-role key trong frontend; hàm `security definer` kiểm tra predicate admin và thu hồi EXECUTE khỏi `anon` / `authenticated`.>

## Định nghĩa hoàn tất

1. `npm run verify` đạt.
2. Checklist guideline liên quan đạt.
3. Docs được cập nhật trong cùng thay đổi khi hành vi, quy tắc hoặc ngân sách đổi.
