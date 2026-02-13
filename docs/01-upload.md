# Upload Module

Version: 1.5.0  
Last Updated: 2026-02-13  

---

# 1. Upload Methods

Cho phép:

- Click chọn file
- Drag & Drop file vào Dropzone

Chỉ chấp nhận:

- .srt

---

# 2. Upload Flow

Khi chưa có project:

idle  
→ uploading  
→ analyzing  
→ success  

---

# 3. Drag & Drop

Dropzone phải:

- Highlight khi drag vào
- Validate file type
- Hiển thị lỗi nếu không phải .srt

---

# 4. Replace Existing Project

Nếu segments.length > 0:

Không được upload trực tiếp.

Phải hiển thị modal xác nhận.

---

Modal:

Bạn đang có một project đang mở.  
Bạn có muốn xóa file hiện tại và upload file mới không?

---

Nếu Cancel:

Không làm gì.

---

Nếu Confirm:

1. Clear project
2. projectState → uploading
3. Parse file mới
4. Analyze
5. projectState → success
6. Set activeFileName = file mới

---

# 5. Sau Upload Thành Công

Bắt buộc:

- activeFileName = originalFile.name
- Render Global File Header
- Load Editor
- Load Analyzer
- Load Histogram

---

# 6. Clear Integration

Khi Clear Project được kích hoạt:

Upload module phải:

- Reset về idle
- Hiển thị Dropzone trống
- Không giữ tên file cũ
- Không giữ metadata

---

End of file.