#!/usr/bin/env zsh
# Screenshot the site at several points in the day using headless Chrome.
# Usage: tools/shoot.sh [port] [fractions...]
# Expects a static server on $PORT (e.g. python3 -m http.server 8765).
PORT=${1:-8765}; shift
FRACS=("$@"); [[ ${#FRACS} -eq 0 ]] && FRACS=(0 0.11 0.3 0.44 0.55 0.66 0.78 1)
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/.shots"; mkdir -p "$OUT"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

for frac in $FRACS; do
  name=$(printf '%s' "$frac" | tr -d '.')
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --no-first-run --disable-component-update \
    --window-size=1440,900 --screenshot="$OUT/t$name.png" \
    "http://localhost:$PORT/index.html?p=$frac" >/dev/null 2>&1
  echo "shot $frac"
done
