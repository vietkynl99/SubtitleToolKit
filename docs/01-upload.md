FEATURE: Subtitle Upload

Version: 1.5.0
Last Updated: 2026-02-13
Changelog:
- Nâng cấp cơ chế Drag & Drop thành tương tác chính.
- Bổ sung trạng thái drag-over và visual feedback rõ ràng.
- Tích hợp Clear Project để quay về trạng thái Upload ban đầu (v1.2.0).
- Clear Project phải trigger mount lại Upload View (v1.3.0).
- Thêm behavior khi upload file mới trong lúc đã có project (v1.4.0).
- Upload thành công phải cập nhật Global Header (v1.5.0).

1. Mục tiêu
Cung cấp cổng vào an toàn, trực quan và thuận tiện cho dữ liệu phụ đề, với Drag & Drop là phương thức tương tác chính.

2. Required Behavior After Upload Success (v1.5.0)
Sau khi upload + parse thành công:
- **Set activeFileName:** Gán tên file gốc vào header.
- **Header Re-render:** UI Header phải tự động cập nhật thông tin file mới.
- **Clear Project:** Khi xóa project, `activeFileName` phải reset về `null` và ẩn header.
- **Replace File:** Sau khi confirm replace, header phải hiển thị tên file mới ngay lập tức.

3. Upload While Project Exists (v1.4.0)
... (giữ nguyên logic confirm modal)