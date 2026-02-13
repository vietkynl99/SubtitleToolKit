# FEATURE: Subtitle Analyzer
**Version:** 1.1.0  
**Last Updated:** 2026-02-13  
**Changelog:**
- Thêm tích hợp trạng thái phân loại với Editor Filter.
- Chuẩn hóa level: Safe / Warning / Critical.

## 1. Mục tiêu
Định lượng chất lượng phụ đề và cung cấp trạng thái phân loại cho từng segment để phục vụ filter trong Editor.

## 2. Logic Requirements
### Công thức CPS
`Số ký tự / (Thời gian kết thúc - Thời gian bắt đầu)`

### Phân loại CPS & Severity Level
| CPS | Level | Màu | Ý nghĩa |
| :--- | :--- | :--- | :--- |
| < 20 | Safe | Xanh | An toàn |
| 20–25 | Warning | Vàng | Cảnh báo |
| > 25 | Critical | Đỏ | Quá nhanh |

### Điều kiện nâng cấp lên Critical
Segment sẽ được đánh dấu Critical nếu:
- CPS > 25
- Hoặc có lỗi timestamp chồng lấn
- Hoặc > 2 dòng
- Hoặc 1 dòng > 45 ký tự

### Metadata Gắn vào Segment
Mỗi segment phải có:
- `cps`: number
- `severity`: (safe | warning | critical)
- `issueList`: (array mô tả lỗi)

## 3. UI Requirements
### Dashboard
- Tổng số Safe
- Tổng số Warning
- Tổng số Critical
- Click vào từng số sẽ tự động kích hoạt Filter tương ứng trong Segment List.

### Filter Integration
- Filter nằm phía trên Segment List.
- Khi chọn: Hệ thống chỉ render segment có severity tương ứng.
- Khi Analyzer tính lại: Filter đang bật vẫn giữ nguyên, danh sách được re-render theo trạng thái mới.

## 4. Trạng thái (State)
- `processing`: Đang tính toán lại khi user chỉnh sửa text.
- `success`: Cập nhật severity và dashboard.
- `partial-success`: Nếu chỉ một phần segment được phân tích lại.

## 5. Điều kiện tích hợp
Kết quả Analyzer là:
- Đầu vào cho 04-local-fix
- Đầu vào cho 06-optimization
- Đầu vào cho Filter trong Editor (UI layer)