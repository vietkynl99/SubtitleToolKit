# RULE: File Naming Standard

Version: 1.0.0  
Last Updated: 2026-02-14  

---

# 1. Định dạng Prefix: [Edited]
Hệ thống áp dụng quy tắc tiền tố duy nhất để theo dõi phiên bản:
- Lần xuất (export) đầu tiên: `[Edited]Filename.srt` (tương đương count = 1).
- Lần xuất thứ hai: `[Edited2]Filename.srt`.
- Lần xuất thứ X: `[EditedX]Filename.srt`.

---

# 2. Logic Xử lý
- **Khi Upload:** Parser tự động bóc tách số `X`. Nếu không thấy prefix, count mặc định là 0.
- **Khi Export:** Hệ thống lấy `currentCount + 1` để tạo tên file mới.
- **Ràng buộc:** Không chấp nhận số 0 đứng đầu (ví dụ `[Edited02]` là sai).

---

End of file.