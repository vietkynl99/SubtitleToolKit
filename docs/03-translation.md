# FEATURE: AI Translation

Version: 1.1.0  
Last Updated: 2026-02-13  

Changelog:
- v1.1.0: Bắt buộc hiển thị translation trực tiếp trong Segment List (không cần click từng segment).

---

# 1. Mục tiêu

Dịch toàn bộ nội dung phụ đề từ tiếng Trung sang tiếng Việt bằng AI.

Sau khi dịch, toàn bộ kết quả phải được hiển thị ngay trong danh sách segment mà không cần chọn từng segment để xem.

---

# 2. User Interaction Flow

1. Click "AI Dịch Toàn Bộ".
2. Theo dõi thanh tiến trình.
3. Translation được cập nhật realtime vào từng segment.
4. Segment List hiển thị ngay bản dịch.

---

# 3. Logic Requirements

## 3.1 Batching

- Chia file thành nhóm 10–20 dòng để gửi API.
- Tránh timeout và token limit.

## 3.2 Context

- Gửi kèm 2 dòng trước và sau để AI hiểu ngữ cảnh.

## 3.3 Glossary (Optional)

- Áp dụng bảng từ vựng nếu có.

---

# 4. Segment Data Structure

Mỗi segment phải có cấu trúc:

{
  id: number,
  start: string,
  end: string,
  original: string,
  translation: string | null,
  cps: number,
  level: "safe" | "warning" | "critical"
}

---

# 5. Hiển thị Translation trong Segment List (NEW – v1.1.0)

## 5.1 Yêu cầu bắt buộc

Segment List phải hiển thị:

- Original (CN)
- Translation (VN) nếu có

Không được yêu cầu click vào segment để xem bản dịch.

---

## 5.2 Rendering Rules

### Nếu translation == null hoặc ""

- Không hiển thị placeholder.
- Không hiển thị "Translating...".
- Để trống phần translation.

### Nếu translation tồn tại

- Hiển thị nguyên văn nội dung đã dịch.
- Không tự động chỉnh sửa lại nội dung.
- Nếu user edit → cập nhật ngay list.

---

## 5.3 Layout Mỗi Segment Item

Ví dụ khi đã dịch:

#1    5.1 CPS
穿越到死神的世界
Đã xuyên đến thế giới Tử Thần
00:00:00,040 → 00:00:01,600

---

Ví dụ khi chưa dịch:

#2    4.4 CPS
来到精神病院
00:00:01,600 → 00:00:03,420

---

## 5.4 Visual Hierarchy

Original:
- Font nhỏ hơn
- Màu dịu hơn

Translation:
- Font rõ hơn
- Màu sáng hơn
- Cách original 4–6px

---

# 6. Real-time Sync

Khi:

- AI trả kết quả từng batch
- User chỉnh sửa translation thủ công
- AI Fix thay đổi nội dung

Segment List phải cập nhật ngay mà không cần refresh.

---

# 7. Performance Requirements

Với file 3000+ segment:

- Phải sử dụng Virtualized List.
- Không render toàn bộ DOM cùng lúc.
- Update phải O(1) theo segment thay đổi.

---

# 8. Filter Compatibility

Khi filter theo:

- Safe
- Warning
- Critical
- CPS bucket

Translation vẫn phải hiển thị bình thường.

Không được mất dữ liệu khi đổi filter.

---

# 9. Không được làm

❌ Không lưu translation chỉ trong Detail Panel  
❌ Không render translation dựa vào segment đang selected  
❌ Không reset translation khi đổi filter  

---

End of file.
