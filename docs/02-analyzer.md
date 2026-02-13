# FEATURE: Subtitle Analyzer
**Version:** 1.4.0  
**Last Updated:** 2026-02-13  
**Changelog:**
- Thêm CPS Detailed Distribution (Histogram).
- Bổ sung thống kê CPS theo khoảng giá trị.
- Thêm biểu đồ phân phối CPS chi tiết.
- Thêm quy tắc Trim Empty Edge Buckets (v1.4.0).

## 1. Mục tiêu
Định lượng chất lượng phụ đề và cung cấp trạng thái phân loại cho từng segment để phục vụ filter trong Editor dựa trên các ngưỡng có thể cấu hình và thống kê phân phối CPS.

## 2. Logic Requirements (Updated v1.4.0)
### CPS Detailed Distribution (Histogram)
Ngoài phân loại Safe / Warning / Critical, hệ thống phải thống kê phân bố CPS theo khoảng giá trị cố định.

**Default CPS Buckets (Step 5):**
0–5, 5–10, 10–15, 15–20, 20–25, 25–30, 30–35, 35–40, 40–45, 45+

### CPS Distribution – Rendering Rules (v1.4.0)
**1. Trim Empty Edge Buckets**
- Histogram không được hiển thị các bucket rỗng ở hai đầu biểu đồ.
- Nếu dữ liệu chỉ tập trung ở dải 15–30, các bucket 0–15 và 30–45+ sẽ không được render.
- **Không xóa bucket rỗng ở giữa:** Nếu dải dữ liệu là 10–30 nhưng bucket 15–20 rỗng, bucket đó vẫn phải hiển thị để giữ tính liên tục.

**2. Edge Cases**
- Nếu chỉ có 1 bucket có dữ liệu: Chỉ hiển thị 1 cột duy nhất.
- Nếu toàn bộ bucket rỗng: Hiển thị thông báo "Không có dữ liệu CPS để hiển thị."

### Metadata bổ sung cho Analyzer
Analyzer phải trả thêm:
- `cpsHistogram` (object)
- `minCPS`
- `maxCPS`
- `avgCPS`
- `medianCPS`

## 3. UI Requirements
### Histogram Chart
- Dạng: Vertical Bar Chart.
- Trục X: CPS Range.
- Trục Y: Số segment.
- Tương tác: Click vào một bucket để filter Segment List theo CPS range đó.
- Trục X tự động co lại theo số bucket thực tế (Trim logic).

## 4. Performance Requirement
Histogram phải được tính trong ≤ 200ms với file 3000 segment. Trim logic phải O(n) theo số bucket.