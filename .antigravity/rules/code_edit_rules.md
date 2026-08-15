---
description: Strict rule for targeted code editing without rewriting whole files
globs: **/*
---

# Code Editing Rule

1. **Never overwrite whole files**: When making modifications, fixes, or additions to existing code files, NEVER rewrite the full file.
2. **Surgical Diff Edits Only**: Always use targeted block replacement tools (`replace_file_content` or `multi_replace_file_content`) to change or insert only the specific lines or functions needed.
3. **Preserve Surrounding Structure**: Keep all unrelated functions, imports, styles, and comments intact.
