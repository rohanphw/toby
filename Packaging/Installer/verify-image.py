"""Check packaged contents without opening Finder or launching the application."""
import pathlib
import plistlib
import subprocess
import sys

result = plistlib.loads(subprocess.check_output([
    "hdiutil", "attach", "-readonly", "-nobrowse", "-noautoopen", "-plist", sys.argv[1]
]))
mount = next(pathlib.Path(entry["mount-point"]) for entry in result["system-entities"]
             if "mount-point" in entry)
try:
    apps = list(mount.glob("*.app"))
    if len(apps) != 1 or (mount / "Applications").readlink() != pathlib.Path("/Applications"):
        raise RuntimeError("Installer must contain one app and an Applications shortcut")
    subprocess.run(["codesign", "--verify", "--deep", "--strict", str(apps[0])], check=True)
    if not (mount / ".DS_Store").is_file():
        raise RuntimeError("Finder layout is missing")
    print("Packaged signature, Applications shortcut, and layout file verified.")
finally:
    subprocess.run(["hdiutil", "detach", str(mount)], check=True)
