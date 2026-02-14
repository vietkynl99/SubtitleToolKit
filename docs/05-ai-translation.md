# MODULE: AI Translation

Version: 2.0.0  
Last Updated: 2026-02-14  

---

# 1. Cơ chế Batching (Cơ bản)
- Lấy `Batch Size` từ Settings (mặc định 100).
- Chỉ gửi các dòng chưa có bản dịch (Translated Text rỗng).

---

# 2. Contextual Logic (Ngữ cảnh)
Mỗi đợt gửi (batch) bao gồm:
- **Main Segments:** Các dòng cần dịch.
- **Context Before:** 2 dòng đã dịch ngay phía trước batch.
- **Context After:** 2 dòng gốc ngay phía sau batch.
- **Style DNA:** Gửi thông tin Genre/Tone để AI chọn xưng hô (nhân xưng) chuẩn xác.

---

# 3. Điều khiển Tiến trình
- **Real-time Progress:** Cập nhật số dòng đã xử lý lên Global Progress Bar.
- **Stop/Resume:** User có thể dừng quá trình dịch bất kỳ lúc nào. Các dòng đã dịch xong sẽ được lưu lại. Có thể tiếp tục dịch từ vị trí dừng sau đó.

---

# 4. Model sử dụng
- Mặc định: `gemini-3-flash-preview`.

---

End of file.