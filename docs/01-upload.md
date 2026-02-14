# MODULE: Upload

Version: 2.0.0  
Last Updated: 2026-02-14  

---

# 1. Thông số kỹ thuật
- **Định dạng:** Chỉ chấp nhận `.srt`.
- **Dung lượng:** Tối đa 5MB.
- **Phương thức:** Drag & Drop hoặc Click to Select.

---

# 2. Quy trình Parser (Pipeline)
1. **Validation:** Kiểm tra đuôi file và kích thước.
2. **Naming Logic:** 
   - Sử dụng regex `^\[Edited(\d*)\]` để tách số lần đã sửa.
   - Nếu là `[Edited]` -> count = 1.
   - Nếu là `[Edited15]` -> count = 15.
3. **Content Parsing:** 
   - Tự động tách text Trung (Original) và Việt (Translated) dựa trên Regex ngôn ngữ.
   - Khởi tạo CPS và Severity mặc định.
4. **Auto-fix:** Nếu cài đặt `autoFixOnUpload` bật, hệ thống tự động chuẩn hóa space và ngắt dòng dài ngay lập tức.

---

# 3. Ràng buộc
- Khi có project đang active, upload file mới sẽ trigger **Replace Modal**.
- Sau khi upload thành công, hệ thống tự động chuyển sang tab **Editor**.

---

End of file.