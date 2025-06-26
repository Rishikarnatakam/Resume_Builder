#!/bin/bash

echo "📦 Setting up Resume Builder project..."

# Navigate to project directory
cd /var/www/resume-builder

# Set up Python environment
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Build frontend
cd frontend
npm install

# Create frontend environment files
echo "📝 Creating frontend environment files..."

# Development environment
cat > .env << 'EOF'
# API Configuration
VITE_API_BASE_URL=http://localhost:8000/api
VITE_API_HOST=http://localhost:8000

# Environment
VITE_NODE_ENV=development
EOF

# Production environment (for nginx)
cat > .env.production << 'EOF'
# API Configuration for Production
VITE_API_BASE_URL=/api
VITE_API_HOST=

# Environment
VITE_NODE_ENV=production
EOF

# Static domain environment (for your ngrok domain)
cat > .env.static << 'EOF'
# API Configuration for Static Domain
VITE_API_BASE_URL=https://herring-meet-seasnail.ngrok-free.app/api
VITE_API_HOST=https://herring-meet-seasnail.ngrok-free.app

# Environment
VITE_NODE_ENV=production
EOF

echo "✅ Frontend environment files created"

npm run build
cd ..

# Create necessary directories
mkdir -p backend/static/uploaded_pdfs
mkdir -p data

# Copy environment file
cp env.example .env

# Set permissions
sudo chown -R $USER:$USER .
sudo chmod +x *.sh

# Create nginx config
sudo tee /etc/nginx/sites-available/resume-builder > /dev/null <<EOF
server {
    listen 80;
    server_name _;
    
    location / {
        root /var/www/resume-builder/frontend/dist;
        index index.html;
        try_files \$uri \$uri/ /index.html;
    }
    
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    location /static/ {
        alias /var/www/resume-builder/backend/static/;
        expires 1d;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Enable nginx site
sudo ln -sf /etc/nginx/sites-available/resume-builder /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t

echo "✅ Project setup complete!"
echo ""
echo "⚠️  IMPORTANT: Edit .env file and add your GEMINI_API_KEY"
echo "Then run: ./start-server.sh" 