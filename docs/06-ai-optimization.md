# MODULE: AI Optimization (Segment-based)

Version: 3.3.0
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
- **Không được suy diễn nội dung từ segment khác.**

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
2. Segment được lọc theo trạng thái: **Warning** hoặc **Critical**.
3. Các segment cần tối ưu sẽ được chia thành các **batch tối đa 20 segment / request**.
4. Mỗi batch được gửi trong một request duy nhất tới AI.

---

# 4. Nguyên tắc xử lý theo batch
## 4.1 Giới hạn batch
- Tối đa 20 segment trong một request.
- Nếu nhiều hơn 20 → chia thành nhiều request.
- Không gửi từng segment riêng lẻ trừ khi chỉ có 1 segment được chọn.

## 4.2 Xử lý độc lập
Trong một request chứa nhiều segment:
- Mỗi segment phải được tối ưu độc lập.
- **Không được coi các segment khác index là ngữ cảnh.**
- Không được nối logic giữa các segment.
- Không được viết lại theo dạng hội thoại liên tục.
- Không được merge hoặc chia lại segment.
- **AI phải xử lý theo nguyên tắc:** Mỗi segment là một đơn vị riêng biệt, không liên quan nội dung đến segment khác trong cùng batch.

---

# 5. Logic xử lý theo trạng thái
## 5.1 Safe
- Segment ở mức an toàn. Hệ thống bỏ qua.
- Không gửi sang AI. Không thay đổi nội dung hay thời gian.

## 5.2 Warning
- Segment có tốc độ đọc cao hơn mức an toàn. Hệ thống gửi nội dung sang AI để tối ưu lại câu.
- **Mục tiêu:** Ngắn gọn hơn, dễ đọc hơn, tự nhiên hơn, giữ nguyên ý nghĩa.
- Không bắt buộc phải đạt mức Safe. Thời gian được giữ nguyên.

## 5.3 Critical
- Segment có tốc độ đọc rất cao hoặc rất khó đọc. Hệ thống gửi nội dung sang AI để tối ưu lại câu.
- **Mục tiêu:** Giảm độ dài, tăng tính rõ ràng, tự nhiên hơn.
- Không bắt buộc phải đưa CPS về Safe.

---

# 6. Nguyên tắc tối ưu
- Không thêm nội dung mới ngoài phạm vi câu gốc.
- Không thay đổi ý nghĩa cốt lõi.
- Không làm thay đổi timeline.
- Không chỉnh sửa segment không được chọn.
- Không gộp hoặc xóa segment.
- **Không sử dụng segment khác làm ngữ cảnh.**
- **Không suy diễn dựa trên thứ tự liền kề.**

---

# 7. Hiển thị trạng thái xử lý
Trong quá trình tối ưu:
- Hiển thị tiến trình theo batch. Ví dụ: `Batch 1/3 (20 segments)`.

Sau khi hoàn tất, hiển thị thống kê:
- Số segment Safe đã bị bỏ qua.
- Số segment được AI tối ưu lại.
- Số request đã thực hiện.

---

# 8. Lưu thay đổi
- Mọi thay đổi được ghi vào file `.sktproject`.
- Chỉ các segment được AI tối ưu mới được cập nhật nội dung `translated`.
- Không thay đổi nội dung file `.srt original`.
- Cập nhật `updated_at` của project sau mỗi lần tối ưu.

End of file.