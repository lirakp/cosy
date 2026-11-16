# Cosy

Grundlage für ein gemütliches Pixel-Art-Spiel – reines HTML5-Canvas, ohne
Abhängigkeiten und ohne Build-Schritt.

## Starten

Das Spiel nutzt ES-Module, braucht also einen kleinen lokalen Webserver:

```sh
python3 -m http.server 8000
```

Dann <http://localhost:8000> öffnen.

**Steuerung:** `←` `→` oder `A` `D` laufen · `E` am Wunschbrunnen · `G` Galerie ·
auf dem Handy linke / rechte Bildhälfte gedrückt halten und die Knöpfe antippen.

## Sammeln

Auf dem Weg erscheinen Münzen (je 10 Gold). Am Wunschbrunnen kostet ein Zug
50 Gold, zehn Züge 450 Gold. Es gibt 2100 Sammelstücke: 7 Kategorien × 6 Ränge
× 50 Stück. Die Bilder werden nicht einzeln gespeichert, sondern aus Bauplänen
in `src/art/` erzeugt – jedes Stück sieht bei jedem Start gleich aus.

| Rang | Chance | Duplikat-Wert |
| --- | --- | --- |
| D | 48 % | 10 Gold |
| C | 27 % | 20 Gold |
| B | 16 % | 40 Gold |
| A | 7,4 % | 100 Gold |
| S | 1,5 % | 500 Gold |
| SS | 0,1 % | 5000 Gold |

Der Spielstand liegt im `localStorage` des Browsers.

## Aufbau

| Datei | Inhalt |
| --- | --- |
| `src/config.js` | Auflösung (320×180), Weltbreite, Bodenlinien |
| `src/palette.js` | Alle Farben an einem Ort |
| `src/background.js` | Himmel, Sterne, Mond, Wolken, Berge, Hügel (Parallax) |
| `src/world.js` | Wiese, Weg, Häuschen, Brunnen, Münzen, Rauch, Glühwürmchen |
| `src/items.js` | Katalog der Sammelstücke, Ränge, Chancen, Ziehen |
| `src/art/` | Zeichner für die Sammelstücke (Kern + je Kategorie) |
| `src/state.js` | Gold, Sammlung, Verkaufen, Speichern |
| `src/ui.js` | Wunschbrunnen-Menü, Galerie, Pop-up für A–SS |
| `src/sprites.js` | Spielfigur als Text-Pixelraster |
| `src/player.js` | Bewegung und Animation |
| `src/input.js` | Tastatur und Touch |
| `src/main.js` | Spielschleife, Kamera, Skalierung |
