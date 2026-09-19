# ChaosChronicle Project Rules

## 1. Test Execution Rule (STRENG / WICHTIG)
- **Tests NUR vor Git Push ausführen**:
  - Führe KEINE manuellen Testskripte (`run_all_tests.js`, `test_*.js`) bei Zwischenschritten, Code-Edits oder Commits aus.
  - Tests laufen ausschließlich und automatisch vor dem `git push` (über den Git Pre-Push-Hook `.git/hooks/pre-push` bzw. vor dem finalen Push).
  - Dadurch bleibt die Entwicklungsgeschwindigkeit hoch und unnötige Wartezeiten entfallen.

## 2. Codebase Architecture & File Constraints
- **Maximale Zeilenzahl**:
  - **STRENG: Maximal 389 Zeilen pro Datei** im gesamten Codebase (`backend`, `frontend`, `services`, etc.).
  - Keine Datei darf jemals 389 Zeilen überschreiten. Bei Bedarf Code in modulare Helper/Services auslagern.

## 3. Title & Script Generation
- **Titel-Generierung**:
  - Es müssen **immer genau 10 Titel-Varianten** generiert werden (niemals nur 5).
  - Ein Selectbox-Dropdown mit `<optgroup>` muss sowohl die thematischen YouTube-Stile (`🎬 YouTube`) als auch die klassischen Autoren-Stile (`🎭 Авторские`) anbieten.

## 4. YouTube Dialoge & Metadata
- **YouTube Metadata & Import**:
  - Sowohl die 5 YouTube-Themenstile (`scipop`, `mystery`, `tech_future`, `psychology`, `storytelling`) als auch die Autorenstile (`golubuzki`, `clickbait`, `kasjanov`, `klimovski`, `gibrid`) müssen in allen relevanten Dialogen zur Verfügung stehen.
