#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
APP="$PWD/dist/mac-arm64/Toby.app"
[[ -d "$APP/Contents" ]] || { echo 'Build the app first'; exit 1; }
VERSION=$(/usr/libexec/PlistBuddy -c "Print :CFBundleShortVersionString" "$APP/Contents/Info.plist")
OUTPUT="$PWD/dist/Toby-$VERSION-arm64.dmg"
codesign --verify --deep --strict "$APP"
if [[ ! -x .local/dmg-tools/bin/dmgbuild ]]; then
 python3 -m venv .local/dmg-tools
 .local/dmg-tools/bin/pip install 'dmgbuild==1.6.5'
fi
mkdir -p dist/installer
swift packaging/installer-background.swift "$PWD/dist/installer/background.png"
[[ ! -e "$OUTPUT" ]] || mv "$OUTPUT" "$OUTPUT.previous"
.local/dmg-tools/bin/dmgbuild -s packaging/installer.py -D "app=$APP" -D "background=$PWD/dist/installer/background.png" 'Install Toby' "$OUTPUT"
codesign --force --sign 'Developer ID Application: Rohan Pahwa (L75A27832H)' --timestamp "$OUTPUT"
hdiutil verify "$OUTPUT"
python3 packaging/verify-image.py "$OUTPUT"
echo "$OUTPUT"
