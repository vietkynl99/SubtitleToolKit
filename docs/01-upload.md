FEATURE: Subtitle Upload

Version: 1.1.0
Last Updated: 2026-02-13
Changelog:

Nâng cấp cơ chế Drag & Drop thành tương tác chính.

Bổ sung trạng thái drag-over và visual feedback rõ ràng.

Chuẩn hóa hành vi khi click chọn file và kéo thả.

1. Mục tiêu

Cung cấp cổng vào an toàn, trực quan và thuận tiện cho dữ liệu phụ đề, với Drag & Drop là phương thức tương tác chính.

2. User Interaction Flow
Cách 1: Kéo thả (Primary Method)

Người dùng kéo file .srt vào khu vực Dropzone.

Khi file đi vào vùng Dropzone:

Giao diện đổi màu nền.

Viền sáng lên (highlight).

Hiển thị text: “Thả file để tải lên”.

Khi thả file:

Hệ thống chuyển sang state processing.

Kiểm tra format và encoding.

Nếu hợp lệ → hiển thị preview.

Nếu lỗi → chuyển sang state error.

Cách 2: Click chọn file (Fallback Method)

User click vào Dropzone.

Mở file picker của hệ điều hành.

Chọn file .srt.

Hệ thống xử lý tương tự như kéo thả.

Hai phương thức này phải dùng chung một luồng xử lý logic.

3. UI Requirements
Dropzone

Khu vực lớn, chiếm trung tâm màn hình khi chưa có file.

Icon Upload ở giữa.

Text chính: “Kéo thả file SRT vào đây”

Text phụ: “Hoặc click để chọn file”

Trạng thái Drag-over

Viền đổi sang màu accent.

Background sáng nhẹ.

Hiệu ứng scale nhẹ (1–2%).

Cursor chuyển sang trạng thái copy.

Sau khi chọn file

Hiển thị:

Tên file

Dung lượng

Encoding

Nút “Thay file”

Nút “Xoá file”

Preview

Hiển thị 5 segment đầu tiên:

Index

Timestamp

Text

4. Logic Requirements
Format Validation

Chỉ chấp nhận .srt

Không phân biệt hoa/thường

Encoding Detection

Tự động nhận diện:

UTF-8

UTF-16

Big5

Validation Rules

File phải có:

Ít nhất 1 segment hợp lệ:

Index (number)

Timestamp (HH:MM:SS,ms --> HH:MM:SS,ms)

Text

Nếu không đạt:

Trả về state error

Hiển thị lý do cụ thể

5. Trạng thái (State)

idle

Hiển thị Dropzone trống

drag-over

Visual highlight

processing

Spinner + “Đang đọc file…”

success

Hiển thị preview + sẵn sàng Analyze

error

Hiển thị message lỗi rõ ràng

Có nút Retry

6. Edge Cases

Kéo nhiều file cùng lúc → chỉ nhận file đầu tiên, cảnh báo người dùng.

Kéo nhầm file không phải SRT → từ chối ngay lập tức.

File quá 5MB → từ chối.

File rỗng → báo lỗi.

BOM header → tự xử lý, không báo lỗi.

File đang có project mở → yêu cầu xác nhận trước khi thay thế.