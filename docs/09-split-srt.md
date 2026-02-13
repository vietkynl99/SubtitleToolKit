# FEATURE: Split SRT
**Version:** 1.5.0  
**Last Updated:** 2026-02-13  
**Status:** Approved

## Changelog
- **Version 1.0.0:** Khởi tạo yêu cầu tính năng Split SRT (Duration, Count, Manual Timestamp).
- **Version 1.1.0:** Bổ sung chế độ **Manual Range Split Mode** (Chia theo phạm vi số thứ tự segment).
- **Version 1.2.0:** Nâng cấp Preview trong Split Modal. Hiển thị chi tiết: Start Time, End Time, Segments, Duration.
- **Version 1.3.0:** Bổ sung hành vi bắt buộc sau khi nhấn “Xác nhận Split”. Định nghĩa rõ UI feedback, state transition và danh sách Generated Files.
- **Version 1.4.0:** Bổ sung quy định hiển thị thông tin Range (Metadata Header) ở đầu file sau khi Split.
- **Version 1.5.0:** Bổ sung quy tắc đặt tên file sau khi Split theo format `[split ...] <original-name>.srt`.

## 1. Mục tiêu
Cung cấp công cụ cho phép người dùng chia nhỏ một file phụ đề SRT lớn thành nhiều file nhỏ hơn để dễ dàng quản lý, phân phối hoặc upload lên các nền tảng có giới hạn thời lượng/dung lượng. Tác vụ này chỉ thay đổi cấu trúc đóng gói, không can thiệp vào nội dung văn bản hoặc logic AI.

## 2. Vị trí trong System Flow
- **Giai đoạn:** Bước tùy chọn (Optional) sau khi đã hoàn tất Edit/Translate và trước khi thực hiện Export.
- **Tính chất:** Không làm thay đổi dữ liệu gốc trong phiên làm việc hiện tại cho đến khi thực hiện lệnh Export Split.

## 3. Split Output – File Naming Rules (v1.5.0)

### 1. Quy tắc đặt tên bắt buộc
Sau khi split, file mới phải có tên theo format:
`[split <type> <range/info>] <original-file-name>.srt`

### 2. Ví dụ cụ thể
- **Manual Range Mode:** `[split range 100 to 1000] movie.srt`
- **Duration Mode:** `[split 00-10min] movie.srt`
- **Count Mode:** `[split 1 to 200] movie.srt`

### 3. Quy tắc chung
- Giữ nguyên tên file gốc (originalFileName).
- Không lồng prefix (nếu split nhiều lần, luôn dùng tên gốc làm base).
- Prefix đặt ở đầu, có dấu cách trước tên gốc.
- Extension luôn là `.srt`.

## 4. Split Output – Metadata Header Rules
Metadata Header (v1.4.0) vẫn được áp dụng ở đầu file, bao gồm: Range, Start, End, Segments, và Duration.

## 5. Confirm Split – Required Behavior
- Chuyển state sang `processing`.
- Disable toàn bộ input trong modal.
- Hiển thị loading spinner trên nút Confirm.
- Sau khi thành công: Hiển thị thông báo, thêm vào danh sách **"Generated Files"** và đóng modal.

## 6. State Flow
`idle` → `calculating` → `ready` → `processing` (khi Confirm) → `success` (đóng modal + update list).