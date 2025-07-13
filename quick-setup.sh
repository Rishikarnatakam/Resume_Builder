#!/bin/bash
# 🚀 ResumeCraft - Prerequisite Installer for Ubuntu 22.04+
# This script installs all necessary system dependencies.
set -e

echo "🚀 Installing prerequisites for ResumeCraft..."

# --- Update System ---
sudo apt-get update && sudo apt-get upgrade -y

# --- Install Core Dependencies ---
echo "📦 Installing Python 3.11, Nginx, Git, and build tools..."
sudo apt-get install -y \
    python3.11 \
    python3.11-venv \
    python3.11-dev \
    nginx \
    git \
    curl \
    wget \
    build-essential \
    libpq-dev

# --- Install Node.js 18+ ---
if ! command -v node > /dev/null || [[ $(node -v | cut -d'.' -f1) != "v18" ]]; then
    echo "📦 Installing Node.js v18..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo "✅ Node.js v18 is already installed."
fi

# --- Install Ngrok ---
if ! command -v ngrok > /dev/null; then
    echo "📦 Installing ngrok..."
    wget -q https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz
    tar xvzf ngrok-v3-stable-linux-amd64.tgz
    sudo mv ngrok /usr/local/bin/
    rm ngrok-v3-stable-linux-amd64.tgz
else
    echo "✅ ngrok is already installed."
fi

# --- Final Instructions ---
echo "✅ System prerequisites are now installed."
echo "➡️  Next steps:"
echo "   1. Clone the repository: git clone https://github.com/your-username/resumecraft.git"
echo "   2. Navigate to the project directory: cd resumecraft"
echo "   3. Run the application setup script: ./project-setup.sh" 