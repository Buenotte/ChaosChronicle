# 🚀 ChaosChronicle – Hauptkonzept & System-Architektur

**ChaosChronicle** ist ein modernes Web-App-System zur automatisierten Erstellung von **6-minütigen YouTube-Feuilleton-Skripten** und passendem Videomaterial auf Basis von unabhängigen Nachrichten.

Es kombiniert ein **React-Frontend Dashboard** mit einem **Node.js Express Backend**, das KI-Modelle wie **Gemini 3.6 Flash**, **DeepSeek V3/R1** und **Qwen 2.5 72B** via **OpenRouter** ansteuert.

---

## 🔑 1. KI-Konfiguration & Modell-Auswahl

Die API-Schlüssel werden direkt aus `C:\Projekte\DecadenceScout AI\.env` in das Projekt übernommen (`OPENROUTER_API_KEY`).

### ⛔ Ausschluss-Regeln:
- **KEIN Anthropic** (Claude entfernt)
- **KEIN OpenAI** (GPT entfernt)

### ✅ Verfügbare Modelle in der Dropdown-Selectbox:
- ✨ **Gemini 3.6 Flash** (`google/gemini-2.5-flash`) – Standard & Blitzschnell
- 🧠 **DeepSeek V3 / R1** (`deepseek/deepseek-chat`)
- 🦁 **Qwen 2.5 72B** (`qwen/qwen-2.5-72b-instruct`)
- 🎁 **OpenRouter Free Router** (`openrouter/free`)

---

## 📰 2. Nachrichten-Quellen (RSS)

### ⛔ Strikter Ausschluss:
- **KEINE russischen Staatsmedien** (kein РИА, ТАСС, Российская газета, РБК, Ведомости, ИноСМИ, Р-Спорт, Sport24)
- **KEINE Украинская правда**

### ✅ Unabhängige russischsprachige Medien:
- **Feuilleton & Kultur**: Meduza (Riga), Novaya Gazeta Europe (Berlin), Mediazona (Tbilisi), DW Russian (Bonn)
- **Politik & Gesellschaft**: Radio Svoboda (Prag), BBC Russian (London), DW Politik, Current Time (Prag)
- **Tech & KI**: Habr, DW Science, Meduza Tech
- **Wirtschaft**: DW Economy, BBC Business, Meduza News
- **Weltgeschehen**: BBC World, DW World, Radio Svoboda
- **Sport**: Sports.ru, Eurosport RU, DW Sport
- **Krieg in der Ukraine**: BBC Ukraine, Meduza Ukraine, DW Ukraine, Current Time, Novaya Gazeta

---

## 📜 3. Das 6-Minuten Feuilleton Skript-Modell

- **Länge**: Exakt **6:00 Minuten** (~840 Wörter bei 140 WPM).
- **Stil**: **Böse Satire & Dunkles Alltagsfeuilleton** (aus `stil_boese_satire_guide.md`).
- **Verbotene Wörter**: **100% Verbot von "МЫ" ("WIR")**.
- **Stilelemente**: Giftige Metaphern (*«хрустальный цветок XXI века»*, *«вирус бесполезности»*, *«каста офисных паразитов»*), groteske Hyperbeln (SMS-Panik, Punkt im Chat, Zoom-Konferenzen), Corporate- & Polit-Satire.
- **Formale Struktur**: 5 Absätze mit englischen `[B-Roll: ...]` Tags am Ende jedes Absatzes.

---

## 💻 4. System-Status

- **React Frontend**: [http://localhost:5173](http://localhost:5173)
- **Express Backend**: [http://localhost:3001](http://localhost:3001)
- **Feuilleton API**: `POST /api/generate-feuilleton`
