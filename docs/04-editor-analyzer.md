# MODULE: Editor & Analyzer

Version: 2.2.0
Last Updated: 2026-02-16

---

# 1. Editor (Segment List)

**Cơ chế hiển thị:**
Sử dụng **Pagination (Phân trang)** với tối đa 30 segments mỗi trang để đảm bảo hiệu năng render mượt mà và giao diện gọn gàng khi xử lý file lớn.

**Cấu trúc hiển thị:**
Hiển thị đồng thời 2 cột:
- Gốc (CN)
- Dịch (VN)

**Nguyên tắc chỉnh sửa:**
- Không còn hiển thị Badge **"Edited"**.
- Không phân biệt nội dung dịch được tạo bởi AI hay được chỉnh sửa thủ công.
- Mọi thay đổi nội dung (dù từ AI Translate, AI Optimize hay người dùng chỉnh sửa trực tiếp) đều được xem là nội dung hiện tại hợp lệ của segment.
- Hệ thống không lưu trạng thái phân loại nguồn chỉnh sửa ở tầng UI.

---

# 2. Analyzer (Dynamic Classification)

Hệ thống phân tích dựa trên ngưỡng CPS từ `Settings`:
- **Safe (Màu xanh):** CPS < safeMax.
- **Warning (Màu vàng):** safeMax <= CPS <= warningMax.
- **Critical (Màu đỏ):** CPS > warningMax.

Phân loại được cập nhật realtime khi nội dung dịch thay đổi.

---

# 3. Visualization Tools

## 3.1 Quality Dashboard
Hiển thị thống kê tổng quan:
- **Số lượng dòng theo Severity:** Safe, Warning, Critical.
- **Translation Progress:**
  - Hiển thị số câu đã dịch / tổng số câu.
  - Đồng thời hiển thị phần trăm hoàn thành (%).
  - **Công thức tính:**
    - Đã dịch = số segments có nội dung ở cột Dịch (VN) khác rỗng.
    - Tổng số = tổng segments của project.
    - % = (Đã dịch / Tổng số) × 100.
  - Đây là chỉ số tiến độ chính, thay thế hoàn toàn "User Intervention Stat".

## 3.2 CPS Histogram
Biểu đồ phân phối mật độ CPS. 
- **Hỗ trợ tương tác:** Click vào các cột biểu đồ để lọc (filter) segments thuộc phạm vi CPS tương ứng.
- Histogram cập nhật động khi nội dung thay đổi.

## 3.3 Issue Alerts
Hệ thống cảnh báo tự động:
- Dòng vượt quá 2 line.
- Dòng vượt quá ngưỡng CPS nguy hiểm (Critical).
- Các cảnh báo này chỉ mang tính phân tích kỹ thuật, không phụ thuộc vào nguồn chỉnh sửa.

---

# 4. Filter System
Hỗ trợ lọc linh hoạt:
- **Theo mức độ nghiêm trọng (Severity):** All, Safe, Warning, Critical.
- **Theo phạm vi CPS (Range Filter):** Kích hoạt khi click vào Histogram.
- **Reset Filter:** Nút "Clear/Reset Filter" để quay về trạng thái hiển thị đầy đủ.

---

End of file.