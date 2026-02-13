# FEATURE: Settings

Version: 1.6.0  
Last Updated: 2026-02-13  

---

# 1. Mục tiêu

Cho phép người dùng cấu hình các thông số hệ thống để tối ưu hóa quy trình dịch và phân tích.

❌ Không còn tính năng History.
❌ Không lưu project history vào LocalStorage.

---

# 2. CPS Threshold Settings

Cho phép thay đổi ngưỡng:

safe: mặc định <25  
warning: 25–40  
critical: >40  

Analyzer phải đọc ngưỡng từ Settings này để tính toán Severity.

---

# 3. Auto Fix Toggle

Toggle bật/tắt:

- Local Auto Fix on Upload: Tự động dọn dẹp khoảng trắng và ngắt dòng cơ bản khi nạp file.

---

# 4. Optimization Mode

Chọn chế độ ưu tiên cho AI:

- Safe Mode: Giữ nghĩa tối đa, chỉ sửa khi CPS quá cao.
- Aggressive Mode: Ưu tiên tốc độ đọc, ép CPS về mức an toàn.

---

# 5. Không được làm

❌ Không lưu lịch sử project (Để bảo mật dữ liệu khách hàng).
❌ Không hiển thị danh sách file đã mở trước đó.

---

End of file.