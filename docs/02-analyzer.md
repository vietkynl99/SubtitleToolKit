# FEATURE: Subtitle Analyzer
**Version:** 1.2.0  
**Last Updated:** 2026-02-13  
**Changelog:**
- CPS severity không còn cố định.
- Analyzer đọc threshold từ Settings.
- Default thresholds: 25 / 40.

## 1. Mục tiêu
Định lượng chất lượng phụ đề và cung cấp trạng thái phân loại cho từng segment để phục vụ filter trong Editor dựa trên các ngưỡng có thể cấu hình.

## 2. Logic Requirements
### CPS Threshold Configuration
Analyzer phải lấy 2 giá trị từ Settings:
- `safeThreshold` (Mặc định: 25)
- `criticalThreshold` (Mặc định: 40)

### Phân loại Severity
| Điều kiện | Level |
| :--- | :--- |
| CPS < safeThreshold | Safe |
| safeThreshold ≤ CPS ≤ criticalThreshold | Warning |
| CPS > criticalThreshold | Critical |

### Điều kiện nâng cấp lên Critical (Override Rule)
Segment sẽ được đánh dấu Critical ngay cả khi CPS an toàn nếu:
- Có lỗi timestamp chồng lấn.
- Hoặc > 2 dòng.
- Hoặc 1 dòng > 45 ký tự.

### Re-analysis Trigger
Phải re-analyze toàn bộ segment khi:
- User chỉnh sửa nội dung text.
- User thay đổi CPS threshold trong Settings.
- User import file mới.

## 3. UI Requirements
### Dashboard
- Tổng số Safe, Warning, Critical dựa trên ngưỡng động.
- Click vào từng số sẽ kích hoạt Filter tương ứng.

### Filter Integration
- Filter nằm phía trên Segment List.
- Re-render danh sách theo trạng thái mới khi Analyzer tính toán lại.

## 4. Trạng thái (State)
- `processing`: Đang tính toán lại.
- `success`: Cập nhật severity và dashboard.

## 5. Điều kiện tích hợp
Kết quả Analyzer là đầu vào cho 04-local-fix, 06-optimization và UI Layer Filter.