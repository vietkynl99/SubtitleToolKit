# FEATURE: History & Settings
**Version:** 1.2.0  
**Last Updated:** 2026-02-13  
**Changelog:**
- Thêm cấu hình CPS threshold.
- Cập nhật default severity range.
- Clear Project không xóa Settings và History (v1.2.0).

## 1. History Requirements
- Lưu Project tự động vào LocalStorage/IndexedDB.
- Version History tối đa 10 bản backup gần nhất.

## 2. Settings Requirements
... (giữ nguyên các mục cũ)

## 3. Clear Project Behavior (v1.2.0)
Khi thực hiện Clear Project:
- **Phải xóa:** Project hiện tại trong memory, cache segment, temporary split files, temporary AI results.
- **Không xóa:** Saved projects trong History, Settings, CPS thresholds, AI model preference.
- **State Flow:** `success` → `clear-confirm` → `processing` → `idle` (Upload screen).