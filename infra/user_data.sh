#!/bin/bash
set -e

yum update -y
yum install -y docker git

systemctl start docker
systemctl enable docker

usermod -aG docker ec2-user

# Install Docker Compose
curl -L https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
-o /usr/local/bin/docker-compose

chmod +x /usr/local/bin/docker-compose

cd /home/ec2-user
git clone https://github.com/<your-username>/FitInLive.git || true