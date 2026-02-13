# FEATURE: Subtitle Upload
**Version:** 1.0.0  
**Last Updated:** 2024-05-24

## 1. Mục tiêu
Cung cấp cổng vào an toàn và chính xác cho dữ liệu phụ đề.

## 2. User Interaction Flow
1. Người dùng kéo thả file hoặc click chọn file.
2. Hệ thống kiểm tra định dạng và encoding.
3. Hiển thị preview 5 dòng đầu tiên.
4. Thông báo trạng thái sẵn sàng xử lý.

## 3. UI Requirements
- Khu vực Dropzone lớn, có icon `Upload`.
- Hiển thị tên file, dung lượng sau khi chọn.
- Bảng preview nhỏ (Table) hiển thị Index, Time, Text.

## 4. Logic Requirements
- **Format:** Chỉ chấp nhận đuôi `.srt`.
- **Encoding:** Tự động nhận diện UTF-8, UTF-16, hoặc Big5.
- **Validation:** File phải có ít nhất 1 segment hợp lệ (Number -> Timestamp -> Text).

## 5. Trạng thái (State)
- `idle`: Hiển thị "Drop your file here".
- `processing`: Đang đọc file.
- `error`: "File không đúng định dạng SRT" hoặc "Dung lượng quá lớn".

## 6. Edge Cases
- File SRT rỗng.
- File có bom (Byte Order Mark).
- File bị lỗi đánh số thứ tự (nhảy số).