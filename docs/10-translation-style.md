Module: Translation Style
Scope: Preset Configuration Engine
Version: 2.3.0 (Independent Import & Entry Points)

1. MỤC TIÊU

Module Translation Style dùng để cấu hình phong cách dịch cho từng tác phẩm.

Chức năng:

Phân tích và chọn Genre

Phân tích và chọn Tone

Điều chỉnh Humor Intensity

Làm đầu vào cho Translation Engine

⚠️ Translation Style là định hướng mềm.
AI phải ưu tiên nội dung thực tế trong file SRT.

2. QUY ĐỊNH UI (BẮT BUỘC)
2.1 Header

Tiêu đề section phải là:

STYLE CONFIGS


Không được hiển thị:

STYLEDNA CONFIG

STYLE CONFIG

Bất kỳ biến thể nào khác

3. CHẾ ĐỘ HIỂN THỊ (STATE MANAGEMENT)

Module có đúng 2 chế độ:

View Mode (mặc định)

Edit Mode

Không được tự ý tạo thêm chế độ khác.

3.1 VIEW MODE (MẶC ĐỊNH)

Đây là trạng thái mặc định sau khi:

Load preset

Phân tích xong

Done Editing

Re-analyze hoàn tất

Trong View Mode:

GENRES

Chỉ hiển thị các phần tử trong:

preset.genres


Không hiển thị full danh sách

Không hiển thị unselected options

Không có scrollbar

Không render danh sách gốc

TONES

Chỉ hiển thị các phần tử trong:

preset.tone


Không hiển thị full danh sách

Không có scroll

Không hiển thị tone chưa chọn

HUMOR INTENSITY

Hiển thị slider

Không thay đổi hành vi hiện tại

⚠️ View Mode là chế độ tóm tắt preset (Preset Summary).
Không được hiển thị toàn bộ lựa chọn trong chế độ này.

3.2 EDIT MODE

Edit Mode chỉ được kích hoạt khi:

Người dùng bấm Edit

Hoặc chủ động mở chế độ chỉnh sửa

Trong Edit Mode:

Hiển thị full danh sách Genre

Hiển thị full danh sách Tone

Cho phép chọn/bỏ chọn

Có thể có scroll nếu danh sách dài

Khi người dùng bấm:

DONE EDITING


Phải:

setIsEditing(false)


Và quay về View Mode.

4. RE-ANALYZE (HÀNH VI BẮT BUỘC)

Khi người dùng bấm:

RE-ANALYZE


Flow bắt buộc:

Gọi AI phân tích title

Cập nhật:

preset.genres
preset.tone
preset.humor_level


Sau khi cập nhật xong:

setIsEditing(false)


⚠️ RE-ANALYZE KHÔNG được giữ nguyên Edit Mode. Sau khi phân tích xong, UI phải quay về View Mode.

5. STATE LOGIC BẮT BUỘC

Phải có state rõ ràng:

const [isEditing, setIsEditing] = useState(false)


Render phải theo cấu trúc:

{isEditing ? (
  <FullSelectableList />
) : (
  <SelectedOnlyView />
)}


6. GENRE
6.1 Cơ chế lưu
"genres": []


Cho phép nhiều giá trị.

7. TONE
7.1 Cơ chế lưu
"tone": []


Cho phép nhiều tone.

8. HUMOR INTENSITY

Giá trị từ 0–10:

"humor_level": 0-10


9. KHÔNG TỰ ĐỘNG PHÂN TÍCH

Hệ thống:

Không auto phân tích khi upload file

Chỉ phân tích khi bấm Analyze hoặc Re-analyze

10. JSON STRUCTURE

Ví dụ preset:

{
  "genres": ["Hệ thống", "Xuyên không"],
  "tone": ["Huyền ảo", "Bí ẩn"],
  "humor_level": 4
}


File preset phải có format:

[Preset] <OriginalTitleAfterClean>.json

11. NGUYÊN TẮC CUỐI

Translation Style là hệ cấu hình định hướng linh hoạt.

12. IMPORT PRESET (BẮT BUỘC HOẠT ĐỘNG ĐỘC LẬP)
12.1 Nguyên tắc

Import preset phải hoạt động độc lập với trạng thái phân tích title.

Không được phụ thuộc vào việc đã bấm Analyze hay chưa.

12.2 Trường hợp CHƯA phân tích title

Nếu chưa có preset, UI bắt buộc hiển thị đồng thời:

Analyze Title (primary)

Import Preset (secondary)

Import không được bị disable.

12.3 Flow đúng khi Import
Parse file JSON -> Cập nhật preset -> setIsEditing(false) -> Chuyển sang View Mode.

12.4 Không được khóa Import
Không được ẩn hoặc disable nút Import khi chưa phân tích.

13. ENTRY POINTS HỢP LỆ

Translation Style có 3 cách để có dữ liệu (hoạt động độc lập):

Analyze Title

Import Preset

Load preset có sẵn từ project

14. PRIORITY

Imported preset > Previous analyze result.

🎯 KẾT QUẢ MONG MUỐN
Trạng thái ban đầu: Hiển thị cả Analyze và Import. Sau khi Import: Hiển thị preset ngay ở View Mode, không cần Analyze.