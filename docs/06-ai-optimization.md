# MODULE: AI Optimization (Segment-based)

Version: 3.4.0
Last Updated: 2026-03-20

---

# 1. Goal
Optimize translated subtitles for readability and lower CPS.
- Skip Safe segments.
- Optimize Warning/Critical segments.
- Not required to reach Safe, only improve.

---

# 2. Selection Logic
- If user selects segments, only selected are processed.
- If no selection, all translated segments are candidates.
- If no translated segments, optimization is blocked.

---

# 3. Batching
- Max 20 segments per request.
- Each segment is optimized independently.
- No merging or splitting segments.

---

# 4. Output
- Translated text updated.
- `optimizeHistory` tracks previous versions.

---

End of file.
