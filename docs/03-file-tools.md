# MODULE: File Tools (Split Engine)

Version: 2.1.0
Last Updated: 2026-03-20

---

# 1. Split Modes
- Duration (minutes)
- Count (segments per file)
- Manual (list of timestamps)
- Range (start index -> end index)

---

# 2. Output Rules
- Reindex segments from 1 in each output file.
- Add a NOTE header when metadata is enabled:
  - range, start/end time, segment count, duration
- File name prefix:
  - `[split ...] OriginalName`

---

# 3. Generated Files
- Listed as cards
- Actions:
  - Download
  - Load into Editor
  - Delete

---

End of file.
