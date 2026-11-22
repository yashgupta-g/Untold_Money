#!/usr/bin/env bash
# One-time setup for a fresh Ubuntu server (Oracle Cloud Always Free or any VPS).
# Installs Docker and opens ports 80/443. Run on the server:
#   bash server-setup.sh
set -euo pipefail

if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "$USER"
fi

# Oracle's Ubuntu images block everything except SSH in iptables, even when
# the cloud security list allows it. Open HTTP and HTTPS and keep the rules.
if sudo iptables -L INPUT -n | grep -q "REJECT"; then
  for port in 80 443; do
    sudo iptables -C INPUT -p tcp --dport "$port" -j ACCEPT 2>/dev/null ||
      sudo iptables -I INPUT 5 -p tcp --dport "$port" -m state --state NEW -j ACCEPT
  done
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y iptables-persistent >/dev/null
  sudo netfilter-persistent save
fi

# A little swap so image builds don't run out of memory on small machines.
if ! swapon --show | grep -q swapfile; then
  sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
  sudo mkswap /swapfile >/dev/null && sudo swapon /swapfile
  echo "/swapfile none swap sw 0 0" | sudo tee -a /etc/fstab >/dev/null
fi

mkdir -p ~/untoldmoney
echo "Server ready. Log out and back in once so 'docker' works without sudo."
