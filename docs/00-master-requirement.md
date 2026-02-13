# MASTER REQUIREMENT: Subtitle Toolkit
**Version:** 1.7.0  
**Last Updated:** 2026-02-13  
**Status:** Approved  
**Changelog:**
- Thêm CPS Histogram vào Quality Dashboard.
- Bổ sung thống kê toán học đầy đủ (Min, Max, Average, Median).
- Thêm tính năng Clear Current Project (v1.4.0).
- Bổ sung Clear Project Execution Flow (v1.5.0).
- Thêm Project Replacement Rule (v1.6.0).
- Thêm Global File Header Display (v1.7.0).

## 1. Product Overview
### Mục tiêu sản phẩm
Xây dựng một nền tảng web chuyên dụng để dịch và tối ưu hóa phụ đề từ tiếng Trung sang tiếng Việt, kết hợp giữa thuật toán xử lý tại chỗ (Local) và trí tuệ nhân tạo (AI).

---

## 5. UI Layout Tổng Thể (Updated v1.7.0)
Trong Control Panel → Analyzer Section phải gồm:

**Quality Dashboard:**
- Safe, Warning, Critical counts.
- Total Lines.

**CPS Distribution:**
- Severity Chart (Safe/Warning/Critical).
- Detailed CPS Histogram (step 5).

**CPS Statistics:**
- Min, Max, Average, Median.

**Global File Header (v1.7.0):**
- Hiển thị khi `projectState === success`.
- Ẩn khi `idle`, `uploading`, `clearing`.
- Hiển thị: Tên file (truncate > 40 ký tự), Tổng segments, Tổng thời lượng, Encoding (UTF-8).
- Tên file header phải cập nhật nếu project được thay thế hoặc đổi file active.

**Global Project Reset – Clear SRT (v1.5.0):**
... (giữ nguyên các quy tắc execution flow)

**Project Replacement Rule (v1.6.0):**
- Ứng dụng không được phép tồn tại 2 project đồng thời.
- Khi upload file mới trong khi project cũ đang mở, hệ thống **bắt buộc** phải hỏi xác nhận.

---

## 6. Non-functional Requirements
- **Performance:** Xử lý file 1000 dòng trong < 5 giây. Histogram calculation < 200ms.
- **Persistence:** Lưu trạng thái vào LocalStorage. Clear project không xóa Settings/History.