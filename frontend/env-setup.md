# Frontend Environment Configuration

## Setting up Environment Variables

Create these environment files in your `frontend/` directory:

### 1. Development Environment (.env)
```bash
# Create frontend/.env
# API Configuration
VITE_API_BASE_URL=http://localhost:8000/api
VITE_API_HOST=http://localhost:8000

# Environment
VITE_NODE_ENV=development
```

### 2. Production Environment (.env.production)
```bash
# Create frontend/.env.production  
# API Configuration for Production
VITE_API_BASE_URL=/api
VITE_API_HOST=

# Environment
VITE_NODE_ENV=production
```

### 3. For your static domain setup (.env.static)
```bash
# Create frontend/.env.static (when using your static domain)
# API Configuration for Static Domain
VITE_API_BASE_URL=https://herring-meet-seasnail.ngrok-free.app/api
VITE_API_HOST=https://herring-meet-seasnail.ngrok-free.app

# Environment
VITE_NODE_ENV=production
```

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

# Environment
VITE_NODE_ENV=development
EOF

# Create production environment file
cat > .env.production << 'EOF'
# API Configuration for Production
VITE_API_BASE_URL=/api
VITE_API_HOST=

# Environment
VITE_NODE_ENV=production
EOF

# Create static domain environment file
cat > .env.static << 'EOF'
# API Configuration for Static Domain
VITE_API_BASE_URL=https://herring-meet-seasnail.ngrok-free.app/api
VITE_API_HOST=https://herring-meet-seasnail.ngrok-free.app

# Environment
VITE_NODE_ENV=production
EOF

echo "✅ Environment files created successfully!"
```

## Usage

- **Local development**: Use `.env` (automatically loaded by Vite)
- **Production build with nginx**: Use `.env.production`
- **Static domain**: Copy `.env.static` to `.env` when building for your static domain

## Build commands

```bash
# For local development
npm run dev

# For production build (uses .env.production automatically)
npm run build

# For static domain build
cp .env.static .env
npm run build
``` 