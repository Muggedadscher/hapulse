#!/bin/sh
# [fork] UDID of an available simulator with this name on the newest installed iOS runtime (CI, ios.yml).
set -eu
xcrun simctl list devices available -j | python3 -c '
import json, sys
name = sys.argv[1]
devices = json.load(sys.stdin)["devices"]
def version(key):
    return [int(x) for x in key.rsplit("iOS-", 1)[1].split("-")]
for runtime in sorted((k for k in devices if ".iOS-" in k), key=version, reverse=True):
    for d in devices[runtime]:
        if d["name"] == name:
            print(d["udid"])
            sys.exit(0)
sys.exit("no simulator named " + name)
' "$1"
