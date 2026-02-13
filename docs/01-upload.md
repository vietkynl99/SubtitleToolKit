FEATURE: Subtitle Upload

Version: 1.4.0
Last Updated: 2026-02-13
Changelog:
- Nâng cấp cơ chế Drag & Drop thành tương tác chính.
- Bổ sung trạng thái drag-over và visual feedback rõ ràng.
- Tích hợp Clear Project để quay về trạng thái Upload ban đầu (v1.2.0).
- Clear Project phải trigger mount lại Upload View (v1.3.0).
- Thêm behavior khi upload file mới trong lúc đã có project (v1.4.0).

1. Mục tiêu
Cung cấp cổng vào an toàn, trực quan và thuận tiện cho dữ liệu phụ đề, với Drag & Drop là phương thức tương tác chính.

2. Upload While Project Exists (v1.4.0)
Nếu đã có file SRT đang active và người dùng cố gắng upload file mới:
- **Trigger Condition:** `segments.length > 0` hoặc trạng thái là `success`.
- **Required Behavior:** 
    1. Hiển thị Confirmation Modal: "Bạn đang có một project đang mở. Bạn có muốn xóa file hiện tại và upload file mới không?".
    2. Hiển thị thông tin file hiện tại (Tên, số Segments) để người dùng cân nhắc.
    3. Nếu **Confirm & Upload**: Thực hiện Clear Project trước, sau đó mới tiến hành Upload và Parse file mới.
    4. Nếu **Cancel**: Đóng modal và giữ nguyên hiện trạng.

3. Required Behavior After Clear (v1.3.0)
Khi Clear Project hoàn tất:
- **Upload module:** Phải tự động trở thành view chính.
- **Dropzone:** Hiển thị full-width như lúc mới load trang.
- **Data:** Không hiển thị preview cũ, không hiển thị tên file cũ.
- **Focus:** Tự động scroll và focus vào vùng dropzone.

4. Logic Requirements
- **State Flow (Replace):** `success` → `confirm-replace` → `clearing` → `uploading` → `analyzing` → `success`.