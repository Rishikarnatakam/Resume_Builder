#!/bin/bash
# 🚀 ResumeCraft - Application Setup Script
# This script sets up the application environment, dependencies, and server configs.
# Run this from the project root after installing prerequisites with quick-setup.sh.
set -e

echo "🚀 Setting up the ResumeCraft application..."

# --- Backend Setup ---
echo "🐍 Setting up Python virtual environment and dependencies..."
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
deactivate
echo "✅ Backend environment is ready."

# --- Frontend Setup ---
echo "🌐 Setting up Node.js dependencies and building for production..."
cd frontend
npm install
npm run build
cd ..
echo "✅ Frontend has been built for production."

# --- Environment Configuration ---
echo "📝 Creating environment configuration files..."

# Create backend .env file if it doesn't exist
if [ ! -f "backend/.env" ]; then
    cp env.example backend/.env
    echo "✅ Created backend/.env from env.example."
    echo "⚠️  IMPORTANT: You must edit backend/.env with your secrets!"
else
    echo "✅ backend/.env already exists."
fi

# Create frontend .env.production file
cat > frontend/.env.production << 'EOF'
# API Configuration for Production (proxied via Nginx)
VITE_API_BASE_URL=/api
VITE_API_HOST=

# Supabase Configuration (replace with your project details)
VITE_SUPABASE_URL=https://[YOUR_PROJECT_REF].supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Environment
VITE_NODE_ENV=production
EOF
echo "✅ Created frontend/.env.production."
echo "⚠️  IMPORTANT: You must edit frontend/.env.production with your Supabase details!"


# --- Create Static Directories ---
mkdir -p backend/static/uploaded_pdfs
mkdir -p backend/static/generated_pdfs
mkdir -p backend/static/temp

# --- Nginx Configuration ---
echo "🔧 Configuring Nginx to serve the application..."
PROJECT_DIR=$(pwd)
NGINX_CONF="/etc/nginx/sites-available/resumecraft"

sudo tee $NGINX_CONF > /dev/null <<EOF
server {
    listen 80;
    server_name _; # Listens for any hostname

    root $PROJECT_DIR/frontend/dist;
    index index.html;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Frontend serving
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # API proxy to backend
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Static assets from backend
    location /static/ {
        alias $PROJECT_DIR/backend/static/;
        expires 1d;
        add_header Cache-Control "public, immutable";
    }

    # Health check endpoint
    location /health {
        proxy_pass http://127.0.0.1:8000/api/health;
    }
}
EOF

echo "✅ Nginx configuration created at $NGINX_CONF"

# Enable the Nginx site
if [ -L /etc/nginx/sites-enabled/resumecraft ]; then
    sudo rm /etc/nginx/sites-enabled/resumecraft
fi
sudo ln -s $NGINX_CONF /etc/nginx/sites-enabled/resumecraft

# Remove default site if it exists
if [ -L /etc/nginx/sites-enabled/default ]; then
    sudo rm /etc/nginx/sites-enabled/default
fi

echo "✅ Enabled Nginx site."

# Test Nginx configuration
sudo nginx -t

# --- Final Instructions ---
echo "🎉 ResumeCraft setup is complete!"
echo ""
echo "📋 NEXT STEPS:"
echo "   1. Edit 'backend/.env' with your secret keys."
echo "   2. Edit 'frontend/.env.production' with your Supabase public keys."
echo "   3. Run the database schema from the README in your Supabase SQL editor."
echo "   4. Use './start-server.sh' to launch the application."
echo "   5. To enable HTTPS, use 'sudo certbot --nginx' after pointing a domain to this server." 