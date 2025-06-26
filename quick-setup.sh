#!/bin/bash

echo "🔧 Quick Setup for Resume Builder..."

# Update system
sudo apt update && sudo apt upgrade -y

# Install everything needed
sudo apt install python3.11 python3.11-venv python3.11-pip nginx curl -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install nodejs -y

# Create project directory
sudo mkdir -p /var/www/resume-builder

echo "✅ System setup complete!"
echo "Now copy your project files to /var/www/resume-builder"
echo "Then run: ./project-setup.sh" 