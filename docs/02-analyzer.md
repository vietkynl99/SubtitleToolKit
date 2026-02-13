# FEATURE: Subtitle Analyzer

Version: 1.5.0  
Last Updated: 2026-02-13  

Changelog:
- v1.4.0: Thêm Detailed CPS Distribution + Trim Empty Edge Buckets.
- v1.5.0: Đồng bộ Analyzer với Segment List hiển thị Translation.

---

# 1. Mục tiêu

Định lượng chất lượng phụ đề và cung cấp:

- Phân loại Safe / Warning / Critical
- Histogram phân phối CPS
- Thống kê min / max / avg / median
- Dữ liệu phục vụ filter Segment List

Analyzer không thay đổi nội dung text.

---

# 2. CPS Classification Logic

Mặc định:

safe: <25  
warning: 25–40  
critical: >40  

Ngưỡng này có thể thay đổi trong Settings.

Analyzer phải đọc ngưỡng hiện tại từ Settings.

---

# 3. CPS Detailed Distribution (Histogram)

Default Buckets (step 5):

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

---

# 4. Histogram Rendering Rules

## 4.1 Trim Empty Edge Buckets

- Không hiển thị bucket rỗng ở hai đầu.
- Không xóa bucket rỗng ở giữa.
- Nếu chỉ có 1 bucket có dữ liệu → chỉ render 1 cột.
- Nếu toàn bộ rỗng → hiển thị:
  "Không có dữ liệu CPS để hiển thị."

---

# 5. Analyzer Output Structure

Analyzer phải trả:

{
  cpsHistogram: object,
  minCPS: number,
  maxCPS: number,
  avgCPS: number,
  medianCPS: number
}

---

# 6. Integration with Segment List

Analyzer không phụ thuộc vào việc segment có translation hay không.

Filter theo:

- Safe
- Warning
- Critical
- CPS bucket

Phải giữ nguyên translation đang hiển thị trong Segment List.

Filter chỉ thay đổi danh sách segment được render, không thay đổi dữ liệu segment.

---

# 7. Performance Requirement

- Tính histogram ≤ 200ms với 3000 segment.
- Trim logic phải O(n) theo số bucket.
- Không re-calc toàn bộ khi chỉ thay đổi translation text.

---

# 8. Click Behavior

Click vào bucket trong histogram:

- Filter Segment List theo CPS range.
- Không reset scroll position nếu có thể.
- Không mất translation đã hiển thị.

---

End of file.
