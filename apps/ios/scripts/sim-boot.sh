#!/bin/sh
# [fork] CI (ios.yml): creates a fresh simulator of this device type on the newest iOS runtime this Xcode can use,
# boots it and prints its UDID. A fresh one instead of the runner's preinstalled device: on 19.11 a preinstalled iPad
# failed to boot after 3 minutes and then vanished from the destinations. A failed boot gets one more fresh device.
set -eu
TYPE="$1"
RUNTIME=$(xcrun simctl list runtimes available -j | python3 -c '
import json, sys
rs = [r for r in json.load(sys.stdin)["runtimes"] if r.get("platform") == "iOS" and r.get("isAvailable", True)]
if not rs:
    sys.exit("no available iOS runtime")
rs.sort(key=lambda r: [int(x) for x in r["version"].split(".")])
print(rs[-1]["identifier"])
')
echo "runtime $RUNTIME for $TYPE" >&2
for attempt in 1 2; do
  UDID=$(xcrun simctl create "hp-ci-$attempt" "$TYPE" "$RUNTIME")
  if xcrun simctl boot "$UDID" >&2 && xcrun simctl bootstatus "$UDID" -b >&2 \
     && xcrun simctl list devices booted | grep -q "$UDID"; then
    echo "$UDID"
    exit 0
  fi
  echo "boot of $TYPE failed (attempt $attempt)" >&2
  xcrun simctl shutdown "$UDID" >&2 || true
  xcrun simctl delete "$UDID" >&2 || true
done
exit 1
