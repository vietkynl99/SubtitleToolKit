# FEATURE: AI Translation
**Version:** 1.0.0  
**Last Updated:** 2024-05-24

## 1. Mục tiêu
Dịch toàn bộ nội dung phụ đề từ tiếng Trung sang tiếng Việt bằng Gemini AI.

## 2. User Interaction Flow
1. Click "Dịch toàn bộ".
2. Theo dõi thanh tiến trình.
3. Xem kết quả song song (Gốc | Dịch).

## 3. Logic Requirements
- **Batching:** Chia nhỏ file thành các nhóm 10-20 dòng để gửi API (tránh timeout/limit).
- **Context:** Gửi kèm 2 dòng trước và sau để AI hiểu ngữ cảnh tốt hơn.
- **Glossary:** (Optional) Áp dụng bảng từ vựng nếu có.

## 4. UI Requirements
- Nút "Dịch" nổi bật.
- Cột dịch thuật có thể Edit trực tiếp.
- Badge hiển thị "Đã dịch" hoặc "Đang chờ".

## 5. Error Cases
- Mất kết nối mạng: Tạm dừng và cho phép "Resume".
- API Key hết quota: Hiển thị thông báo và yêu cầu chờ.