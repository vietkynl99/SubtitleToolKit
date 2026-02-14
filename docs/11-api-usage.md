# FEATURE: API Usage Dashboard

Version: 1.0.0  
Last Updated: 2026-02-14  

---

# 1. Mục tiêu

Hiển thị rõ ràng mức sử dụng API theo từng tính năng AI.

Không yêu cầu tính toán quota.
Không yêu cầu kiểm soát request.
Chỉ hiển thị thống kê usage.

---

# 2. Vị trí hiển thị

Hiển thị trong menu: Settings  
Section: "API Usage"

Phải luôn hiển thị dữ liệu của Project hiện tại.

---

# 3. Cấu trúc UI

Hiển thị dưới dạng 3 khối riêng biệt:

1. Translation Style
2. AI Translate
3. AI Optimize

Mỗi khối có tiêu đề rõ ràng và được phân tách trực quan.

Không gộp chung.

---

# 4. Thông tin bắt buộc hiển thị

## 4.1 Translation Style

Hiển thị:

- Total Requests
- Total Tokens

Ví dụ:

Translation Style  
Requests: 2  
Tokens: 3,420  

Không hiển thị segment.

---

## 4.2 AI Translate

Hiển thị:

- Total Requests
- Total Tokens
- Total Segments Translated
- Average Tokens per Segment

Ví dụ:

AI Translate  
Requests: 15  
Tokens: 82,450  
Segments Translated: 1,200  
Avg Tokens / Segment: 68.7  

Average phải hiển thị tối đa 1 chữ số thập phân.

---

## 4.3 AI Optimize

Hiển thị:

- Total Requests
- Total Tokens

Ví dụ:

AI Optimize  
Requests: 3  
Tokens: 9,200  

Không hiển thị segment.

---

# 5. Quy tắc hiển thị

- Số token phải có phân cách hàng nghìn (ví dụ: 82,450).
- Không hiển thị số âm.
- Nếu chưa sử dụng thì hiển thị 0.
- Không hiển thị null hoặc undefined.

---

# 6. Reset

Khi "Clear Current Project":

- Toàn bộ thống kê trong API Usage phải reset về 0.

Không ảnh hưởng đến global system.

---

# 7. Không được làm

❌ Không tính toán chi phí tiền.  
❌ Không hiển thị quota còn lại.  
❌ Không hiển thị RPM / TPM / RPD.  
❌ Không gộp các tính năng vào một tổng duy nhất.  

---

# 8. Mục tiêu UX

Người dùng phải nhìn vào và biết ngay:

- Tính năng nào tốn nhiều token nhất.
- Translation đang tiêu tốn bao nhiêu so với phân tích tiêu đề.
- Trung bình mỗi segment tốn bao nhiêu token.

Dashboard phải đơn giản, rõ ràng, không phức tạp.

---

End of file.