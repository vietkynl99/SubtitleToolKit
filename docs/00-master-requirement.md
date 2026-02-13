# Subtitle Toolkit – Master Requirement

Version: 1.7.0  
Last Updated: 2026-02-13  

---

# 1. Global Layout Structure

Ứng dụng bao gồm:

- Sidebar Navigation Menu
- Global File Header
- Clear Project Button
- Global Progress Bar
- Main Content Area

---

# 2. Sidebar Navigation Structure (CRITICAL – DO NOT MERGE)

Menu phải có cấu trúc PHẲNG (flat structure).

Không có menu lồng nhau.

Thứ tự bắt buộc:

1. Upload
2. Translation Style
3. File Tools
4. Editor
5. Settings

---

# 3. Translation Style

Translation Style là một menu độc lập.

❌ Không nằm trong File Tools  
❌ Không phải là tab của File Tools  
❌ Không được render chung container với Split SRT  

Khi click:

→ Render nội dung của Translation Style module

---

# 4. File Tools

File Tools là một menu độc lập.

Hiện tại File Tools chỉ chứa 1 công cụ:

- Split SRT

Trong trang File Tools:

- Hiển thị tiêu đề: "File Tools"
- Bên dưới hiển thị tool: Split SRT

Không được hiển thị Translation Style ở đây.

---

# 5. Clear Current Project Position

Clear Project:

- Không nằm trong Sidebar Menu
- Không phải là 1 menu item

Vị trí:

- Nằm phía trên Progress Bar
- Hiển thị khi projectState != idle

---

# 6. Navigation Rules (Strict)

Mỗi menu:

- Có route riêng
- Có component riêng
- Không share layout content

Sai cấu trúc nếu:

- Translation Style và Split SRT chung 1 container
- Hoặc File Tools có tab Translation Style

---

# 7. Route Mapping Example

/upload  
/translation-style  
/file-tools  
/editor  
/settings  

---

# 8. Không được làm

❌ Không lồng Translation Style vào File Tools  
❌ Không tạo tab chung giữa 2 module  
❌ Không render conditional tab trong cùng 1 page  

Cấu trúc phải tách biệt hoàn toàn.

---

End of file.