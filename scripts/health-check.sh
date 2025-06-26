#!/bin/bash

# Resume Builder Health Check Script
# Monitors application health and services

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_ok() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

APP_DIR="/opt/resume-builder"

echo "🏥 Resume Builder Health Check"
echo "============================="

all_healthy=true

# Check if PM2 is running
echo ""
print_info "Checking PM2 status..."
if command -v pm2 &> /dev/null; then
    if pm2 status | grep -q "resume-builder-backend.*online"; then
        print_ok "Backend service running via PM2"
    else
        print_error "Backend service not running in PM2"
        all_healthy=false
    fi
else
    print_error "PM2 not installed"
    all_healthy=false
fi

# Check Nginx status
echo ""
print_info "Checking Nginx status..."
if sudo systemctl is-active --quiet nginx; then
    print_ok "Nginx is running"
    
    # Test nginx configuration
    if sudo nginx -t &>/dev/null; then
        print_ok "Nginx configuration is valid"
    else
        print_error "Nginx configuration has errors"
        all_healthy=false
    fi
else
    print_error "Nginx is not running"
    all_healthy=false
fi

# Check Redis status
echo ""
print_info "Checking Redis status..."
if sudo systemctl is-active --quiet redis-server; then
    print_ok "Redis is running"
else
    print_warning "Redis is not running (optional service)"
fi

# Check network connectivity
echo ""
print_info "Checking network connectivity..."

# Health endpoint
if curl -s -f http://localhost/health > /dev/null; then
    print_ok "Main health endpoint responding"
else
    print_error "Main health endpoint not responding"
    all_healthy=false
fi

# API health endpoint
if curl -s -f http://localhost/api/health > /dev/null; then
    response=$(curl -s http://localhost/api/health | python3 -c "import sys, json; print(json.load(sys.stdin).get('status', 'unknown'))" 2>/dev/null)
    if [ "$response" = "healthy" ]; then
        print_ok "API health endpoint: $response"
    else
        print_warning "API health endpoint: $response"
    fi
else
    print_error "API health endpoint not responding"
    all_healthy=false
fi

# Frontend accessibility
if curl -s -f http://localhost/ > /dev/null; then
    print_ok "Frontend is accessible"
else
    print_error "Frontend is not accessible"
    all_healthy=false
fi

# Check SSL if configured
if [ -d "/etc/letsencrypt/live" ]; then
    echo ""
    print_info "Checking SSL certificates..."
    
    for cert_dir in /etc/letsencrypt/live/*/; do
        if [ -d "$cert_dir" ]; then
            domain=$(basename "$cert_dir")
            if openssl x509 -in "${cert_dir}cert.pem" -noout -checkend 604800 > /dev/null 2>&1; then
                expiry=$(openssl x509 -in "${cert_dir}cert.pem" -noout -enddate | cut -d= -f2)
                print_ok "SSL certificate for $domain valid until: $expiry"
            else
                print_warning "SSL certificate for $domain expires within 7 days"
            fi
        fi
    done
fi

# Check disk space
echo ""
print_info "Checking system resources..."

disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$disk_usage" -lt 80 ]; then
    print_ok "Disk usage: ${disk_usage}%"
elif [ "$disk_usage" -lt 90 ]; then
    print_warning "Disk usage: ${disk_usage}%"
else
    print_error "Disk usage critical: ${disk_usage}%"
    all_healthy=false
fi

# Check memory usage
memory_usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2 }')
if [ "$memory_usage" -lt 80 ]; then
    print_ok "Memory usage: ${memory_usage}%"
elif [ "$memory_usage" -lt 90 ]; then
    print_warning "Memory usage: ${memory_usage}%"
else
    print_error "Memory usage critical: ${memory_usage}%"
fi

# Check database
echo ""
print_info "Checking database..."

if [ -f "$APP_DIR/backend/data/latex_resume_ai.db" ]; then
    if sqlite3 $APP_DIR/backend/data/latex_resume_ai.db "SELECT 1;" > /dev/null 2>&1; then
        db_size=$(du -h $APP_DIR/backend/data/latex_resume_ai.db | cut -f1)
        print_ok "Database accessible (Size: $db_size)"
    else
        print_error "Database corrupted or inaccessible"
        all_healthy=false
    fi
else
    print_warning "Database file not found"
fi

# Check application files
echo ""
print_info "Checking application files..."

if [ -d "$APP_DIR" ]; then
    print_ok "Application directory exists: $APP_DIR"
    
    if [ -f "$APP_DIR/backend/venv/bin/python" ]; then
        print_ok "Python virtual environment found"
    else
        print_error "Python virtual environment missing"
        all_healthy=false
    fi
    
    if [ -d "/var/www/resume-builder" ]; then
        print_ok "Frontend files deployed to nginx directory"
    else
        print_error "Frontend files missing from nginx directory"
        all_healthy=false
    fi
else
    print_error "Application directory missing: $APP_DIR"
    all_healthy=false
fi

# Check logs for errors
echo ""
print_info "Checking recent errors in logs..."

if [ -f "$APP_DIR/backend/static/logs/backend-error.log" ]; then
    error_count=$(tail -100 $APP_DIR/backend/static/logs/backend-error.log | grep -i "error\|exception\|failed" | wc -l)
    if [ "$error_count" -eq 0 ]; then
        print_ok "No recent errors in backend logs"
    elif [ "$error_count" -lt 5 ]; then
        print_warning "$error_count errors in recent backend logs"
    else
        print_error "$error_count errors in recent backend logs"
    fi
else
    print_warning "Backend error log not found"
fi

# Summary
echo ""
echo "============================="
if $all_healthy; then
    print_ok "Overall Status: HEALTHY"
    echo ""
    print_info "Service management commands:"
    print_info "- View backend logs: pm2 logs resume-builder-backend"
    print_info "- Restart backend: pm2 restart resume-builder-backend"
    print_info "- Restart nginx: sudo systemctl restart nginx"
    print_info "- Check PM2 status: pm2 status"
    exit 0
else
    print_error "Overall Status: UNHEALTHY"
    echo ""
    print_info "Troubleshooting commands:"
    print_info "- Check backend logs: pm2 logs resume-builder-backend"
    print_info "- Check nginx logs: sudo journalctl -u nginx"
    print_info "- Restart services: pm2 restart all && sudo systemctl restart nginx"
    exit 1
fi 