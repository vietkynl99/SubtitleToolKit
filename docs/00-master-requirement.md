# MASTER REQUIREMENT: Subtitle Toolkit
**Version:** 1.3.0  
**Last Updated:** 2026-02-13  
**Status:** Approved  
**Changelog:**
- Thêm CPS Histogram vào Quality Dashboard.
- Bổ sung thống kê toán học đầy đủ (Min, Max, Average, Median).

## 1. Product Overview
### Mục tiêu sản phẩm
Xây dựng một nền tảng web chuyên dụng để dịch và tối ưu hóa phụ đề từ tiếng Trung sang tiếng Việt, kết hợp giữa thuật toán xử lý tại chỗ (Local) và trí tuệ nhân tạo (AI).

---

## 5. UI Layout Tổng Thể (Updated v1.3.0)
Trong Control Panel → Analyzer Section phải gồm:

**Quality Dashboard:**
- Safe, Warning, Critical counts.
- Total Lines.

**CPS Distribution:**
- Severity Chart (Safe/Warning/Critical).
- Detailed CPS Histogram (step 5).

**CPS Statistics:**
- Min, Max, Average, Median.

---

## 6. Non-functional Requirements
- **Performance:** Xử lý file 1000 dòng trong < 5 giây. Histogram calculation < 200ms.
- **Limits:** File tối đa 5MB.
- **Persistence:** Lưu trạng thái vào LocalStorage.