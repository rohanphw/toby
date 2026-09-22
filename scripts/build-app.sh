#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
VERSION=$(cat VERSION)
CONFIGURATION=${CONFIGURATION:-release}
swift build -c "$CONFIGURATION"
BIN_DIRECTORY=$(swift build -c "$CONFIGURATION" --show-bin-path)
APP="$PWD/dist/Toby.app"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
cp "$BIN_DIRECTORY/Toby" "$APP/Contents/MacOS/Toby"
cp Packaging/Toby.icns "$APP/Contents/Resources/Toby.icns"
cp Packaging/Info.plist "$APP/Contents/Info.plist"
/usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString $VERSION" "$APP/Contents/Info.plist"
codesign --force --deep --sign "${CODE_SIGN_IDENTITY:--}" --entitlements Packaging/Toby.entitlements "$APP"
echo "Built $APP (version $VERSION). The app has not been launched."
