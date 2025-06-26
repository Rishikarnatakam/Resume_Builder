# 🤖 AI-Powered LaTeX Resume Builder

A modern, full-stack web application that combines the power of AI with professional LaTeX resume generation. Features a Cursor-style AI chat interface for natural language resume editing.

## ✨ Features

- **AI-Powered Editing**: Natural language resume modifications using Google Gemini AI
- **Live LaTeX Preview**: Real-time PDF generation and preview
- **Modern UI**: Beautiful, responsive interface built with React and Tailwind CSS
- **Multiple Templates**: Professional resume templates (AltaCV, Professional)
- **Diff Viewer**: Visual changes preview before applying modifications
- **Session Management**: Persistent AI chat sessions with context caching
- **PDF Generation**: High-quality LaTeX-compiled PDFs
- **User Authentication**: Secure login and user management
- **File Upload**: CV parsing and data extraction

## 🏗️ Architecture

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: FastAPI + SQLAlchemy + SQLite
- **AI Engine**: Google Gemini 2.5 Flash with context caching
- **PDF Generation**: LaTeX (TexLive)
- **Deployment**: Native Ubuntu deployment with PM2 + Nginx

## 🚀 Quick Start (Ubuntu Server)

### Prerequisites

- Ubuntu 20.04+ server
- Domain name (optional, for SSL)
- Google Gemini API key

### Automated Deployment

1. **Clone the repository**:
```bash
git clone https://github.com/yourusername/resume-builder.git
cd resume-builder
```

2. **Set up environment**:
```bash
cp env.example .env
nano .env  # Edit with your configuration
```

3. **Run deployment script**:
```bash
chmod +x deploy.sh
./deploy.sh
```

The script will:
- Install system dependencies (Python, Node.js, Nginx, Redis)
- Set up LaTeX environment
- Create Python virtual environment
- Build React frontend
- Configure PM2 for process management
- Set up Nginx reverse proxy
- Optionally configure SSL with Let's Encrypt
- Configure firewall

## 🔧 Configuration

### Environment Variables

Copy `env.example` to `.env` and configure:

```bash
# Required
GEMINI_API_KEY=your_gemini_api_key_here
SECRET_KEY=your-secure-secret-key

# Optional
DEFAULT_GEMINI_MODEL=gemini-2.5-flash
DATABASE_URL=sqlite+aiosqlite:///./data/latex_resume_ai.db
```

### Get Gemini API Key

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key
3. Add it to your `.env` file

## 🌐 Access Points

After deployment:

- **Frontend**: http://your-domain.com
- **API Documentation**: http://your-domain.com/api/docs
- **Health Check**: http://your-domain.com/health

## 📱 Usage

1. **Register/Login**: Create an account or log in
2. **Create Resume**: Choose a template and enter your information
3. **AI Editing**: Use natural language to modify your resume:
   - "Make my name bigger and bold"
   - "Add a skills section with Python, React, Node.js"
   - "Change the experience section formatting"
4. **Preview Changes**: Review AI modifications in the diff viewer
5. **Download**: Get your professional PDF resume

## 🛠️ Development

### Local Development Setup

**Backend**:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

**Frontend**:
```bash
cd frontend
npm install
npm run dev
```

### Project Structure

```
resume-builder/
├── backend/              # FastAPI backend
│   ├── routes/          # API endpoints
│   ├── services/        # Business logic
│   ├── templates/       # LaTeX templates
│   └── utils/           # Utilities
├── frontend/            # React frontend
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── pages/       # Page components
│   │   └── context/     # React context
├── nginx/               # Nginx configuration
├── docker-compose.yml   # Container orchestration
└── deploy.sh           # Deployment script
```

## ⚙️ System Services

- **PM2**: Process manager for the FastAPI backend
- **Nginx**: Web server and reverse proxy
- **Redis**: Session storage and caching
- **SQLite**: Lightweight database
- **Python venv**: Isolated Python environment

## 🔒 Security Features

- JWT-based authentication
- Rate limiting
- CORS protection
- Security headers
- Input validation
- SSL/TLS support

## 📊 Monitoring

View application logs:
```bash
# Backend logs
pm2 logs resume-builder-backend

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Check all service status
./scripts/health-check.sh
```

## 🔄 Updates

To update the application:
```bash
./scripts/update.sh
```

## 🐛 Troubleshooting

### Common Issues

1. **API Key Error**: Ensure `GEMINI_API_KEY` is set in `.env`
2. **Permission Denied**: Check file permissions for static directories
3. **Port Conflicts**: Ensure ports 80, 443, 8000 are available
4. **Build Failures**: Check Docker logs and ensure sufficient disk space

### Health Checks

```bash
# Check comprehensive health
./scripts/health-check.sh

# Check PM2 status
pm2 status

# Test health endpoint
curl http://localhost/health

# Check API
curl http://localhost/api/health
```

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Check the troubleshooting section
- Review application logs

## 🎯 Roadmap

- [ ] Multiple language support
- [ ] More LaTeX templates
- [ ] Advanced AI features
- [ ] Collaborative editing
- [ ] Template marketplace
- [ ] Mobile application

---

Built with ❤️ using React, FastAPI, and Google Gemini AI 