#!/bin/bash

# Resume Builder Deployment Script for Ubuntu Server
# Native deployment without Docker

set -e

echo "🚀 Starting Resume Builder deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root"
   exit 1
fi

# Update system
print_status "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install system dependencies
print_status "Installing system dependencies..."
sudo apt install -y \
    python3 \
    python3-venv \
    python3-dev \
    python3-pip \
    nodejs \
    npm \
    nginx \
    redis-server \
    sqlite3 \
    texlive-latex-base \
    texlive-latex-extra \
    texlive-fonts-recommended \
    texlive-fonts-extra \
    texlive-xetex \
    git \
    curl \
    unzip

# Install PM2 for process management
print_status "Installing PM2 for process management..."
sudo npm install -g pm2

# Create application directory
APP_DIR="/opt/resume-builder"
print_status "Setting up application directory: $APP_DIR"

# Copy current directory to /opt/resume-builder if we're not already there
if [ "$(pwd)" != "$APP_DIR" ]; then
    sudo mkdir -p $APP_DIR
    sudo cp -r . $APP_DIR/
    sudo chown -R $USER:$USER $APP_DIR
    cd $APP_DIR
fi

# Setup environment
if [ ! -f ".env" ]; then
    print_warning "No .env file found. Creating from env.example..."
    cp env.example .env
    
    # Generate a secure secret key
    SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))" 2>/dev/null || openssl rand -base64 32)
    sed -i "s/your-very-secure-secret-key-here-minimum-32-characters/$SECRET_KEY/" .env
    print_status "Generated secure SECRET_KEY"
    
    print_warning "Please edit .env file with your GEMINI_API_KEY before continuing"
    read -p "Press Enter when you've updated the .env file..."
fi

# Setup backend
print_status "Setting up Python backend..."
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Create necessary directories
mkdir -p data static/{uploaded_pdfs,generated_pdfs,temp,logs}
chmod 755 static
chmod 755 static/*

# Setup database
print_status "Initializing database..."
python -c "
import asyncio
from database import init_db
asyncio.run(init_db())
"

cd ..

# Setup frontend
print_status "Setting up React frontend..."
cd frontend

# Install dependencies
npm install

# Build for production
npm run build

cd ..

# Setup Redis
print_status "Configuring Redis..."
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Setup Nginx
print_status "Configuring Nginx..."
sudo cp nginx/nginx.conf /etc/nginx/sites-available/resume-builder
sudo ln -sf /etc/nginx/sites-available/resume-builder /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
sudo nginx -t

# Setup PM2 processes
print_status "Setting up PM2 processes..."

# Create PM2 ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'resume-builder-backend',
      script: 'venv/bin/uvicorn',
      args: 'main:app --host 0.0.0.0 --port 8000',
      cwd: '/opt/resume-builder/backend',
      env: {
        PYTHONPATH: '/opt/resume-builder/backend'
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: '/opt/resume-builder/backend/static/logs/backend-error.log',
      out_file: '/opt/resume-builder/backend/static/logs/backend-out.log',
      log_file: '/opt/resume-builder/backend/static/logs/backend-combined.log'
    }
  ]
};
EOF

# Start backend with PM2
print_status "Starting backend service..."
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# Copy the frontend build to nginx directory
print_status "Setting up frontend files..."
sudo mkdir -p /var/www/resume-builder
sudo cp -r frontend/dist/* /var/www/resume-builder/
sudo chown -R www-data:www-data /var/www/resume-builder

# Create static files symlink for nginx
sudo ln -sf $APP_DIR/backend/static /var/www/resume-builder/static

# Start Nginx
print_status "Starting Nginx..."
sudo systemctl restart nginx
sudo systemctl enable nginx

# Setup firewall (optional)
read -p "Do you want to configure UFW firewall? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_status "Configuring UFW firewall..."
    sudo ufw allow 22/tcp
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    sudo ufw --force enable
fi

# Setup SSL (optional)
read -p "Do you want to setup SSL with Let's Encrypt? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "Enter your domain name: " DOMAIN
    if [ ! -z "$DOMAIN" ]; then
        print_status "Installing Certbot..."
        sudo apt install -y certbot python3-certbot-nginx
        
        print_status "Obtaining SSL certificate..."
        sudo certbot --nginx -d $DOMAIN
        
        print_status "SSL certificate installed and nginx configured"
    fi
fi

# Wait for services to be ready
print_status "Waiting for services to start..."
sleep 10

# Check service health
print_status "Checking service health..."
if curl -f http://localhost/health > /dev/null 2>&1; then
    print_status "✅ Application is running successfully!"
    print_status "Frontend: http://localhost"
    print_status "Backend API: http://localhost/api/docs"
else
    print_error "❌ Application health check failed"
    print_error "Check logs with: pm2 logs"
fi

print_status "🎉 Deployment completed!"
print_status ""
print_status "Service management commands:"
print_status "- View logs: pm2 logs"
print_status "- Restart backend: pm2 restart resume-builder-backend"
print_status "- Check status: pm2 status"
print_status "- Restart nginx: sudo systemctl restart nginx"
print_status "- Check nginx: sudo systemctl status nginx"
print_status ""
print_status "Application files located at: $APP_DIR" 