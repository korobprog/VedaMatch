#!/bin/bash
exec > debug_start.log 2>&1
echo "=== DEBUG START SCRIPT ==="
date
echo "Current Dir: $(pwd)"
echo "User: $(whoami)"
echo "PATH: $PATH"

# Try to find go
if command -v go >/dev/null; then
    echo "Go found at: $(which go)"
    go version
else
    echo "Go NOT found in PATH. Searching..."
    for path in /usr/local/go/bin/go /usr/bin/go /snap/bin/go /home/maxim/go/bin/go; do
        if [ -x "$path" ]; then
            echo "Found go at $path"
            export PATH=$PATH:$(dirname $path)
            break
        fi
    done
fi

if ! command -v go >/dev/null; then
    echo "CRITICAL: Go not found after search"
    exit 1
fi

echo "Building server..."
cd server || exit 1
go build -v -o server_bin_debug cmd/api/main.go
if [ $? -ne 0 ]; then
    echo "Build failed!"
    exit 1
fi

echo "Build successful. Starting server..."
./server_bin_debug
