# Test Execution Rule for ChaosChronicle

- **STRICT RULE**: NEVER run test suites (e.g. `npm test`, `node tests/...`, `run_all_tests.js`) automatically or implicitly.
- **ALWAYS ASK FIRST**: ALWAYS ask the user explicitly before executing any test command (e.g. "Darf ich die Tests jetzt ausführen?").
- **WAIT FOR CONFIRMATION**: Only execute test commands when the user has explicitly confirmed or ordered it.
