#!/bin/bash

# Resume Builder Update Script
# Updates the application safely

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[UPDATE]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

APP_DIR="/opt/resume-builder"

print_status "🚀 Starting Resume Builder update process..."

# Check if we're in the right directory
if [ ! -f "package.json" ] && [ ! -f "requirements.txt" ]; then
    if [ -d "$APP_DIR" ]; then
        cd $APP_DIR
    else
        print_error "Cannot find application directory"
        exit 1
    fi
fi

# Check if git is available and we're in a git repo
if ! git status > /dev/null 2>&1; then
    print_error "Not in a git repository or git not available"
    exit 1
fi

# Create backup before update
print_status "Creating backup before update..."
if [ -f "scripts/backup.sh" ]; then
    chmod +x scripts/backup.sh
    ./scripts/backup.sh
else
    print_warning "Backup script not found, continuing without backup"
fi

# Check for updates
print_status "Checking for updates..."
git fetch origin

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" = "$REMOTE" ]; then
    print_status "Already up to date!"
    exit 0
fi

print_status "Updates available. Updating from $LOCAL to $REMOTE"

# Show what's changing
print_status "Changes to be applied:"
git log --oneline $LOCAL..$REMOTE

read -p "Proceed with update? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_status "Update cancelled"
    exit 0
fi

# Stop backend service
print_status "Stopping backend service..."
pm2 stop resume-builder-backend || print_warning "Backend service not running"

# Pull changes
print_status "Pulling latest changes..."
git pull origin main

# Update backend dependencies
print_status "Updating backend dependencies..."
cd backend
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Run any database migrations if needed
print_status "Checking database..."
python -c "
import asyncio
from database import init_db
asyncio.run(init_db())
" || print_warning "Database initialization failed"

cd ..

# Update frontend
print_status "Updating frontend..."
cd frontend
npm install
npm run build

# Copy new build to nginx directory
sudo cp -r dist/* /var/www/resume-builder/
sudo chown -R www-data:www-data /var/www/resume-builder

cd ..

# Check if nginx config changed
if ! sudo nginx -t; then
    print_error "Nginx configuration test failed"
    print_warning "You may need to update nginx configuration manually"
fi

# Restart services
print_status "Restarting services..."
pm2 restart resume-builder-backend
sudo systemctl reload nginx

# Wait for services to start
print_status "Waiting for services to start..."
sleep 10

# Health check
print_status "Performing health check..."
MAX_TRIES=5
TRIES=0

while [ $TRIES -lt $MAX_TRIES ]; do
    if curl -f http://localhost/health > /dev/null 2>&1; then
        print_status "✅ Update completed successfully!"
        print_status "Application is running at: http://localhost"
        print_status "API docs: http://localhost/api/docs"
        break
    else
        TRIES=$((TRIES + 1))
        if [ $TRIES -eq $MAX_TRIES ]; then
            print_error "❌ Health check failed after update"
            print_error "Check logs with: pm2 logs"
            print_warning "You may need to restore from backup"
            exit 1
        else
            print_status "Health check failed, retrying... ($TRIES/$MAX_TRIES)"
            sleep 10
        fi
    fi
done

# Show current version
CURRENT_VERSION=$(git rev-parse --short HEAD)
print_status "Updated to version: $CURRENT_VERSION"

# Show service status
print_status "Service status:"
pm2 status
sudo systemctl status nginx --no-pager -l

print_status "🎉 Update completed successfully!" 