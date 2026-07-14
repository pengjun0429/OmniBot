# OmniBot 🤖

多功能 Discord 機器人 — 管理 · 審核 · 工單 · 語音 · 身分組 · 抽獎 · 音樂

## 功能特色

| 類別 | 功能 |
|---|---|
| 🛡️ **管理** | Ban / Kick / Timeout / Clear / Warn / Forceunmute |
| 🤖 **自動審核** | 過濾詞 / 正則表達式 / 累犯制度 / 釣魚偵測 |
| 🚨 **防轟炸** | 大量加入偵測 / 重複訊息偵測 |
| 👑 **權限管理** | 可愛/可惡管管們分權 / 後臺 Discord 登入 |
| 🎫 **工單系統** | 開單面板 / 私人頻道 / HTML 對話備份 |
| 🔊 **語音包房** | 自動創建 / 主人管理 / 自訂參數 |
| 🎭 **身分組** | 自助領取 / 公開派發 / 互斥群組 |
| 🎵 **音樂播放** | 播放 / 佇列 / 暫停 / 循環 / 音量 |
| 🎁 **抽獎系統** | 按鈕參加 / 自動開獎 |
| 💬 **自訂指令** | /tag + @Bot 觸發 |
| 📢 **通知** | 歡迎告別 / 公告 Embed / 手機推播 |
| 🔗 **連結管理** | 白名單 / 自動刪除 |
| 📝 **訊息紀錄** | 編輯刪除記錄 / Google Sheets 備份 |
| 📋 **申訴系統** | Discord 登入驗證 / 網頁表單 |
| 🌐 **後臺面板** | 伺服器設定 / 即時預覽 / Google Sheets 同步 |

## 快速開始

### 邀請機器人
[📥 點此邀請](https://discord.com/oauth2/authorize?client_id=1524767770871595191&permissions=8&scope=bot%20applications.commands)

### 環境需求
- Node.js 22+
- npm

### 安裝
```bash
git clone https://github.com/pengjun0429/OmniBot.git
cd OmniBot
npm install
```

### 環境變數
複製 `.env.example` 為 `.env`，填入必要設定：

| 變數 | 說明 | 必要 |
|---|---|---|
| `DISCORD_TOKEN` | Bot Token | ✅ |
| `DISCORD_CLIENT_ID` | 應用程式 ID | ✅ |
| `DISCORD_CLIENT_SECRET` | OAuth2 Secret | ✅ |
| `DISCORD_REDIRECT_URI` | OAuth2 回調網址 | ✅ |
| `DISCORD_GUILD_ID` | 測試伺服器 ID（指令即時生效） | |
| `GOOGLE_DB_URL` | Google Sheets 資料庫網址 | |
| `CWA_API_KEY` | 氣象局 API Key（/earthquake） | |

### 啟動
```bash
node replit-entry.js
```

## 完整指令列表
詳見 [COMMANDS.md](COMMANDS.md)

## 技術棧
- **Runtime:** Node.js
- **Framework:** Discord.js v14
- **資料庫:** JSON / Google Sheets
- **語音:** @discordjs/voice
- **部署:** Render

## 授權
MIT
