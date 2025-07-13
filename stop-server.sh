#!/bin/bash
set -e

echo "🛑 Stopping Resume Builder Server..."

# --- Stop Backend Server ---
if [ -f "backend.pid" ]; then
    PID=$(cat backend.pid)
    echo "Stopping backend server with PID $PID..."
    # The '|| true' prevents the script from exiting if the process is already gone.
    kill $PID || true
    rm -f backend.pid
    echo "Backend server stopped."
else
    echo "Backend PID file not found. Assuming it is not running."
fi

# --- Stop Ngrok Tunnel ---
if [ -f "ngrok.pid" ]; then
    PID=$(cat ngrok.pid)
    echo "Stopping ngrok tunnel with PID $PID..."
    kill $PID || true
    rm -f ngrok.pid
    echo "Ngrok tunnel stopped."
else
    echo "Ngrok PID file not found. Assuming it is not running."
fi

# --- Stop Nginx ---
echo "Stopping Nginx service on Ubuntu..."
sudo systemctl stop nginx
echo "Nginx service stopped."

echo "---"
echo "✅ All services have been stopped."
echo "---" 