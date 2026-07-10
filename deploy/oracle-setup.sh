#!/bin/bash
# Oracle Cloud ARM 實例初始化腳本
# 在 SSH 連線後執行

set -e

echo "=== 更新系統 ==="
sudo apt update && sudo apt upgrade -y

echo "=== 安裝 Node.js 22 ==="
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs git

echo "=== 驗證版本 ==="
node --version
npm --version

echo "=== 安裝 PM2 ==="
sudo npm install -g pm2

echo "=== 設定防火牆（管理員後臺用） ==="
sudo ufw allow 22/tcp
sudo ufw allow 3000/tcp
sudo ufw --force enable

echo "=== 克隆專案 ==="
cd /opt
sudo git clone https://github.com/pengjun0429/OmniBot.git
sudo chown -R $USER:$USER OmniBot
cd OmniBot

echo "=== 安裝專案依賴 ==="
npm install --production

echo ""
echo "=== 完成！接下來請手動操作 ==="
echo "1. 放入 service-account.json："
echo "   nano service-account.json"
echo ""
echo "2. 設定環境變數："
echo "   nano .env"
echo "   （填入 DISCORD_TOKEN、DISCORD_CLIENT_ID 等）"
echo ""
echo "3. 啟動 Bot："
echo "   pm2 start ecosystem.config.js"
echo "   pm2 save"
echo "   sudo env PATH=\$PATH:/usr/bin pm2 startup systemd -u \$USER --hp \$HOME"
echo ""
echo "4. 查看狀態："
echo "   pm2 status"
echo "   pm2 logs omnibot"
