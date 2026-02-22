# MODULE: Editor & Analyzer

Version: 2.3.0
Last Updated: 2026-02-22

---

# 1. Editor (Segment List)

**Cơ chế hiển thị:**
Sử dụng **Pagination (Phân trang)** với tối đa 30 segments mỗi trang để đảm bảo hiệu năng render mượt mà và giao diện gọn gàng khi xử lý file lớn.

**Cấu trúc hiển thị:**
Hiển thị đồng thời 2 cột:

* Gốc (CN)
* Dịch (VN)

Mỗi segment bao gồm:

* Số thứ tự (Index)
* Nội dung Gốc (CN)
* Nội dung Dịch (VN)
* Nút Xoá (Delete)

---

## 1.1 Nút Xoá Segment (Delete Segment)

**Mục đích:**
Cho phép người dùng xoá từng segment riêng lẻ trực tiếp trong danh sách.

**Yêu cầu hành vi:**

* Mỗi segment phải có một nút **"Xoá"**.
* Khi người dùng nhấn nút Xoá:

  1. Hiển thị hộp thoại xác nhận (Confirm Dialog):

     * Nội dung gợi ý: "Bạn có chắc muốn xoá segment này không?"
     * Có 2 lựa chọn: Confirm / Cancel.
  2. Nếu Confirm → Segment bị loại bỏ khỏi danh sách.
  3. Nếu Cancel → Không có thay đổi nào xảy ra.

---

## 1.2 Cơ chế Đánh Lại Số Thứ Tự (Re-indexing)

Sau khi một segment bị xoá:

* Hệ thống phải **tự động đánh lại toàn bộ số thứ tự (Index)** của các segment còn lại.
* Thứ tự mới phải:

  * Bắt đầu từ 1.
  * Liên tục.
  * Không được tồn tại khoảng trống số.

**Ví dụ:**

Ban đầu:
1
2
3
4
5

Xoá segment số 3 → Kết quả:
1
2
3
4

(Trong đó segment cũ số 4 trở thành 3, segment cũ số 5 trở thành 4)

---

## 1.3 Ảnh hưởng đến các hệ thống liên quan

Khi xoá segment:

* Tổng số segments của project phải được cập nhật lại.
* Translation Progress phải được tính lại dựa trên tổng mới.
* Quality Dashboard phải cập nhật lại số lượng Safe / Warning / Critical.
* CPS Histogram phải render lại theo tập dữ liệu mới.
* Các Filter đang hoạt động phải được áp dụng lại trên danh sách mới.

Tất cả cập nhật phải diễn ra **realtime**.

---

## 1.4 Nguyên tắc chỉnh sửa nội dung

* Không còn hiển thị Badge **"Edited"**.
* Không phân biệt nội dung dịch được tạo bởi AI hay được chỉnh sửa thủ công.
* Mọi thay đổi nội dung (dù từ AI Translate, AI Optimize hay người dùng chỉnh sửa trực tiếp) đều được xem là nội dung hiện tại hợp lệ của segment.
* Hệ thống không lưu trạng thái phân loại nguồn chỉnh sửa ở tầng UI.

---

# 2. Analyzer (Dynamic Classification)

Hệ thống phân tích dựa trên ngưỡng CPS từ `Settings`:

* **Safe (Màu xanh):** CPS < safeMax.
* **Warning (Màu vàng):** safeMax <= CPS <= warningMax.
* **Critical (Màu đỏ):** CPS > warningMax.

Phân loại được cập nhật realtime khi nội dung dịch thay đổi hoặc khi segment bị xoá.

---

# 3. Visualization Tools

## 3.1 Quality Dashboard

Hiển thị thống kê tổng quan:

* **Số lượng dòng theo Severity:** Safe, Warning, Critical.
* **Translation Progress:**

  * Hiển thị số câu đã dịch / tổng số câu.
  * Đồng thời hiển thị phần trăm hoàn thành (%).
  * **Công thức tính:**

    * Đã dịch = số segments có nội dung ở cột Dịch (VN) khác rỗng.
    * Tổng số = tổng segments của project.
    * % = (Đã dịch / Tổng số) × 100.
  * Đây là chỉ số tiến độ chính.

Dashboard phải cập nhật ngay khi:

* Nội dung bị chỉnh sửa.
* Segment bị xoá.

---

## 3.2 CPS Histogram

Biểu đồ phân phối mật độ CPS.

* **Hỗ trợ tương tác:** Click vào các cột biểu đồ để lọc (filter) segments thuộc phạm vi CPS tương ứng.
* Histogram cập nhật động khi nội dung thay đổi hoặc khi segment bị xoá.

---

## 3.3 Issue Alerts

Hệ thống cảnh báo tự động:

* Dòng vượt quá 2 line.
* Dòng vượt quá ngưỡng CPS nguy hiểm (Critical).
* Các cảnh báo này chỉ mang tính phân tích kỹ thuật.

Alerts phải được tính lại ngay sau khi xoá segment.

---

# 4. Filter System

Hỗ trợ lọc linh hoạt:

* **Theo mức độ nghiêm trọng (Severity):** All, Safe, Warning, Critical.
* **Theo phạm vi CPS (Range Filter):** Kích hoạt khi click vào Histogram.
* **Reset Filter:** Nút "Clear/Reset Filter" để quay về trạng thái hiển thị đầy đủ.

Khi segment bị xoá:

* Filter hiện tại vẫn giữ nguyên trạng thái.
* Danh sách hiển thị được áp dụng lại trên tập dữ liệu mới sau khi re-index.

---

End of file.
