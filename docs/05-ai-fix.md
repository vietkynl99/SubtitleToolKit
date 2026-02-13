# FEATURE: AI Heavy Fix
**Version:** 1.0.0  
**Last Updated:** 2024-05-24

## 1. Mục tiêu
Xử lý các vấn đề về ngữ nghĩa và văn phong mà thuật toán thường không làm được.

## 2. Logic Requirements
- **Phân tích nhân xưng:** Đảm bảo "Tôi/Bạn" hoặc "Anh/Em" nhất quán dựa trên ngữ cảnh phim.
- **Rút gọn thông minh:** Nếu CPS > 25, yêu cầu AI viết lại câu ngắn hơn nhưng giữ nguyên ý nghĩa chính.
- **Tự nhiên hóa:** Chuyển các cụm từ Hán Việt khó hiểu sang thuần Việt.

## 3. User Interaction Flow
1. AI đề xuất các thay đổi.
2. Hiển thị giao diện so sánh (Diff view).
3. User nhấn "Accept" hoặc "Reject" cho từng câu hoặc "Accept All".

## 4. UI Requirements
- Panel "Đề xuất của AI" bên cạnh segment.
- Nút Accept/Reject màu xanh/đỏ.
- Tooltip giải thích lý do thay đổi (ví dụ: "Rút gọn để giảm CPS").