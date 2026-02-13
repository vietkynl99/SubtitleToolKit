FEATURE: Subtitle Upload

Version: 1.3.0
Last Updated: 2026-02-13
Changelog:
- Nâng cấp cơ chế Drag & Drop thành tương tác chính.
- Bổ sung trạng thái drag-over và visual feedback rõ ràng.
- Tích hợp Clear Project để quay về trạng thái Upload ban đầu (v1.2.0).
- Clear Project phải trigger mount lại Upload View (v1.3.0).

1. Mục tiêu
Cung cấp cổng vào an toàn, trực quan và thuận tiện cho dữ liệu phụ đề, với Drag & Drop là phương thức tương tác chính.

2. Required Behavior After Clear (v1.3.0)
Khi Clear Project hoàn tất:
- **Upload module:** Phải tự động trở thành view chính.
- **Dropzone:** Hiển thị full-width như lúc mới load trang.
- **Data:** Không hiển thị preview cũ, không hiển thị tên file cũ.
- **Focus:** Tự động scroll và focus vào vùng dropzone.

3. Logic Requirements
... (giữ nguyên các mục cũ)