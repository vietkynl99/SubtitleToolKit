# MASTER REQUIREMENT: Subtitle Toolkit
**Version:** 1.5.0  
**Last Updated:** 2026-02-13  
**Status:** Approved  
**Changelog:**
- Thêm CPS Histogram vào Quality Dashboard.
- Bổ sung thống kê toán học đầy đủ (Min, Max, Average, Median).
- Thêm tính năng Clear Current Project (v1.4.0).
- Bổ sung Clear Project Execution Flow (v1.5.0).

## 1. Product Overview
### Mục tiêu sản phẩm
Xây dựng một nền tảng web chuyên dụng để dịch và tối ưu hóa phụ đề từ tiếng Trung sang tiếng Việt, kết hợp giữa thuật toán xử lý tại chỗ (Local) và trí tuệ nhân tạo (AI).

---

## 5. UI Layout Tổng Thể (Updated v1.5.0)
Trong Control Panel → Analyzer Section phải gồm:

**Quality Dashboard:**
- Safe, Warning, Critical counts.
- Total Lines.

**CPS Distribution:**
- Severity Chart (Safe/Warning/Critical).
- Detailed CPS Histogram (step 5).

**CPS Statistics:**
- Min, Max, Average, Median.

**Global Project Reset – Clear SRT (v1.5.0):**

### 1. Execution Flow (BẮT BUỘC)
- **Khi user click “Clear Current Project”:** Hiển thị Confirmation Modal. Nếu Confirm, chuyển state global → `clearing`, disable UI và hiển thị loading spinner.
- **Sau khi Clear thành công:** 
    - Reset Global State (segments, analyzerData, histogram, translationCache, splitFiles, progress = 0%).
    - UI Reset: Unmount Editor/Analyzer/Split Panel, Mount lại Upload View.
    - Navigation: Scroll lên đầu trang, focus vào Dropzone.
    - Feedback: Hiển thị Toast "Project đã được xóa." trong 2-3 giây.
- **Không reset:** Settings, History.

### 2. State Flow
`success` → `confirm-clear` → `clearing` → `idle`.

---

## 6. Non-functional Requirements
- **Performance:** Xử lý file 1000 dòng trong < 5 giây. Histogram calculation < 200ms.
- **Persistence:** Lưu trạng thái vào LocalStorage. Clear project không xóa Settings/History.