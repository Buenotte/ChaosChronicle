# ChaosChronicle Project Rules

## 1. Test Execution Rule
- **Tests NUR vor Git Push ausführen**:
  - Keine Test-Runs bei Zwischenschritten, normalen Datei-Edits oder Commits.
  - Tests laufen ausschließlich vor dem `git push` (bzw. durch den `.git/hooks/pre-push` Hook).

## 2. File Constraints
- **Maximal 389 Zeilen pro Datei** im gesamten Projekt (Backend & Frontend).

## 3. Title Generation
- Es müssen **immer genau 10 Titel-Varianten** generiert werden (niemals 5).
- Immer beide Stil-Gruppen anbieten (YouTube-Themenstile und Autorenstile).
