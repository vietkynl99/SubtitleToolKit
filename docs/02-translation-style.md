# MODULE: Translation Style (DNA)

Version: 3.1.0
Last Updated: 2026-02-18

---

# 1. Mục tiêu
Cung cấp "hệ gen" phong cách cho AI trước khi dịch, đảm bảo:
- Xưng hô đồng nhất
- Từ vựng phù hợp thể loại
- Mức độ hài hước phù hợp
- Nhất quán xuyên suốt toàn bộ dự án

Hệ thống hoạt động theo mô hình AI-first, giảm cấu hình thủ công.

---

# 2. Input: Title / Summary Field
## 2.1 Mô tả
UI cung cấp một ô nhập văn bản: **Title / Summary**.
User có thể nhập:
- Tiêu đề gốc
- Tiêu đề đã dịch
- Hoặc bản tóm tắt nội dung phim (khuyến nghị)

Ví dụ: 
- "Tu tiên thiếu niên trọng sinh báo thù"
- "Một thiếu niên bị phản bội, trọng sinh và tu luyện để báo thù gia tộc"

---

# 3. AI Analysis Flow
Khi user bấm **Analyze**, hệ thống sẽ:

## 3.1 Phân tích nội dung đầu vào
AI đọc Title/Summary và suy luận:
- **Genres** (1–5 thể loại phù hợp)
- **Tone** (nghiêm túc, hài hước, dark, bi tráng, v.v.)
- **Humor Level** (0–10)

## 3.2 Chuẩn hóa dữ liệu
AI chỉ được phép trả về danh sách từ bộ taxonomy nội bộ để đảm bảo nhất quán.

Ví dụ kết quả:
- **Genres:** Tu tiên, Huyền huyễn, Trả thù.
- **Tone:** Nghiêm túc, Bi tráng.
- **Humor Level:** 3.

---

# 4. Preset JSON Structure
Sau khi phân tích, toàn bộ dữ liệu sẽ được lưu vào preset dưới dạng:

```json
{
  "reference": {
    "title_or_summary": "Một thiếu niên bị phản bội, trọng sinh và tu luyện để báo thù gia tộc"
  },
  "genres": ["Tu tiên", "Huyền huyễn", "Trả thù"],
  "tone": ["Nghiêm túc", "Bi tráng"],
  "humor_level": 3
}
```

**Lưu ý:**
- `title_or_summary` luôn được lưu để làm context reference cho các lần dịch sau.
- Humor Level có thể chỉnh tay nếu user muốn override sau khi AI phân tích.
- Preset có thể tái sử dụng cho toàn bộ series.

---

# 5. Runtime Usage
Trong quá trình dịch:
- AI sẽ đọc preset trước mỗi batch.
- **Humor Level** điều chỉnh mức độ "thoát ý".
- **Tone** quyết định xưng hô và nhịp câu.
- **Genres** ảnh hưởng tới từ vựng chuyên ngành.
- **Title/Summary** không hiển thị trong UI khi dịch nhưng luôn được dùng làm nền tảng ngữ cảnh.

---

# 6. Import / Export
Hỗ trợ:
- Export preset thành `.json`
- Import preset để áp dụng cho tập khác trong cùng dự án

**Khi import:**
- Ghi đè toàn bộ Translation Style hiện tại.
- Không merge từng phần.

---

End of file.