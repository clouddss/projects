#!/bin/bash

echo "Setting up Ubuntu server for headless Chrome automation..."

# Update package list
sudo apt-get update

# Install dependencies for Chrome
sudo apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    xdg-utils

# Install Chrome (optional, puppeteer will download its own Chromium)
# wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
# sudo sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list'
# sudo apt-get update
# sudo apt-get install -y google-chrome-stable

# Install Node.js dependencies
echo "Installing Node.js dependencies..."
npm install puppeteer-extra puppeteer-extra-plugin-stealth puppeteer-extra-plugin-recaptcha

# Create screenshots directory
mkdir -p screenshots

echo "Setup complete!"
echo ""
echo "To use the server version with 2captcha:"
echo "1. Sign up for a 2captcha account at https://2captcha.com"
echo "2. Get your API key from the dashboard"
echo "3. Run the script with: CAPTCHA_API_KEY='your-key-here' node lib/make-transaction-server.js"
echo ""
echo "Alternative: Use Xvfb for virtual display"
echo "sudo apt-get install -y xvfb"
echo "xvfb-run -a node lib/make-transaction-server.js"