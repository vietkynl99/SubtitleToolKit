# MODULE: Translation Style (DNA)

Version: 4.1.0
Last Updated: 2026-03-20

---

# 1. Purpose
Provide a style preset for AI translation to keep:
- consistent naming
- suitable genre vocabulary
- consistent humor level

---

# 2. Input
User provides a **Title / Summary**.
AI analyzes it to generate:
- `genres` (1-5)
- `humor_level` (0-10)

---

# 3. Preset Structure (Current)
```json
{
  "reference": { "title_or_summary": "..." },
  "genres": ["Tu tien", "Huyen huyen"],
  "term_replacements": [
    { "id": 1, "find": "A", "replace_with": "B" }
  ],
  "term_replace_options": {
    "case_sensitive": false,
    "whole_word": false,
    "regex": false
  },
  "humor_level": 3
}
```

Notes:
- No `tone` field in current implementation.
- Term replacement rules are stored with the preset.

---

# 4. Runtime Usage
- Preset is sent to AI translation and AI optimization.
- `genres` + `humor_level` affect tone in the prompt.

---

# 5. Import / Export
- Export preset to JSON.
- Import preset replaces current preset (no merge).

---

End of file.
