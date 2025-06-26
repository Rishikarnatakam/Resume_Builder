#!/bin/bash

echo "🛑 Stopping Resume Builder Server..."

# Kill backend process
echo "Stopping backend..."
pkill -f "uvicorn main:app"

# Stop nginx
echo "Stopping nginx..."
sudo systemctl stop nginx

echo "✅ All services stopped" 