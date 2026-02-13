# FEATURE: Local Auto-Fix
**Version:** 1.0.0  
**Last Updated:** 2024-05-24

## 1. Mục tiêu
Sửa các lỗi kỹ thuật hiển nhiên bằng thuật toán nội bộ mà không tốn phí AI.

## 2. Logic Requirements
- **Trình bày:** Tự động gộp các khoảng trắng thừa.
- **Xuống dòng:** Nếu 1 dòng quá dài (>45 ký tự), tìm khoảng trắng gần giữa nhất để ngắt dòng.
- **Giới hạn:** Xóa các dòng trống thừa trong segment.
- **Timestamp:** Đảm bảo thời gian bắt đầu luôn nhỏ hơn thời gian kết thúc.

## 3. User Interaction Flow
1. User bật "Auto-fix" trong Settings hoặc click nút "Sửa nhanh".
2. Hệ thống quét toàn bộ list.
3. Hiển thị log: "Đã sửa 15 lỗi định dạng".

## 4. Edge Cases
- Câu không có khoảng trắng (tiếng Trung dính liền) -> Cần logic cắt theo từ hoặc dấu câu.