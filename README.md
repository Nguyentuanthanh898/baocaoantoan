# Báo cáo hành vi và điều kiện không an toàn (mã nguồn mở)

Trang web gửi báo cáo **không cần đăng nhập** (mở link hoặc quét QR là gửi, có chụp ảnh) và trang quản trị riêng để xử lý.
Giao diện là HTML tĩnh; dữ liệu lưu ở Supabase (mã nguồn mở, PostgreSQL). Giấy phép MIT.

| File | Việc |
|---|---|
| `index.html`, `app.js` | Trang công khai: gửi báo cáo, xem thống kê chung (không lộ nội dung) |
| `admin.html`, `admin.js` | Quản trị: đăng nhập, lọc, đổi trạng thái, ghi chú xử lý, xem ảnh, xóa, tải CSV |
| `config.js` | Địa chỉ Supabase, tên nhà máy, danh sách khu vực |
| `supabase/schema.sql` | Bảng dữ liệu, phân quyền (RLS), kho ảnh riêng tư |

## Cài đặt (khoảng 20 phút)

1. **Tạo dự án Supabase.** Vào supabase.com, tạo project (chọn vùng gần nhất, ví dụ Singapore).
2. **Tạo cấu trúc dữ liệu.** SQL Editor > New query > dán toàn bộ `supabase/schema.sql` > Run.
3. **Tắt đăng ký tự do.** Authentication > Sign In / Providers > Email: tắt "Allow new users to sign up".
4. **Tạo tài khoản quản trị.** Authentication > Users > Add user (email và mật khẩu mạnh). Sau đó chạy trong SQL Editor, thay email của bạn:
   `insert into public.admins (email) values ('email-admin@congty.vn');`
   Chỉ email nằm trong bảng `admins` mới xem và sửa được báo cáo.
5. **Điền `config.js`.** Project Settings > API: chép `Project URL` vào `SUPABASE_URL`, khóa `anon public` vào `SUPABASE_ANON_KEY`. Không bao giờ dùng khóa `service_role` trong thư mục này. Sửa `AREAS` cho đúng khu vực nhà máy.
6. **Đưa lên mạng (chọn một).**
   - GitHub Pages: tạo repository, tải toàn bộ file lên, Settings > Pages > Deploy from branch (main, thư mục root). Link dạng `https://tên.github.io/tên-repo/`.
   - Máy chủ nội bộ: chép thư mục lên web server bất kỳ (nginx, IIS). Cần HTTPS để chụp ảnh ổn định. Nếu mạng nhà máy chặn internet ngoài, tải sẵn file `supabase.js` về cùng thư mục và đổi thẻ `<script>` trong 2 file HTML.
7. **Tạo mã QR** cho link `index.html` bằng công cụ QR bất kỳ, in dán tại cổng, canteen, khu vực sản xuất.
8. **Chạy thử:** gửi 1 báo cáo có ảnh từ điện thoại (không đăng nhập), vào `admin.html`, đăng nhập, kiểm tra thấy báo cáo, đổi trạng thái, xem ảnh, tải CSV.

## Bảo mật và vận hành

- Người ngoài chỉ **thêm** được báo cáo (kiểm tra độ dài, trạng thái ban đầu cố định). Họ không đọc, sửa, xóa được báo cáo của ai; ảnh nằm trong kho riêng tư, chỉ admin xem qua link tạm 10 phút.
- Khóa `anon` công khai là bình thường; an toàn nhờ các quy tắc RLS trong `schema.sql`. Đừng tắt RLS.
- Chống spam hiện có: ô bẫy bot ẩn, giãn cách 20 giây mỗi lần gửi trên mỗi thiết bị. Chưa chống được kẻ cố tình spam bằng script. Nếu bị, thêm Cloudflare Turnstile hoặc hCaptcha vào form.
- Cột "Người báo" là họ tên người dùng tự nhập hoặc để trống; hãy thông báo cho công nhân biết có thể báo ẩn danh.
- Gói miễn phí Supabase có thể tự tạm dừng khi không có hoạt động vài ngày: kiểm tra chính sách hiện hành, hoặc dùng gói trả phí cho hệ thống chạy lâu dài. Tải CSV định kỳ để lưu dự phòng.
- Dữ liệu nằm trên cloud của Supabase. Nếu công ty yêu cầu lưu nội bộ, Supabase có bản tự cài (Docker); mã này dùng được nguyên vẹn, chỉ đổi `SUPABASE_URL`.

## Tùy biến

- Khu vực: sửa `AREAS` trong `config.js`. Loại báo cáo và mức độ cố định trong `schema.sql` (ràng buộc `check`), muốn đổi phải sửa cả hai nơi.
- Màu sắc và giao diện: `style.css` (tự chuyển sáng/tối theo máy).
