# MODULE: Settings

Version: 3.2.0
Last Updated: 2026-03-20

---

# 1. Persistence
Settings and API usage are stored in localStorage:
- `subtitle_settings`
- `subtitle_api_key` (mirrors apiKey)

---

# 2. Current UI Settings
- AI Model:
  - `gemini-2.5-flash` (default)
  - `gemini-2.5-pro`
  - `gemini-3-flash-preview`
  - `gemini-3-pro-preview`
- API Key (Gemini)

---

# 3. Internal Settings (Stored, not exposed in UI)
- `cpsThreshold.safeMax` (default 25)
- `cpsThreshold.warningMax` (default 40)
- `translationBatchSize` (default 100)
- `maxSingleLineWords` (default 12)
- `autoSplitLongLines` (default true)

---

# 4. API Usage Dashboard
Session-based counters:
- Translation Style (requests, tokens)
- AI Translate (requests, tokens, segments)
- AI Optimize (requests, tokens)

Resets when:
- Clear Project
- Upload new file

---

End of file.
