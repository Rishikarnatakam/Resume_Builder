#!/bin/bash

echo "🚀 Starting ResumeCraft Server..."

# Navigate to project directory
PROJECT_DIR="/var/www/resumecraft"
if [ ! -d "$PROJECT_DIR" ]; then
    PROJECT_DIR="$(pwd)"
    echo "📁 Using current directory: $PROJECT_DIR"
fi

cd "$PROJECT_DIR"

# Activate Python virtual environment
source venv/bin/activate

# Validate environment configuration
echo "🔍 Validating configuration..."
if [ ! -f "backend/.env" ]; then
    echo "❌ Backend environment file not found!"
    echo "   Please copy env.example to backend/.env and configure it"
    exit 1
fi

# Check for required environment variables
if ! grep -q "DATABASE_URL.*postgresql" backend/.env; then
    echo "⚠️  WARNING: DATABASE_URL not configured for PostgreSQL"
    echo "   Please update backend/.env with your Supabase connection string"
fi

if ! grep -q "GEMINI_API_KEY" backend/.env; then
    echo "⚠️  WARNING: GEMINI_API_KEY not found in backend/.env"
fi

# Start backend in background (FROM BACKEND DIRECTORY where .env file is)
echo "🔧 Starting backend API..."
cd backend

# Validate Supabase connection
echo "📡 Testing database connection..."
python validate_supabase_only.py
if [ $? -ne 0 ]; then
    echo "❌ Database validation failed!"
    echo "   Please check your Supabase configuration in backend/.env"
    exit 1
fi

nohup uvicorn main:app --host 0.0.0.0 --port 8000 > ../backend.log 2>&1 &
BACKEND_PID=$!
echo "✅ Backend started (PID: $BACKEND_PID)"
cd ..

# Start nginx if available
if command -v nginx &> /dev/null; then
    echo "🌐 Starting nginx..."
    sudo systemctl start nginx
    if sudo systemctl is-active --quiet nginx; then
        echo "✅ Nginx is running"
    else
        echo "⚠️  Nginx failed to start (check configuration)"
    fi
else
    echo "ℹ️  Nginx not installed - serving frontend via Vite dev server"
    cd frontend
    npm run dev &
    FRONTEND_PID=$!
    echo "✅ Frontend dev server started (PID: $FRONTEND_PID)"
    cd ..
fi

# Wait for backend to start
echo "⏳ Waiting for services to initialize..."
sleep 5

# Health checks
echo "🔍 Checking services..."

# Check backend
if curl -s http://localhost:8000/docs > /dev/null; then
    echo "✅ Backend API is running on port 8000"
else
    echo "❌ Backend health check failed"
    echo "   Check backend.log for errors"
fi

# Check if nginx is serving the frontend
if command -v nginx &> /dev/null && sudo systemctl is-active --quiet nginx; then
    if curl -s http://localhost/ > /dev/null; then
        echo "✅ Frontend is served by nginx on port 80"
    else
        echo "⚠️  Frontend nginx check failed"
    fi
fi

echo ""
echo "🎉 ResumeCraft startup complete!"
echo ""
echo "📍 Access your application:"
echo "   🌐 Frontend: http://localhost:5173 (dev) or http://localhost (nginx)"
echo "   🔧 Backend API: http://localhost:8000"
echo "   📚 API Documentation: http://localhost:8000/docs"
echo ""
echo "📝 Logs:"
echo "   📄 Backend: tail -f backend.log"
echo "   📄 Nginx: sudo tail -f /var/log/nginx/error.log"
echo ""
echo "🛑 To stop all services: ./stop-server.sh"
echo ""
echo "💡 Tips:"
echo "   - Your data is securely stored in Supabase PostgreSQL"
echo "   - Enterprise-grade Row Level Security is active"
echo "   - AI features powered by Google Gemini"