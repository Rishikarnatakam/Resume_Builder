# 🚀 Deployment Guide

## Overview

This guide covers deploying ResumeCraft to production with Supabase as the database backend. The application is designed for modern cloud deployment with enterprise-grade security.

## 🏗️ Architecture Options

### Option 1: Vercel + Railway (Recommended)
- **Frontend**: Vercel (automatic deployments from GitHub)
- **Backend**: Railway (containerized Python deployment)
- **Database**: Supabase (managed PostgreSQL)

### Option 2: Single VPS
- **Server**: DigitalOcean/AWS/GCP droplet
- **Web Server**: Nginx + PM2
- **Database**: Supabase (managed PostgreSQL)

### Option 3: Serverless
- **Frontend**: Vercel/Netlify
- **Backend**: Vercel Functions/AWS Lambda
- **Database**: Supabase

## 🔧 Pre-Deployment Checklist

### 1. Environment Configuration
- [ ] Supabase project created and configured
- [ ] Database schema deployed (see `docs/database.md`)
- [ ] Google Gemini API key obtained
- [ ] Domain name purchased (optional)
- [ ] SSL certificate configured

### 2. Security Hardening
- [ ] Row Level Security enabled on all tables
- [ ] Environment variables secured
- [ ] CORS configured for your domain
- [ ] Rate limiting configured (post-launch)

## 🌐 Option 1: Vercel + Railway Deployment

### Step 1: Deploy Database (Supabase)

1. **Create Supabase Project**:
   ```bash
   # Go to https://app.supabase.com
   # Create new project
   # Note down your project URL and keys
   ```

2. **Run Database Setup**:
   ```sql
   -- Copy the complete SQL from docs/database.md
   -- Run in Supabase SQL Editor
   ```

3. **Configure Environment**:
   ```bash
   # Note these values for later:
   SUPABASE_URL=https://[project-ref].supabase.co
   SUPABASE_ANON_KEY=eyJ...
   SUPABASE_SERVICE_KEY=eyJ...
   DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
   ```

### Step 2: Deploy Backend (Railway)

1. **Connect GitHub**:
   ```bash
   # Push your code to GitHub
   git add .
   git commit -m "feat: prepare for production deployment"
   git push origin main
   ```

2. **Deploy to Railway**:
   ```bash
   # Go to https://railway.app
   # Connect GitHub repository
   # Select backend/ as root directory
   ```

3. **Configure Environment Variables**:
   ```env
   DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
   SUPABASE_URL=https://[project-ref].supabase.co
   SUPABASE_ANON_KEY=eyJ...
   SUPABASE_SERVICE_KEY=eyJ...
   GEMINI_API_KEY=your_gemini_api_key
   SECRET_KEY=your-super-secure-secret-key-32-chars-min
   DEFAULT_GEMINI_MODEL=gemini-2.5-flash
   ENVIRONMENT=production
   ```

4. **Configure Build**:
   ```toml
   # railway.toml
   [build]
   builder = "nixpacks"
   
   [deploy]
   startCommand = "uvicorn main:app --host 0.0.0.0 --port $PORT"
   ```

### Step 3: Deploy Frontend (Vercel)

1. **Connect Repository**:
   ```bash
   # Go to https://vercel.com
   # Import your GitHub repository
   # Set root directory to 'frontend'
   ```

2. **Configure Build Settings**:
   ```bash
   # Build Command: npm run build
   # Output Directory: dist
   # Install Command: npm install
   ```

3. **Environment Variables**:
   ```env
   VITE_API_BASE_URL=https://your-backend.railway.app/api
   VITE_API_HOST=https://your-backend.railway.app
   VITE_SUPABASE_URL=https://[project-ref].supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   VITE_NODE_ENV=production
   ```

### Step 4: Configure Custom Domain (Optional)

1. **Add Domain to Vercel**:
   ```bash
   # In Vercel dashboard: Settings > Domains
   # Add your domain: resumecraft.yourdomain.com
   ```

2. **Update DNS**:
   ```dns
   CNAME resumecraft 76.76.19.19 (Vercel)
   ```

3. **Update Environment Variables**:
   ```env
   # Update CORS in backend if needed
   # Update frontend environment with new domain
   ```

## 🖥️ Option 2: VPS Deployment

### Step 1: Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y python3.11 python3.11-venv nginx nodejs npm git

# Install PM2 for process management
sudo npm install -g pm2

# Create application directory
sudo mkdir -p /var/www/resumecraft
sudo chown $USER:$USER /var/www/resumecraft
```

### Step 2: Deploy Application

```bash
# Clone repository
cd /var/www/resumecraft
git clone https://github.com/yourusername/resumecraft.git .

# Run setup script
chmod +x project-setup.sh
./project-setup.sh

# Configure environment variables
cp env.example backend/.env
# Edit backend/.env with your production values
```

### Step 3: Configure Process Management

```bash
# Create PM2 ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'resumecraft-backend',
    cwd: '/var/www/resumecraft/backend',
    script: '/var/www/resumecraft/venv/bin/uvicorn',
    args: 'main:app --host 0.0.0.0 --port 8000',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    }
  }]
};
EOF

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Step 4: Configure Nginx

```nginx
# /etc/nginx/sites-available/resumecraft
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    # Frontend
    location / {
        root /var/www/resumecraft/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
        
        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    }
    
    # API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Static files
    location /static/ {
        alias /var/www/resumecraft/backend/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### Step 5: SSL Configuration

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

## 🔒 Production Security

### Environment Variables Security

```bash
# Set restrictive permissions on .env files
chmod 600 backend/.env
chmod 600 frontend/.env.production

# Use secrets management for sensitive data
# Consider AWS Secrets Manager, HashiCorp Vault, etc.
```

### Firewall Configuration

```bash
# Configure UFW firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### Monitoring Setup

```bash
# Set up log rotation
sudo nano /etc/logrotate.d/resumecraft

# Monitor with PM2
pm2 monit

# Set up health checks
# Consider using UptimeRobot or similar service
```

## 📊 Performance Optimization

### Database Optimization

```sql
-- Run in Supabase SQL Editor for production optimization
-- Analyze query performance
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Add additional indexes if needed based on usage patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_resumes_updated_at ON resumes(updated_at);
```

### CDN Setup

```bash
# Use Cloudflare for:
# - Static asset caching
# - DDoS protection
# - Performance optimization
# - Additional security layer
```

### Caching Strategy

```python
# Backend: Implement Redis for session caching
# Frontend: Use service workers for offline capabilities
# Database: Leverage Supabase built-in caching
```

## 🚀 CI/CD Pipeline

### GitHub Actions Deployment

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Railway
        uses: railway-deploy@v2
        with:
          token: ${{ secrets.RAILWAY_TOKEN }}
          
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Vercel
        uses: vercel/action@v1
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

## 🔍 Post-Deployment Checklist

### Functional Testing
- [ ] User registration/login works
- [ ] Resume creation and editing
- [ ] PDF generation and download
- [ ] AI chat functionality
- [ ] File upload/download

### Performance Testing
- [ ] Page load times < 3 seconds
- [ ] API response times < 500ms
- [ ] Database query performance
- [ ] Mobile responsiveness

### Security Testing
- [ ] HTTPS enforced
- [ ] CORS configured correctly
- [ ] RLS policies working
- [ ] Input validation active
- [ ] Rate limiting functional

### Monitoring Setup
- [ ] Error tracking (Sentry)
- [ ] Performance monitoring (New Relic)
- [ ] Uptime monitoring (UptimeRobot)
- [ ] Log aggregation (LogRocket)

## 📈 Scaling Considerations

### Traffic Growth Plan
- **0-1K users**: Current setup sufficient
- **1K-10K users**: Scale backend horizontally
- **10K+ users**: Consider microservices architecture

### Database Scaling
- **Supabase Pro**: 8GB database, better performance
- **Read replicas**: For read-heavy workloads
- **Connection pooling**: Optimize database connections

### Cost Optimization
- **Supabase**: Free tier → Pro ($25/month)
- **Railway**: $5-20/month based on usage
- **Vercel**: Free for most use cases

## 🆘 Emergency Procedures

### Database Backup
```sql
-- Supabase automatic backups (7 days retention)
-- For longer retention, set up automated exports
-- Test restore procedures regularly
```

### Rollback Strategy
```bash
# Git-based rollback
git revert [commit-hash]
git push origin main

# Platform-specific rollback
# Railway: Use dashboard rollback feature
# Vercel: Redeploy previous version
```

### Incident Response
1. **Identify**: Monitor alerts and logs
2. **Assess**: Determine impact and severity
3. **Respond**: Implement immediate fixes
4. **Communicate**: Update users if necessary
5. **Document**: Record incident and resolution

---

🎉 **Congratulations!** Your ResumeCraft application is now production-ready with enterprise-grade security and scalability. 