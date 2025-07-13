#!/bin/bash
# 🚀 ResumeCraft - Server Stopper
# This script stops all running services for the application.
set -e

echo "🛑 Stopping ResumeCraft Server..."

# --- Stop Backend Server ---
if [ -f "backend.pid" ]; then
    PID=$(cat backend.pid)
    echo "⚙️  Stopping backend server with PID $PID..."
    # Kill process and ignore errors if it's already gone
    kill $PID || true
    rm -f backend.pid
    echo "✅ Backend server stopped."
else
    echo "✅ Backend server is not running."
fi

# --- Stop Ngrok Tunnel ---
if [ -f "ngrok.pid" ]; then
    PID=$(cat ngrok.pid)
    echo "⚙️  Stopping ngrok tunnel with PID $PID..."
    kill $PID || true
    rm -f ngrok.pid
    echo "✅ Ngrok tunnel stopped."
else
    echo "✅ Ngrok tunnel is not running."
fi

# --- Stop Nginx ---
if sudo systemctl is-active --quiet nginx; then
    echo "⚙️  Stopping Nginx service..."
    sudo systemctl stop nginx
    echo "✅ Nginx service stopped."
else
    echo "✅ Nginx service is not running."
fi

echo "---"
echo "🎉 All services have been stopped."
echo "---" 