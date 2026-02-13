# Subtitle Toolkit – Master Requirement

Version: 1.6.0  
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

## Mục tiêu

Luôn hiển thị tên file đang active để user biết mình đang xử lý file nào.

---

## Điều kiện hiển thị

Hiển thị khi:

projectState === success

Ẩn khi:

- idle
- uploading
- clearing
- error

---

## Nội dung hiển thị

Bắt buộc:

- Tên file

Khuyến nghị:

- Số segment
- Tổng thời lượng

Ví dụ:

[📄] movie_ep1.srt  
3311 segments | 102m 51s

---

## Khi split

Nếu file sau split:

Tên phải cập nhật theo file mới:

[split range 100 to 1000] movie_ep1.srt

---

## Khi clear

activeFileName = null  
Header phải biến mất hoàn toàn.

---

# 5. Clear Current Project

## Mục tiêu

Cho phép reset toàn bộ project về trạng thái như mới load trang.

---

## UI

Nút: Clear Current Project  
Vị trí: File Control Area  

---

## Khi click

Hiển thị modal:

Bạn có chắc muốn xóa project hiện tại?  
Mọi thay đổi chưa export sẽ bị mất.

Buttons:

- Cancel
- Confirm

---

## Nếu Confirm

Bắt buộc thực hiện:

1. projectState → clearing  
2. Reset toàn bộ:
   - segments = []
   - analyzerData = null
   - histogram = null
   - translationCache = null
   - splitFiles = []
   - progress = 0
3. activeFileName = null
4. Unmount:
   - Editor
   - Analyzer
   - Histogram
   - Split Panel
5. Mount lại Upload View
6. Scroll lên đầu trang
7. Hiển thị toast: "Project đã được xóa"

Cuối cùng:

projectState → idle

---

# 6. Replace File Rule

Nếu đã có project active và user:

- Click Upload
- Hoặc Drag & Drop file mới

Phải hiển thị modal:

Bạn đang có một project đang mở.  
Bạn có muốn xóa file hiện tại và upload file mới không?

Buttons:

- Cancel
- Confirm & Upload

Nếu Confirm:

1. Clear project
2. Upload file mới
3. Parse
4. Analyze
5. Load Editor
6. projectState → success

---

# 7. Settings Persistence

Clear Project không được reset:

- CPS threshold
- AI model preference
- History
- Saved settings

---

# 8. Error Handling

Nếu upload hoặc parse lỗi:

projectState → error

Hiển thị message rõ ràng  
Cho phép retry

---

End of file.