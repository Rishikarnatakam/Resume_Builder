#!/bin/bash

echo "🚀 Starting Resume Builder Server..."

# Navigate to project directory
cd /var/www/resume-builder

# Activate Python virtual environment
source venv/bin/activate

# Start backend in background
echo "Starting backend API..."
cd backend
nohup uvicorn main:app --host 0.0.0.0 --port 8000 > ../backend.log 2>&1 &
cd ..

# Start nginx
echo "Starting nginx..."
sudo systemctl start nginx

# Check if everything is running
sleep 3
echo "✅ Checking services..."

# Check backend
if curl -s http://localhost:8000/api/health > /dev/null; then
    echo "✅ Backend is running on port 8000"
else
    echo "❌ Backend failed to start"
fi

# Check nginx
if sudo systemctl is-active --quiet nginx; then
    echo "✅ Nginx is running"
else
    echo "❌ Nginx failed to start"
fi

echo "🎉 Server startup complete!"
echo "Access your app at: http://your-domain.com" 