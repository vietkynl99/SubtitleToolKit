# MODULE: Editor & Analyzer

Version: 2.4.0
Last Updated: 2026-03-20

---

# 1. Editor (Segment List)
- Pagination: 30 segments per page.
- Columns: Select, #, Time, CN (Original), VN (Translation), CPS.
- Inline editing for translation and time.
- Delete segment with confirmation.
- Reindex segments after deletion.
- Optimize history badge shown as "optimized" when available.

---

# 2. Analyzer (Dynamic Classification)
- CPS computed from translated text.
- Severity:
  - Safe: CPS < safeMax
  - Warning: safeMax <= CPS <= warningMax
  - Critical: CPS > warningMax

---

# 3. Quality Dashboard
- Shows counts for Safe/Warning/Critical.
- Translation progress (count + percentage).
- Issue alerts (clickable):
  - Timeline overlap
  - Language issues (warning)
  - Too long (more than 2 lines)

---

# 4. CPS Histogram
- Display only (no click-to-filter in current UI).

---

# 5. Filters
Dropdown filters:
- All
- Safe / Warning / Critical
- Timeline Issues
- Language Issues
- Too Long (3+ lines)
- Translated / Untranslated
- Optimized

---

# 6. Search
- Text search across id/time/original/translated.
- Supports:
  - Case sensitivity
  - Whole word
  - Regex
  - ID search with `#`

---

End of file.
