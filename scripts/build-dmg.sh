#!/bin/bash
# Package an already-built app. This does not sign, notarize, or publish a release.
set -euo pipefail
cd "$(dirname "$0")/.."
APP="${1:?Usage: scripts/build-dmg.sh /path/to/Toby.app /path/to/output.dmg}"
OUTPUT="${2:?Provide a new output DMG path}"
[[ "$APP" = /* && "$OUTPUT" = /* ]] || { echo "Use absolute paths." >&2; exit 1; }
[[ -d "$APP/Contents" ]] || { echo "App bundle not found: $APP" >&2; exit 1; }
[[ ! -e "$OUTPUT" ]] || { echo "Refusing to replace an existing image: $OUTPUT" >&2; exit 1; }
DMGBUILD="${DMGBUILD:-$PWD/.local/dmg-tools/venv/bin/dmgbuild}"
[[ -x "$DMGBUILD" ]] || {
    echo 'Install packaging dependencies: python3 -m venv .local/dmg-tools/venv && .local/dmg-tools/venv/bin/pip install -r Packaging/Installer/requirements.txt' >&2
    exit 1
}
codesign --verify --deep --strict "$APP"
VERSION=$(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "$APP/Contents/Info.plist")
STAGING=$(mktemp -d "${TMPDIR:-/tmp}/toby-installer.XXXXXX")
trap 'rm -rf "$STAGING"' EXIT
swift Packaging/Installer/render-background.swift "$STAGING/background.png"
mkdir -p "$(dirname "$OUTPUT")"
"$DMGBUILD" -s Packaging/Installer/settings.py -D "app=$APP" -D "background=$STAGING/background.png" "Install Toby $VERSION" "$OUTPUT"
hdiutil verify "$OUTPUT"
python3 Packaging/Installer/verify-image.py "$OUTPUT"
echo "Built $OUTPUT. Sign and notarize before public distribution."
