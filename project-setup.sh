#!/bin/bash

echo "🚀 Setting up ResumeCraft with Supabase..."

# Navigate to project directory
cd /var/www/resumecraft

# Set up Python environment
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Build frontend
cd frontend
npm install

# Create frontend environment files (IN FRONTEND DIRECTORY)
echo "📝 Creating frontend environment files..."

# Development environment
cat > .env << 'EOF'
# API Configuration
VITE_API_BASE_URL=http://localhost:8000/api
VITE_API_HOST=http://localhost:8000

# Supabase Configuration
VITE_SUPABASE_URL=https://[PROJECT_REF].supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Environment
VITE_NODE_ENV=development
EOF

# Production environment (for nginx)
cat > .env.production << 'EOF'
# API Configuration for Production
VITE_API_BASE_URL=/api
VITE_API_HOST=

# Supabase Configuration
VITE_SUPABASE_URL=https://[PROJECT_REF].supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Environment
VITE_NODE_ENV=production
EOF

# Static domain environment (for your custom domain)
cat > .env.static << 'EOF'
# API Configuration for Static Domain
VITE_API_BASE_URL=https://your-domain.com/api
VITE_API_HOST=https://your-domain.com

# Supabase Configuration
VITE_SUPABASE_URL=https://[PROJECT_REF].supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Environment
VITE_NODE_ENV=production
EOF

echo "✅ Frontend environment files created"

npm run build
cd ..

# Create necessary directories
mkdir -p backend/static/uploaded_pdfs
mkdir -p backend/static/generated_pdfs
mkdir -p backend/static/temp

# Copy environment file TO BACKEND DIRECTORY (where it's expected)
cp env.example backend/.env

echo "📝 Backend environment file created at backend/.env"
echo ""
echo "⚠️  IMPORTANT: Edit backend/.env and configure these required variables:"
echo "   - DATABASE_URL (your Supabase PostgreSQL connection string)"
echo "   - SUPABASE_URL"
echo "   - SUPABASE_ANON_KEY"  
echo "   - SUPABASE_SERVICE_KEY"
echo "   - GEMINI_API_KEY"
echo ""

# Set permissions
sudo chown -R $USER:$USER .
sudo chmod +x *.sh

# Create nginx config for production
sudo tee /etc/nginx/sites-available/resumecraft > /dev/null <<EOF
server {
    listen 80;
    server_name _;
    
    # Frontend static files
    location / {
        root /var/www/resumecraft/frontend/dist;
        index index.html;
        try_files \$uri \$uri/ /index.html;
        
        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
    }
    
    # API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # CORS headers for API
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
        add_header Access-Control-Allow-Headers "Authorization, Content-Type";
    }
    
    # Static assets (PDFs, uploads)
    location /static/ {
        alias /var/www/resumecraft/backend/static/;
        expires 1d;
        add_header Cache-Control "public, immutable";
    }
    
    # Health check endpoint
    location /health {
        proxy_pass http://127.0.0.1:8000/health;
    }
}
EOF

# Enable nginx site
sudo ln -sf /etc/nginx/sites-available/resumecraft /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t

echo "✅ Project setup complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Edit backend/.env with your Supabase credentials"
echo "2. Edit frontend/.env with your Supabase project details"
echo "3. Run the database schema in your Supabase SQL editor"
echo "4. Start the server: ./start-server.sh"
echo ""
echo "📚 Documentation:"
echo "   - README.md for detailed setup instructions"
echo "   - CONTRIBUTING.md for development guidelines"
echo ""
echo "🔐 Security: Your app uses enterprise-grade Row Level Security with Supabase!" 