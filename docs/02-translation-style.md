# MODULE: Translation Style (DNA)

Version: 4.0.0
Last Updated: 2026-02-23

---

# 1. Mục tiêu

Cung cấp "hệ gen" phong cách cho AI trước khi dịch, đảm bảo:

* Xưng hô đồng nhất
* Từ vựng phù hợp thể loại
* Mức độ hài hước phù hợp
* Nhất quán xuyên suốt toàn bộ dự án

Hệ thống hoạt động theo mô hình AI-first, giảm cấu hình thủ công và cho phép chỉnh sửa trực tiếp trong UI.

---

# 2. Input: Title / Summary Field

## 2.1 Mô tả

UI cung cấp một ô nhập văn bản: **Title / Summary**.

User có thể nhập:

* Tiêu đề gốc
* Tiêu đề đã dịch
* Hoặc bản tóm tắt nội dung phim (khuyến nghị)

Ví dụ:

* "Tu tiên thiếu niên trọng sinh báo thù"
* "Một thiếu niên bị phản bội, trọng sinh và tu luyện để báo thù gia tộc"

---

# 3. AI Analysis Flow

Khi user bấm **Analyze**, hệ thống sẽ:

## 3.1 Phân tích nội dung đầu vào

AI đọc Title/Summary và suy luận:

* **Genres** (1–5 thể loại phù hợp)
* **Tone** (1–5 sắc thái chính)
* **Humor Level** (0–10)

## 3.2 Chuẩn hóa dữ liệu

AI chỉ được phép trả về danh sách từ bộ taxonomy nội bộ để đảm bảo nhất quán.

Ví dụ kết quả:

* **Genres:** Tu tiên, Huyền huyễn, Trả thù
* **Tone:** Nghiêm túc, Bi tráng
* **Humor Level:** 3

---

# 4. UI/UX: Editable Tag System (Giống giao diện Tag/Keyword)

## 4.1 Mô hình hiển thị

Genres và Tone được hiển thị dưới dạng **tag chips** (giống UI keyword/tag):

* Mỗi mục là một "chip"
* Có nút ❌ để xóa
* Có thể chỉnh sửa trực tiếp
* Có thể thêm mới bằng cách gõ và nhấn Enter
* Ngăn trùng lặp tự động
* Giới hạn tối đa 5 tag cho mỗi nhóm

Ví dụ hiển thị:

Genres:
[ Tu tiên ✕ ] [ Huyền huyễn ✕ ] [ Trả thù ✕ ]

Tone:
[ Nghiêm túc ✕ ] [ Bi tráng ✕ ]

Humor Level:
Thanh slider từ 0 → 10 (có thể kéo chỉnh trực tiếp)

---

## 4.2 Hành vi chỉnh sửa

User có thể:

* Xóa tag AI đề xuất
* Thêm tag mới thủ công
* Sửa lại tag bằng cách xóa và nhập lại
* Điều chỉnh Humor Level bằng slider

Khi user chỉnh sửa:

* Không cần bấm Analyze lại
* Preset được cập nhật realtime
* Không khóa dữ liệu theo AI output

---

## 4.3 Cơ chế Validation

* Chỉ cho phép tag nằm trong taxonomy nội bộ
* Nếu nhập tag ngoài taxonomy → hiển thị gợi ý thay thế
* Không cho phép trùng lặp trong cùng nhóm
* Nếu vượt quá 5 tag → hiển thị cảnh báo

---

# 5. Preset JSON Structure

Sau khi phân tích (và/hoặc user chỉnh sửa), toàn bộ dữ liệu sẽ được lưu vào preset dưới dạng:

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

## 5.1 Nguyên tắc lưu trữ

* `title_or_summary` luôn được lưu làm context reference.
* `genres` và `tone` phản ánh trạng thái cuối cùng sau khi user chỉnh sửa.
* `humor_level` luôn là giá trị integer 0–10.
* Không lưu metadata UI (không lưu trạng thái chip, focus, v.v.).

---

# 6. Runtime Usage

Trong quá trình dịch:

* AI sẽ đọc preset trước mỗi batch.
* **Humor Level** điều chỉnh mức độ "thoát ý".
* **Tone** quyết định xưng hô, nhịp câu, mức độ cảm xúc.
* **Genres** ảnh hưởng tới từ vựng chuyên ngành.
* **Title/Summary** không hiển thị khi dịch nhưng luôn dùng làm nền ngữ cảnh.

Preset được coi là "DNA" cố định của toàn bộ series.

---

# 7. Import / Export

Hỗ trợ:

* Export preset thành `.json`
* Import preset để áp dụng cho tập khác trong cùng dự án

## 7.1 Khi Import

* Ghi đè toàn bộ Translation Style hiện tại
* Không merge từng phần
* UI chip sẽ render lại toàn bộ theo dữ liệu mới

---

End of file.
