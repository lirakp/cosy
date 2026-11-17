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

**Steuerung:** `←` `→` oder `A` `D` laufen · `E` am Wunschbrunnen und im Lager · `G` Galerie · `X` Expedition · `F` Dungeon · `B` Bossarena · `N` Mine · `H` Schmiede · `P` Pause · `I` Statistik · `Z` Zauberbuch · `M` Ton an/aus ·
auf dem Handy linke / rechte Bildhälfte gedrückt halten und die Knöpfe antippen.

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
| Helden | +2 · 3 · 4 · 6 · 8 · 12 % Rabatt am Wunschbrunnen |

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

Der **Magierturm** (zwischen Garten und Brunnen, 1500 Gold, Ausbau 3000 · 7000 ·
15000 · 35000 · 80000) sammelt Mana – nachts doppelt so schnell, offline zum
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
| ❀ Zeit & Wachstum | **Keimling**: Beete reif | **Frühlingshauch**: + 1 Ernte je Beet | **Erntesegen**: + 15 min Ertrag für Expedition und Mine | **Zeitsprung**: + 2 Ernte, 30 min | **Jahreslauf**: leere Beete neu bepflanzt, 60 min | **Ewiger Frühling**: + 3 Ernte, 120 min |
| ◉ Gold | **Sternenregen**: 45 s Münzregen | **Münzschauer**: 60 s + 100 Gold | **Goldene Brise**: 75 s + 300 | **Schatzregen**: 90 s + 800 | **Goldflut**: 120 s + 2000, Goldrausch 10 min | **Sonnengold**: 180 s + 5000, Goldrausch 20 min |
| ≈ Wasser | **Lockruf**: 1 Wurf, +1 Rang | **Fischflüstern**: 2 Würfe | **Gezeitenruf**: 3 Würfe, Reuse + 30 min | **Mondflut**: 4 Würfe, +2 Ränge, Reuse + 60 min | **Tiefenruf**: 5 Würfe, Reuse + 120 min | **Ruf des Ozeans**: 8 Würfe, +3 Ränge, Reuse + 240 min |
| ✦ Glück & Sterne | **Glücksfunke**: 1 Wunsch ab C | **Wunschstern**: 2 Wünsche ab C, 3 Sternschnuppen | **Kleeblattsegen**: 2 ab B, 4 Schnuppen | **Sternschnuppenregen**: 3 ab B, 6 Schnuppen | **Schicksalsfaden**: 3 ab A, 8 Schnuppen, Glücksrausch 15 min | **Tausend Wünsche**: 5 ab A, 12 Schnuppen, Glücksrausch 30 min |
| ⛨ Schutz & Kampf | **Schutzhauch**: 1 Kampf +5 % | **Eisenhaut**: +10 % | **Schutzschild**: 2 Kämpfe +12 % | **Kriegsruf**: 2 × +15 % | **Bollwerk**: 3 × +20 % | **Unbezwingbar**: 3 × +25 %, Gladiatorrausch 20 min |

„Wünsche“ heißt: das erste Stück eines Zugs am Brunnen hat mindestens diesen
Rang. Lockruf-, Glücks- und Schild-Ladungen desselben Typs werden nicht
addiert: Es zählen die meisten Ladungen und die stärkste Wirkung. Zauber-
Sternschnuppen kommen kurz nacheinander, auch am Tag. Ein Rausch aus einem
Zauber verlängert einen gleichen Rausch oder ersetzt einen anderen. Alte
Spielstände behalten ihre Zauber, sie heißen jetzt nach ihrer Schule. In der
Galerie steht bei jeder Schriftrolle, welchen Zauber sie lehrt.

Werte in `src/magic.js`.

## Wunschbrunnen

- **Glückszähler:** Spätestens das 60. Stück ohne Rang A oder besser ist ein A,
  spätestens das 300. ohne S oder besser ein S. Beide Zähler stehen im Brunnen-Menü.
- **Wunsch des Tages:** Gratis-Einzelwünsche pro Spieltag. Der Brunnen funkelt,
  wenn einer bereit ist.
- **Gratis-Folgewunsch:** Nach jedem Wunsch ist der nächste Einzelwunsch mit
  etwas Glück gratis (5–12 % je Brunnen-Rang).
- **Brunnengeist:** Er schwebt über dem Brunnen, nachts deutlicher, und kommentiert
  jeden Wunsch. Ganz selten (je gezogenem Stück 0,4–1,25 %) erscheint er mit
  einem „!“ und schenkt einen Gratiswunsch mit garantiert Rang A, S oder SS.
- **Ausbau** (1500 · 4000 · 10000 · 25000 · 60000 Gold), im Brunnen-Menü:

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
| Waschbär | B | sammelt Münzen bis 26 Schritte entfernt ein |
| Glühwürmchen (nachts, fliegt, leuchtet) | B | Sternschnuppen 40 % öfter |
| Mini-Drache (fliegt, leuchtet) | A | Mine +20 % Erz |
| Einhornfohlen | A | Beete wachsen 30 % schneller |
| Phönixküken (fliegt, leuchtet) | S | Mana lädt 40 % schneller |
| Neunschwanzfuchs | S | Expedition +25 % Gold |
| Sternenkitz (nachts, leuchtet) | SS | von allem etwas: +15 % überall, Münzen bis 20 Schritte |

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

Expeditionslager, Dungeon-Tor, Bossarena, Mine, Schmiede und Magierturm müssen
erst gebaut werden (250, 400, 600, 800, 1000 und 1500 Gold) und starten auf Rang D. Jeder Ausbau schaltet den nächsten Rang frei:

| Ausbau auf | C | B | A | S | SS |
| --- | --- | --- | --- | --- | --- |
| Expeditionslager | 1000 | 3000 | 8000 | 20000 | 50000 |
| Dungeon-Tor | 800 | 2500 | 7000 | 18000 | 45000 |
| Bossarena | 1200 | 3500 | 9000 | 22000 | 55000 |
| Mine | 1500 | 4000 | 10000 | 25000 | 60000 |
| Schmiede | 2000 | 5000 | 12000 | 30000 | 70000 |

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
- **Siegchance:** Team-Stärke ÷ Boss-Stärke, begrenzt auf 5–95 %. Nach dem
  Kampf ist der Boss weg, auch bei einer Niederlage.
- **Beute:** 3× Stoff im Rang des Bosses, mit 35 % zusätzlich 1× Seide.
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
