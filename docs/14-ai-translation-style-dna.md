# FEATURE: AI Translation Style DNA

Version: 2.3.0  
Last Updated: 2026-02-14  

---

# 1. Mục tiêu

Cung cấp khả năng cấu hình phong cách dịch sáng tạo và chính xác hơn cho AI.  
Sử dụng metadata để AI hiểu được tone giọng, thể loại và mức độ hài hước của tác phẩm.  
Hệ thống cung cấp tính năng phân tích tự động dựa trên tên file.

---

# 2. Cấu trúc State (TranslationPreset)

```json
{
  "title_original": "string",
  "title_vi": "string",
  "genres": ["string"],
  "tone": ["string"],
  "humor_level": 0-10
}
```

---

# 3. Quy trình Phân tích tự động (Automated Discovery)

## 3.1 Trigger
Người dùng click: `Analyze Title`

## 3.2 Flow xử lý (STRICT)

1. **Bước 1:** Clean tên file (xóa .srt và các prefix/suffix kỹ thuật).
2. **Bước 2:** AI trích xuất tiêu đề thực tế từ chuỗi đã clean.
3. **Bước 3:** Nếu tiêu đề là tiếng Trung → AI dịch tiêu đề sang tiếng Việt.
4. **Bước 4:** AI phân tích tiêu đề (Việt/Trung) để xác định:
   - Genres (đa lựa chọn)
   - Tones (đa lựa chọn)
   - Humor Level
5. **Bước 5:** Lưu vào state `translationPreset`.

---

# 4. UI Requirements (PresetPage)

## 4.1 Trình bày Work Identity
Hiển thị tiêu đề gốc và tiêu đề Việt hóa một cách trang trọng (Card lớn).

## 4.2 Trình bày Style Configuration (STYLE CONFIGS)
- **Genres:** Hiển thị dưới dạng tags. Trong Edit Mode, cho phép chọn từ danh sách gợi ý.
- **Tones:** Hiển thị dưới dạng tags. Trong Edit Mode, cho phép chọn từ danh sách gợi ý.
- **Humor Intensity:** Hiển thị thanh slider 0-10.

## 4.3 Chế độ Edit/View
- Mặc định ở chế độ View (chỉ hiển thị các tag đã chọn).
- Bấm "Edit Style" để mở danh sách đầy đủ để chọn lại.
- Bấm "Done Editing" để quay về View Mode.

## 4.4 Actions
- **Export JSON:** Xuất preset ra file .json.
- **Import Preset:** Nạp preset từ file .json.
- **Re-analyze:** Chạy lại quy trình phân tích tự động.

---

# 5. Danh sách gợi ý (Suggestions)

## 5.1 Genres
Tu tiên, Tiên hiệp, Huyền huyễn, Hệ thống, Xuyên không, Trọng sinh, Dị giới, Dị năng, Thần thoại, Quỷ dị, Huyền nghi, Mạt thế, Đô thị, Tổng tài, Thương chiến, Hắc đạo, Gia đấu, Học đường, Showbiz, Hành động, Chiến đấu, Sinh tồn, Báo thù, Trinh thám, Kịch tính, Hài hước, Hài hước đen, Parody, Châm biếm.

## 5.2 Tones
Trang trọng, Hào hùng, Huyền ảo, Bí ẩn, U ám, Lạnh lùng, Kiêu ngạo, Thực tế, Đời thường, Phóng khoáng, Hài hước, Mỉa mai, Châm biếm, Kịch tính, Nghiêm túc.

---

# 6. Tích hợp với AI Translation

Khi người dùng bấm "AI Dịch Toàn Bộ":
1. Hệ thống bắt buộc kiểm tra xem đã có `translationPreset` chưa.
2. Nếu chưa → Yêu cầu người dùng cấu hình Style trước.
3. Nếu đã có → Gửi kèm thông tin Style DNA vào prompt của Gemini.

---

# 7. Không được làm

❌ Không được bỏ qua phong cách dịch nếu người dùng đã cấu hình.  
❌ Không được reset Style khi upload file mới (nếu tên file giống nhau - Optional).  
❌ Không được ép người dùng dùng Style mặc định mà không cho sửa.  

---

End of file.