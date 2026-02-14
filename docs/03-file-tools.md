# MODULE: File Tools (Split Engine)

Version: 2.0.0  
Last Updated: 2026-02-14  

---

# 1. Công cụ Split SRT
Chia file phụ đề hiện tại thành nhiều tệp nhỏ hơn.

---

# 2. Các chế độ Chia (Modes)
- **Duration (Phút):** Chia mỗi X phút. Hệ thống tự tìm mốc thời gian phù hợp để không ngắt giữa chừng một câu thoại.
- **Count (Số dòng):** Chia đều mỗi file X segment.
- **Manual (Thủ công):** Nhập danh sách các mốc Timestamp (mỗi dòng một mốc).
- **Range (Phạm vi):** Trích xuất một đoạn cụ thể (từ Index A đến B).

---

# 3. Quy tắc Output
- **Reset Index:** Mỗi file xuất ra sẽ được đánh lại Index từ 1.
- **Metadata Header:** Tự động chèn block `NOTE` chứa thông tin Range, Start/End time và Duration vào đầu file.
- **Naming:** File có prefix `[split ...]` đứng trước tên file gốc.

---

# 4. Quản lý File đã chia
Các file được tạo ra hiển thị dưới dạng Card:
- Cho phép tải về (Save).
- Cho phép nạp trực tiếp vào Editor để làm việc tiếp (Load Editor).

---

End of file.