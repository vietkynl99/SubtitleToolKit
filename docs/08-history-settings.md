# FEATURE: Settings

Version: 1.7.0  
Last Updated: 2026-02-13  

---

# 1. Mục tiêu

Cho phép người dùng cấu hình các thông số hệ thống để tối ưu hóa:

- Phân loại CPS
- Auto Fix
- Optimization

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

# 3. State Structure

settingsState ví dụ:

{
  cpsThreshold: {
    safeMax: number,
    warningMax: number
  },
  autoFixOnUpload: boolean,
  optimizationMode: "safe" | "aggressive"
}

---

# 4. Recalculation Rule (STRICT)

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

# 5. Không được làm

❌ Không chỉ đổi màu UI mà không re-classify  
❌ Không cache level theo threshold cũ  
❌ Không yêu cầu user reload file  

Re-analyze phải diễn ra realtime.

---

End of file.