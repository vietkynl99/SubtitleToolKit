# MODULE: AI Optimization (Fix)

Version: 2.0.0  
Last Updated: 2026-02-14  

---

# 1. Mục tiêu
Sử dụng AI cấp cao để sửa các lỗi ngữ pháp, hành văn không tự nhiên hoặc rút gọn câu để giảm chỉ số CPS Critical.

---

# 2. AI Fix Pipeline
- Sử dụng model: `gemini-3-pro-preview`.
- AI nhận diện các đoạn phụ đề "khó đọc" hoặc "quá dài".
- Trả về JSON chứa nội dung đã được tinh chỉnh (concise & natural).

---

# 3. Chế độ Tối ưu (Settings)
- **Safe Mode:** Chỉ can thiệp tối thiểu để đưa CPS về vùng an toàn.
- **Aggressive Mode:** Ưu tiên trải nghiệm người dùng, AI có quyền thay đổi từ vựng mạnh mẽ hơn để đảm bảo tính điện ảnh.

---

End of file.