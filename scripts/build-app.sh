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
GOOGLE_CLIENT="${GOOGLE_OAUTH_CLIENT_FILE:-$PWD/.local/GoogleOAuthClient.json}"
python3 - "$GOOGLE_CLIENT" <<'PYCLIENT'
import json, pathlib, sys
path = pathlib.Path(sys.argv[1])
if not path.is_file():
    sys.exit('Configure Toby’s Desktop OAuth client before packaging: set GOOGLE_OAUTH_CLIENT_FILE to its JSON path.')
try:
    client = json.loads(path.read_text())['installed']
    assert client['client_id'].endswith('.apps.googleusercontent.com')
except (KeyError, ValueError, AssertionError, TypeError):
    sys.exit('Google OAuth configuration must be a valid Desktop app client JSON.')
PYCLIENT
swift build -c "$CONFIGURATION"
BIN_DIRECTORY=$(swift build -c "$CONFIGURATION" --show-bin-path)
ensure_not_running
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
cp "$BIN_DIRECTORY/Toby" "$APP/Contents/MacOS/Toby"
cp Packaging/Toby.icns "$APP/Contents/Resources/Toby.icns"
cp Packaging/Info.plist "$APP/Contents/Info.plist"
mkdir -p "$APP/Contents/Resources/ProviderMarks"
cp Sources/Toby/Resources/ProviderMarks/*.png "$APP/Contents/Resources/ProviderMarks/"
cp Sources/Toby/Resources/ProviderMarks/NOTICE.md Sources/Toby/Resources/ProviderMarks/LICENSE "$APP/Contents/Resources/ProviderMarks/"
cp "$GOOGLE_CLIENT" "$APP/Contents/Resources/GoogleOAuthClient.json"
/usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString $VERSION" "$APP/Contents/Info.plist"
# SwiftPM links Sparkle; our custom bundle builder must embed and sign its helpers.
SPARKLE="$PWD/.build/artifacts/sparkle/Sparkle/Sparkle.xcframework/macos-arm64_x86_64/Sparkle.framework"
[[ -d "$SPARKLE" ]] || { echo "Sparkle framework missing after build." >&2; exit 1; }
mkdir -p "$APP/Contents/Frameworks"
cp "$PWD/.build/artifacts/sparkle/Sparkle/LICENSE" "$APP/Contents/Resources/Sparkle-LICENSE"
ditto "$SPARKLE" "$APP/Contents/Frameworks/Sparkle.framework"
FRAMEWORK="$APP/Contents/Frameworks/Sparkle.framework"
for COMPONENT in \
    "$FRAMEWORK/Versions/B/XPCServices/Downloader.xpc" \
    "$FRAMEWORK/Versions/B/XPCServices/Installer.xpc" \
    "$FRAMEWORK/Versions/B/Autoupdate" \
    "$FRAMEWORK/Versions/B/Updater.app" \
    "$FRAMEWORK"; do
    codesign --force --options runtime --timestamp --preserve-metadata=entitlements --sign "$IDENTITY" "$COMPONENT"
done
codesign --force --options runtime --timestamp --sign "$IDENTITY" --entitlements Packaging/Toby.entitlements "$APP"
codesign --verify --deep --strict "$APP"
# Pin this Mac's successful choice; never silently switch certificates on a later build.
printf '%s\n' "$IDENTITY" > "$IDENTITY_FILE"
echo "Built $APP (version $VERSION). The app has not been launched."
