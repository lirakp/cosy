# Cosy

Grundlage für ein gemütliches Pixel-Art-Spiel – reines HTML5-Canvas, ohne
Abhängigkeiten und ohne Build-Schritt.

## Starten

Das Spiel nutzt ES-Module, braucht also einen kleinen lokalen Webserver:

```sh
python3 -m http.server 8000
```

Dann <http://localhost:8000> öffnen.

**Steuerung:** `←` `→` oder `A` `D` laufen · `E` am Wunschbrunnen und im Lager · `G` Galerie · `X` Expedition ·
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

## Expedition

Die vier stärksten Lebewesen laufen im Lager umher und füllen die Truhe – auch
während das Spiel geschlossen ist. Die Truhe fasst den Ertrag von vier Stunden
und fünf Funde; geleert wird sie per Klick auf die Truhe, mit `E` oder im Menü.

- **Gold pro Minute** nach Ausgangsrang: D 2 · C 3 · B 5 · A 8 · S 14 · SS 30.
- **Entwicklung:** Jedes Lebewesen startet auf Stufe D und steigt bis SS
  (Faktor 1 · 1,5 · 2,25 · 3,5 · 5 · 8). Bezahlt wird mit Lebewesen-Duplikaten
  im Verkaufswert von 30 · 80 · 200 · 600 · 2000.
- **Funde:** 2 % Chance pro Minute auf ein Sammelstück (Rang nach den normalen
  Chancen); jeder Fund wird beim Leeren als Pop-up gezeigt.
- **Expeditionsleitung:** drei Figuren mit je sechs Bildern (D–SS). Entwickelt
  wird mit Gold (300 · 900 · 2500 · 7000 · 20000). Bonus je Stufe
  0 · 10 · 25 · 45 · 70 · 100 %, gewichtet: Mira 1× Gold / 1× Funde,
  Bodo 1,6× / 0,4×, Yuna 0,4× / 1,6×.

Alle Werte stehen oben in `src/expedition.js`.

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
| `src/expedition.js` | Team, Ertrag, Truhe, Funde, Entwicklung, Leitung |
| `src/state.js` | Gold, Sammlung, Verkaufen, Speichern |
| `src/ui.js` | Menüs für Brunnen, Galerie und Expedition, Pop-ups |
| `src/sprites.js` | Spielfigur als Text-Pixelraster |
| `src/player.js` | Bewegung und Animation |
| `src/input.js` | Tastatur und Touch |
| `src/main.js` | Spielschleife, Kamera, Skalierung |
