#!/bin/bash
exec > debug_restart.log 2>&1
echo "=== RESTART DEBUG SCRIPT ==="
date

echo "Locating process on 8081..."
# Function to find and kill
cleanup_port() {
    local port=$1
    echo "Cleaning port $port..."
    fuser -v -k -9 $port/tcp
    if [ $? -eq 0 ]; then
        echo "Sent kill signal to process on $port"
        sleep 2
    else
        echo "No process found/killed by fuser on $port"
    fi
}

cleanup_port 8081

# Double check with lsof if available
if command -v lsof >/dev/null; then
    PIDS=$(lsof -t -i :8081)
    if [ -n "$PIDS" ]; then
        echo "Found lingering PIDs via lsof: $PIDS. Killing..."
        kill -9 $PIDS
        sleep 2
    fi
fi

# Final check
if fuser 8081/tcp >/dev/null 2>&1; then
    echo "CRITICAL: Port 8081 still in use!"
    fuser -v 8081/tcp
    exit 1
else
    echo "Port 8081 is free."
fi

export PATH=$PATH:/usr/local/go/bin:/usr/bin:/home/maxim/go/bin

echo "Building server..."
cd server || exit 1
go build -v -o server_bin_debug cmd/api/main.go

echo "Starting server..."
./server_bin_debug
