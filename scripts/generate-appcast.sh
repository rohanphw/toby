#!/bin/bash
# Run after notarization and stapling; never alter archive bytes after signing the feed.
set -euo pipefail
cd "$(dirname "$0")/.."
ARCHIVE="${1:?Usage: scripts/generate-appcast.sh /absolute/path/Toby-version-arm64.dmg version}"
VERSION="${2:?Provide the matching release version}"
[[ "$ARCHIVE" = /* && -f "$ARCHIVE" ]] || { echo "Archive must be an existing absolute path." >&2; exit 1; }
[[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo "Use a stable semantic version." >&2; exit 1; }
[[ "$(basename "$ARCHIVE")" = "Toby-$VERSION-arm64.dmg" ]] || { echo "Archive name and version differ." >&2; exit 1; }
xcrun stapler validate "$ARCHIVE"
codesign --verify --strict "$ARCHIVE"
TOOL="$PWD/.build/artifacts/sparkle/Sparkle/bin/generate_appcast"
[[ -x "$TOOL" ]] || { echo "Resolve Swift dependencies first." >&2; exit 1; }
STAGING=$(mktemp -d "${TMPDIR:-/tmp}/toby-appcast.XXXXXX")
trap 'rm -rf "$STAGING"' EXIT
cp "$ARCHIVE" "$STAGING/"
[[ ! -f appcast.xml ]] || cp appcast.xml "$STAGING/appcast.xml"
"$TOOL" --account toby-sparkle --download-url-prefix "https://github.com/rohanphw/toby/releases/download/v$VERSION/" --maximum-deltas 0 "$STAGING"
python3 - "$STAGING/appcast.xml" "$ARCHIVE" "$VERSION" <<'PYVERIFY'
import pathlib, sys, xml.etree.ElementTree as ET
feed, archive, version = sys.argv[1:]
namespace = "{http://www.andymatuschak.org/xml-namespaces/sparkle}"
items = ET.parse(feed).findall("./channel/item")
matching = [item for item in items if item.findtext(namespace + "shortVersionString") == version]
if len(matching) != 1:
    sys.exit("Generated feed does not contain exactly one matching release")
enclosure = matching[0].find("enclosure")
expected = "https://github.com/rohanphw/toby/releases/download/v" + version + "/" + pathlib.Path(archive).name
if enclosure is None or not enclosure.get(namespace + "edSignature"):
    sys.exit("Update has no Ed25519 signature. Check the app public key and signing account.")
if enclosure.get("url") != expected or int(enclosure.get("length", "0")) != pathlib.Path(archive).stat().st_size:
    sys.exit("Update URL or length does not match the release archive")
PYVERIFY
cp "$STAGING/appcast.xml" appcast.xml
echo "Prepared appcast.xml. Publish only after its matching GitHub release asset is available."
