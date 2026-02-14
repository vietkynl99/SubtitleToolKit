# Subtitle Toolkit – Master Requirement

Version: 2.0.0  
Last Updated: 2026-02-14  

---

# 1. Global Layout Structure

Ứng dụng sử dụng kiến trúc Sidebar cố định kết hợp với Main Content Area:
- **Sidebar Navigation:** Chứa Menu điều hướng phẳng (Flat Menu).
- **Global File Header:** Hiển thị Metadata của file hiện tại (Tên file, số Segment, CPS trung bình, Thời lượng).
- **Control Bar (Sidebar Footer):** 
  - Nút **Clear Project**: Xóa toàn bộ trạng thái hiện tại.
  - **Global Progress Bar**: Theo dõi tiến trình các tác vụ AI dài hơi.

---

# 2. Sidebar Navigation Structure (STRICT)

Menu bắt buộc tuân thủ thứ tự chức năng sau:
1. **Upload:** Tiếp nhận file nguồn.
2. **Translation Style:** Cấu hình DNA phong cách (Genre, Tone, Humor).
3. **File Tools:** Các công cụ xử lý tệp tin (Split SRT).
4. **Editor:** Giao diện chỉnh sửa chính và Analyzer.
5. **Settings:** Cấu hình hệ thống và Dashboard thống kê API.

---

# 3. Core Logic Rules

## 3.1 Project Lifecycle
- **Active State:** Dự án được coi là active khi mảng `segments` có dữ liệu.
- **Clear Project:** Reset toàn bộ state (segments, fileName, API usage) về mặc định.
- **Replace Project:** Khi upload file mới đè lên file cũ, hệ thống phải hiển thị Modal xác nhận.

## 3.2 File Naming Standard
- Chỉ sử dụng một loại prefix duy nhất: `[EditedX]`.
- X là số lần file đã được xuất.
- Hệ thống tự động nhận diện prefix này khi upload để xác định phiên bản tệp.

---

End of file.