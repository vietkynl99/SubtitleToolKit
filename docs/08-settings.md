# MODULE: Settings

Version: 2.0.0  
Last Updated: 2026-02-14  

---

# 1. Persistence
Toàn bộ cài đặt được lưu trữ tại `localStorage` dưới key `subtitle_settings`.

---

# 2. Các tham số cấu hình

## 2.1 Ngưỡng CPS (Thresholds)
- **Safe Max:** Ngưỡng an toàn (Default: 25).
- **Warning Max:** Ngưỡng cảnh báo (Default: 40).
- Hệ thống tự động đảm bảo `safeMax < warningMax`.

## 2.2 AI Translation
- **Batch Size:** 10 - 500 dòng/request. Cấu hình linh hoạt tùy theo độ ổn định của kết nối.

## 2.3 Automation
- **Auto-fix on Upload:** Tự động sửa format khi nạp file.
- **Optimization Mode:** Lựa chọn giữa Safe và Aggressive.

---

End of file.