#!/usr/bin/env bash
# Richtet das von Capacitor erzeugte Android-Projekt für Cosy ein:
# Querformat, Vollbild, eigenes Symbol und Startbild, fortlaufende Versionsnummer.
# Aufruf aus dem Projektordner nach `npx cap add android`: mobile/prepare-android.sh <versionCode>
set -euo pipefail
VERSION_CODE="${1:-1}"
ICON=build/icon.png
RES=android/app/src/main/res
MANIFEST=android/app/src/main/AndroidManifest.xml

# Querformat (beide Richtungen)
sed -i 's|<activity|<activity android:screenOrientation="sensorLandscape"|' "$MANIFEST"

# Vollbild
sed -i 's|<item name="android:background">@null</item>|<item name="android:background">@null</item>\n        <item name="android:windowFullscreen">true</item>|' "$RES/values/styles.xml"

# Versionsnummer: jede neue APK lässt sich über die alte installieren
sed -i "s/versionCode 1/versionCode $VERSION_CODE/" android/app/build.gradle
sed -i "s/versionName \"1.0\"/versionName \"1.$VERSION_CODE\"/" android/app/build.gradle

# App-Symbol (Pixel bleiben scharf)
rm -rf "$RES/mipmap-anydpi-v26"
for pair in mdpi:48 hdpi:72 xhdpi:96 xxhdpi:144 xxxhdpi:192; do
  dir="${pair%%:*}"; size="${pair##*:}"
  for name in ic_launcher ic_launcher_round; do
    convert "$ICON" -filter point -resize "${size}x${size}" "$RES/mipmap-$dir/$name.png"
  done
  rm -f "$RES/mipmap-$dir/ic_launcher_foreground.png"
done

# Startbild: dunkler Hintergrund mit dem Symbol in der Mitte
find "$RES" -name 'splash.png' | while read -r f; do
  w=$(identify -format '%w' "$f"); h=$(identify -format '%h' "$f")
  s=$(( (w < h ? w : h) / 3 ))
  convert -size "${w}x${h}" xc:'#1b1730' \( "$ICON" -filter point -resize "${s}x${s}" \) -gravity center -composite "$f"
done
