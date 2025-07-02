# Frontend Environment Configuration

## Setting up Environment Variables for Supabase Integration

Create these environment files in your `frontend/` directory to configure API endpoints and Supabase integration:

### 1. Development Environment (.env)
```bash
# Create frontend/.env
# API Configuration
VITE_API_BASE_URL=http://localhost:8000/api
VITE_API_HOST=http://localhost:8000

# Supabase Configuration
VITE_SUPABASE_URL=https://[YOUR_PROJECT_REF].supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Environment
VITE_NODE_ENV=development
```

### 2. Production Environment (.env.production)
```bash
# Create frontend/.env.production  
# API Configuration for Production
VITE_API_BASE_URL=/api
VITE_API_HOST=

# Supabase Configuration
VITE_SUPABASE_URL=https://[YOUR_PROJECT_REF].supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Environment
VITE_NODE_ENV=production
```

### 3. For your custom domain setup (.env.custom)
```bash
# Create frontend/.env.custom (when using your custom domain)
# API Configuration for Custom Domain
VITE_API_BASE_URL=https://your-domain.com/api
VITE_API_HOST=https://your-domain.com

# Supabase Configuration
VITE_SUPABASE_URL=https://[YOUR_PROJECT_REF].supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Environment
VITE_NODE_ENV=production
```

## 🔑 Getting Your Supabase Credentials

1. **Go to your Supabase Dashboard**: https://app.supabase.com
2. **Select your project**
3. **Go to Settings > API**
4. **Copy the following:**
   - **Project URL** → Use as `VITE_SUPABASE_URL`
   - **Project API keys > anon public** → Use as `VITE_SUPABASE_ANON_KEY`

## Commands to create these files:

Copy and run these commands in your terminal:

```bash
# Navigate to frontend directory
cd frontend

# Create development environment file
cat > .env << 'EOF'
# API Configuration
VITE_API_BASE_URL=http://localhost:8000/api
VITE_API_HOST=http://localhost:8000

# Supabase Configuration (REPLACE WITH YOUR VALUES)
VITE_SUPABASE_URL=https://[YOUR_PROJECT_REF].supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Environment
VITE_NODE_ENV=development
EOF

# Create production environment file
cat > .env.production << 'EOF'
# API Configuration for Production
VITE_API_BASE_URL=/api
VITE_API_HOST=

# Supabase Configuration (REPLACE WITH YOUR VALUES)
VITE_SUPABASE_URL=https://[YOUR_PROJECT_REF].supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Environment
VITE_NODE_ENV=production
EOF

# Create custom domain environment file
cat > .env.custom << 'EOF'
# API Configuration for Custom Domain
VITE_API_BASE_URL=https://your-domain.com/api
VITE_API_HOST=https://your-domain.com

# Supabase Configuration (REPLACE WITH YOUR VALUES)
VITE_SUPABASE_URL=https://[YOUR_PROJECT_REF].supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Environment
VITE_NODE_ENV=production
EOF

echo "✅ Environment files created successfully!"
echo ""
echo "⚠️  IMPORTANT: Replace placeholder values with your actual Supabase credentials:"
echo "   1. Go to https://app.supabase.com"
echo "   2. Select your project"
echo "   3. Go to Settings > API"
echo "   4. Copy Project URL and anon public key"
echo "   5. Replace placeholders in your .env files"
```

## 🔐 Environment Variables Explained

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | Backend API base URL | `http://localhost:8000/api` |
| `VITE_API_HOST` | Backend host for direct requests | `http://localhost:8000` |
| `VITE_SUPABASE_URL` | Your Supabase project URL | `https://abc123.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous/public key | `eyJhbGci...` |
| `VITE_NODE_ENV` | Environment mode | `development` or `production` |

## Usage

- **Local development**: Use `.env` (automatically loaded by Vite)
- **Production build with nginx**: Use `.env.production`
- **Custom domain**: Copy `.env.custom` to `.env` when building for your domain

## Build commands

```bash
# For local development
npm run dev

# For production build (uses .env.production automatically)
npm run build

# For custom domain build
cp .env.custom .env
npm run build

# Preview production build locally
npm run preview
```

## 🔒 Security Notes

- ✅ **VITE_SUPABASE_ANON_KEY** is safe to expose (it's designed to be public)
- ✅ **Row Level Security** protects your data at the database level
- ❌ **Never put SERVICE_KEY** in frontend environment variables
- ✅ **All secrets** are handled by the backend

## 🚀 Ready for Production

Your frontend configuration supports:
- **Enterprise-grade security** with Supabase
- **Automatic SSL/TLS** encryption
- **Global CDN** deployment
- **Real-time capabilities** (when enabled)

## Troubleshooting

### Common Issues:
1. **CORS errors**: Check your Supabase project settings
2. **Auth not working**: Verify your anon key is correct
3. **API calls failing**: Check VITE_API_BASE_URL format

### Debug Commands:
```bash
# Check environment variables are loaded
npm run dev
# Open browser console and type: import.meta.env

# Test API connection
curl http://localhost:8000/api/health

# Validate frontend build
npm run build && npm run preview
``` 