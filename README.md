# Cosy

Grundlage für ein gemütliches Pixel-Art-Spiel – reines HTML5-Canvas, ohne
Abhängigkeiten und ohne Build-Schritt.

## Startbildschirm und Figuren

Beim Start erscheint der Titelbildschirm. Dort wählst du deine Figur, mit Klick
oder mit ← → und `Enter`:

Mensch (männlich / weiblich), Elf, Elfe, Zwerg, Zwergin, Ork, Mondelfe und Halbling.

Die Völker unterscheiden sich in Haut- und Haarfarbe, Frisur, spitzen Ohren,
Bart, Zöpfen, Hauern und Größe. Zwerge und Halblinge sind kleiner. Menschen,
Elfen, Zwerge und Halblinge haben fünf Hauttöne zur Auswahl. Die Wahl ändert nur
das Aussehen, alle Figuren spielen sich gleich. Jede Kleidung aus dem
Kleiderschrank passt allen; neu dazugekommen ist „Ohne Hut“, damit man die Frisur
sieht. Neue Spielstände starten in diesem Outfit.

Die Figur lässt sich jederzeit im Pause-Menü unter „Figur wechseln“ ändern.
Daten in `src/sprites.js` (`CHARACTERS`), der Bildschirm in `src/title.js`.

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
npm test         # Spielregeln automatisch prüfen
npm run dist     # Windows-Programme nach dist/ bauen
```

Die Tests in `tests/rules.test.js` prüfen Chancen, Kosten, Grenzen und den
Spielstand (z. B. dass Kopieren in der Schmiede nie Gewinn bringt). Sie laufen
auch auf GitHub vor jedem Windows-Build; schlägt einer fehl, wird nicht gebaut.

## Im Browser starten

Das Spiel nutzt ES-Module, braucht also einen kleinen lokalen Webserver:

```sh
python3 -m http.server 8000
```

Dann <http://localhost:8000> öffnen.

**Steuerung:** `←` `→` oder `A` `D` laufen · `E` am Wunschbrunnen und im Lager · `G` Galerie · `X` Expedition · `F` Dungeon · `B` Bossarena · `N` Mine · `H` Schmiede · `P` Pause · `I` Statistik · `R` Errungenschaften · `Z` Zauberbuch · `M` Ton an/aus ·
auf dem Handy linke / rechte Bildhälfte gedrückt halten und die Knöpfe antippen.


## Auf dem Handy spielen

- **Android-App:** Unter *Releases → „Cosy für Android“* liegt `Cosy.apk`. Auf dem
  Handy öffnen und installieren (einmalig „Apps aus dieser Quelle zulassen“).
  Neue Fassungen einfach drüber installieren – der Spielstand bleibt. Gebaut wird
  automatisch mit Capacitor (`.github/workflows/android.yml`, Anpassungen in
  `mobile/prepare-android.sh`). Der Signierschlüssel `mobile/cosy-debug.keystore`
  ist ein einfacher Debug-Schlüssel (Passwort `android`), damit Updates passen.
- **Als Web-App (auch iPhone):** Wird das Spiel auf einer Webseite bereitgestellt,
  lässt es sich im Browser über „Zum Home-Bildschirm“ wie eine App installieren
  (Vollbild, offline spielbar – `manifest.webmanifest`, `sw.js`).
- **Bedienung per Touch:** ◀ ▶ unten links/rechts gedrückt halten zum Laufen,
  der grüne Knopf rechts ist die Aktion (`E`), Galerie und Begleiter über die Knöpfe oben (Schmiede, Mine, Arena usw. direkt am Gebäude), das
  Mana-Feld öffnet das Zauberbuch, in der Mine wechseln ▲ ▼ die Ebene. Am besten
  quer halten.
- **Spielstand übertragen:** In der Android-App kopiert „Sichern“ den Spielstand in
  die Zwischenablage, „Laden“ liest ihn von dort (oder aus einer Datei).

## Das Dorf

Am Wegweiser ganz links auf dem Hof (`E` oder Klick aufs Schild) geht es ins
Dorf; rechts im Dorf führt der Weg zurück.

- **Bewohner mit Aufgaben:** Bäckerin Greta, Fischer Ole, Bürgermeister Anton,
  Gärtnerin Lotte und Abenteurer Jonas. Ein „?“ über dem Kopf heißt: Aufgabe
  offen, ein grünes „!“: kann abgegeben werden. Aufgaben sind zufällig und
  kommen immer wieder (1–3 Minuten nach Abgabe oder Ablehnen). Verlangt werden
  Erz (nur aus offenen Minen-Ebenen), Ernte, Fische oder ein Duplikat einer
  Kategorie und eines Rangs.

| Schwierigkeit | Häufigkeit | Belohnung |
| --- | --- | --- |
| leicht | 50 % | 40–100 Gold |
| mittel | 35 % | 150–350 Gold, mit 40 % ein Sammelstück ab Rang C |
| schwer | 15 % | 600–1200 Gold und ein Sammelstück ab Rang B |

- **Marktstand (Marktfrau Hilde):** Saatpäckchen auf Vorrat (20 % günstiger,
  werden beim Pflanzen zuerst verbraucht), Ernte und Fische verkaufen, vier
  Sammelstücke zum Kaufen (Verkaufswert × 5) und drei gesuchte Stücke, die sie
  für den doppelten Verkaufswert ankauft (nur Duplikate). Das Angebot wechselt
  alle 20 Minuten.
- **Fischreuse:** am Ufer neben dem Steg, kaufbar (400 Gold) und ausbaubar
  (1200 · 3500 · 9000 · 22000). Fängt alle 8 · 6 · 4,5 · 3,5 · 2,5 Minuten einen
  Fisch (gleiche Chancen wie beim Angeln, offline Arten aller Tageszeiten, keine
  Flaschenpost), bis zu 8 · 12 · 18 · 25 · 35 Fische; dann wartet sie aufs Leeren.
- **Angelbuch:** Pult am Ende des Stegs (`E`): alle sechs Fischarten mit Bild
  (unbekannte als Schatten), Rang, Seltenheit, Marktwert, wie viele je
  gefangen und wie viele im Vorrat; dazu gefundene Flaschenposts.
- **Angeln am Steg:** `E` wirft aus, und die Kamera wechselt in eine Sicht
  auf den See: Fische schwimmen umher, und der Fisch, der gleich anbeißt, schwimmt
  sichtbar zum Haken – ein seltener Fang ist also schon vorher zu erkennen. Nach 3–8 Sekunden beißt etwas („!“), dann
  hat man 0,9 Sekunden zum Einholen. Erst wird der Rang nach den Brunnen-Chancen
  gewürfelt, dann beißt eine gerade aktive Art dieses Rangs (☀ tagsüber, ☾ nachts,
  ◐ in der Dämmerung, ◯ immer – jeder Rang hat eine Art, die immer beißt); mit
  3 % hängt eine Flaschenpost mit einem Sammelstück am Haken.

| Rang | Arten |
| --- | --- |
| D | Weißfisch ◯, Rotauge ☀, Flussbarsch ☀, Schleie ◐, Gründling ◯, Leuchtgrundel ☾ |
| C | Forelle ◯, Aal ☾, Brasse ☀, Rotfeder ☀, Mondbarsch ☾ |
| B | Karpfen ◯, Zander ◐, Wels ☾, Regenbogenforelle ☀, Laternenfisch ☾ |
| A | Hecht ◯, Stör ◐, Geisterkarpfen ☾, Koi ☀ |
| S | Goldkarpfen ◯, Nordlichtfisch ☾ |
| SS | Mondfisch ☾, Drachenfisch ☀ |

  Aufgaben verlangen „Fisch vom Rang X“ – jede Art dieses Rangs zählt.

Werte in `src/village.js`.

### Freundschaft, Dorfprojekte und Gilde

Damit das Dorf auch später wichtig bleibt:

- **Aufgaben wachsen mit:** Das Gold einer Aufgabe steigt um 12 % je Gebäude-Rang
  in der Welt (Bau zählt als Rang). Dazu gibt es Glückstaler (leicht 1 · mittel 3 ·
  schwer 6 🪙, schwer mit 25 % – in den Dimensionen 50 % – auch 1 🌟). Mittlere und
  schwere Aufgaben fragen später auch nach Stoff, Seide und Duplikaten.
- **Freundschaft:** Jede Aufgabe bringt Herzen (leicht 1 · mittel 2 · schwer 3 ♥).
  Stufen bei 3 · 8 · 15 · 25 · 40 Herzen. Jede Stufe gibt ein Geschenk (5 🪙 ·
  10 🪙 · 20 🪙 + 1 🌟 · 30 🪙 + 2 🌟), Stufe 5 ein seltenes Sammelstück (S/SS,
  bevorzugt ein fehlendes). Der Bonus wächst mit der Stufe (Werte auf Stufe 5):

| Heimat | Bonus | Hölle | Bonus | Himmel | Bonus |
| --- | --- | --- | --- | --- | --- |
| Greta | Räusche +50 % länger, Aufgaben +20 % Gold | Kohla | Räusche +50 %, Minispiele +25 % | Aurelia | Räusche +50 %, Aufgaben +20 % |
| Ole | Fische +40 % schneller, Mana +10 % | Brandolf | Glut +40 %, Mine +15 % | Cirrus | Sternschnuppen +50 %, Minispiele +25 % |
| Anton | Ausbau −15 %, Aufgaben +20 % | Asmund | Ausbau −15 %, Kampfgold +20 % | Lumen | Ausbau −15 %, Taler −10 % |
| Lotte | Garten +30 %, Mine +10 % | Flamma | Garten +30 %, Seide +5 % | Celeste | Garten +30 %, Mana +20 % |
| Jonas | Expedition +25 %, Stärke +8 % | Grimm | Stärke +10 %, Kampfgold +20 % | Zephyr | Expedition +25 %, Gratiswunsch +5 % |

  Der Ausbau-Rabatt ist auf −40 % gedeckelt. Sind alle fünf Bewohner einer Welt beste
  Freunde, gibt es ihre **Zunft-Tracht** im Kleiderschrank: Dorftracht (Aufgaben +30 %,
  Ausbau −5 %, Münzen 6 Schritte), Glutzunft-Tracht (Stärke +8 %, Glut +20 %,
  Minispiele +20 %), Wolkenzunft-Tracht (Taler −10 %, Sternschnuppen +30 %, Aufgaben +30 %).
- **Dorfprojekte** am östlichen Dorfrand – in jedem Dorf (Heimat, Hölle, Himmel)
  eigene, je drei Stufen. Man spendet nach und nach Gold, Erz, Stoff, Seide, Fisch
  (Dimensionen: Glutsteine/Sternensplitter ×10) und Duplikate; Gold kostet in den
  Dimensionen das Dreifache.
  - **Taverne:** Rausch-Tränke für 15 Minuten (Freundschaft verlängert sie):
    Glücksrausch 3.000 Gold (Stufe 1), Goldrausch 8.000 (Stufe 2), Gladiatorrausch
    20.000 (Stufe 3, dann alle −25 %); in Hölle/Himmel auf Stufe 3 auch Höllenfeuer
    bzw. Himmelssegen (60.000). In den Dimensionen ×3.
  - **Gildenhaus:** *Daueraufträge* zählen über das ganze Spiel (alle Welten):
    | Auftrag | Meilensteine | danach |
    | --- | --- | --- |
    | Tiefenläufer (Etagen im Abstieg) | 50 · 100 · 250 · 500 · 1.000 · 1.500 | alle 250 |
    | Bossjäger (Bosse im Bossrush) | 25 · 50 · 100 · 250 · 500 · 1.000 · 1.500 | alle 250 |
    | Kundschafter (erfolgreiche Dungeon-Erkundungen) | 5 · 10 · 25 · 50 · 100 · 200 · 300 | alle 50 |
    | Arena-Champion (Siege in der Bossarena) | 5 · 10 · 25 · 50 · 100 · 200 · 300 | alle 50 |

    Belohnungen steigen von 5 🪙 bis 100 🪙 + 8 🌟 + Sammelstück ab S; nach dem Limit
    gibt es je Schritt die Standardbelohnung 20 🪙 + 2 🌟. *Tagesaufträge* (1 · 2 · 3
    je Stufe, jeden Spieltag neu) wollen Seide, Stoff, Erz hoher Ränge oder Duplikate
    und zahlen Gold, Taler und ab dem zweiten Auftrag ein Sammelstück ab B/A/S.
  - **Festplatz:** Dorffest an jedem 4. · 3. · 2. Spieltag (je Stufe), mit Wimpeln im
    Dorf. Jeder Fisch bringt Wettbewerbspunkte (D 1 · C 2 · B 4 · A 8 · S 16 · SS 32),
    in den Dimensionen zählt ein Drittel der Minispiel-Punkte. Preise ab 10 / 30 / 60
    Punkten (10 🪙 · 20 🪙 + 1 🌟 · 30 🪙 + 2 🌟 + Sammelstück ab A). Der Sonderhändler
    bietet drei Stücke ab Rang A (Stufe 3: bis SS) für Sternentaler (A 2 · S 4 · SS 9 🌟).

Werte in `src/friendship.js`, `src/projects.js` und `src/guild.js`.

## Garten und Küche

Rechts vom Haus liegen Beete (zwei sind frei, weitere kosten 300 · 800 · 2000 ·
5000 Gold). Pflanzen wachsen in echter Zeit, auch offline; mit `E` am Garten
wird geerntet oder gepflanzt.

| Pflanze | Saatgut | Wachstum | Ernte |
| --- | --- | --- | --- |
| Karotte | 10 Gold | 5 min | 2 |
| Weizen | 15 Gold | 8 min | 2 |
| Kartoffel | 20 Gold | 12 min | 2 |
| Beeren | 30 Gold | 20 min | 3 |
| Kürbis | 50 Gold | 30 min | 1 |
| Sternenblume | 150 Gold | 60 min | 1 |

**Gartenhelfer:** Im Garten-Menü lässt sich eines deiner Lebewesen als Helfer
einsetzen (es zieht dann nicht mehr mit auf Expedition). Es läuft zwischen den
Beeten, erntet Reifes und pflanzt neu – je Beet „wie zuletzt“, eine feste
Pflanze oder „leer lassen“ –, auch offline (bis 8 Stunden, mehrere Durchgänge).
Saat nimmt es zuerst aus dem Päckchen-Vorrat. Mit Verkaufserlaubnis verkauft es
Ernte über dem eingestellten Vorrat (Standard 5 je Pflanze, fürs Kochen) zu
Marktpreisen, kauft davon Saat und sammelt den Gewinn in seiner Kasse, die du
leeren kannst; reicht das Geld für die nächste Saat nicht, greift es auch den
Vorrat an. Ohne Erlaubnis erntet es nur und pflanzt mit Päckchen.

Am Kamin im Haus wird gekocht – Gerichte geben gezielt einen Rausch:

| Gericht | Zutaten | Wirkung |
| --- | --- | --- |
| Goldene Kürbissuppe | 1 Kürbis, 1 Sternenblume, 2 Karotten | Goldrausch, 5 min |
| Glückskuchen | 3 Weizen, 2 Beeren | Glücksrausch, 6 min |
| Kraft-Eintopf | 2 Kartoffeln, 1 Kürbis, 2 Karotten | Gladiatorrausch, 6 min |
| Sternenblüten-Tee | 1 Sternenblume, 2 Beeren | verlängert den laufenden Rausch um 5 min |

Werte in `src/garden.js`.

## Sammel-Sets

Wer alle 50 Stücke einer Kategorie in einem Rang besitzt, schließt ein Set ab
und bekommt einen dauerhaften Bonus (Pop-up beim Abschluss, Fortschritt in der
Galerie). Je Set nach Rang D · C · B · A · S · SS:

| Kategorie | Bonus je Set |
| --- | --- |
| Lebewesen | +2 · 3 · 4 · 6 · 8 · 12 % Expeditionsgold |
| Monster | +2 · 3 · 4 · 6 · 8 · 12 % Erz in der Mine |
| Waffen | +2 · 3 · 4 · 6 · 8 · 12 % Team-Stärke in der Bossarena |
| Rüstung | +2 · 3 · 4 · 6 · 8 · 12 % Team-Stärke im Dungeon |
| Relikte | +1 · 1 · 2 · 3 · 4 · 6 Gold pro Münze auf dem Weg |
| Artefakte | +2 · 3 · 4 · 6 · 8 · 12 % schnellere Schmiedeglut |
| Helden | +2 · 3 · 4 · 6 · 8 · 12 % Rabatt auf Brunnen-Taler |

Boni einer Kategorie addieren sich. Werte in `src/sets.js`.

## Tag und Nacht

Ein ganzer Tag dauert 12 Minuten (`DAY_LENGTH` in `src/config.js`): Morgen,
Tag, Abend, Nacht. Sonne und Mond ziehen über den Himmel, nachts erscheinen
Sterne und Glühwürmchen, Fenster, Laterne und Fackeln leuchten. Die Tageszeit
steht oben links, wird mit dem Spielstand gespeichert und bleibt in der Pause
stehen. Farben und Übergänge stehen in `src/daycycle.js`.

## Landschaften

Im Pause-Fenster lässt sich die Landschaft wählen; sie gilt für Hof und Dorf und
wird mit dem Spielstand gespeichert:

| Landschaft | Besonderheiten |
| --- | --- |
| Bergland | wie bisher |
| Kirschblütental | rosa Bäume, frisches Grün, fallende Blütenblätter |
| Herbstwald | orange-rote Bäume, goldene Wiese, fallendes Laub |
| Winterland | Schnee auf Wiese, Bäumen, Tannen, Gipfeln und Dach, Schneefall |
| Küste | Meer mit Inseln statt Bergen, Dünen, Sandweg |
| Jahreszeiten | wechselt alle 2 Spieltage: Frühling, Sommer, Herbst, Winter |

Farben und Wetter stehen in `src/themes.js`.

## Musik und Ton

Musik und Effekte entstehen live mit der Web-Audio-Schnittstelle, ohne
Audiodateien (`src/audio.js`). Die Musik ist ein ruhiger Loop in C-Dur, dessen
Melodie immer wieder neu erfunden wird; nachts wird sie leiser und sparsamer,
in der Pause gedämpft. Browser erlauben Ton erst nach der ersten Eingabe.
Ton an/aus mit dem ♪-Knopf oder `M`, Lautstärke von Musik und Effekten im
Pause-Fenster. Die Einstellungen werden im Browser gespeichert.

## Mine und Erzhändler

Ganz rechts liegt die Mine (betreten mit `E`). Jeder Minen-Rang öffnet eine
tiefere Ebene: Lehmstollen (Kupfererz, D), Felsengang (Eisen, C), Silberader (B),
Goldkammer (A), Kristallhöhle (Mithril, S), Sternengrund (Sternenerz, SS). Im
Schacht wechselt man mit `↑`/`↓` oder über das Aufzug-Menü die Ebene.

Bis zu drei Monster pro Ebene hacken sichtbar mit der Spitzhacke; das Erz
sammelt sich von selbst, auch offline (bis zu 8 Stunden).

- Hiebe pro Minute nach Rang des Monsters: D 2 · C 2,5 · B 3,2 · A 4 · S 5 · SS 6,5
- Verbesserung mit Monster-Duplikaten (30 · 80 · 200 · 600 · 2000), bis zum
  Minen-Rang: Tempo ×1 · 1,25 · 1,55 · 1,9 · 2,3 · 2,8 und Erz pro Hieb
  1 · 1 · 2 · 2 · 3 · 4
- Je tiefer, desto seltener das Erz: Faktor 1 · 0,6 · 0,4 · 0,25 · 0,15 · 0,08

Der **Erzhändler** setzt sich ab und zu neben den Brunnen: alle 3 Minuten
Spielzeit mit 8,9 % Chance (so selten wie ein A- oder S-Zug), dann bleibt er
6 Minuten. Er bietet vier bestimmte Sammelstücke (bevorzugt fehlende) für
20 · 20 · 25 · 30 · 40 · 50 Erz ihres Rangs und drei Überraschungstausche pro
Besuch (10 · 10 · 12 · 15 · 20 · 25 Erz → zufälliges Stück dieses Rangs).

Werte in `src/mine.js` und `src/trader.js`.

## Magie

Der **Magierturm** (zwischen Garten und Brunnen, 1500 Gold, Ausbau 1800 · 4200 ·
9000 · 19000 · 44000) sammelt Mana – nachts doppelt so schnell, offline zum
Tageswert. Vorrat und Nachladen je Rang: 30 · 45 · 60 · 80 · 100 · 130 Mana,
1 · 1,3 · 1,6 · 2 · 2,5 · 3 pro Minute. Das **Zauberbuch** öffnet sich am Turm
oder überall mit `Z`; das Mana steht oben links.

**Jede der 30 Schriftrollen** (Relikte, 5 je Rang) lehrt ihren eigenen Zauber.
Lernen braucht genau diese Schriftrolle und einen Turm ab ihrem Rang; die
Schriftrolle wird nicht verbraucht (die Schmiede kann sie kopieren). Innerhalb
eines Rangs gehören die Schriftrollen zu fünf Schulen. Mit jedem Rang wird der
Zauber stärker, ab und zu kommen Wirkungen dazu.

Mana und Abklingzeit je Rang D … SS: 15 · 20 · 30 · 45 · 65 · 90 Mana,
5 · 8 · 12 · 20 · 30 · 45 Minuten.

| Schule | D | C | B | A | S | SS |
| --- | --- | --- | --- | --- | --- | --- |
| ❀ Zeit & Wachstum | **Keimling**: Beete reif | **Frühlingshauch**: + 1 Ernte je Beet | **Erntesegen**: + 15 min für Expedition, Mine und Schmiedeglut | **Zeitsprung**: + 2 Ernte, 30 min | **Jahreslauf**: leere Beete neu bepflanzt, 60 min | **Ewiger Frühling**: + 3 Ernte, 120 min |
| ◉ Gold | **Sternenregen**: 45 s Münzregen | **Münzschauer**: 60 s + 100 Gold | **Goldene Brise**: 75 s + 300 | **Schatzregen**: 90 s + 800 | **Goldflut**: 120 s + 2000, Goldrausch 10 min | **Sonnengold**: 180 s + 5000, Goldrausch 20 min |
| ≈ Wasser | **Lockruf**: 1 Wurf, +1 Rang | **Fischflüstern**: 2 Würfe | **Gezeitenruf**: 3 Würfe, Reuse + 30 min | **Mondflut**: 4 Würfe, +2 Ränge, Reuse + 60 min | **Tiefenruf**: 5 Würfe, Reuse + 120 min | **Ruf des Ozeans**: 8 Würfe, +3 Ränge, Reuse + 240 min |
| ✦ Glück & Sterne | **Glücksfunke**: 1 Wunsch ab C, +2 🪙 | **Wunschstern**: 2 Wünsche ab C, 3 Sternschnuppen, +4 🪙 | **Kleeblattsegen**: 2 ab B, 4 Schnuppen, +6 🪙 | **Sternschnuppenregen**: 3 ab B, 6 Schnuppen, +10 🪙 | **Schicksalsfaden**: 3 ab A, 8 Schnuppen, +15 🪙 +1 🌟, Glücksrausch 15 min | **Tausend Wünsche**: 5 ab A, 12 Schnuppen, +25 🪙 +2 🌟, Glücksrausch 30 min |
| ⛨ Schutz & Kampf | **Schutzhauch**: 1 Kampf +5 % | **Eisenhaut**: +10 % | **Schutzschild**: 2 Kämpfe +12 %, 1 Schutz | **Kriegsruf**: 2 × +15 %, 1 Schutz | **Bollwerk**: 3 × +20 %, 2 Schutz | **Unbezwingbar**: 3 × +25 %, 3 Schutz, Gladiatorrausch 20 min |

„Wünsche“ heißt: das erste Stück eines Zugs am Brunnen hat mindestens diesen
Rang. 🪙/🌟 sind Glückstaler/Sternentaler für den Brunnen. „Schutz“ wehrt die
nächste Niederlage im Bossrush oder Abstieg ab (es geht einfach weiter); Schutz-Ladungen werden addiert. Die Zauber der Dimensionen schenken
doppelt so viele Taler, einen Sternentaler und einen Schutz mehr. Lockruf-, Glücks- und Schild-Ladungen desselben Typs werden nicht
addiert: Es zählen die meisten Ladungen und die stärkste Wirkung. Zauber-
Sternschnuppen kommen kurz nacheinander, auch am Tag. Ein Rausch aus einem
Zauber verlängert einen gleichen Rausch oder ersetzt einen anderen. Alte
Spielstände behalten ihre Zauber, sie heißen jetzt nach ihrer Schule. In der
Galerie steht bei jeder Schriftrolle, welchen Zauber sie lehrt.

Werte in `src/magic.js`.

## Dimensionsportal (Hölle oder Himmel)

Zwischen Expeditionslager und Bossarena lässt sich für **10.000 Gold** ein
Dimensionsportal bauen. Beim Bau entscheidet der Zufall, wohin es führt: in die
**Hölle** oder in den **Himmel**. Das bleibt dann für immer so; verraten wird es
erst beim ersten Durchschreiten (`E` vor dem Portal).

Die Portalwelt ist genauso aufgebaut wie die Heimat: Haus, Garten, Brunnen,
Bauplätze für Lager, Dungeon, Arena, Mine, Schmiede und Turm, Schild zum Dorf und
das Portal für den Rückweg. Sie sieht aber anders aus:

- **Hölle:** glühender Himmel, Asche, dunkler Fels und aufsteigende Funken.
- **Himmel:** goldenes Licht, Wolkenboden und fallende Federn.

**Eigener Stand je Welt:** Gebäude, Expedition, Dungeon, Arena (mit Stoff und
Seide), Mine, Schmiede, Brunnen (mit Glückszähler) und Garten. Die verlassene Welt
sammelt währenddessen weiter, wie offline.

**Für beide Welten gemeinsam:** Gold, Sammlung, Begleiter, Haus mit Nähtisch,
Dorf, Magie und Statistik.

**2100 neue Sammelstücke je Portalwelt** (7 Kategorien × 6 Ränge × 50):

- **Hölle:** Glut-, Asche- und Obsidianfarben, kleine Hörner, Funken statt
  Glitzer, Namen wie „Waldläufer der Neun Kreise“.
- **Himmel:** Weiß, Gold und Pastell, Heiligenschein, goldener Glitzer, Namen wie
  „Katze vom Wolkenrand“.

In der Portalwelt bringen Brunnen, Expedition, Dungeon, Händler, Sternschnuppen
und Geschenke nur Stücke dieser Welt. Auch die Teams (Expedition, Arena, Dungeon,
Mine, Gartenhelfer) und das Leveln nutzen nur deren Stücke. Man baut dort also
wirklich neu auf. Die Galerie hat oben einen Reiter je Welt. Sammel-Sets und
Zauber-Schriftrollen gibt es nur in der Heimat.

### Regeln und Boni der Dimensionen

- **Start bei Rang B:** Gebäude werden in einer Dimension direkt auf Rang B
  gebaut, der Brunnen steht dort schon auf B. Sie kosten mehr: Bau = (Bau +
  Ausbau auf C + Ausbau auf B der Heimat) × 2,5, jeder weitere Ausbau × 2,5.
- **Höhere Belohnungen:** Gold aus Expedition, Dungeon und Münzen × 2. Taler
  am Brunnen kosten das Doppelte.
- **Eigene Boni**, solange man dort ist:
  - Hölle: Expedition +50 % Gold, Mine +30 % Erz, Arena und Dungeon +15 % Stärke
  - Himmel: Beete wachsen 40 % schneller, Mana +40 %, Sternschnuppen +50 %, am
    Brunnen und beim Händler immer Glück wie im Glücksrausch
- **Pflanzen (nur dort anbaubar):**
  - Hölle: Feuerchili, Aschenknolle, Lavamelone
  - Himmel: Wolkenbeere, Sonnenweizen, Engelsapfel
- **Gerichte (nur dort kochbar):**
  - Hölle: Feuereintopf → *Höllenfeuer* (Gold- und Gladiatorrausch zugleich,
    10 min), Glutkuchen → Goldrausch 12 min, Lavasuppe verlängert um 12 min
  - Himmel: Wolkenbrot → *Himmelssegen* (Glücks- und Goldrausch zugleich,
    10 min), Engelstorte → Glücksrausch 15 min, Himmelstee verlängert um 12 min
- **Zauber:** Die 30 Schriftrollen jeder Dimension lehren eigene Zauber, etwa
  „Funkenregen“, „Höllenpakt“, „Schwert des Seraphen“ oder „Tausend Engel“. Sie
  sind stärker als die der Heimat. Höllenzauber schenken zusätzlich Erz für die
  Mine, Himmelszauber ab Rang B einen Gratiswunsch. Im Zauberbuch haben sie einen
  eigenen Reiter.
- **Kleidung** (am Nähtisch, nur in der jeweiligen Dimension aus deren Stoff und
  Seide):
  - Hölle: Glutpanzer, Aschemantel, Dämonenrobe, Gewand des Höllenfürsten
  - Himmel: Federkleid, Wolkenmantel, Engelsrobe, Seraphengewand
  - Neu: Dämonenrobe Seide +5 %, Gewand des Höllenfürsten Schmiedeglut +20 % und
    Stärke +5 %, Engelsrobe Taler −5 %, Seraphengewand Taler −10 % und Stärke +5 %.
  - Jede mit eigenem Bonus von Rang B bis SS.
- **Die zweite Dimension:** Stehen in der Heimat **alle Gebäude auf Rang SS**
  (Lager, Dungeon, Arena, Mine, Schmiede, Turm, Brunnen), öffnet das Portal auch
  die andere Dimension. Am Portal wählt man dann das Ziel.

### Dörfer der Dimensionen

Das Schild links führt in jeder Dimension in ein eigenes Dorf im Stil der Welt.
Die Bewohner haben Hörner bzw. Heiligenschein, die Häuser die Farben der Welt.
Statt eines Sees liegt dort ein Lavasee bzw. ein Wolkenloch.

| | Bewohner | Händler |
| --- | --- | --- |
| Hölle | Köchin Kohla, Schmied Brandolf, Aschefürst Asmund, Gärtnerin Flamma, Seelensammler Grimm | Händlerin Zunder |
| Himmel | Bäckerin Aurelia, Sternenhüter Cirrus, Ratsältester Lumen, Gärtnerin Celeste, Windreiter Zephyr | Händler Nimbus |

**Aufgaben** wollen Pflanzen der Dimension, Erz, Sammelstück-Duplikate der
Dimension oder Glutsteine/Sternensplitter. Sie zahlen dreimal so viel Gold, und
Sammelstücke gibt es ab Rang B.

**Minispiele** (statt Angeln, links am See):

- **Höllenschmiede am Lavasee:** 8 Schläge. Ein Zeiger saust über eine Leiste
  und wird mit jedem Schlag schneller. `E` im gelben Feld = perfekt (3 Punkte),
  im roten = gut (1 Punkt).
- **Sternenfang über den Wolken:** 25 Sekunden lang mit ← → den Wolkenkorb
  bewegen. Stern +1, goldener Stern +5, Gewitterwolke −3 und kurz betäubt.

Jeder Punkt bringt einen Glutstein bzw. Sternensplitter und 15 Gold (in der
Dimension doppelt). Ab 18 bzw. 30 Punkten gibt es ein Sammelstück der Dimension
ab Rang B, ab 24 bzw. 50 Punkten mindestens Rang A. Rekorde werden gespeichert.
Glutsteine und Sternensplitter lassen sich am Markt für je 25 Gold verkaufen.

### Begleiter der Dimensionen

Je Dimension gibt es 6 eigene Begleiter (Rang B bis SS). Sie streunen nur dort
umher und bringen neue Bonus-Arten mit:

„Stärke“ gilt für alle Kampfteams (Arena, Dungeon, Bossrush, Abstieg), „Gold“ aus
Dungeon auch für Abstieg und Bossrush. Rabatte auf Brunnen-Taler (Begleiter,
Statuen, Kleidung, Helden-Sets) zählen zusammen, höchstens −50 %.

| Hölle | Rang | Bonus |
| --- | --- | --- |
| Glutsalamander | B | Dungeon +20 % Gold |
| Aschefledermaus | B | Minispiele +25 % Ertrag |
| Höllenhund | A | alle Kampfteams +12 % Stärke, Seide +5 % |
| Feuerimp | A | +5 % Chance auf Gratis-Folgewunsch, Brunnen-Taler −10 % |
| Lavaschnecke | S | Mine +40 % Erz, Kampfgold +20 %, Schmiedeglut 30 % schneller |
| Nachtmahr | SS | +15 % Stärke, Dungeon +30 % Gold, Expedition +20 % |

| Himmel | Rang | Bonus |
| --- | --- | --- |
| Wolkenschaf | B | Aufgaben +30 % Gold |
| Sternenspatz | B | Minispiele +25 % Ertrag |
| Engelskatze | A | +5 % Chance auf Gratis-Folgewunsch, Brunnen-Taler −10 % |
| Pegasusfohlen | A | alle Kampfteams +12 % Stärke, Seide +5 % |
| Glückskranich | S | Sternschnuppen +50 %, Gratiswunsch +5 %, Aufgaben +20 %, Taler −10 % |
| Himmelsdrache | SS | von allem etwas, Aufgaben +30 %, Minispiele +30 %, Taler −10 %, Seide +5 %, Glut +15 % |

Ihre Lieblingsleckerlis sind die Pflanzen der Dimension. Als Geschenke bringen
sie unter anderem Glutsteine bzw. Sternensplitter. Im Begleiter-Menü stehen sie
unter einer eigenen Überschrift. Mitnehmen kann man sie überallhin.

Logik in `src/realm.js`, `src/dimension.js` und `state.switchWorld()`, Stücke in `src/items.js`,
Stil in `src/art/core.js`, Landschaften in `src/themes.js`.

## Edelsteine, Statuen und Metall-Einrichtung (Schmiede)

Die Schmiede hat drei Reiter: **Kopieren**, **💎 Edelsteine** und **🗿 Statuen & Deko**.

**Edelsteine** werden aus Erz geschliffen. Der Rang des Edelsteins entspricht dem
Rang des Erzes, höchstens bis zum Rang der Schmiede. Kosten je Rang D … SS:
6 · 6 · 8 · 10 · 12 · 15 Erz und 60 · 150 · 400 · 1000 · 2500 · 6000 Gold.
Jeder Held in Arena, Dungeon (Erkundung und Abstieg) und Bossrush hat einen
**Edelstein-Platz**. Alle Teams teilen sich den Vorrat, Monster tragen keine.

| Edelstein | Wirkung (D … SS) |
| --- | --- |
| Rubin | +4 · 7 · 10 · 14 · 20 · 30 % Stärke für diesen Helden |
| Saphir | +5 · 8 · 12 · 18 · 25 · 35 % Gold aus Dungeon, Abstieg und Bossrush (Team) |
| Smaragd | +1 · 1,5 · 2 · 3 · 4 · 6 % Erfolgschance (Team) |
| Topas | +3 · 5 · 8 · 11 · 15 · 20 % Chance auf Extra-Beute: Sammelstück im Dungeon/Abstieg, Seide in Arena/Bossrush (Team) |

**Statuen**: Auf drei Sockeln auf dem Hof steht je eine Statue eines eigenen
Stücks ab Rang A, gegossen aus 10 Erz im Rang des Stücks plus 2000 / 6000 /
20000 Gold. A ist aus Bronze, S aus Silber, SS aus Gold. Das Stück bleibt in der
Sammlung. Bonus nach Kategorie (bei S × 1,5, bei SS × 2):
Helden +3 % Stärke · Lebewesen +5 % Expeditionsgold · Monster +5 % Erz ·
Waffen +5 % Dungeon-Gold und +3 % Seide · Rüstung +2 % Stärke und Münzen-Reichweite ·
Relikte +5 % Mana · Artefakte +10 % Sternschnuppen und Schmiedeglut. Helden-Statuen
machen außerdem Brunnen-Taler 3 % günstiger.

**Metall-Einrichtung** fürs Haus (Gemütlichkeit wie vom Nähtisch):
Kaminbesteck (8 Eisenerz, ♥1), Standuhr mit Pendel (8 Silbererz, ♥2),
goldener Kronleuchter (6 Golderz, ♥3, leuchtet nachts). Mit aller Einrichtung
liegt die Rausch-Chance beim Schlafen jetzt bei bis zu 31 %.

Werte in `src/gems.js`, `src/statues.js` und `src/tailor.js`.

## Nähtisch (Schneiderei)

Im Haus steht neben dem Tisch am Fenster ein Nähkorb. Dort (`E`) wird aus Stoff
und Seide der Bossarena genäht:

- **Heldenumhänge:** je 3 Stoff + 1 Seide eines Rangs. Ein neuer Platz „Umhang“
  bei jedem Helden in Arena und Dungeon gibt +3 · 6 · 10 · 16 · 28 · 48 Stärke
  (D … SS). Beide Teams teilen sich den Vorrat, „Automatisch ausrüsten“ verteilt
  die besten freien Umhänge.
- **Kleidung mit Bonus** (erst nähen, dann im Kleiderschrank anziehen; der
  Bonus wirkt, solange man sie trägt):

| Kleidung | Material | Bonus |
| --- | --- | --- |
| Leinenkittel | 6 Stoff D | Münzen bis 6 Schritte entfernt einsammeln |
| Reisemantel | 6 Stoff C, 1 Seide C | Expedition +6 % Gold |
| Blütenschürze | 5 Stoff B, 2 Seide B | Beete wachsen 12 % schneller |
| Seidenrobe | 4 Seide A | Mana lädt 15 % schneller |
| Wellenmantel | 4 Stoff S, 3 Seide S | Fische beißen 25 % schneller, Sternschnuppen 15 % öfter |
| Sternenseidengewand | 4 Seide SS | +10 % auf fast alles, Münzen bis 8 Schritte, Taler −5 %, Seide +5 % |

- **Einrichtung:** Tischdecke, bunte Kissen, Webteppich, Wandbehang,
  Wimpelgirlande, Seidenbaldachin und Seidenlampions (leuchten nachts) machen
  das Haus sichtbar schöner. Jede bringt Gemütlichkeit (insgesamt 15). Jeder
  Punkt erhöht die Chance auf einen Rausch beim Schlafen um 1 %, also von
  10 % auf bis zu 25 % (mit der Metall-Einrichtung aus der Schmiede bis 31 %).
- **Veredeln:** 4 Stoff → 1 Seide (gleicher Rang), 5 Stoff → 1 Stoff des
  nächsten Rangs, 3 Seide → 1 Seide des nächsten Rangs.

Werte in `src/tailor.js`, Kleidung in `src/sprites.js`.

## Wunschbrunnen

- **Glückszähler:** Spätestens das 60. Stück ohne Rang A oder besser ist ein A,
  spätestens das 300. ohne S oder besser ein S. Beide Zähler stehen im Brunnen-Menü.
- **Wunsch des Tages:** Gratis-Einzelwünsche pro Spieltag. Der Brunnen funkelt,
  wenn einer bereit ist.
- **Gratis-Folgewunsch:** Nach jedem bezahlten Wunsch ist der nächste Einzelwunsch mit
  etwas Glück gratis (5–12 % je Brunnen-Rang).
- **Brunnengeist:** Er schwebt über dem Brunnen, nachts deutlicher, und kommentiert
  jeden Wunsch. Ganz selten (je gezogenem Stück 0,4–1,25 %) erscheint er mit
  einem „!“ und schenkt einen Gratiswunsch mit garantiert Rang A, S oder SS.
- **Ausbau** (900 · 2400 · 6000 · 14000 · 33000 Gold), im Brunnen-Menü:

| Rang | Rabatt | Gratis am Tag | Folgewunsch gratis | Geschenk des Geists (je Stück) | Aussehen |
| --- | --- | --- | --- | --- | --- |
| D | – | 1 | 5 % | 0,4 % | – |
| C | 4 % | 1 | 6 % | 0,5 % | Rangfahne, Blumen |
| B | 8 % | 1 | 7 % | 0,6 % | Laterne |
| A | 12 % | 2 | 8 % | 0,8 % | Goldkanten |
| S | 16 % | 2 | 10 % | 1 % | Kristalle |
| SS | 20 % | 3 | 12 % | 1,25 % | Regenbogen |

Werte in `src/well.js`.

## Begleiter

Auf dem Hof und im Dorf taucht ab und zu ein streunendes Tier mit einem Herz
über dem Kopf auf: das erste nach etwa 45 Sekunden, danach alle 2½–5½
Minuten Spielzeit. Es bleibt 75 Sekunden. Geh hin und freunde dich mit `E`
an. Es kommen nur Tiere, die man noch nicht hat. Der Rang wird wie am Brunnen
ausgewürfelt (D 48 % … SS 0,1 %), manche zeigen sich nur nachts.

Einer kann dich begleiten: Er läuft oder fliegt hinter dir her, auch ins Haus,
in die Mine und ins Dorf, und gibt seinen Bonus. Auswahl im Begleiter-Menü
(`C`). Der erste gefundene Begleiter kommt automatisch mit.

| Begleiter | Rang | Bonus |
| --- | --- | --- |
| Katze | D | sammelt Münzen bis 14 Schritte entfernt ein |
| Hund | D | Expedition +5 % Gold |
| Hase | D | Beete wachsen 10 % schneller |
| Igel | D | Mine +5 % Erz |
| Fuchs | C | Expedition +10 % Gold |
| Eule (nachts, fliegt) | C | Mana lädt 15 % schneller |
| Frosch | C | Fische beißen 25 % schneller |
| Waschbär | B | sammelt Münzen bis 26 Schritte entfernt ein, Brunnen-Taler −5 % |
| Glühwürmchen (nachts, fliegt, leuchtet) | B | Sternschnuppen 40 % öfter |
| Mini-Drache (fliegt, leuchtet) | A | Mine +20 % Erz, Schmiedeglut 25 % schneller |
| Einhornfohlen | A | Beete wachsen 30 % schneller |
| Phönixküken (fliegt, leuchtet) | S | Mana lädt 40 % schneller |
| Neunschwanzfuchs | S | Expedition +25 % Gold |
| Sternenkitz (nachts, leuchtet) | SS | von allem etwas: +15 % überall, Münzen bis 20 Schritte, Taler −5 %, Seide +5 %, Glut +15 % |

### Freundschaft und Leckerlis

Im Begleiter-Menü gibst du Ernte aus dem Garten als Leckerli. Punkte je Pflanze:
Karotte/Weizen 1, Kartoffel 2, Beeren 3, Kürbis 5, Sternenblume 10. Das
Lieblingsleckerli jedes Begleiters zählt doppelt. Die Freundschaft hat 5
Stufen (♥): Stufe 2 … 5 ab 6 · 18 · 40 · 80 Punkten, bei seltenen Begleitern
mehr (× 1 + 0,5 je Rang). Der Bonus wächst je Stufe auf × 1,25 · 1,5 · 1,75 · 2.

### Geschenke

Der Begleiter, der dich begleitet, bringt alle 4–8 Minuten Spielzeit etwas mit
(mit jeder Freundschaftsstufe 10 % öfter). Über ihm erscheint kurz ein Päckchen.
Jedes Tier hat seine Art Geschenk: Gold, Saatgut, Ernte, Fische, Erz oder
Mana; die Menge wächst mit Rang und Stufe. Mit 3 % (+ 1 % je Stufe) ist es ein
Sammelstück, Waschbär, Neunschwanzfuchs und Sternenkitz finden sie öfter.
Geschenke zählen in der Statistik.

Werte in `src/companions.js` (Tiere, Stufen) und `src/companioncare.js`
(Leckerlis, Geschenke).

## Sternschnuppen

Nachts (draußen auf dem Hof oder im Dorf, nicht in der Seesicht beim Angeln)
zieht alle 20–60 Sekunden Spielzeit eine Sternschnuppe über den Himmel. Sie ist
knapp 2 Sekunden zu sehen – wer sie rechtzeitig anklickt, darf sich etwas wünschen:

- 5 %: ein Sammelstück ab Rang C (mit eigenem Pop-up)
- mit Magierturm: 45 % der übrigen Wünsche bringen +12 Mana
- sonst 40–120 Gold

Gefangene Sternschnuppen zählen in der Statistik. Die Werte stehen in `src/stars.js`.

## Schmiede

Der Anbau links am Haus kopiert gezielt ein Sammelstück, das man schon besitzt
(auch direkt aus der Galerie). Damit das nicht alles aushebelt, gibt es drei Bremsen:

- **Gold:** immer das Vierfache des Verkaufswerts – Kopieren und Verkaufen lohnt nie.
- **Erz** im Rang des Stücks: 5 · 6 · 8 · 10 · 14 · 20 – die Schmiede hängt an der Mine.
- **Schmiedeglut:** jede Kopie kostet 1 · 1 · 2 · 2 · 3 · 4 Glut. Vorrat und
  Nachladezeit nach Schmiede-Rang: 3 Glut / 30 min (D) bis 8 Glut / 10 min (SS).

Kopiert werden nur Stücke bis zum Rang der Schmiede. Werte in `src/forge.js`.

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

Auf dem Weg erscheinen Münzen (je 10 Gold). **Gewünscht wird nur mit
Brunnen-Währung** – Gold kauft die Taler, nicht mehr den Wunsch selbst.

**Brunnen-Währungen** (im Brunnen mit Gold kaufen, Brunnen-Rabatt gilt, in den
Dimensionen doppelt; jede Welt hat ihr eigenes Portemonnaie; ein 10er-Pack kostet
wie 9):

| Währung | Preis | Chancen |
| --- | --- | --- |
| 🪙 Glückstaler (günstig) | 40 Gold (10 für 360) | D 55 % · C 40 % · B 4 % · A 0,9 % · S 0,09 % · SS 0,01 % |
| 🌟 Sternentaler (teuer) | 500 Gold (10 für 4500) | B 70 % · A 25 % · S 4,5 % · SS 0,5 % |

- Ein Wunsch kostet einen Taler, zehn Wünsche zehn Taler.
- **Zusatz-Modi:** „Nur Duplikate“ und „Nur Neue“ kosten dasselbe wie ein normaler
  Wunsch (mit beiden Talern) und treffen mit **75 %** je Stück; die übrigen 25 % sind
  ganz normale Stücke.
- Jeder Glückstaler-Wunsch gibt einen **Sternsplitter**; 25 Splitter werden
  automatisch zu einem Sternentaler.
- Gratiswünsche (Wunsch des Tages, Folgewunsch) würfeln wie ein Glückstaler-Wunsch.
- Der Glückszähler gilt für alle Wünsche.

Im Brunnen lassen sich die Pop-ups für Rang A–SS abschalten (Häkchen unter den
Modus-Knöpfen, wird im Browser gemerkt). Dann gibt es nur einen kurzen Hinweis.
Es gibt 2100 Sammelstücke: 7 Kategorien × 6 Ränge
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

Expeditionslager, Dungeon-Tor, Bossarena, Mine, Schmiede und Magierturm müssen
erst gebaut werden (250, 400, 600, 800, 1000 und 1500 Gold) und starten auf Rang D. Jeder Ausbau schaltet den nächsten Rang frei:

| Ausbau auf | C | B | A | S | SS |
| --- | --- | --- | --- | --- | --- |
| Expeditionslager | 600 | 1800 | 4800 | 11000 | 27500 |
| Dungeon-Tor | 480 | 1500 | 4200 | 10000 | 25000 |
| Bossarena | 720 | 2100 | 5400 | 12000 | 30500 |
| Mine | 900 | 2400 | 6000 | 14000 | 33000 |
| Schmiede | 1200 | 3000 | 7200 | 16500 | 38500 |
| Magierturm | 1800 | 4200 | 9000 | 19000 | 44000 |
| Wunschbrunnen | 900 | 2400 | 6000 | 14000 | 33000 |

Die Preise steigen gleichmäßig (etwa × 2–2,5 je Rang), ohne große Sprünge.

Jeder Ausbau ist auch zu sehen: Alle Anlagen tragen eine Fahne in der
Rangfarbe (D grau, C grün, B blau, A lila, S gold, SS schimmernd in allen
Farben) und bekommen pro Rang etwas dazu – das Lager Kisten, Lagerfeuer,
ein zweites Zelt und Goldsaum; das Dungeon-Tor Fallgitter, Banner, Goldkante,
Runen-Obelisken und ein Portal; die Arena Banner, Türme und Goldwappen; die
Mine Laterne, zweite Lore, Golderz, Kristalle und Sternenerz; die Schmiede eine
höhere Esse, Waffen an der Wand, zweiten Amboss und eine blaue Zauberflamme.

Der Lager-Rang begrenzt, bis zu welcher Stufe Lebewesen und Leitung entwickelt
werden können; der Tor-Rang bestimmt die zugänglichen Gefahrenstufen; der Arena-Rang die
gezielt wählbaren Boss-Ränge und die höchste Ausrüstungsstufe. Die
Preise stehen in `src/buildings.js`.

## Expedition

Die vier stärksten Lebewesen laufen im Lager umher und füllen die Truhe – auch
während das Spiel geschlossen ist. Die Truhe fasst den Ertrag von vier Stunden
und fünf Funde; geleert wird sie per Klick auf die Truhe, mit `E` oder im Menü.

- **Gold pro Minute** nach Ausgangsrang: D 7 · C 11 · B 18 · A 30 · S 52 · SS 110,
  mal Entwicklungsstufe und mal **Lager-Rang** (D ×1 · C ×2 · B ×4 · A ×5 · S ×6 · SS ×7).
  Beispiele für das ganze Team: Lager D mit vier D-Lebewesen ≈ 28 Gold/min;
  Lager B mit vier C-Lebewesen auf Stufe B und Leitung B ≈ 500 Gold/min
  (5000 Gold in 10 Minuten); Lager A mit vier B-Lebewesen auf A ≈ 1800 Gold/min.
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

Am Tor ganz links zieht ein Team aus bis zu fünf Helden los – ausgerüstet und
gelevelt wie in der Bossarena (Waffe, Rüstung, Relikt, Artefakt; Stufen D bis
SS). Die Dauer ist die Gefahrenstufe; es läuft immer eine Erkundung zur selben
Zeit, auch bei geschlossenem Spiel. Erfolgschance = Team-Stärke ÷ nötige Stärke,
begrenzt auf 5–95 %; es zählt die Stärke beim Aufbruch, und das Team ist bis zur
Rückkehr gesperrt. Scheitert die Erkundung, gibt es keine Beute.

**Arena und Dungeon teilen sich nichts gleichzeitig:** Ein Held oder ein
Ausrüstungsstück im Arena-Team ist im Dungeon nicht verfügbar und umgekehrt
(in der Auswahl ausgegraut und mit „A“ bzw. „D“ markiert). Stufen gehören zum
Stück und gelten überall – wie weit sie zählen und gelevelt werden können,
begrenzt der Rang der jeweiligen Anlage (Arena bzw. Dungeon-Tor).

| Stufe | Dauer | Nötige Stärke | Gold | Sammelstücke |
| --- | --- | --- | --- | --- |
| D | 30 s | 30 | ~15 | 1× Zufall |
| C | 1 min | 90 | ~35 | 3× D + 1× Zufall |
| B | 5 min | 210 | ~150 | 3× D + 2× ab C |
| A | 15 min | 420 | ~500 | 3× D + 3× ab C |
| S | 30 min | 750 | ~1200 | 3× D + 4× ab B |
| SS | 60 min | 1275 | ~3000 | 3× D + 5× ab A |

Alle Werte stehen oben in `src/dungeon.js`.


### Drei Arten von Dungeons (je 6 Ränge = 18 Dungeons)

Im Dungeon-Menü wählt man oben die Art, darunter die Gefahrenstufe. Das Tor
schaltet die Ränge wie gehabt frei.

| Art | Gefahr | Gold | Beute |
| --- | --- | --- | --- |
| 🩸 **Blutdungeon** (Blutkeller … Abgrund der roten Ewigkeit) | Stärke × 1,4 | × 1,5 | +1 Bonus-Stück, Bonus-Stücke einen Rang höher, 80 % Waffen und Rüstung |
| 🌿 **Dornendungeon** (Dornenkeller … Labyrinth der tausend Dornen) | Stärke × 1,15, Fallen kosten 8–20 % Erfolgschance | × 1,2 | +2 Standard- und +1 Bonus-Stück, 80 % Lebewesen und Relikte |
| ⌛ **Schleifendungeon** (Echo des Kellers … Schleife der Ewigkeit) | Stärke × 1,25 | × 1,3 | +1 Bonus-Stück, 90 % Monster und Artefakte |

Im **Schleifendungeon** durchleben die Helden bei jeder Rückkehr eine
Erinnerung an grausame alte Zeiten, etwa „Das Erntefest von Rabenfurt“, „Die
Belagerung von Dornwall“ oder „Das letzte Lied der Elfen“. Die 12 Erinnerungen
werden in der **Chronik** im Dungeon-Menü gesammelt; ungesehene kommen zuerst.
Werte in `src/dungeon.js` (`TYPES`, `MEMORIES`).

### Abstieg (endloser Dungeon)

Im Dungeon-Menü gibt es neben „Erkundung“ den Reiter **⬇ Abstieg**. Das
Dungeon-Team (5 Helden) steigt in der gewählten Art Etage für Etage hinab: alle
**10 Sekunden** eine, solange du spielst, bis es fällt. Solange der Abstieg läuft,
ist das Team gesperrt. Eine normale Erkundung geht dann nicht.

- Jede Etage verlangt 3 % mehr Stärke (linear, × Art). Alle **5** Etagen wartet ein
  **Wächter** (× 1,5, sicheres Sammelstück), alle **10** ein **Etagenboss**
  (× 2,5, Sammelstück einen Rang höher). Der Mindest-Rang der Beute steigt alle
  10 Etagen.
- Gold je Etage wächst mit der Tiefe (Wächter × 2, Boss × 5). Normale Etagen
  bringen mit 15 % ein Sammelstück im Schwerpunkt der Art.
- **Ereignis-Räume** (25 % der normalen Etagen; Gewichte je Art):
  - Schatzraum: ein Extra-Stück
  - Heilende Quelle: übersteht die nächste Niederlage kostenlos
  - Händler im Dunkeln: +15 % Stärke für den Rest des Laufs gegen Gold; der
    Abstieg wartet, bis man kauft oder weitergeht
  - Fallenkorridor: −10 % Stärke, im Dornendungeon häufig
  - Erinnerung: nur im Schleifendungeon; landet in der Chronik und stärkt
    (+10 %) oder erschüttert (−5 %)
- Alles landet im **Rucksack**. **Heimkehren** behält alles. Nach einer
  Niederlage: **Wiederbeleben** (300 Gold + 150 je Etage, höchstens 15.000)
  oder **Aufgeben**. Dann gehen die Hälfte des Golds und etwa die Hälfte der
  Stücke verloren.
- Der Rekord (tiefste Etage) wird je Art gespeichert.

Werte in `src/descent.js`.
## Bossarena

Drei Helden treten gemeinsam an; jeder trägt Waffe, Rüstung, Relikt und
Artefakt. Jedes Stück kann nur einmal getragen werden.

| | D | C | B | A | S | SS |
| --- | --- | --- | --- | --- | --- | --- |
| Stärke Held | 10 | 20 | 40 | 70 | 120 | 200 |
| Stärke Ausrüstung (nach Rang) | 4 | 7 | 12 | 20 | 35 | 60 |
| Faktor nach Stufe (Held und Ausrüstung) | 1 | 1,3 | 1,7 | 2,2 | 3 | 4 |
| Kosten bis zu dieser Stufe (Duplikat-Wert) | – | 30 | 80 | 200 | 600 | 2000 |
| Stärke Boss | 40 | 100 | 220 | 500 | 1100 | 2400 |
| Preis Boss gezielt (Gold) | 50 | 120 | 300 | 800 | 2500 | 8000 |

- **Zufallsboss:** 30 Gold, der Rang wird mit den Chancen des Brunnens gewürfelt.
- **Rundenkampf:** Die drei Helden kämpfen Runde für Runde gegen den Boss. Jeder
  lebende Held wählt nacheinander **⚔ Angriff**, seine **Spezialfähigkeit** oder
  **🛡 Verteidigen** (halber Schaden bis zur nächsten Runde, +5 % Leben). Danach
  schlägt der Boss zu: Er trifft einen Helden, holt alle 3 Runden zu einem
  **Flächenangriff** aus (eine Runde vorher angekündigt, ×1,4 auf alle) und wird
  unter 30 % Leben **wütend** (+30 % Angriff). Nach 40 Runden zieht er ab.
  „Runde automatisch“ / „Bis zum Ende automatisch“ spielen mit einer einfachen
  Taktik; **Schnellkampf** erledigt den ganzen Kampf sofort automatisch.
- **Klassen** (nach dem Namen des Helden):

| Klasse | Helden | Leben / Angriff | Fähigkeit (Abklingzeit) |
| --- | --- | --- | --- |
| ⚔ Krieger | Ritter, Paladin, Berserker | ×1,3 / ×1 | Kraftschlag: 200 % Schaden (3) |
| ✦ Magier | Magier, Hexe | ×0,85 / ×1,15 | Feuerball: 150 %, Boss brennt 2 Runden je 40 % (3) |
| ✚ Heiler | Barde, Mönch, Königin | ×1 / ×0,8 | Heilung: alle +35 %, Gefallene zurück mit 25 % (3) |
| ➶ Waldläufer | Schurke, Waldläufer | ×0,95 / ×1,05 | Doppelschuss: 2 × 90 %, 35 % kritisch (2) |

- **Werte:** Leben = (20 + 2,2 × Stärke) × Klasse, Angriff = (3 + 0,45 × Stärke) ×
  Klasse; die Stärke enthält Rang, Stufe, Ausrüstung, Umhang, Rubin, Sets und
  Boni. Boss: Leben 30 + 4,5 × Boss-Stärke, Angriff 3 + 0,28 × Boss-Stärke.
  Kritische Treffer 10 % (×1,6), Smaragde erhöhen die Chance; Gladiatorrausch
  +15 % Angriff; der Schutz-Zauber mindert den Schaden des Bosses.
- **Einschätzung** statt Siegchance: Bei gleicher Stärke gewinnt die Automatik
  rund 80 %, ab 1,25-facher Stärke praktisch immer – mit guter Taktik mehr.
  Nach dem Kampf ist der Boss weg, auch bei einer Niederlage.
- **Beute:** 3× Stoff im Rang des Bosses, mit 40 % zusätzlich 1× Seide.
- **Arena-Händler:** 3 Stoff → Sammelstück im selben Rang (75 %) oder einen
  Rang höher (25 %). 1 Seide → einen Rang höher (70 %) oder selber Rang (30 %).
  Rang SS ergibt immer SS.
- **Helden und Ausrüstung verbessern:** Stufe D bis SS (Stärke ×1 · 1,3 · 1,7 ·
  2,2 · 3 · 4), bis zum Arena-Rang. Helden zahlen mit Helden-Duplikaten,
  Ausrüstung mit Duplikaten von Waffen, Rüstung, Relikten und Artefakten.

Alle Werte stehen oben in `src/arena.js`.

Der Spielstand liegt im `localStorage` des Browsers. Im Pause-Fenster lässt er
sich als Datei **sichern** und wieder **laden** (auch zwischen Browser und
PC-Programm) oder komplett **neu anfangen**.


### Bossrush

Im Arena-Menü gibt es den Reiter **Bossrush**. Dort stellt man bis zu **10**
Kämpfer auf: Helden mit Ausrüstung und Umhang oder Monster ohne Ausrüstung.
Beide werden wie in Arena und Dungeon gelevelt, Monster mit Monster-Duplikaten.
Wer im Arena- oder Dungeon-Team steckt, ist hier nicht verfügbar und umgekehrt.

- Nach dem Start kämpft das Team **alle 5 Sekunden** gegen einen Boss mit
  zufälligem Rang (Chancen wie am Brunnen). Das läuft nur, solange du
  spielst, bis es verliert.
- Bosse im Rush sind **1,5× so stark** wie in der Arena und werden je bisherigem
  Sieg um 0,4 % stärker (Siegchance siehe „Lange Läufe“ unten).
- Jeder Sieg bringt Gold (15 · 35 · 80 · 180 · 450 · 1200 je Rang, in
  Dimensionen doppelt), 3 Stoff und mit 40 % 1 Seide im Rang des Bosses.
- **Wiederbeleben** nach einer Niederlage: 300 Gold + 150 je besiegtem Boss,
  höchstens **15.000**. Danach geht es gegen denselben Boss weiter.
- **Heimkehren** (jederzeit): Gold und Material kommen in den Vorrat. Der
  beste Lauf wird gespeichert.

**⚔ Ultimativer Bossrush** (zweiter Start-Knopf): nur Bosse von Rang **A bis SS**.
Damit die Siegchancen passen, sind sie nur halb so stark angesetzt und werden je
Sieg nur um 0,3 % statt 0,4 % zäher. Die Beute ist größer: Gold × 1,5 und +15 %
Seide-Chance. Wiederbeleben und Heimkehren funktionieren wie im normalen Rush. Der
beste Lauf wird getrennt gespeichert.

**Lange Läufe** (Bossrush, ultimativer Bossrush und Abstieg):
Die volle Siegchance von 99,98 % gibt es erst mit deutlichem Vorsprung (Team
mindestens 1,25× so stark wie der Gegner). Bei gleicher Stärke sind es 99,5 %, ist
der Gegner stärker, fällt sie quadratisch: 99,5 % − 1,5 × (1 − Verhältnis)²
(bei 80 % Stärke ≈ 93,5 %, bei 50 % ≈ 62 %, mindestens 5 %). Bosse wachsen je Sieg
um 0,4 % (ultimativ 0,3 %), Abstieg-Etagen linear um 3 % (Etage 1 verlangt 40 ×
Art). Das Gold je Boss nimmt bei langen Läufen ab (1 / (1 + Bosse/200)), im Abstieg
wächst es nur mit der Wurzel der Tiefe (4 × (1 + √Etage) × Art).
Richtwerte (simuliert, Helden ohne Level): 5 Helden Rang C ≈ 17.000 Gold pro Stunde
im Bossrush, 10 Helden A ≈ 26.000; Läufe dauern je nach Team Minuten bis zu einer
Stunde. Der
Mindest-Rang der Beute steigt im Abstieg alle 100 Etagen, höchstens bis A.
**Nur beim Spielen:** Bossrush und Abstieg laufen nur, solange das Spiel sichtbar
ist und in den letzten 5 Minuten eine Eingabe kam (Taste, Klick, Tippen). Ist das
Spiel zu, minimiert, im Hintergrund-Tab oder liegt man untätig davor, pausiert der
Lauf (Hinweis „⏸ Pausiert“) und macht beim Weiterspielen einfach dort weiter –
nachgeholt wird nichts. Einen AFK-Modus gibt es nicht mehr.

Werte in `src/bossrush.js` und `src/activity.js`.

## Errungenschaften

`R` (oder im Pause-Menü) öffnet die Errungenschaften: 22 Stück in fünf Gruppen
(Sammeln, Aufbau, Kämpfen, Dorf, Magie & Begleiter), jede mit bis zu fünf Stufen
**Bronze · Silber · Gold · Platin · Diamant**. Sie werden alle paar Sekunden geprüft;
erreichte Stufen zahlen sofort aus (die letzte Stufe einer Errungenschaft zählt immer
als Diamant):

| Stufe | Belohnung | Punkte |
| --- | --- | --- |
| Bronze | 5 🪙 | 5 |
| Silber | 15 🪙 | 10 |
| Gold | 30 🪙 + 1 🌟 | 20 |
| Platin | 50 🪙 + 3 🌟 | 35 |
| Diamant | 100 🪙 + 6 🌟 | 60 |

Beispiele: Sammlerherz (25 … 2.100 verschiedene Stücke), Legendenjäger (SS-Stücke),
Wunschkind (10 … 20.000 Wünsche), Baumeisterin (Gebäude auf SS), Unaufhaltsam
(50 … 50.000 Bossrush-Bosse), In die Tiefe / Bodenlos (Abstieg), Beste Freunde,
Gemeinsinn (Dorfprojekte), Fischkunde, Zauberkundig, Tierfreund, Weltenwanderer.
Bisheriger Fortschritt zählt mit – alte Spielstände bekommen ihre Stufen beim ersten
Start nachgezahlt. Werte in `src/achievements.js`.

## Statistik

`I` oder Pause → Statistik zeigt, woher Gold und Sammelstücke kommen: Gold
eingenommen und ausgegeben je Quelle, erhaltene Stücke, Duplikate und
Duplikat-Wert – jeweils gesamt, pro Stunde echter Zeit und pro Spielstunde.
Gedacht zum Ausbalancieren; lässt sich separat zurücksetzen.

## Aufbau

| Datei | Inhalt |
| --- | --- |
| `src/config.js` | Auflösung (320×180), Weltbreite, Bodenlinien |
| `src/palette.js` | Alle Farben an einem Ort |
| `src/background.js` | Himmel, Sterne, Sonne, Mond, Wolken, Berge, Hügel (Parallax) |
| `src/themes.js` | Landschaften und Jahreszeiten |
| `src/daycycle.js` | Tag-Nacht-Zyklus: Himmelsfarben, Tönung, Sonnen- und Mondbahn |
| `src/world.js` | Wiese, Weg, Häuschen, Brunnen, Lager, Dungeon-Tor, Münzen, Rauch, Glühwürmchen |
| `src/items.js` | Katalog der Sammelstücke, Ränge, Chancen, Ziehen |
| `src/art/` | Zeichner für die Sammelstücke (Kern + je Kategorie) |
| `src/expedition.js` | Team, Ertrag, Truhe, Funde, Entwicklung, Leitung |
| `src/arena.js` | Bossarena: Team, Ausrüstung, Bosse, Beute, Händler |
| `src/dupes.js` | Bezahlen mit Duplikaten |
| `src/buildings.js` | Bau und Ausbau von Lager, Dungeon-Tor und Bossarena |
| `src/party.js` | Gemeinsame Team-Logik für Arena und Dungeon (Ausrüstung, Stufen) |
| `src/dungeon.js` | Gefahrenstufen, Erfolgschance, Beute |
| `src/state.js` | Gold, Sammlung, Verkaufen, Speichern |
| `src/ui.js` | Menüs für Brunnen, Galerie, Expedition und Dungeon, Pop-ups |
| `src/sprites.js` | Spielfigur und Outfits als Text-Pixelraster |
| `src/player.js` | Bewegung und Animation |
| `src/input.js` | Tastatur und Touch |
| `desktop/main.cjs` | Programmfenster für die Desktop-Version (Electron) |
| `src/audio.js` | Musik und Soundeffekte (Web Audio) |
| `src/interior.js` | Innenraum des Hauses |
| `src/buffs.js` | Rausch-Effekte nach dem Schlafen |
| `src/mine.js` | Mine: Ebenen, Arbeiter, Erz |
| `src/minescene.js` | Darstellung der Mine mit hackenden Monstern |
| `src/trader.js` | Erzhändler: Ankunft, Angebote, Tausch |
| `src/village.js` | Dorf: Aufgaben, Markt, Angeln |
| `src/villagescene.js` | Darstellung des Dorfs und der Angel |
| `src/gardener.js` | Gartenhelfer: automatisch ernten, verkaufen, pflanzen |
| `src/fishtrap.js` | Fischreuse: automatisch Fische fangen |
| `src/garden.js` | Garten (Beete, Wachstum, Ernte) und Küche (Rezepte) |
| `src/sets.js` | Sammel-Sets und ihre Boni |
| `src/magic.js` | Magierturm, Mana und Zauber |
| `src/forge.js` | Schmiede: Kopierkosten und Schmiedeglut |
| `src/main.js` | Spielschleife, Kamera, Skalierung |
