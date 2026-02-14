# FEATURE: AI Translation

Version: 1.3.0  
Last Updated: 2026-02-14  

Changelog:
- v1.3.0: Batch size bắt buộc lấy từ Settings (translationBatchSize).
- v1.2.0: Cho phép cấu hình số lượng segment mỗi batch.
- v1.1.0: Hiển thị translation trực tiếp trong Segment List.

---

# 1. Mục tiêu

Dịch toàn bộ nội dung phụ đề từ tiếng Trung sang tiếng Việt bằng AI.

Sau khi dịch, toàn bộ kết quả phải được hiển thị ngay trong danh sách segment mà không cần chọn từng segment để xem.

Batch size không được hardcode. Phải lấy từ Settings.

---

# 2. User Interaction Flow

1. Click "AI Dịch Toàn Bộ".
2. Hệ thống đọc giá trị translationBatchSize từ Settings.
3. Chia segment theo batch size hiện tại.
4. Hiển thị thanh tiến trình.
5. Translation được cập nhật realtime vào từng segment.
6. Segment List hiển thị ngay bản dịch.
7. Khi hoàn tất → hiển thị trạng thái hoàn thành.

---

# 3. Logic Requirements

## 3.1 Batching (UPDATED – v1.3.0)

### 3.1.1 Batch Size Source (STRICT)

Batch size phải được lấy từ:
`settings.translationBatchSize`

Không được:
- ❌ Hardcode số 100
- ❌ Tự động thay đổi batch size
- ❌ Ghi đè giá trị từ Settings

Nếu Settings chưa tồn tại giá trị:
→ Sử dụng mặc định 100.

### 3.1.2 Batch Rules

- Chỉ chia theo số lượng segment.
- Không tính token.
- Batch cuối có thể nhỏ hơn batch size.
- Không gộp segment đã dịch lại vào batch mới.
- Không thay đổi batch size trong lúc đang chạy.

## 3.2 Context

- Gửi kèm 2 dòng trước và sau để AI hiểu ngữ cảnh.
- Context không được tính vào segment cần dịch.
- Không hiển thị context trong Segment List.

## 3.3 Glossary (Optional)

- Áp dụng bảng từ vựng nếu có.
- Không bắt buộc.

---

# 4. Segment Data Structure

Mỗi segment phải có cấu trúc:

```json
{
  "id": 1,
  "start": "00:00:01,000",
  "end": "00:00:03,000",
  "original": "你好",
  "translation": "Chào bạn",
  "cps": 4.5,
  "level": "safe"
}
```

---

# 5. Hiển thị Translation trong Segment List

## 5.1 Yêu cầu bắt buộc

Segment List phải hiển thị:
- Original (CN)
- Translation (VN) nếu có

Không được yêu cầu click vào segment để xem bản dịch.

## 5.2 Rendering Rules

### Nếu translation == null hoặc ""
- Không hiển thị placeholder.
- Không hiển thị "Translating...".
- Để trống phần translation.

### Nếu translation tồn tại
- Hiển thị nguyên văn nội dung đã dịch.
- Không tự động chỉnh sửa lại nội dung.
- Nếu user edit → cập nhật ngay list.

## 5.3 Layout Mỗi Segment Item

Ví dụ khi đã dịch:
`#1 5.1 CPS`  
`穿越到死神的世界`  
`Đã xuyên đến thế giới Tử Thần`  
`00:00:00,040 → 00:00:01,600`

Ví dụ khi chưa dịch:
`#2 4.4 CPS`  
`来到精神病院`  
`00:00:01,600 → 00:00:03,420`

## 5.4 Visual Hierarchy

**Original:**
- Font nhỏ hơn
- Màu dịu hơn

**Translation:**
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
❌ Không hardcode batch size  
❌ Không bỏ qua giá trị từ Settings  

---

End of file.