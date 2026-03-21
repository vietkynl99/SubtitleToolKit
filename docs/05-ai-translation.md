# MODULE: AI Translation

Version: 2.1.0
Last Updated: 2026-03-20

---

# 1. Batching
- Batch size from settings (`translationBatchSize`, default 100).
- Only untranslated segments are sent.

---

# 2. Context
- Context Before: 2 previous original lines.
- Context After: 2 next original lines.
- Preset (genres + humor_level) included in prompt.

---

# 3. Progress Control
- Real-time progress and stop capability.
- Already translated items are kept; you can run translation again to continue.

---

# 4. Model
- Default: `gemini-2.5-flash`
- Selectable in Settings.

---

# 5. Line Break Rule
- If `autoSplitLongLines` is enabled and a single line would exceed `maxSingleLineWords`, AI must insert `\n`.
- Post-processing collapses to one line when total words <= `maxSingleLineWords`.

---

End of file.
