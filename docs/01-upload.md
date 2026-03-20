# MODULE: Upload

Version: 2.1.0
Last Updated: 2026-03-20

---

# 1. Supported Inputs
- File types: `.srt`, `.sktproject`, `.json` (CapCut draft_content.json)
- Max size: 50MB
- Method: Drag & drop or click to select

---

# 2. Parser Pipeline
1. Validate file size and extension.
2. Parse:
   - `.srt` -> parse SRT, split CN/VN by language detection
   - `.sktproject` -> load segments + preset
   - `.json` -> parse CapCut draft_content.json
3. Auto-fix (always on):
   - Trim and collapse whitespace for both `originalText` and `translatedText`
4. Initialize runtime fields (CPS, severity, issue list).

---

# 3. Behavior
- If a project is active, upload triggers a replace confirmation modal.
- After successful upload, app switches to **Editor** tab.

---

End of file.
