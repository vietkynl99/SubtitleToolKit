# MODULE: Editor & Analyzer

Version: 2.1.0
Last Updated: 2026-02-15

---

# 1. Editor (Segment List)
- **Cơ chế hiển thị:** Sử dụng **Pagination (Phân trang)** với 30 segments mỗi trang để đảm bảo hiệu năng render mượt mà và giao diện gọn gàng.
- **Cấu trúc:** Hiển thị đồng thời 2 cột: Gốc (CN) và Dịch (VN).
- **Trạng thái [Edited]:** 
  - Segment hiển thị Badge **"Edited"** khi người dùng can thiệp chỉnh sửa nội dung dịch thủ công.
  - **Lưu ý:** Các tác vụ từ AI (Translate/Optimize) sẽ cập nhật nội dung nhưng KHÔNG kích hoạt Badge này (chỉ dành cho user-intervention).

---

# 2. Analyzer (Dynamic Classification)
Hệ thống phân tích dựa trên ngưỡng CPS từ `Settings`:
- **Safe (Màu xanh):** CPS < safeMax.
- **Warning (Màu vàng):** safeMax <= CPS <= warningMax.
- **Critical (Màu đỏ):** CPS > warningMax.

---

# 3. Visualization Tools
- **Quality Dashboard:** 
  - Thống kê nhanh số lượng dòng theo Severity (Safe/Warning/Critical).
  - **User Intervention Stat:** Hiển thị tỷ lệ phần trăm (%) các câu đã được người dùng chỉnh sửa thủ công so với tổng số dòng.
- **CPS Histogram:** Biểu đồ phân phối mật độ CPS. 
  - Hỗ trợ tương tác: Click vào các cột biểu đồ để lọc (filter) segments thuộc phạm vi CPS tương ứng.
- **Issue Alerts:** Cảnh báo các dòng quá 2 line hoặc vượt quá ngưỡng CPS nguy hiểm.

---

# 4. Filter System
Hỗ trợ lọc linh hoạt:
- **Theo mức độ nghiêm trọng (Severity):** All, Safe, Warning, Critical.
- **Theo phạm vi CPS (Range Filter):** Kích hoạt khi click vào Histogram.
- **Reset:** Nút "Clear/Reset Filter" để quay về trạng thái hiển thị đầy đủ.

---

End of file.