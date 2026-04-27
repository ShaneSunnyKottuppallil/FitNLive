#!/bin/bash
set -e

# Update system
yum update -y

# Install Docker + Git
yum install -y docker git

# Start Docker
systemctl start docker
systemctl enable docker

# Allow ec2-user to use Docker
usermod -aG docker ec2-user

# Install Docker Compose (v1 standalone)
curl -L https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
-o /usr/local/bin/docker-compose

chmod +x /usr/local/bin/docker-compose

# Fix permissions immediately (no logout needed)
newgrp docker <<EONG
docker version
EONG

# Create app directory (CI/CD will use this)
mkdir -p /home/ec2-user/FitInLive

# Set ownership
chown -R ec2-user:ec2-user /home/ec2-user/FitInLive
echo "✅ EC2 setup complete"
