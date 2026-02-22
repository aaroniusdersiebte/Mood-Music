# Mood Music Player

## Das hier ist ein Standalone, nicht das Mood Music das ich in meinem Streams benutze. 
Die version ist mehr ein prof of conzept aber wird in dieser form nicht weiter entwickelt

Ein erweiterbarer Musik Player mit Mood-basierten Gruppen und OBS Integration für Streamer.

## ✨ Neue Features

### 🎯 Drag & Drop Support
- **Externe Dateien direkt in die App ziehen**: Unterstützung für MP3, WAV, FLAC, OGG, M4A
- **Automatische Zuordnung**: Dateien werden automatisch zur aktuell geöffneten Mood hinzugefügt
- **Bibliotheks-Integration**: Alle Dateien werden automatisch in die Bibliothek aufgenommen
- **Visuelles Feedback**: Animierte Drop-Indikatoren während des Drag & Drop

### 🎨 Verbesserte Browser-Ansicht (OBS Overlay)
- **Erweiterte Mood-Effekte**: 
  - **Pulse**: Rhythmisches Pulsieren mit Intensitätskontrolle
  - **Wave**: Sanfte Wellenbewegungen 
  - **Glow**: Dynamisches Glühen mit Farbeffekten
  - **Gradient**: Animierte Farbverläufe
  - **Sparkle**: Funkelnde Partikeleffekte
- **Intelligente Farbanalyse**: Automatische Anpassung der Textfarben basierend auf Mood-Farbe
- **Mood-spezifische Themes**: Spezielle Effekte für "Energetic", "Calm", "Dark", "Bright" Moods
- **Verbesserte Animationen**: Flüssige Übergänge und Eingangsanimationen
- **Responsive Design**: Optimiert für verschiedene Overlay-Größen

### 🛠️ Mood-Bearbeitungsfenster Verbesserungen
- **Live-Vorschau**: Echtzeit-Vorschau der Mood-Effekte während der Erstellung
- **Erweiterte Intensitätskontrolle**: 10-stufige Intensitätseinstellung für alle Effekte
- **Farbkomplementierung**: Automatische Generierung von Komplementärfarben
- **Export/Import**: Moods können exportiert und geteilt werden

### 🔧 Build-Optimierungen
- **Dependencies Fix**: Alle fehlenden Module (body-parser, multer) hinzugefügt
- **Automatische Build-Skripte**: Vereinfachte Installation und Build-Prozesse
- **Verbesserte Error-Handling**: Bessere Fehlerbehandlung für fehlende Module

## 🚀 Installation

### Automatische Installation (Empfohlen)
```batch
# 1. Dependencies installieren
install.bat

# 2. Anwendung starten
npm start

# 3. Oder Build erstellen
npm run build
```

### Bei Build-Problemen
```batch
# Alle Probleme beheben und neu bauen
fix-build.bat
```

## 📁 Projektstruktur

```
mood music/
├── src/                    # Frontend-Quellcode
│   ├── components/         # UI-Komponenten
│   ├── utils/             # Hilfsfunktionen
│   ├── app.js             # Hauptanwendung
│   ├── index.html         # Haupt-UI
│   └── styles.css         # Styling
├── obs-overlay/           # OBS Browser Source
│   ├── index.html         # Overlay-UI
│   ├── overlay.css        # Erweiterte Effekt-Styles
│   └── overlay.js         # Overlay-Logik
├── data/                  # Konfiguration & Daten
├── assets/               # Icons & Bilder
├── dist/                 # Build-Ausgabe
└── main.js              # Electron Hauptprozess
```

## 🎵 Verwendung

### Drag & Drop
1. **Dateien hinzufügen**: Ziehen Sie Musikdateien direkt in die Anwendung
2. **Zur Mood hinzufügen**: Öffnen Sie eine Mood und ziehen Sie Dateien hinein
3. **Unterstützte Formate**: MP3, WAV, FLAC, OGG, M4A

### Mood-Erstellung
1. Klicken Sie auf das **"+"** bei Moods
2. **Name eingeben**: Beschreibender Name für die Mood
3. **Farbe wählen**: Grundfarbe für die Mood-Effekte
4. **Effekt auswählen**: Pulse, Wave, Glow, Gradient oder Sparkle
5. **Intensität einstellen**: 1-10 für die Effektstärke
6. **Live-Vorschau**: Sehen Sie die Effekte in Echtzeit

### OBS Integration
1. **Browser Source hinzufügen** in OBS
2. **URL eingeben**: `http://localhost:3000`
3. **Größe einstellen**: 500x200 für optimale Darstellung
4. **Transparenz aktivieren**: Für saubere Overlay-Integration

## 🎨 Mood-Effekte im Detail

### Pulse (Pulsierend)
- Rhythmisches Skalieren und Opacity-Änderungen
- Intensität steuert Geschwindigkeit und Amplitude
- Perfekt für energiegeladene Musik

### Wave (Wellenbewegung)  
- Sanfte Bewegungen und Transforms
- Hintergrund-Animationen für Depth
- Ideal für entspannende Musik

### Glow (Glühen)
- Dynamische Box-Shadow Effekte
- Farbbasierte Leuchteffekte
- Hervorhebung für besondere Momente

### Gradient (Farbverlauf)
- Animierte Background-Gradienten
- Multi-Color Transitions
- Visuell beeindruckend für Shows

### Sparkle (Funkeln)
- Partikel-Effekte mit CSS
- Bewegliche Lichtpunkte
- Magische Atmosphäre

## ⚙️ Konfiguration

### OBS-Einstellungen
- **Port**: Standard 3000 (änderbar in Einstellungen)
- **Anzeigedauer**: Wie lange das Overlay sichtbar bleibt
- **Übergangszeit**: Fade-In/Out Geschwindigkeit
- **Immer anzeigen**: Overlay permanent sichtbar

### Audio-Einstellungen
- **Lautstärke**: Standard-Wiedergabelautstärke  
- **Übergangszeit**: Fade zwischen Tracks
- **Auto-Advance**: Automatischer Titelwechsel

### Theme-Anpassung
- **Primärfarbe**: Haupt-Hintergrundfarbe
- **Sekundärfarbe**: Akzentfarbe für UI-Elemente
- **Border Radius**: Rundung der UI-Elemente

## 🛠️ Entwicklung

### Development Mode
```bash
npm start
# oder
npm run dev
```

### Build für Distribution
```bash
npm run build
```

### Debug Mode
```bash
npm run dev
# Öffnet Developer Tools automatisch
```

## 📋 Systemanforderungen

- **Windows**: 10 oder höher
- **Node.js**: 16.x oder höher
- **Electron**: 27.x
- **Speicher**: 100MB für Installation
- **Audio-Formate**: MP3, WAV, FLAC, OGG, M4A

## 🔧 Fehlerbehebung

### Build-Fehler
```batch
# Vollständiger Reset und Neuinstallation
fix-build.bat
```

### Dependencies-Probleme
```batch
# Nur Dependencies neu installieren
install-dependencies.bat
```

### Häufige Probleme

1. **"body-parser module not found"**
   - Lösung: `install-dependencies.bat` ausführen

2. **Audio-Dateien werden nicht erkannt**
   - Überprüfen Sie die unterstützten Formate
   - Dateipfad darf keine Sonderzeichen enthalten

3. **OBS Overlay zeigt nichts an**
   - URL prüfen: `http://localhost:3000`
   - Port in Einstellungen überprüfen
   - Transparenz in OBS aktivieren

## 🎯 Tipps für Streamer

### Optimale OBS-Einstellungen
- **Größe**: 500x200 für Standard-Overlay
- **Position**: Unten links oder rechts für beste Sichtbarkeit
- **Transparenz**: Aktiviert für nahtlose Integration
- **Refresh**: Bei Problemen F5 drücken

### Mood-Organisation
- **Kategorien**: Nutzen Sie beschreibende Namen (Gaming, Chill, Hype)
- **Farben**: Konsistente Farbschemen für ähnliche Moods
- **Effekte**: Passende Effekte zur Musik-Energie

## 📈 Zukünftige Features

- [ ] Spotify Integration
- [ ] Last.fm Scrobbling  
- [ ] Custom CSS für OBS Overlay
- [ ] Mood-Sharing Community
- [ ] Audio-Visualizer Integration
- [ ] Multiple Overlay-Layouts
- [ ] Playlist-Import/Export

## 🤝 Support

Bei Problemen oder Fragen:
1. **Build-Skripte** ausprobieren (`fix-build.bat`)
2. **Console-Logs** überprüfen (F12 in der App)
3. **Issue** auf GitHub erstellen

## 📄 Lizenz

MIT License - Frei für private und kommerzielle Nutzung.

---

**Viel Spaß beim Streamen mit Mood Music! 🎵🎮**
