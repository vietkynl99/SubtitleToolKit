# Subtitle Toolkit - Master Requirement

Version: 2.1.0
Last Updated: 2026-03-20

---

# 1. Global Layout Structure

- Sidebar navigation (fixed).
- Main content area per tab.
- Global file header shows current file metadata:
  - file name
  - total segments
  - avg CPS
  - total duration
- Sidebar footer contains:
  - Clear Project
  - Global progress bar for AI tasks

---

# 2. Sidebar Navigation Order (Strict)

1. Upload
2. Translation Style
3. File Tools
4. Editor
5. Settings

---

# 3. Core Logic Rules

## 3.1 Project Lifecycle
- Project is active when `segments` has data.
- Clear Project resets all state (segments, file name, presets, API usage).
- Uploading a new file while a project is active shows a replace confirmation.

## 3.2 File Naming Standard
- Single prefix format: `[EditedX]`
- X is the export count.
- Parser detects prefix on upload to restore the count.

---

End of file.
