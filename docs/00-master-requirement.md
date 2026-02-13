# MASTER REQUIREMENT: Subtitle Toolkit
**Version:** 1.1.0  
**Last Updated:** 2026-02-13  
**Status:** Approved  
**Changelog:**
- Bổ sung tính năng Filter Segment theo trạng thái Safe/Warning/Critical trong Editor.

## 1. Product Overview
### Mục tiêu sản phẩm
Xây dựng một nền tảng web chuyên dụng để dịch và tối ưu hóa phụ đề từ tiếng Trung sang tiếng Việt, kết hợp giữa thuật toán xử lý tại chỗ (Local) và trí tuệ nhân tạo (AI).

### Đối tượng người dùng
- Dịch giả tự do (Freelance translators).
- Các team làm sub (Fansub groups).
- Biên tập viên nội dung video.

### Use Cases chính
- Dịch nhanh file phụ đề tiếng Trung sang tiếng Việt.
- Sửa lỗi định dạng và tối ưu độ dài dòng phụ đề.
- Kiểm tra tốc độ đọc (CPS) để đảm bảo trải nghiệm người xem.

### Phạm vi hệ thống
- Xử lý file định dạng `.srt`.
- Dịch thuật từ Trung sang Việt.
- Phân tích và tối ưu hóa metrics phụ đề.

---

## 2. System Flow Tổng Thể
1. **Upload:** Người dùng tải file SRT gốc.
2. **Analyze:** Hệ thống tính toán CPS, số dòng, độ dài.
3. **Translate:** Chuyển đổi ngôn ngữ bằng AI.
4. **Fix:** 
   - Lỗi nhẹ: Xử lý bằng thuật toán Local (tự động).
   - Lỗi nặng: Gợi ý sửa bằng AI (người dùng xác nhận).
5. **Optimize:** Tinh chỉnh độ dài và vị trí ngắt dòng.
6. **Export:** Xuất file SRT đã hoàn thiện.

---

## 3. Phân loại lỗi
### Lỗi nhẹ (Local Fix)
- **Định nghĩa:** Lỗi định dạng, khoảng trắng, xuống dòng sai, lệch timestamp nhẹ.
- **Xử lý:** Thuật toán RegEx và logic chuỗi xử lý tức thì không cần API.

### Lỗi nặng (AI Fix)
- **Định nghĩa:** Sai ngữ cảnh, xưng hô không nhất quán, câu quá dài nhưng không thể cắt cơ học, câu tối nghĩa.
- **Xử lý:** Gửi prompt tới Gemini để nhận đề xuất.
- **Fallback:** Nếu AI lỗi/timeout, giữ nguyên bản dịch cũ và đánh dấu đỏ để người dùng sửa tay.

---

## 4. State Management Chung
Tất cả các module phải tuân thủ các trạng thái:
- `idle`: Chờ tương tác.
- `loading`: Đang tải dữ liệu/cấu hình.
- `processing`: Đang thực hiện tính toán/gọi API.
- `success`: Hoàn thành tác vụ.
- `partial-success`: Hoàn thành một phần (ví dụ: dịch được 80% file).
- `error`: Lỗi nghiêm trọng dừng hệ thống.
- `retry`: Đang thử lại sau lỗi.

---

## 5. UI Layout Tổng Thể
- **Theme:** Dark Mode mặc định (Slate/Zinc palette).
- **Layout 3 cột:**
  - **Cột trái (Segment list):** 
    - Danh sách các segment.
    - Mỗi segment có badge trạng thái: 🟢 Safe, 🟡 Warning, 🔴 Critical.
    - Có thanh Filter phía trên danh sách: All, Safe, Warning, Critical.
  - **Cột giữa (Editor):** 
    - Hiển thị nội dung segment đang chọn.
    - Khi bật Filter, Editor chỉ hiển thị các segment phù hợp filter.
  - **Cột phải (Control Panel):** Dashboard phân tích, nút bấm tác vụ (Translate, Fix, Export).
- **Filter Behavior:**
  - Mặc định: All.
  - Khi chọn Safe → chỉ hiển thị segment có CPS < 20 và không có lỗi khác.
  - Khi chọn Warning → chỉ hiển thị segment có CPS từ 20–25 hoặc có cảnh báo độ dài.
  - Khi chọn Critical → chỉ hiển thị segment CPS > 25 hoặc lỗi nghiêm trọng.
  - Khi thay đổi filter: Không reload lại file, không reset trạng thái chỉnh sửa, không ảnh hưởng đến dữ liệu gốc.
- **Global Progress:** Thanh tiến trình nằm cố định ở Sidebar hoặc Topbar.

---

## 6. Non-functional Requirements
- **Performance:** Xử lý file 1000 dòng trong < 5 giây (không tính thời gian gọi AI).
- **Limits:** File tối đa 5MB.
- **Data Integrity:** Không làm thay đổi timestamp gốc trừ khi có yêu cầu fix.
- **Persistence:** Lưu trạng thái vào LocalStorage để tránh mất dữ liệu khi Refresh.