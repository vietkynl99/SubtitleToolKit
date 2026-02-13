# FEATURE: Split SRT

Version: 1.7.0  
Last Updated: 2026-02-13  

---

# 1. Menu Placement (STRICT)

Split SRT thuộc:

Menu: File Tools

❌ Không thuộc Translation Style  
❌ Không share UI container với Translation Style  

---

# 2. Mục tiêu

Chia file SRT lớn thành nhiều file nhỏ dựa trên:

- Số lượng segment
- Hoặc thời lượng

---

# 3. UI Structure

Trang File Tools hiển thị:

Title: File Tools

Tool section:

Split SRT

---

# 4. Logic Requirements

## 4.1 Theo số segment

Ví dụ:

2000 segment  
Chia mỗi file 500 segment  

→ Tạo 4 file SRT

---

## 4.2 Theo thời lượng

Ví dụ:

Mỗi file tối đa 10 phút  

Phải:

- Không cắt giữa segment
- Không làm sai timestamp

---

# 5. Output Rules

- Reset index về 1 cho từng file
- Giữ nguyên timestamp
- Giữ nguyên original & translation

---

# 6. Không được làm

❌ Không thay đổi translation  
❌ Không thay đổi CPS  
❌ Không ảnh hưởng state project  

Chỉ tạo file export mới.

---

End of file.