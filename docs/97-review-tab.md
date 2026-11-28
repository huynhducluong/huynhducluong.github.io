# 97 — Nghiệm thu một tab của Career Hub (ADR-046, chốt 2026-11-28)

> Mục đích: biết khi nào một tab (CV, Portfolio, Cover Letter, Homepage…) **đạt**, không cần sửa gì nữa. Khác checklist `admin-ui-guidelines` §14 / `ui-guidelines` §9 (kiểm từng thay đổi code): đây là kiểm **cả tab trên dữ liệu thật**.

## 1. Cách dùng

- Mỗi mục ghi **Đạt / Không đạt / Không áp dụng** kèm **bằng chứng** (số đo, công cụ, ảnh trong `tmp/` không vào Git, hoặc xác nhận của người vận hành).
- **Claude** đo; **Bạn** (người vận hành) xác nhận mục đánh dấu "Bạn".
- **Tab ĐẠT** khi nhóm 1 – 5 và 8 đạt hết, nhóm 6 – 7 được người vận hành xác nhận. Ghi vào bảng kết quả §4 kèm ngày và commit.
- Sau khi đạt, thay đổi nào chạm tab chỉ mở lại **nhóm bị chạm**.
- Mục không đạt → dòng W-xx trong `docs/93` và đề bài; không sửa trong lúc review.

## 2. Tiêu chí chung

| # | Nhóm | Kiểm gì | Ai |
|---|---|---|---|
| 1 | Admin khớp đầu ra | Mọi trường / lựa chọn của tab hiện đúng trong preview và đầu ra (trang công khai hoặc PDF), kể cả bật / tắt và số đếm; thứ tự theo Profile / thư viện; Save draft → tải lại còn nguyên; đầu ra công khai chỉ đổi khi Publish | Claude |
| 2 | Bản in / trang công khai | Tài liệu: đúng khổ và số trang, không tràn, không trang trắng, lề đúng, chữ bôi chọn được, link bấm được, dấu tiếng Việt đúng, thử dữ liệu dài. Website: ma trận màn hình §2.2, không cuộn ngang | Claude |
| 3 | Font, màu, kích thước | Chỉ dùng token chung (§8.0 / tokens), không giá trị cứng; tương phản ≥ 4,5 : 1 với theme sáng, tối và màu từ logo | Claude |
| 4 | UI/UX trong Admin | `admin-ui-guidelines` §14 từng mục; ba màn hình mục tiêu và 1180, 768; bàn phím; hàng không lệch (`shots --stress`) | Claude |
| 5 | EN và VI | Bản VI không sót tiếng Anh, ngày tháng đúng định dạng, giá trị thiếu thì bỏ (không in "—") | Claude |
| 6 | Nội dung | Chính tả, thì câu nhất quán, không còn chữ giữ chỗ, không lặp thông tin, liên hệ đúng, ảnh đúng dự án | **Bạn** |
| 7 | Người tuyển dụng và máy đọc (ATS) | Copy chữ từ PDF ra theo thứ tự hợp lý; tên và liên hệ ở đầu; tên file tải về rõ ràng; đọc lướt 30 giây thấy được vai trò và điểm mạnh | Claude đo, **Bạn** duyệt |
| 8 | Riêng tư và ổn định | Không lộ thông tin riêng / dữ liệu Admin trên trang công khai; không lỗi console; mất mạng báo lỗi rõ, không mất bản nháp | Claude |

## 3. Mục riêng theo tab

### 3.1 CV (làm trước)

- Đúng **2 trang A4** (`.cv-page`), không `.cv-page--overflow`, không báo "PDF export needs attention".
- Tab **Profile, Background, Projects & tools, Appearance**: Off / Compact / Detailed của dự án khớp bản in; số trách nhiệm đã chọn khớp; theme preset, Custom và màu từ logo khớp.
- Trang công khai `/cv/` khớp bản đã publish, EN và `?lang=vi`.
- Link điện thoại, email và link web (ADR-045) bấm được trong PDF.

### 3.2 Portfolio, 3.3 Cover Letter, 3.4 Homepage / Website

Bổ sung khi tới lượt (giữ tiêu chí chung; thêm mục riêng của tab).

## 4. Kết quả nghiệm thu

| Ngày | Tab | Commit | Nhóm không đạt | Kết luận |
|---|---|---|---|---|
| | CV | | | chưa review |
