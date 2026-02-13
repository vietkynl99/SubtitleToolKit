# Subtitle Toolkit – Master Requirement

Version: 1.7.0  
Last Updated: 2026-02-13  

---

# 1. Overview

Subtitle Toolkit là web app dùng để:

- Upload file SRT tiếng Trung
- Phân tích tốc độ (CPS)
- Dịch sang tiếng Việt
- Tối ưu subtitle
- Fix lỗi (local + AI)
- Split SRT
- Export file kết quả

Ứng dụng chỉ cho phép tồn tại **1 project active tại một thời điểm**.

---

# 2. Global Application State

Các trạng thái chính:

- idle
- uploading
- analyzing
- success
- clearing
- error

State Flow chuẩn:

idle  
→ uploading  
→ analyzing  
→ success  

Khi clear:

success  
→ clearing  
→ idle  

Khi replace file:

success  
→ confirm-replace  
→ clearing  
→ uploading  
→ analyzing  
→ success  

---

# 3. Single Project Rule

Không được tồn tại 2 project đồng thời.

Khi upload file mới:

- Project cũ phải bị destroy hoàn toàn
- Không giữ segment
- Không giữ analyzer data
- Không giữ histogram
- Không giữ split files
- Không giữ AI cache

---

# 4. Global File Header

Hiển thị khi projectState === success.

Bắt buộc hiển thị:
- Tên file

Khuyến nghị:
- Tổng segment
- Tổng thời lượng
- Encoding

Ví dụ:

movie_ep1.srt  
3311 segments | 120m 24s | UTF-8

Khi Clear:
activeFileName = null  
Header phải biến mất.

---

# 5. Segment List Global Rule (NEW v1.7.0)

Segment List phải hiển thị:

- Original text (CN)
- Translation (VN) nếu có

Không được yêu cầu click từng segment để xem bản dịch.

Nếu translation rỗng:
- Không hiển thị placeholder.
- Không hiển thị text tạm.

Nếu translation tồn tại:
- Hiển thị nguyên văn nội dung đã lưu.

Việc render translation phải realtime khi:
- AI dịch xong
- User chỉnh sửa
- AI Fix thay đổi nội dung

---

# 6. Clear Current Project

Khi Confirm Clear:

1. projectState → clearing
2. Reset:
   - segments = []
   - analyzerData = null
   - histogram = null
   - translationCache = null
   - splitFiles = []
   - progress = 0
3. activeFileName = null
4. Unmount Editor / Analyzer / Histogram / Split
5. Mount Upload View
6. Scroll top
7. Toast: "Project đã được xóa"

Cuối cùng:
projectState → idle

---

# 7. Replace File Rule

Nếu đã có project active và user upload file mới:

Phải hiển thị confirm modal.

Nếu Confirm:

1. Clear project
2. projectState → uploading
3. Parse file mới
4. Analyze
5. projectState → success
6. Set activeFileName = file mới

---

# 8. Settings Persistence

Clear không được reset:
- CPS threshold
- AI model preference
- History
- Saved settings

---

# 9. Error Handling

Nếu upload hoặc parse lỗi:

projectState → error

Hiển thị message rõ ràng  
Cho phép retry

---

End of file.
