# FEATURE: File Naming Rules

Version: 1.0.0
Last Updated: 2026-02-14

---

# 1. Mục tiêu

Định nghĩa quy tắc đặt tên file khi export.

Toàn bộ hệ thống chỉ sử dụng một prefix duy nhất:

`[Edited]`

Prefix này đại diện cho việc file đã được chỉnh sửa và xuất lại.

Không sử dụng bất kỳ prefix nào khác.

---

# 2. Cấu trúc chuẩn

Tên file khi export phải có dạng:

`[EditedX]<BaseFileName>.srt`

Trong đó:

- **X** là số lần file đã được export.
- Nếu là lần đầu tiên → không hiển thị số (mặc định là 1).

---

# 3. Quy tắc hoạt động

## 3.1 Trường hợp file gốc không có prefix

Ví dụ: `abc.srt`

Sau khi export: `[Edited]abc.srt`

Không hiển thị số 1.

## 3.2 Trường hợp file gốc đã có prefix

Nếu file gốc là: `[Edited]abc.srt`

Sau khi export: `[Edited2]abc.srt`

Nếu tiếp tục export: `[Edited3]abc.srt`

Số phải tăng tuần tự.

---

# 4. Xác định BaseFileName

BaseFileName là phần tên file sau khi loại bỏ prefix hợp lệ ở đầu.

Ví dụ: `[Edited3]movie.srt`

BaseFileName = `movie`

Không được giữ prefix cũ trong BaseFileName.

---

# 5. Nhận diện prefix hợp lệ

Prefix hợp lệ phải có dạng: `[Edited]` hoặc `[Edited<number>]`.

- **Ví dụ hợp lệ:** `[Edited]`, `[Edited2]`, `[Edited15]`
- **Ví dụ không hợp lệ:** `[edited]`, `[EDITED]`, `[Edited_2]`, `[Edited01]` (không dùng số có số 0 đứng đầu)

Chỉ chấp nhận đúng format chuẩn (Case sensitive).

---

# 6. Quy tắc bắt buộc

✔ Prefix luôn ở đầu file  
✔ Không bao giờ lặp prefix liên tiếp  
✔ Không bao giờ tạo: `[Edited][Edited]abc.srt`  
✔ Không bao giờ append prefix vào cuối  
✔ Không bao giờ tạo: `abc_[Edited].srt`  
✔ Không được reset số  
✔ Không được bỏ qua số hiện tại nếu đã tồn tại  

---

# 7. Ví dụ đầy đủ

| File gốc | File sau export |
| :--- | :--- |
| `abc.srt` | `[Edited]abc.srt` |
| `[Edited]abc.srt` | `[Edited2]abc.srt` |
| `[Edited2]abc.srt` | `[Edited3]abc.srt` |
| `[Edited15]movie.srt` | `[Edited16]movie.srt` |

---

# 8. Phạm vi áp dụng

Quy tắc này áp dụng cho mọi hành động export file trong hệ thống, bao gồm:

- Sau khi AI Translate
- Sau khi AI Optimize
- Sau khi chỉnh sửa thủ công
- Sau khi Fix CPS

Mọi export đều phải tuân thủ quy tắc này.

---

End of file.