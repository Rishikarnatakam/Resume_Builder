# ⚡ Quick Start Guide

Get your AI-Powered LaTeX Resume Builder running on Ubuntu server in under 5 minutes!

## 🚀 One-Command Deployment

```bash
# Clone and deploy in one go
git clone https://github.com/yourusername/resume-builder.git && \
cd resume-builder && \
cp env.example .env && \
chmod +x deploy.sh && \
./deploy.sh
```

## 📝 Before You Start

**You'll need:**
1. Ubuntu 20.04+ server with sudo access
2. Google Gemini API key ([Get it here](https://aistudio.google.com/app/apikey))

## 🎯 Step-by-Step

### 1. Get the Code
```bash
git clone https://github.com/yourusername/resume-builder.git
cd resume-builder
```

### 2. Configure Environment
```bash
cp env.example .env
nano .env  # Add your GEMINI_API_KEY
```

**Required settings in `.env`:**
```
GEMINI_API_KEY=your_actual_api_key_here
```

### 3. Deploy
```bash
chmod +x deploy.sh
./deploy.sh
```

The script will:
- ✅ Install system dependencies (Python, Node.js, Nginx, etc.)
- ✅ Set up Python virtual environment & LaTeX
- ✅ Build React frontend
- ✅ Configure PM2 process manager
- ✅ Set up nginx reverse proxy
- ✅ Configure firewall (optional)
- ✅ Set up SSL with Let's Encrypt (optional)

### 4. Access Your App
- **Frontend**: http://your-server-ip
- **API Docs**: http://your-server-ip/api/docs

## 🛠️ Management Commands

```bash
# Check health
./scripts/health-check.sh

# View backend logs
pm2 logs resume-builder-backend

# Update application
./scripts/update.sh

# Backup data
./scripts/backup.sh

# Restart backend
pm2 restart resume-builder-backend

# Restart nginx
sudo systemctl restart nginx
```

## 🔒 Security Setup (Optional)

### SSL Certificate
The deployment script can set up Let's Encrypt automatically:
1. Point your domain to the server
2. Run the deployment script
3. Choose "yes" when prompted for SSL setup

### Firewall
```bash
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

## 🐛 Troubleshooting

### Common Issues

**Service won't start?**
```bash
pm2 logs resume-builder-backend
pm2 status
```

**Frontend not loading?**
```bash
curl http://localhost/health
sudo systemctl restart nginx
```

**API key issues?**
```bash
# Check environment variables
cat /opt/resume-builder/.env | grep GEMINI
```

### Get Help
- Run `./scripts/health-check.sh` for comprehensive diagnostics
- View backend logs: `pm2 logs resume-builder-backend`
- Check nginx logs: `sudo journalctl -u nginx`

## 🎉 You're Done!

Your AI resume builder is now running! Users can:
1. Register and create accounts
2. Upload existing PDFs to extract data
3. Use AI chat to modify resumes naturally
4. Download professional LaTeX-compiled PDFs

---

**Next Steps:**
- Set up regular backups: `crontab -e` → `0 2 * * * /path/to/resume-builder/scripts/backup.sh`
- Configure monitoring
- Set up domain and SSL
- Customize templates in `backend/templates/` 