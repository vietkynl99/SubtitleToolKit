# FEATURE: Export Completion
**Version:** 1.0.0  
**Last Updated:** 2024-05-24

## 1. Mục tiêu
Đóng gói dữ liệu thành file SRT chuẩn.

## 2. Logic Requirements
- Tái cấu trúc file theo chuẩn: Index -> Time -> Text -> Empty Line.
- Kiểm tra chéo (Final Validation): Không có segment nào trống text, không có lỗi lồng thời gian.

## 3. UI Requirements
- Nút Export với icon `Download`.
- Dropdown chọn Encoding (UTF-8 là mặc định).
- Hiển thị thông báo "Export thành công".

## 4. Error Cases
- File đang trong quá trình xử lý AI chưa xong -> Cảnh báo người dùng.