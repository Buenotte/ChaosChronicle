# Git Commit & Push Rule for ChaosChronicle

- **STRICT RULE**: NEVER perform `git commit` or `git push` automatically.
- **CONDITION**: Always wait for the user's explicit command before making any Git commits or pushing to remote repositories (GitHub/GitLab/etc.).
- **TEST BEFORE PUSH (MANDATORY)**: Before executing `git push` (or `commit und push`), ask the user first before running the test suite (`node tests/run_all_tests.js`). If any test fails, abort immediately and DO NOT push broken code. Only push when all tests pass (100% green).
