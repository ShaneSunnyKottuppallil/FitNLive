#!/bin/bash
set -e

# Update system
apt-get update -y

# Install Docker + Git
apt-get install -y docker.io git

# Start Docker
systemctl start docker
systemctl enable docker

# Allow ubuntu user to use Docker
usermod -aG docker ubuntu

# Install Docker Compose
curl -L https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
  -o /usr/local/bin/docker-compose

chmod +x /usr/local/bin/docker-compose

# Create app directory
mkdir -p /home/ubuntu/FitNLive

# Set ownership
chown -R ubuntu:ubuntu /home/ubuntu/FitNLive

echo "✅ EC2 setup complete"
