#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
VERSION=$(cat VERSION)
CONFIGURATION=${CONFIGURATION:-release}
APP="${APP_BUNDLE_PATH:-$PWD/dist/Toby.app}"
# Never replace the executable/signature underneath a running permission-sensitive app.
ensure_not_running() {
python3 - "$APP/Contents/MacOS/Toby" <<'PY'
import subprocess, sys
for line in subprocess.check_output(['ps', '-axo', 'pid=,comm='], text=True).splitlines():
    parts = line.strip().split(None, 1)
    if len(parts) == 2 and parts[1] == sys.argv[1]:
        sys.exit('Quit this copy of Toby before rebuilding it, or set APP_BUNDLE_PATH to a staging path.')
PY
}
ensure_not_running
IDENTITY_FILE="$PWD/.local-code-sign-identity"
IDENTITY="${CODE_SIGN_IDENTITY:-}"
if [[ -z "$IDENTITY" && -f "$IDENTITY_FILE" ]]; then
    IDENTITY=$(cat "$IDENTITY_FILE")
fi
if [[ -z "$IDENTITY" ]]; then
    IDENTITY=$(security find-identity -v -p codesigning | sed -nE '/"Apple Development:/{s/^[[:space:]]*[0-9]+\) ([A-F0-9]+).*/\1/p;}' | head -1)
fi
if [[ -z "$IDENTITY" || "$IDENTITY" == "-" ]]; then
    echo "A stable signing certificate is required. Create an Apple Development certificate in Xcode, or set CODE_SIGN_IDENTITY. Ad-hoc signing breaks permission identity across builds." >&2
    exit 1
fi
swift build -c "$CONFIGURATION"
BIN_DIRECTORY=$(swift build -c "$CONFIGURATION" --show-bin-path)
ensure_not_running
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
cp "$BIN_DIRECTORY/Toby" "$APP/Contents/MacOS/Toby"
cp Packaging/Toby.icns "$APP/Contents/Resources/Toby.icns"
cp Packaging/Info.plist "$APP/Contents/Info.plist"
/usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString $VERSION" "$APP/Contents/Info.plist"
codesign --force --sign "$IDENTITY" --entitlements Packaging/Toby.entitlements "$APP"
codesign --verify --deep --strict "$APP"
# Pin this Mac's successful choice; never silently switch certificates on a later build.
printf '%s\n' "$IDENTITY" > "$IDENTITY_FILE"
echo "Built $APP (version $VERSION). The app has not been launched."
