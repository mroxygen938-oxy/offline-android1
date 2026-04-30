#!/usr/bin/env bash
set -euo pipefail
SRC="${1:-public/logo-256.png}"
RES="android/app/src/main/res"

# 1) Square launcher icons (mipmap-*).
declare -A SIZES=(
  [mdpi]=48
  [hdpi]=72
  [xhdpi]=96
  [xxhdpi]=144
  [xxxhdpi]=192
)

# Background colour for legacy launcher and round.
BG="#0E0B1F"

for d in "${!SIZES[@]}"; do
  s="${SIZES[$d]}"
  out="$RES/mipmap-$d"
  mkdir -p "$out"
  # Foreground — transparent, planet centred at 70% size.
  inner=$(echo "$s * 70 / 100" | bc)
  # Legacy square icon: solid bg + planet on top.
  convert -size "${s}x${s}" "xc:$BG" \
    \( "$SRC" -resize "${inner}x${inner}" \) \
    -gravity center -compose over -composite \
    "$out/ic_launcher.png"
  # Round icon: same but masked to a circle.
  convert -size "${s}x${s}" "xc:$BG" \
    \( "$SRC" -resize "${inner}x${inner}" \) \
    -gravity center -compose over -composite \
    \( -size "${s}x${s}" xc:black -fill white -draw "circle $((s/2)),$((s/2)) $((s/2)),0" \) \
    -alpha off -compose CopyOpacity -composite \
    "$out/ic_launcher_round.png"
  # Foreground for adaptive icon (transparent bg, planet centred small).
  fg_inner=$(echo "$s * 50 / 100" | bc)
  convert -size "${s}x${s}" "xc:none" \
    \( "$SRC" -resize "${fg_inner}x${fg_inner}" \) \
    -gravity center -compose over -composite \
    "$out/ic_launcher_foreground.png"
done

# Adaptive icon resource — solid colour bg + the foreground PNG.
mkdir -p "$RES/values" "$RES/mipmap-anydpi-v26" "$RES/drawable"
cat > "$RES/values/ic_launcher_background.xml" <<XML
<?xml version="1.0" encoding="utf-8"?>
<resources>
  <color name="ic_launcher_background">$BG</color>
</resources>
XML
cat > "$RES/mipmap-anydpi-v26/ic_launcher.xml" <<XML
<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
  <background android:drawable="@color/ic_launcher_background"/>
  <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
XML
cat > "$RES/mipmap-anydpi-v26/ic_launcher_round.xml" <<XML
<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
  <background android:drawable="@color/ic_launcher_background"/>
  <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
XML

# 2) Splash images for legacy (drawable-port-* + drawable-land-*).
SPLASH_SIZES_PORT=("mdpi 320 480" "hdpi 480 800" "xhdpi 720 1280" "xxhdpi 960 1600" "xxxhdpi 1280 1920")
SPLASH_SIZES_LAND=("mdpi 480 320" "hdpi 800 480" "xhdpi 1280 720" "xxhdpi 1600 960" "xxxhdpi 1920 1280")
gen_splash() {
  local out="$1" w="$2" h="$3"
  local short=$(( w < h ? w : h ))
  local logo_size=$(( short / 3 ))
  mkdir -p "$out"
  convert -size "${w}x${h}" "xc:$BG" \
    \( "$SRC" -resize "${logo_size}x${logo_size}" \) \
    -gravity center -compose over -composite \
    "$out/splash.png"
}
for entry in "${SPLASH_SIZES_PORT[@]}"; do
  set -- $entry; d=$1; w=$2; h=$3
  gen_splash "$RES/drawable-port-$d" "$w" "$h"
done
for entry in "${SPLASH_SIZES_LAND[@]}"; do
  set -- $entry; d=$1; w=$2; h=$3
  gen_splash "$RES/drawable-land-$d" "$w" "$h"
done
# Default splash (used by some configs).
gen_splash "$RES/drawable" 1080 1920

echo "Icons + splash generated."
