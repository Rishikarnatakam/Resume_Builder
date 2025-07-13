#!/bin/bash
# 🚀 ResumeCraft - Server Starter
# This script starts the backend, Nginx, and the ngrok tunnel.
set -e

echo "🚀 Starting ResumeCraft Server..."

# --- Activate Python Virtual Environment ---
if [ -d "venv" ]; then
    echo "🐍 Activating Python virtual environment..."
    source venv/bin/activate
else
    echo "❌ Error: 'venv' directory not found."
    echo "Please run ./project-setup.sh first."
    exit 1
fi

# --- Start Backend Server ---
echo "⚙️  Starting Python backend with Uvicorn..."
# The backend is started in the background. Logs are in backend.log.
nohup uvicorn main:app --host 127.0.0.1 --port 8000 --app-dir backend > backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > backend.pid
echo "✅ Backend started with PID $BACKEND_PID. Logs are in backend.log"

# --- Start/Reload Nginx ---
echo "⚙️  Starting/Reloading Nginx..."
# Use reload to apply config changes without downtime, start if not running.
if ! sudo systemctl is-active --quiet nginx; then
    sudo systemctl start nginx
    echo "✅ Nginx started."
else
    sudo systemctl reload nginx
    echo "✅ Nginx configuration reloaded."
fi

# --- Start Ngrok Tunnel (Optional) ---
# Replace with your static domain or remove the --domain flag for a random one.
NGROK_DOMAIN="your-domain.ngrok-free.app" 
echo "🔗 Starting ngrok tunnel for domain: $NGROK_DOMAIN..."
nohup ngrok http 80 --domain=$NGROK_DOMAIN --log=stdout > ngrok.log 2>&1 &
NGROK_PID=$!
echo $NGROK_PID > ngrok.pid
echo "✅ Ngrok tunnel started with PID $NGROK_PID. Logs are in ngrok.log"

echo "---"
echo "🎉 Server is now running!"
echo "   - Local: http://localhost"
echo "   - Public: https://$NGROK_DOMAIN"
echo "   - API Docs: http://localhost/api/docs"
echo "---"
echo "   To stop the server, run ./stop-server.sh"
echo "---" 