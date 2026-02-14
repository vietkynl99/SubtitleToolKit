# MODULE: AI Optimization (Segment-based)

Version: 3.2.0
Last Updated: 2026-02-14

---

# 1. Mục tiêu
Cho phép người dùng lựa chọn một hoặc nhiều segment trong Editor và sử dụng AI để tối ưu nội dung của các segment đó.

**Nguyên tắc chính:**
- Segment ở trạng thái **Safe** → bỏ qua.
- Segment ở trạng thái **Warning** hoặc **Critical** → được tối ưu lại.
- Không bắt buộc phải đưa CPS về mức Safe.
- Chỉ yêu cầu kết quả tốt hơn hiện tại (dễ đọc hơn, tự nhiên hơn hoặc giảm CPS).

**Tối ưu phải đảm bảo:**
- Không làm sai lệch nội dung gốc.
- Không phá vỡ timeline.
- Không gây trùng thời gian giữa các segment.
- Không ảnh hưởng tới các segment không được chọn.

---

# 2. Cơ chế chọn Segment trong Editor
## 2.1 Lựa chọn segment
Trong Editor:
- Mỗi segment có thể được chọn riêng lẻ.
- Có thể chọn nhiều segment cùng lúc.
- Có thể chọn tất cả segment.

## 2.2 Điều kiện kích hoạt nút "AI tối ưu"
- Nếu chưa có segment nào được chọn → nút "AI tối ưu" không thể bấm.
- Khi có ít nhất một segment được chọn → nút được kích hoạt.

---

# 3. Luồng xử lý khi bấm "AI tối ưu"
Khi người dùng bấm nút:
1. Hệ thống chỉ xử lý các segment đã được chọn.
2. Mỗi segment được kiểm tra trạng thái hiện tại: **Safe**, **Warning**, **Critical**.
3. Thực hiện xử lý tương ứng theo từng trạng thái.

---

# 4. Logic xử lý theo trạng thái
## 4.1 Safe
- Segment ở mức an toàn.
- Hệ thống bỏ qua. Không thay đổi nội dung hay thời gian.

## 4.2 Warning
- Segment có tốc độ đọc cao hơn mức an toàn.
- Hệ thống sẽ: Gửi nội dung sang AI để tối ưu lại câu.
- **Mục tiêu:** Ngắn gọn hơn, dễ đọc hơn, tự nhiên hơn, giữ nguyên ý nghĩa.
- Không yêu cầu bắt buộc phải đạt mức Safe, chỉ cần cải thiện so với trạng thái ban đầu.
- Thời gian (start/end time) được giữ nguyên.

## 4.3 Critical
- Segment có tốc độ đọc rất cao hoặc rất khó đọc.
- Hệ thống sẽ: Gửi nội dung sang AI để phân tích lại ngữ cảnh và tối ưu lại câu theo hướng giảm độ dài, tăng tính rõ ràng, tự nhiên và điện ảnh hơn.
- Không bắt buộc phải đưa CPS về Safe, chỉ cần cải thiện đáng kể so với ban đầu.

---

# 5. Nguyên tắc tối ưu
- Không thêm nội dung mới ngoài phạm vi câu gốc.
- Không thay đổi ý nghĩa cốt lõi.
- Không làm thay đổi timeline.
- Không chỉnh sửa segment không được chọn.
- Không gộp hoặc xóa segment.

---

# 6. Xử lý nhiều segment
- Hệ thống xử lý lần lượt các segment được chọn.
- Mỗi segment được tối ưu độc lập.
- Đảm bảo không gây xung đột dữ liệu hoặc sai lệch ngữ cảnh.

---

# 7. Hiển thị trạng thái xử lý
- Trong quá trình tối ưu: Hiển thị tiến trình xử lý theo số lượng segment.
- Sau khi hoàn tất, hiển thị thống kê:
  - Số segment Safe đã bị bỏ qua.
  - Số segment được AI tối ưu lại.

---

# 8. Lưu thay đổi
- Mọi thay đổi được ghi vào file `.sktproject`.
- Chỉ những segment bị chỉnh sửa mới được đánh dấu là đã tối ưu (modified).
- Không thay đổi nội dung file gốc (`.srt original`).

End of file.