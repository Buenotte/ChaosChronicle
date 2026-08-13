# Konzept & Schritt-für-Schritt Entwicklungsplan: ChaosChronicle

Ein modulares Web-App-System zur automatisieren Erstellung von 6-minütigen YouTube-Feuilleton-Skripten und Video-Content aus den aktuellsten Nachrichten.

---

## 1. Aktualisierte Anforderungen

- **Schritt 1 (Fokus V1)**: Aktuelle Nachrichten in Echtzeit abrufen & im React Frontend geordnet nach Themen (Feuilleton/Kultur, Politik, Tech, Wirtschaft, Gesellschaft) anzeigen. Die **neuesten Nachrichten** stehen immer ganz oben.
- **Schritt 2**: Bei Klick auf eine Nachricht wird mit KI (**DeepSeek API** oder **Qwen API**) ein anspruchsvoller **Feuilleton-Text / Skript** für ein **6-Minuten YouTube Video** generiert (ca. **800–900 Wörter**, ca. 140 Wörter/Min).
- **Schritt 3**: Automatische Extraktion von Bild- & B-Roll-Keywords aus dem Feuilleton-Text und Suche/Download von YouTube-Videomaterial.

---

## 2. API-Key Konfiguration

Das Backend nutzt eine `.env` Datei für die KI-Modelle.
Die Keys werden aus `C:\Projekte\DecadenceScout AI\.env` übernommen:
```env
# Zentraler Provider: OpenRouter (1 Key = DeepSeek + Qwen + alle Modelle)
OPENROUTER_API_KEY="sk-or-v1-..."

# Standard Modellkonfiguration
DEFAULT_AI_PROVIDER="openrouter"
DEFAULT_MODEL="deepseek/deepseek-chat"  # Alternativ: qwen/qwen-2.5-72b-instruct
```

---

## 3. Schritt-für-Schritt Fahrplan (Stufenweise Umsetzung)

### 🔵 Etappe 1: Basis-Setup & Schritt 1 (Nachrichten-Feed)
1. **Backend Service (`server.js` / Express)**:
   - RSS-Feeds von renommierten deutschen & internationalen Quellen (z.B. Tagesschau, Zeit Online Feuilleton, Perlentaucher, Heise, Spiegel).
   - Automatische Chronologische Sortierung (neueste Nachrichten zuerst).
   - `/api/news` Endpoint mit Themenfilter.
2. **React Frontend (Vite + React + Vanilla CSS / Glassmorphism UI)**:
   - Modernes Dashboard mit Kategorie-Tabs (Feuilleton, Politik, Tech, etc.).
   - News-Cards mit Live-Zeitstempeln ("Vor 5 Min"), Quelle, Vorschaubild und Zusammenfassung.

### 🟣 Etappe 2: Schritt 2 (Feuilleton-KI-Skripterstellung für 6 Minuten)
1. **KI-Integration (DeepSeek & Qwen API Client via OpenRouter)**:
   - **Stil-Quelle**: `C:\Projekte\Compartier\themes\moderne_helden\data\stil_boese_satire_guide.md` (**Böse Satire & Dunkles Alltagsfeuilleton**).
   - Kern-Regeln: Kein "WIR", giftige Metaphern, groteske Hyperbel, Corporate- & Polit-Satire.
   - **Exakte 6-Minuten-Struktur (~840 Wörter)**:
     - *Einleitung / Hook (0:00 - 1:00)*: ~140 Wörter – Kulturelle/Gesellschaftliche Fragestellung.
     - *Kontext & Diskurs (1:00 - 2:30)*: ~210 Wörter – Der Nachrichtenkern & Relevanz.
     - *Feuilletonistische Analyse (2:30 - 4:30)*: ~280 Wörter – Vertiefung, Metaphern & Perspektiven.
     - *Ausblick & Fazit (4:30 - 6:00)*: ~210 Wörter – Resümee & YouTube Call-to-Action.
2. **Skript-Studio UI**:
   - Live-Lesezeit-Messung, Wortzähler, Segment-Tabs, Regieanweisungen.

### 🟡 Etappe 3: Schritt 3 (YouTube Suche & Video Downloader)
1. **B-Roll Keyword Finder**: Generiert präzise Videosuchbegriffe passend zu den Abschnitten.
2. **YouTube Video Suche & Downloader**: Einbindung von `yt-dlp` zum sicheren HD MP4 Download im Backend.

---

## Verifikations-Plan

- **Test 1**: Verify `/api/news` liefert sortierte Nachrichten (neueste oben).
- **Test 2**: Test Skript-Generierung mit DeepSeek/Qwen API auf ~800–900 Wörter für 6 Minuten.
