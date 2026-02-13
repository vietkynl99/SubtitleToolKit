# FEATURE: Optimization
**Version:** 1.0.0  
**Last Updated:** 2024-05-24

## 1. Mục tiêu
Cân bằng giữa nội dung và tốc độ đọc để đạt trải nghiệm xem phim tốt nhất.

## 2. Logic Requirements
- **Chế độ Safe:** Chỉ sửa các câu có CPS > 30.
- **Chế độ Aggressive:** Ép toàn bộ câu về CPS < 23.
- **Nguyên tắc:** Không thay đổi Timestamp trừ khi câu quá ngắn không thể rút gọn thêm (khi đó sẽ kéo dài thời gian hiển thị nếu không đè lên câu sau).

## 3. UI Requirements
- Toggle chọn chế độ Optimize.
- Preview kết quả tổng thể (Trước và Sau optimization).