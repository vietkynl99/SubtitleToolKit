# History & Settings

Version: 1.2.0  
Last Updated: 2026-02-13  

---

# 1. Settings Persistence

Các setting sau phải được lưu persistent:

- CPS threshold
- AI model preference
- Default optimization config

Có thể dùng:

- LocalStorage
- IndexedDB

---

# 2. CPS Threshold Default

Default:

safe: <25  
warning: 25–40  
critical: >40  

User có thể thay đổi trong Settings.

---

# 3. Clear Project Behavior

Khi Clear Project:

Phải xóa:

- Project hiện tại trong memory
- Segment list
- Analyzer data
- Histogram
- Split files
- AI temporary result cache

Không được xóa:

- Settings
- CPS threshold
- AI preference
- History saved projects

---

# 4. Auto Save

Nếu Auto Save bật:

- Clear phải xóa snapshot hiện tại
- Pero không xóa version backup trước đó

---

# 5. History (Future Expand)

Có thể mở rộng:

- Lưu project theo version
- Restore project cũ
- Compare version

Hiện tại chưa bắt buộc implement.

---

End of file.