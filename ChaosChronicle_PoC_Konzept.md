# 🧪 ChaosChronicle – Proof of Concept (PoC) & Stil-Spezifikation

Dieses Dokument beschreibt das **Proof of Concept (PoC)** für **ChaosChronicle**: Eine Web-Anwendung, die in Echtzeit unabhängige Nachrichten aggregiert, per KI (**Gemini 3.6 Flash, DeepSeek, Qwen**) ein anspruchsvolles, beißendes **3-Minuten Feuilleton-YouTube-Drehbuch (~420 Wörter)** im Stil der **Bösen Satire & Dunklen Alltagsfeuilletons** generiert, dieses **automatisch als `.md`-Datei im Ordner `scripts/` speichert** und passendes Videomaterial auf YouTube sucht und herunterlädt.

---

## 🎭 1. Stil-Definition: Böse Satire & Dunkles Alltagsfeuilleton (Wicked Satire Guide)

*Basiert auf der Stil-Richtlinie aus `C:\Projekte\Compartier\themes\moderne_helden\data\stil_boese_satire_guide.md`*

### 💥 Kern-Regeln & Stil-Elemente:

1. **STRIKTES VERBOT des Pronomens "МЫ" ("WIR")**:
   - ❌ **VERBOTEN**: *"Мы привыкли...", "Мы создали..."*
   - ✅ **ERLAUBT**: Erzählung in der 3. Person (*"Существо"*, *"Паразит"*, *"Менеджер"*, *"Элита"*, *"Каста офисных паразитов"*) oder direkte Anrede *"Вы"*.

2. **Giftige Satirische Metaphern & Epitheta**:
   - *"Хрустальный цветок XXI века"*
   - *"Вирус абсолютной бесполезности"*
   - *"Каста офисных паразитов"*
   - *"Стерильная, звенящая пустота цифрового духа"*

3. **Groteske Hyperbolisierung von Alltags-Ängsten**:
   - **Anruf ohne vorherige SMS** ➔ Gilt als Schock-Trauma und zivilisatorischer Terrorakt.
   - **Anruf von unbekannter Nummer** ➔ Führt zum sofortigen Nervenzusammenbruch.
   - **Ein Punkt im Chat statt eines Emojis** ➔ Erfordert eine Woche psychologische Reha zur Wiederherstellung des Egos.
   - **Das Bett am Morgen machen** ➔ Entspricht der Bezwingung des Mount Everest ohne Sauerstoffflasche.

4. **Satire auf Corporate-Parasitismus & Politische Eliten**:
   - **Büro-Management**: Dreistündige Zoom-Konferenz zur Ansetzung der nächsten Zoom-Konferenz; Entscheidungen ausweichen wie Neo den Kugeln in Matrix.
   - **Politik**: Professionelle Phrasendrescher; tagelanger Abwägungsprozess zwischen zwei völlig inhaltsleeren Floskeln.

---

## 📜 2. Das 3-Minuten Feuilleton Skript-Modell

- **Sprechtempo**: ~140 Wörter pro Minute (WPM).
- **Ziel-Länge**: Exakt **3:00 Minuten** = **ca. 400 – 450 Wörter** (Idealmaß: **420 Wörter**).
- **Struktur**: 3 bis 4 Absätze mit visueller B-Roll Zeile `[B-Roll: ...]` am Ende jedes Absatzes.
- **Bilderbedarf für YouTube-Video (3:00 Min)**: **30 bis 45 Fotos** (bei 4-6 Sekunden Standzeit pro Bild).

---

## 🤖 2. Erlaubte KI-Modelle & API-Konfiguration

### ⛔ Restriktionen:
- **KEIN OpenAI** (GPT entfernt)
- *(Anthropic Claude Sonnet kann bei Bedarf per Option wieder hinzugefügt werden)*

### ✅ Erlaubte Modelle in der Dropdown-Selectbox:

| Name im Frontend | OpenRouter Modell-ID | Anbieter | Eigenschaften |
| :--- | :--- | :--- | :--- |
| **✨ Gemini 3.6 Flash** *(Standard)* | `google/gemini-2.5-flash` | 🇺🇸 Google | Blitzschnell, exakt 840 Wörter |
| **🧠 DeepSeek V3 / R1** | `deepseek/deepseek-chat` | 🇨🇳 DeepSeek AI | Tiefgründige Metaphern, stark in Satire |
| **🦁 Qwen 2.5 72B** | `qwen/qwen-2.5-72b-instruct` | 🇨🇳 Alibaba | Sehr präzise im russischen Stil |
| **🎁 OpenRouter Free Router** | `openrouter/free` | OpenRouter | Automatisches kostenloses Modell-Routing |

---

## 📰 3. Schritt 1: Unabhängige Nachrichten-Feeds (Keine Staatsmedien)

### ⛔ Strikter Ausschluss:
- **KEINE russischen Staatsmedien** (Kein РИА Новости, ТАСС, Российская газета, РБК, Ведомости, ИноСМИ).
- **KEINE Украинская правда**.

### ✅ 8 Themen-Kategorien & Unabhängige Quellen:

| Tab | Kategorie | Quellen | Standort |
| :--- | :--- | :--- | :--- |
| 🌐 **Все новости** | Alle Nachrichten | Alle Quellen kombiniert, neueste zuerst | — |
| 🎭 **Культура** | Kultur & Gesellschaft | Meduza, Novaya Gazeta Europe, Mediazona, DW | Riga / Berlin / Tbilisi |
| 🏛️ **Политика** | Politik | Radio Svoboda, BBC Russian, DW, Current Time | Prag / London / Bonn |
| 🤖 **Технологии** | Tech & KI | Habr, DW Science, Meduza | Unabhängig / Bonn |
| 📈 **Экономика** | Wirtschaft | DW Economy, BBC Business, Meduza | Bonn / London |
| 🌍 **Мир** | Weltgeschehen | BBC World, DW, Radio Svoboda | London / Bonn / Prag |
| ⚽ **Спорт** | Sport | Sports.ru, Eurosport RU, DW Sport | Unabhängig / Paris |
| 🇺🇦 **Война в Украине** | Krieg in der Ukraine | BBC Ukraine, Meduza Ukraine, DW Ukraine, Current Time, Novaya Gazeta | London / Riga / Kiew |

---

## 💾 4. Automatische Speicherung der Skripte

Jedes generierte Feuilleton-Skript wird **automatisch als `.md`-Datei im Ordner `C:\Projekte\ChaosChronicle\scripts\`** gespeichert.

- **Ordnerpfad**: `C:\Projekte\ChaosChronicle\scripts\`
- **Dateinamensschema**: `YYYY-MM-DDTHH-MM_Titel.md` (z. B. `2026-08-13T08-56_Тест_автосохранения.md`)
- **Dateiaufbau**:
  ```markdown
  # 🎭 [Titel der Nachricht]

  - **Дата**: 13.08.2026, 10:56:00
  - **Модель ИИ**: google/gemini-2.5-flash
  - **Хронометраж**: ~6.0 мин.
  - **Количество слов**: 846
  - **Источник**: Meduza

  ---

  [Vollständiger Feuilleton-Text mit B-Roll Regieanweisungen]
  ```

---

## 📜 5. Schritt 2: 6-Minuten Feuilleton Skript Generator

### ⏱️ Zeit- & Wortanzahl-Formel:
- **Sprechtempo**: ~140 Wörter pro Minute (WPM).
- **Ziel-Länge**: **6:00 Minuten** = **ca. 800 – 900 Wörter** (Idealmaß: **840 Wörter**).
- **Format**: 5 Absätze, am Ende jedes Absatzes eine Zeile `[B-Roll: Keyword1, Keyword2, Keyword3]` auf Englisch.

---

## 🎬 6. Schritt 3: YouTube B-Roll Suche & Downloader Engine

- **B-Roll Keywords**: Werden automatisch am Ende jedes Absatzes generiert (z. B. `[B-Roll: AI art, digital writing, sterile creativity]`).
- **Download Command (`yt-dlp`)**:
  ```bash
  yt-dlp -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]" \
         --output "C:\Projekte\ChaosChronicle\downloads\%(title)s.%(ext)s" \
         "https://www.youtube.com/watch?v=VIDEO_ID"
  ```

---

## 📸 7. Echte Nachrichten-Fotos direkt im Text & in den `.md`-Dateien

- **Eingebettete Fotos im Text (Inline)**: Zwischen den 5 Absätzen des generierten Feuilletons werden **die echten Originalfotos genau dieser Nachricht** direkt als hochauflösende Bildkarten eingebettet.
- **Inklusive `.md`-Dateispeicherung**: Auch in der automatisch auf Festplatte gespeicherten Datei unter `C:\Projekte\ChaosChronicle\scripts\` werden die **echten Nachrichtenbilder per Markdown `![Bild](URL)` direkt in den Text eingewoben**.
- **Multi-Image Zuordnung**: Besitzt eine Nachricht mehrere Fotos (Bild 1, Bild 2, Bild 3), wird jedes Foto chronologisch dem passenden Textabschnitt zugeteilt.

---

## 🎙️ 10. Zweistufiger Workflow & Sonner Live-Toasts

1. **Schritt 1: Paket speichern (`news/`)**:
   - Im Feuilleton-Dialog wird zuerst der Button **`📦 Сохранить видео-пакет в news/`** gedrückt.
   - **Sonner Lade-Toast**: *"Сохранение видео-пакета в news/... (Скачивание 20 фото, script.txt und project.json)"*
   - **Sonner Erfolgs-Toast**: *"📦 Видео-пакет успешно сохранен в news/<Titel>. Теперь можно создать аудио!"*

2. **Schritt 2: Audio-Erstellung & Direktes Anhören im Dialog**:
   - **Erst NACH Schritt 1** wird der orangefarbene Button **`🎙️ Создать audio.mp3 (Nikolay)`** im Dialog sichtbar & aktiv.
   - **Live-Zeitmessung im Lade-Toast**: *"🎙️ Генерация аудио-файла через edge-tts... [X сек.] (Идет обработка текста и синтез речи Nikolay, 0%, -10%)..."*
   - **Direkter Audio-Player im Dialog**: Sobald `audio.mp3` generiert wurde, erscheint **direkt im Haupt-Feuilleton-Dialog ein HTML5 Audio-Player**, mit dem du die Sprachausgabe von Nikolay sofort anhören und abspielen kannst (`autoPlay`)!

---

## 🏷️ 11. Visuelle Kennzeichnung & Paket-Viewer Modal (`SavedPackageModal`)

- **🟢 Visuelle Kennzeichnung (`NewsCard`)**: Sobald ein Feuilleton-Paket unter `news/` gespeichert ist, erhält die entsprechende Nachrichtentaste automatisch ein auffälliges grünes Badge: **`🟢 📦 Сохранено в news/`**.
- **📂 Separates Viewer-Modal (`📂 Просмотр пакета`)**:
  - Jede gespeicherte Nachricht erhält den Button **`📂 Просмотр пакета`**.
  - Beim Klick öffnet sich das dedizierte Paket-Fenster, mit dem du das gespeicherte Paket direkt aus dem Browser anschauen kannst:
    - 🎙️ **Integrierter Audio-Player**: Zum Abspielen des generierten Nikolay-Audios (`audio.mp3`)
    - 🖼️ **Foto-Galerie**: Alle heruntergeladenen Bilddateien aus `news/<folderName>/photos/`
    - 📜 **Skript-Textanzeige**: Vorschau von `script.txt` und `script.md` mit Kopier-Button.

---

## 💻 12. Status der Live-Anwendung

- 🔒 **STRIKTE REGEL**: `git commit` und `git push` dürfen **NIEMALS automatisch** ausgeführt werden.
- 🛑 **Ausschließlich auf expliziten Befehl**: Commits und Pushes werden **nur dann durchgeführt, wenn du mir den ausdrücklichen Befehl dazu gibst**.

---

## 📸 11. 100% Strikte Themenzugehörigkeit für Nachrichten-Fotos

- **Keine unpassenden / fremden Fotos**: Der künstliche Kategorie-Auffüllmechanismus wurde vollständig entfernt. Dir werden **ausschließlich Fotos angezeigt, die zu 100% exakt aus diesem Artikel oder aus Berichten über DIESES EXAKTE EREIGNIS stammen**.
- **Webpage-Scraper (`scrapeArticlePhotos`)**: Liest alle echten hochauflösenden Artikel-Fotos aus `og:image`, `twitter:image`, `<figure>` und `<picture>` direkt aus dem HTML-Quelltext der nachrichteneigenen Webseite aus.
- **Strikter 24-Stunden- & Jahres-Filter**: Alle Fotos stammen aus tagesaktuellen Berichten der letzten 24 Stunden (alte Archivjahre in URLs werden verworfen).

---

## 💻 11. Status der Live-Anwendung

- **Express Backend**: [http://localhost:3001](http://localhost:3001) (`node server.js`)
- **React Frontend**: [http://localhost:5173](http://localhost:5173) (`npm run dev`)
- **API Endpoint**: `POST http://localhost:3001/api/generate-feuilleton`
- **Skripte-Ordner**: `C:\Projekte\ChaosChronicle\scripts\`
