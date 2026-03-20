# RULE: File Naming Standard

Version: 1.1.0
Last Updated: 2026-03-20

---

# 1. Prefix Format
- `[Edited]Filename.srt` -> count = 1
- `[Edited2]Filename.srt` -> count = 2
- `[EditedX]Filename.srt` -> count = X

---

# 2. Parsing Logic
- On upload, parser extracts `Edited` count from the prefix.
- If no prefix, count = 0.
- Leading zero format like `[Edited02]` is rejected.

---

End of file.
