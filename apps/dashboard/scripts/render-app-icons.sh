#!/bin/bash
# [fork] Render public/icons/<id>-{180,192,512}.png from the generated SVGs with headless
# Chromium (run after gen-app-icons.mjs; needs `chromium` on PATH). Outputs are committed.
set -e
cd "$(dirname "$0")/../public/icons"
for svg in *.svg; do
  id="${svg%.svg}"
  for px in 180 192 512; do
    printf '<html><body style="margin:0;background:transparent"><img src="file://%s/%s" style="width:%spx;height:%spx;display:block"></body></html>' "$PWD" "$svg" "$px" "$px" > /tmp/icon-render.html
    chromium --headless=new --no-sandbox --disable-gpu --hide-scrollbars --default-background-color=00000000 \
      --window-size="$px,$px" --screenshot="$PWD/$id-$px.png" file:///tmp/icon-render.html >/dev/null 2>&1
    echo "$id-$px.png"
  done
done
