#!/bin/bash

# Get list of connected device serials
devices=$(adb devices | grep -v "List" | awk 'NF {print $1}')

if [ -z "$devices" ]; then
    echo "No devices connected via ADB."
    exit 0
fi

for dev in $devices; do
    echo "Applying adb reverse for device: $dev"
    adb -s "$dev" reverse tcp:8081 tcp:8081
    adb -s "$dev" reverse tcp:8082 tcp:8082
done
