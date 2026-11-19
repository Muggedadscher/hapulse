#!/bin/sh
# [fork] CI (ios.yml): creates a fresh simulator of this device type on the newest iOS runtime this Xcode can use,
# boots it and prints its UDID. A fresh one instead of the runner's preinstalled device: on 19.11 a preinstalled iPad
# failed to boot after 3 minutes and then vanished from the destinations. A failed boot gets one more fresh device.
# Simulators of an earlier step are shut down first (two booted simulators slowed the runner down, 19.11), and the
# wait for the boot is capped at 5 minutes (`simctl bootstatus` can wait forever).
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
xcrun simctl shutdown all >&2 || true

# bootstatus with a time limit (macOS has no `timeout`)
booted() {
  xcrun simctl bootstatus "$1" -b >&2 &
  pid=$!
  (sleep 300 && kill "$pid") >/dev/null 2>&1 &
  guard=$!
  if wait "$pid"; then rc=0; else rc=1; fi
  kill "$guard" 2>/dev/null || true
  return $rc
}

for attempt in 1 2; do
  UDID=$(xcrun simctl create "hp-ci-$attempt" "$TYPE" "$RUNTIME")
  if xcrun simctl boot "$UDID" >&2 && booted "$UDID" \
     && xcrun simctl list devices booted | grep -q "$UDID"; then
    echo "$UDID"
    exit 0
  fi
  echo "boot of $TYPE failed (attempt $attempt)" >&2
  xcrun simctl shutdown "$UDID" >&2 || true
  xcrun simctl delete "$UDID" >&2 || true
done
exit 1
