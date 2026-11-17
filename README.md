# Cosy

Grundlage für ein gemütliches Pixel-Art-Spiel – reines HTML5-Canvas, ohne
Abhängigkeiten und ohne Build-Schritt.

## Als Programm für Windows

Unter **Releases** auf GitHub liegt der aktuelle Build („Cosy für Windows“):

- `Cosy-Setup-….exe` installiert das Spiel mit Startmenü-Eintrag.
- `Cosy-…-portable.exe` startet direkt, ohne Installation.

Der Build entsteht automatisch bei jedem Push (`.github/workflows/desktop.yml`).
Die Programme sind nicht signiert; Windows zeigt beim ersten Start deshalb eine
SmartScreen-Warnung („Weitere Informationen“ → „Trotzdem ausführen“).
`F11` schaltet Vollbild um.

Selbst bauen oder im Fenster testen:

```sh
npm install
npm start        # Spiel im Programmfenster starten
npm run dist     # Windows-Programme nach dist/ bauen
```

## Im Browser starten

Das Spiel nutzt ES-Module, braucht also einen kleinen lokalen Webserver:

```sh
python3 -m http.server 8000
```

Dann <http://localhost:8000> öffnen.

**Steuerung:** `←` `→` oder `A` `D` laufen · `E` am Wunschbrunnen und im Lager · `G` Galerie · `X` Expedition · `F` Dungeon · `B` Bossarena · `P` Pause · `M` Ton an/aus ·
auf dem Handy linke / rechte Bildhälfte gedrückt halten und die Knöpfe antippen.

## Tag und Nacht

Ein ganzer Tag dauert 12 Minuten (`DAY_LENGTH` in `src/config.js`): Morgen,
Tag, Abend, Nacht. Sonne und Mond ziehen über den Himmel, nachts erscheinen
Sterne und Glühwürmchen, Fenster, Laterne und Fackeln leuchten. Die Tageszeit
steht oben links, wird mit dem Spielstand gespeichert und bleibt in der Pause
stehen. Farben und Übergänge stehen in `src/daycycle.js`.

## Musik und Ton

Musik und Effekte entstehen live mit der Web-Audio-Schnittstelle, ohne
Audiodateien (`src/audio.js`). Die Musik ist ein ruhiger Loop in C-Dur, dessen
Melodie immer wieder neu erfunden wird; nachts wird sie leiser und sparsamer,
in der Pause gedämpft. Browser erlauben Ton erst nach der ersten Eingabe.
Ton an/aus mit dem ♪-Knopf oder `M`, Lautstärke von Musik und Effekten im
Pause-Fenster. Die Einstellungen werden im Browser gespeichert.

## Das Haus

An der Haustür (`E`) betritt man das Häuschen. Durch das Fenster sieht man den
Himmel draußen, auf dem Kaminsims stehen die drei seltensten eigenen
Sammelstücke.

- **Kleiderschrank:** 14 Outfits (Wanderer, Winterjacke, Zauberlehrling,
  Königlich, Waldläufer, Kätzchen, Ritterrüstung, Schlafanzug …). Die Kleidung
  wird gespeichert und draußen wie drinnen getragen.
- **Bett:** Schlafen geht ab dem Abend und spult bis zum nächsten Morgen vor.
  Mit 10 % Chance wacht man mit einem von drei Rausch-Effekten auf, der
  15 Minuten (echte Zeit) hält und oben links angezeigt wird:

| Rausch | Wirkung |
| --- | --- |
| Goldrausch | Münzen auf dem Weg 40 statt 10 Gold, Expedition +5 % Gold |
| Glücksrausch | Brunnen: Chancen auf C bis SS ×1,1 (D seltener); Arena-Händler: Chance auf den höheren Rang ×1,1 |
| Gladiatorrausch | Dungeon und Bossarena: Erfolgschance +10 Prozentpunkte (bis 99 %) |

Werte in `src/buffs.js`, Outfits in `src/sprites.js`.

## Sammeln

Auf dem Weg erscheinen Münzen (je 10 Gold). Am Wunschbrunnen kostet ein Zug
65 Gold, zehn Züge 585 Gold. Es gibt 2100 Sammelstücke: 7 Kategorien × 6 Ränge
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

## Anlagen

Expeditionslager, Dungeon-Tor und Bossarena müssen erst gebaut werden (250, 400
und 600 Gold) und starten auf Rang D. Jeder Ausbau schaltet den nächsten Rang frei:

| Ausbau auf | C | B | A | S | SS |
| --- | --- | --- | --- | --- | --- |
| Expeditionslager | 1000 | 3000 | 8000 | 20000 | 50000 |
| Dungeon-Tor | 800 | 2500 | 7000 | 18000 | 45000 |
| Bossarena | 1200 | 3500 | 9000 | 22000 | 55000 |

Der Lager-Rang begrenzt, bis zu welcher Stufe Lebewesen und Leitung entwickelt
werden können; der Tor-Rang bestimmt die zugänglichen Gefahrenstufen; der Arena-Rang die
gezielt wählbaren Boss-Ränge und die höchste Ausrüstungsstufe. Die
Preise stehen in `src/buildings.js`.

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

## Dungeon

Am Tor ganz links ziehen bis zu fünf Helden los. Die Dauer ist die
Gefahrenstufe; es läuft immer eine Erkundung zur selben Zeit, auch bei
geschlossenem Spiel. Erfolgschance = Team-Stärke ÷ nötige Stärke, begrenzt auf
5–95 %. Stärke je Held: D 1 · C 2 · B 4 · A 7 · S 12 · SS 20. Scheitert die
Erkundung, gibt es keine Beute.

| Stufe | Dauer | Nötige Stärke | Gold | Sammelstücke |
| --- | --- | --- | --- | --- |
| D | 30 s | 2 | ~15 | 1× Zufall |
| C | 1 min | 6 | ~35 | 3× D + 1× Zufall |
| B | 5 min | 14 | ~150 | 3× D + 2× ab C |
| A | 15 min | 28 | ~500 | 3× D + 3× ab C |
| S | 30 min | 50 | ~1200 | 3× D + 4× ab B |
| SS | 60 min | 85 | ~3000 | 3× D + 5× ab A |

Alle Werte stehen oben in `src/dungeon.js`.

## Bossarena

Drei Helden treten gemeinsam an; jeder trägt Waffe, Rüstung, Relikt und
Artefakt. Jedes Stück kann nur einmal getragen werden.

| | D | C | B | A | S | SS |
| --- | --- | --- | --- | --- | --- | --- |
| Stärke Held | 10 | 20 | 40 | 70 | 120 | 200 |
| Stärke Ausrüstung (nach Rang) | 4 | 7 | 12 | 20 | 35 | 60 |
| Faktor nach Ausrüstungsstufe | 1 | 1,3 | 1,7 | 2,2 | 3 | 4 |
| Kosten bis zu dieser Stufe (Duplikat-Wert) | – | 30 | 80 | 200 | 600 | 2000 |
| Stärke Boss | 40 | 100 | 220 | 500 | 1100 | 2400 |
| Preis Boss gezielt (Gold) | 50 | 120 | 300 | 800 | 2500 | 8000 |

- **Zufallsboss:** 30 Gold, der Rang wird mit den Chancen des Brunnens gewürfelt.
- **Siegchance:** Team-Stärke ÷ Boss-Stärke, begrenzt auf 5–95 %. Nach dem
  Kampf ist der Boss weg, auch bei einer Niederlage.
- **Beute:** 3× Stoff im Rang des Bosses, mit 35 % zusätzlich 1× Seide.
- **Arena-Händler:** 3 Stoff → Sammelstück im selben Rang (75 %) oder einen
  Rang höher (25 %). 1 Seide → einen Rang höher (70 %) oder selber Rang (30 %).
  Rang SS ergibt immer SS.
- **Ausrüstung verbessern:** mit Duplikaten von Waffen, Rüstung, Relikten und
  Artefakten, wie bei der Expedition.

Alle Werte stehen oben in `src/arena.js`.

Der Spielstand liegt im `localStorage` des Browsers.

## Aufbau

| Datei | Inhalt |
| --- | --- |
| `src/config.js` | Auflösung (320×180), Weltbreite, Bodenlinien |
| `src/palette.js` | Alle Farben an einem Ort |
| `src/background.js` | Himmel, Sterne, Sonne, Mond, Wolken, Berge, Hügel (Parallax) |
| `src/daycycle.js` | Tag-Nacht-Zyklus: Himmelsfarben, Tönung, Sonnen- und Mondbahn |
| `src/world.js` | Wiese, Weg, Häuschen, Brunnen, Lager, Dungeon-Tor, Münzen, Rauch, Glühwürmchen |
| `src/items.js` | Katalog der Sammelstücke, Ränge, Chancen, Ziehen |
| `src/art/` | Zeichner für die Sammelstücke (Kern + je Kategorie) |
| `src/expedition.js` | Team, Ertrag, Truhe, Funde, Entwicklung, Leitung |
| `src/arena.js` | Bossarena: Team, Ausrüstung, Bosse, Beute, Händler |
| `src/dupes.js` | Bezahlen mit Duplikaten |
| `src/buildings.js` | Bau und Ausbau von Lager, Dungeon-Tor und Bossarena |
| `src/dungeon.js` | Gefahrenstufen, Erfolgschance, Beute |
| `src/state.js` | Gold, Sammlung, Verkaufen, Speichern |
| `src/ui.js` | Menüs für Brunnen, Galerie, Expedition und Dungeon, Pop-ups |
| `src/sprites.js` | Spielfigur und Outfits als Text-Pixelraster |
| `src/player.js` | Bewegung und Animation |
| `src/input.js` | Tastatur und Touch |
| `desktop/main.js` | Programmfenster für die Desktop-Version (Electron) |
| `src/audio.js` | Musik und Soundeffekte (Web Audio) |
| `src/interior.js` | Innenraum des Hauses |
| `src/buffs.js` | Rausch-Effekte nach dem Schlafen |
| `src/main.js` | Spielschleife, Kamera, Skalierung |
