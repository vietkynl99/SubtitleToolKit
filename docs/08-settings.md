# MODULE: Settings

Version: 3.1.0
Last Updated: 2026-02-15

---

# 1. Persistence

Toàn bộ cài đặt và dữ liệu thống kê được lưu trữ tại `localStorage` dưới key `subtitle_settings`.

Cấu trúc bao gồm:
- CPS Thresholds
- AI Translation configuration
- AI Mode
- Automation options
- API Usage session statistics

---

# 2. Các tham số cấu hình

## 2.1 Ngưỡng CPS (Thresholds)
- **Safe Max:** Ngưỡng an toàn (Default: 25).
- **Warning Max:** Ngưỡng cảnh báo (Default: 40).
- Hệ thống tự động đảm bảo `safeMax < warningMax`.
- Segment vượt Safe Max sẽ hiển thị cảnh báo nhẹ (vàng).
- Segment vượt Warning Max sẽ hiển thị cảnh báo đỏ (critical).

## 2.2 AI Translation
- **Batch Size:** 10 – 500 dòng/request. Cấu hình linh hoạt tùy theo độ ổn định kết nối và rate limit của model.

## 2.3 AI Mode
Cho phép người dùng lựa chọn model sử dụng cho toàn bộ tính năng AI (Translate, Optimize, Style Analysis).
- **Danh sách model:**
  - `gemini-2.5-flash` (Default)
  - `gemini-2.5-pro`
  - `gemini-3-flash-preview`
  - `gemini-3-pro-preview`
- **Hành vi hệ thống:**
  - Model được áp dụng cho: AI Translate, AI Optimize, Translation Style (DNA analysis).
  - Khi thay đổi model: Không reset API Usage, chỉ áp dụng cho các request tiếp theo.
  - Model được lưu trong `subtitle_settings`.

## 2.4 Automation
- **Auto-fix on Upload:** Tự động chuẩn hóa format SRT khi nạp file.
- **Optimization Mode:**
  - **Safe:** Ưu tiên giữ nghĩa, hạn chế việc thay đổi quá mức nếu không cần thiết.
  - **Aggressive:** Ưu tiên giảm CPS mạnh, chấp nhận viết lại câu ngắn gọn nhất có thể.

---

# 3. API Usage Dashboard (Session-Based)

Dữ liệu thống kê API được theo dõi theo từng phiên làm việc (session).

## 3.1 Nhóm thống kê
1. **Translation Style:** Theo dõi request và tokens cho việc phân tích phong cách dịch.
2. **AI Translate:** Theo dõi request, tokens, tổng số dòng đã dịch và số token trung bình trên mỗi dòng.
3. **AI Optimize:** Theo dõi request và tokens cho các tác vụ AI Fix và Tối ưu hóa.

## 3.2 Life Cycle
Dữ liệu API Usage tự động reset về 0 khi:
- Người dùng bấm **Clear Project**.
- Nạp file mới (Upload .srt hoặc .sktproject).

---

End of file.