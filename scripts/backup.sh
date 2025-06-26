#!/bin/bash

# Resume Builder Backup Script
# Creates backups for the application

set -e

# Configuration
BACKUP_DIR="backups"
DATE=$(date +%Y%m%d_%H%M%S)
APP_NAME="resume_builder"
APP_DIR="/opt/resume-builder"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[BACKUP]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Create backup directory
mkdir -p $BACKUP_DIR

print_status "Starting backup process..."

# Backup database
if [ -f "$APP_DIR/backend/data/latex_resume_ai.db" ]; then
    print_status "Backing up SQLite database..."
    cp $APP_DIR/backend/data/latex_resume_ai.db $BACKUP_DIR/${APP_NAME}_db_${DATE}.db
fi

# Backup user uploads
if [ -d "$APP_DIR/backend/static/uploaded_pdfs" ]; then
    print_status "Backing up user uploads..."
    tar -czf $BACKUP_DIR/${APP_NAME}_uploads_${DATE}.tar.gz -C $APP_DIR backend/static/uploaded_pdfs/
fi

# Backup configuration
print_status "Backing up configuration..."
cp $APP_DIR/.env $BACKUP_DIR/${APP_NAME}_env_${DATE}.backup 2>/dev/null || print_warning "No .env file found"
cp $APP_DIR/ecosystem.config.js $BACKUP_DIR/${APP_NAME}_pm2_${DATE}.js 2>/dev/null || print_warning "No PM2 config found"
cp /etc/nginx/sites-available/resume-builder $BACKUP_DIR/${APP_NAME}_nginx_${DATE}.conf 2>/dev/null || print_warning "No nginx config found"

# Backup SSL certificates if they exist
if [ -d "/etc/letsencrypt/live" ]; then
    print_status "Backing up Let's Encrypt certificates..."
    sudo tar -czf $BACKUP_DIR/${APP_NAME}_ssl_${DATE}.tar.gz -C /etc/letsencrypt live/ || print_warning "SSL backup failed"
fi

# Backup PM2 processes list
if command -v pm2 &> /dev/null; then
    print_status "Backing up PM2 configuration..."
    pm2 save
    cp ~/.pm2/dump.pm2 $BACKUP_DIR/${APP_NAME}_pm2_dump_${DATE}.pm2 2>/dev/null || print_warning "PM2 dump failed"
fi

# Create archive of all backups
print_status "Creating backup archive..."
tar -czf $BACKUP_DIR/${APP_NAME}_backup_${DATE}.tar.gz \
    $BACKUP_DIR/${APP_NAME}_*_${DATE}.*

# Clean up individual files (keep only the archive)
rm -f $BACKUP_DIR/${APP_NAME}_*_${DATE}.* 2>/dev/null || true

# Remove old backups (keep last 7 days)
find $BACKUP_DIR -name "${APP_NAME}_backup_*.tar.gz" -mtime +7 -delete

print_status "Backup completed: $BACKUP_DIR/${APP_NAME}_backup_${DATE}.tar.gz"
print_status "Backup size: $(du -h $BACKUP_DIR/${APP_NAME}_backup_${DATE}.tar.gz | cut -f1)"

# List recent backups
print_status "Recent backups:"
ls -lah $BACKUP_DIR/${APP_NAME}_backup_*.tar.gz 2>/dev/null | tail -5 || echo "No previous backups found" 