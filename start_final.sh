#!/bin/bash
exec > start_final.log 2>&1
echo "=== FINAL START SCRIPT ==="
date

# Clean port
fuser -k -9 8081/tcp || true
sleep 1

# Ensure go is in path (using found path from before)
export PATH=$PATH:/usr/local/go/bin:/usr/bin:/home/maxim/go/bin

cd server || exit 1

# Verify binary exists
if [ ! -f server_bin_debug ]; then
    echo "Binary not found, rebuilding..."
    go build -v -o server_bin_debug cmd/api/main.go
fi

echo "Starting server with nohup..."
nohup ./server_bin_debug > server.log 2>&1 &
PID=$!
echo "Server started with PID $PID"
echo $PID > server.pid

sleep 2
if ps -p $PID > /dev/null; then
    echo "Server is running."
    exit 0
else
    echo "Server died immediately. Check server.log"
    cat server.log
    exit 1
fi
