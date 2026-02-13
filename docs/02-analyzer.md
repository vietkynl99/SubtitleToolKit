# FEATURE: Subtitle Analyzer

Version: 1.6.0  
Last Updated: 2026-02-13  

Changelog:
- v1.6.0: Analyzer phụ thuộc trực tiếp vào CPS Threshold trong Settings và tự động re-run khi threshold thay đổi.

---

# 1. Mục tiêu

Định lượng chất lượng phụ đề và cung cấp:

- Phân loại Safe / Warning / Critical
- Histogram phân phối CPS
- Thống kê min / max / avg / median
- Dữ liệu phục vụ filter Segment List

Analyzer không thay đổi nội dung text.

---

# 2. CPS Classification Logic (UPDATED)

Analyzer không dùng hard-coded threshold.

Phải đọc từ settingsState.cpsThreshold:

{
  safeMax,
  warningMax
}

Classification:

if (cps < safeMax) → safe  
if (cps <= warningMax) → warning  
else → critical  

Không được hard-code 25 / 40.

---

# 3. Re-run Trigger (CRITICAL)

Analyzer phải re-run khi:

- Upload file mới
- Translation thay đổi làm thay đổi CPS
- Settings.cpsThreshold thay đổi

Không được giữ histogram cũ khi threshold đổi.

---

# 4. Segment Data Update Rule

Analyzer phải cập nhật:

segment.level

Level không được lưu cố định sau upload.

Nó phụ thuộc vào:

- cps
- threshold hiện tại

---

# 5. CPS Histogram

Histogram vẫn dùng bucket cố định:

0–5  
5–10  
10–15  
15–20  
20–25  
25–30  
30–35  
35–40  
40–45  
45+  

Lưu ý:

Histogram không phụ thuộc threshold.

Threshold chỉ ảnh hưởng level (safe/warning/critical), không ảnh hưởng bucket.

---

# 6. Analyzer Output Structure

Analyzer phải trả:

{
  cpsHistogram: object,
  minCPS: number,
  maxCPS: number,
  avgCPS: number,
  medianCPS: number,
  safeCount: number,
  warningCount: number,
  criticalCount: number
}

Các count này phải dựa trên threshold hiện tại.

---

# 7. Integration with Segment List

Filter theo:

- Safe
- Warning
- Critical
- CPS bucket

Khi threshold thay đổi:

- Segment List phải cập nhật level ngay
- Filter đang active vẫn phải hoạt động chính xác
- Không mất translation

---

# 8. Performance Requirement

Re-classify level:

- O(n) theo số segment
- Không tính lại CPS nếu text không đổi
- Chỉ re-map level theo threshold mới

---

# 9. Không được làm

❌ Không hard-code threshold  
❌ Không giữ level từ lần analyze trước  
❌ Không update histogram mà không update level  

Analyzer và Settings phải đồng bộ 100%.

---

End of file.