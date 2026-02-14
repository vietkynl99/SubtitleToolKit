# MODULE: Editor & Analyzer

Version: 2.0.0  
Last Updated: 2026-02-14  

---

# 1. Editor (Segment List)
- Sử dụng **Virtual List** để render mượt mà hàng nghìn dòng.
- Hiển thị đồng thời 2 cột: Gốc (CN) và Dịch (VN).
- Trạng thái **isModified** được đánh dấu khi user chỉnh sửa text.

---

# 2. Analyzer (Dynamic Classification)
Hệ thống phân tích dựa trên ngưỡng CPS từ `Settings`:
- **Safe (Màu xanh):** CPS < safeMax.
- **Warning (Màu vàng):** safeMax <= CPS <= warningMax.
- **Critical (Màu đỏ):** CPS > warningMax.

---

# 3. Visualization Tools
- **Quality Dashboard:** Thống kê nhanh số lượng dòng theo Severity.
- **CPS Histogram:** Biểu đồ phân phối mật độ CPS. Click vào các cột biểu đồ để lọc (filter) segments tương ứng.
- **Issue Alerts:** Cảnh báo các dòng quá 2 line hoặc vượt quá 50 ký tự/dòng.

---

# 4. Filter System
Hỗ trợ lọc theo:
- Severity (An toàn/Cảnh báo/Nguy hiểm).
- Range (theo bucket của Histogram).
- Trạng thái chưa dịch.

---

End of file.