# FEATURE: Settings

Version: 1.8.0  
Last Updated: 2026-02-14  

Changelog:
- v1.8.0: Thêm cấu hình AI Translation Batch Size (mặc định 100).
- v1.7.0: Cấu hình CPS Threshold và Optimization Mode.

---

# 1. Mục tiêu

Cho phép người dùng cấu hình các thông số hệ thống để tối ưu hóa:

- Phân loại CPS
- Auto Fix
- Optimization
- AI Translation batching

❌ Không có History  
❌ Không lưu project history

---

# 2. CPS Threshold Settings (CRITICAL)

Cho phép user cấu hình:

- safeMax (mặc định: 25)
- warningMax (mặc định: 40)

Logic phân loại:

safe: cps < safeMax  
warning: safeMax ≤ cps ≤ warningMax  
critical: cps > warningMax  

---

# 3. AI Translation Settings (NEW – v1.8.0)

## 3.1 Batch Size

Cho phép cấu hình:

- translationBatchSize (mặc định: 100)

Giới hạn hợp lệ:

- Tối thiểu: 10
- Tối đa: 500
- Chỉ chấp nhận số nguyên
- Không chấp nhận giá trị rỗng
- Không chấp nhận số âm hoặc 0

## 3.2 Ảnh hưởng

Batch Size được áp dụng khi click "AI Dịch Toàn Bộ".
Không thay đổi batch đang chạy.
Chỉ áp dụng cho lần dịch mới.

---

# 4. State Structure

settingsState ví dụ:

```json
{
  "cpsThreshold": {
    "safeMax": 25,
    "warningMax": 40
  },
  "autoFixOnUpload": false,
  "optimizationMode": "safe",
  "translationBatchSize": 100
}
```

---

# 5. Recalculation Rule (STRICT)

Khi user thay đổi CPS Threshold:

Hệ thống bắt buộc:

1. Cập nhật settingsState
2. Trigger re-run Analyzer
3. Cập nhật lại:
   - segment.level
   - histogram
   - safe / warning / critical counters
4. Re-render Segment List

Không được giữ level cũ.

---

# 6. Không được làm

❌ Không chỉ đổi màu UI mà không re-classify  
❌ Không cache level theo threshold cũ  
❌ Không yêu cầu user reload file  
❌ Không tự động thay đổi batch size nếu user đã cấu hình  

Re-analyze phải diễn ra realtime.

---

End of file.