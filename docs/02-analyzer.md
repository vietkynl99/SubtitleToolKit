# FEATURE: Subtitle Analyzer
**Version:** 1.0.0  
**Last Updated:** 2024-05-24

## 1. Mục tiêu
Định lượng chất lượng phụ đề thông qua các chỉ số kỹ thuật.

## 2. Logic Requirements
- **Công thức CPS:** `Số ký tự / (Thời gian kết thúc - Thời gian bắt đầu)`.
- **Phân loại CPS:**
  - `< 20 CPS`: Xanh (An toàn).
  - `20 - 25 CPS`: Vàng (Cảnh báo).
  - `> 25 CPS`: Đỏ (Quá nhanh).
- **Độ dài dòng:** Cảnh báo nếu 1 segment > 2 dòng hoặc 1 dòng > 45 ký tự.

## 3. UI Requirements
- Dashboard với các thẻ số liệu: Tổng dòng, Avg CPS, Max CPS.
- Biểu đồ Bar Chart thể hiện phân bổ CPS (Safe/Warning/Danger).
- Danh sách cảnh báo (Issues List) liệt kê các ID segment vi phạm.

## 4. Trạng thái (State)
- `processing`: Đang tính toán lại sau khi người dùng sửa Text.
- `success`: Cập nhật dashboard mới.

## 5. Điều kiện tích hợp
Kết quả Analyzer là đầu vào cho Feature `04-local-fix` và `06-optimization`.