# Project File Specification – .sktproject (Version 1.0)

## 1. Tổng quan
Subtitle Toolkit sử dụng định dạng project riêng với phần mở rộng: `.sktproject`. Bên trong file là cấu trúc JSON thuần.
File `.sktproject` dùng để:
- Lưu toàn bộ trạng thái làm việc
- Lưu preset dịch
- Lưu original subtitle
- Lưu translated subtitle
- Cho phép mở lại project và tiếp tục chỉnh sửa

## 2. Cấu trúc .sktproject (v1.0)
```json
{
  "version": "1.0",
  "original_title": "Tên phim hoặc tiêu đề gốc",
  "created_at": "2026-02-14T15:00:00Z",
  "updated_at": "2026-02-14T15:20:00Z",
  "preset": {
    "title_original": "...",
    "title_vi": "...",
    "genres": ["tu tien"],
    "tone": ["dramatic"],
    "humor_level": 7
  },
  "segments": [
    {
      "id": 1,
      "start": "00:00:01,000",
      "end": "00:00:03,000",
      "original": "原文内容",
      "translated": "Nội dung dịch"
    }
  ]
}
```

## 3. Ý nghĩa từng field
### 3.1 Root Level
| Field | Mô tả |
| :--- | :--- |
| **version** | Phiên bản schema (hiện tại: "1.0") |
| **original_title** | Tên nội dung gốc |
| **created_at** | Thời điểm project được tạo (ISO 8601) |
| **updated_at** | Thời điểm project được cập nhật gần nhất |
| **preset** | Snapshot cấu hình dịch (DNA) |
| **segments** | Danh sách toàn bộ subtitle segments |

### 3.2 Preset
Lưu cấu hình tại thời điểm dịch. Preset được lưu snapshot để đảm bảo mở lại project giữ nguyên style cũ và re-translate dùng đúng cấu hình.

### 3.3 Segments
Mỗi subtitle là một object độc lập.
- `translated`: "" → chưa dịch.
- Không lưu meta (CPS, ratio, status…).
- Không lưu timestamp chỉnh sửa từng segment.

## 4. Upload Logic
Hệ thống hỗ trợ upload: `.srt` và `.sktproject`.

### 4.1 Nếu upload .srt
Hệ thống sẽ:
1. Parse file `.srt`.
2. Tạo cấu trúc project trong bộ nhớ.
3. Điền: `original_title` = tên file, `segments[].original` = nội dung từ SRT, `segments[].translated` = "".
4. Gán `created_at` và `updated_at`.

### 4.2 Nếu upload .sktproject
Hệ thống sẽ:
1. Parse JSON.
2. Validate `version === "1.0"` và các fields bắt buộc.
3. Load toàn bộ project state (Preset + Segments).

## 5. Download Logic
Khi người dùng bấm tải xuống, hệ thống cho phép chọn:

### 5.1 Tải .sktproject
- Xuất file JSON đúng cấu trúc v1.0.
- Lưu toàn bộ preset + segments.

### 5.2 Tải .srt
Khi chọn tải `.srt`, hệ thống phải hỏi: "Bạn muốn tải bản nào? Original / Translated".
- **Original:** Xuất file `.srt` từ `segments[].original`.
- **Translated:** Xuất file `.srt` từ `segments[].translated`.

## 6. Nguyên tắc thiết kế
- `.sktproject` là nguồn dữ liệu chính (source of truth).
- `.srt` chỉ là format export.
- Không lưu dữ liệu tính toán (CPS, ratio…). Tất cả dữ liệu có thể tính lại runtime.

## 7. Tương thích tương lai
- Nếu thay đổi cấu trúc: Phải tăng version và giữ backward compatibility nếu có thể.
