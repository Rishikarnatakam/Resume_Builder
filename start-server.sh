#!/bin/bash
set -e

echo "🚀 Starting Resume Builder Server..."

# Activate Python virtual environment if it exists
if [ -d "venv" ]; then
    echo "Activating Python virtual environment..."
    source venv/bin/activate
else
    echo "Warning: 'venv' directory not found. Assuming Python environment is active."
fi

# --- Start Backend Server ---
echo "Starting Python backend with Uvicorn..."
# Start the backend in the background. Redirect stdout and stderr to a log file.
nohup uvicorn main:app --host 127.0.0.1 --port 8000 --app-dir backend > backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > backend.pid
echo "Backend started with PID $BACKEND_PID. Logs are in backend.log"

# --- Start Nginx ---
echo "Starting Nginx..."
# This command is for Ubuntu. For Windows testing, you will start it manually.
# Ensure your nginx config is in /etc/nginx/sites-enabled/
sudo systemctl start nginx
sudo systemctl reload nginx
echo "Nginx started and reloaded."

# --- Start Ngrok Tunnel ---
NGROK_DOMAIN="herring-meet-seasnail.ngrok-free.app"
echo "Starting ngrok tunnel for domain: $NGROK_DOMAIN..."
# Start ngrok, pointing to the Nginx port (80)
nohup ngrok http 80 --domain=$NGROK_DOMAIN --log=stdout > ngrok.log 2>&1 &
NGROK_PID=$!
echo $NGROK_PID > ngrok.pid
echo "Ngrok tunnel started with PID $NGROK_PID. Logs are in ngrok.log"

echo "---"
echo "✅ Server is running!"
echo "Your application is available at: https://$NGROK_DOMAIN"
echo "---" 