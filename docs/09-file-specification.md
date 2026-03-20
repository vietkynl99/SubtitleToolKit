# Project File Specification - .sktproject (v1.0)

Version: 1.1.0
Last Updated: 2026-03-20

---

# 1. Overview
`.sktproject` is the project JSON format used to:
- store segments
- store translation preset
- allow reopening projects

---

# 2. Structure (v1.0)
```json
{
  "version": "1.0",
  "original_title": "Source title",
  "created_at": "2026-03-20T12:00:00Z",
  "updated_at": "2026-03-20T12:30:00Z",
  "preset": {
    "reference": { "title_or_summary": "..." },
    "genres": ["Tu tien"],
    "term_replacements": [
      { "id": 1, "find": "A", "replace_with": "B" }
    ],
    "term_replace_options": {
      "case_sensitive": false,
      "whole_word": false,
      "regex": false
    },
    "humor_level": 3
  },
  "segments": [
    {
      "id": 1,
      "start": "00:00:01,000",
      "end": "00:00:03,000",
      "original": "CN text",
      "translated": "VN text",
      "optimize_history": ["old text", "new text"]
    }
  ]
}
```

---

# 3. Notes
- Computed data (CPS, severity) is not stored.
- `optimize_history` is optional.
- `translated` can be empty string if untranslated.

---

# 4. Upload / Download
- Upload supports `.srt` and `.sktproject`.
- Download supports `.sktproject`, `.srt` (original), `.srt` (translated).

---

End of file.
