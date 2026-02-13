# FEATURE: History & Settings
**Version:** 1.1.0  
**Last Updated:** 2026-02-13  
**Changelog:**
- Thêm cấu hình CPS threshold.
- Cập nhật default severity range.

## 1. History Requirements
- Lưu Project tự động vào LocalStorage/IndexedDB.
- Version History tối đa 5 bản backup.

## 2. Settings Requirements (Updated)
### CPS Threshold Configuration
Cho phép người dùng chỉnh:
- **Safe Threshold:** (Slider/Input number). Mặc định: 25.
- **Critical Threshold:** (Slider/Input number). Mặc định: 40.
- Warning sẽ tự động nằm giữa hai ngưỡng này.

### Validation Rules
- `safeThreshold` phải nhỏ hơn `criticalThreshold`.
- Khoảng cách tối thiểu giữa 2 ngưỡng: ≥ 5 CPS.
- Nếu nhập sai: Highlight đỏ, không cho lưu.

### Behavior Khi Thay Đổi
Khi user thay đổi threshold:
- Lưu vào Settings.
- Trigger re-analysis toàn bộ segment.
- Cập nhật Severity badge, Dashboard count và Filter result ngay lập tức.
- Không reset nội dung đã dịch hoặc chỉnh sửa.

## 3. UI Requirements
- Giao diện Settings bao gồm các Slider trực quan cho Thresholds.
- Hiển thị preview các dải màu (Xanh/Vàng/Đỏ) tương ứng với ngưỡng đang chọn.