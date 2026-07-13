const axios = require('axios');
const logger = require('../utils/logger');

const queue = [];
let processing = false;

async function processQueue() {
  if (processing) return;
  processing = true;
  while (queue.length > 0) {
    const { url, embed } = queue.shift();
    try {
      await axios.post(url, { embeds: [embed] }, { timeout: 5000 });
      await new Promise(r => setTimeout(r, 1100));
    } catch { /* 忽略 rate limit */ }
  }
  processing = false;
}

function send(webhookUrl, embed) {
  if (!webhookUrl) return;
  queue.push({ url: webhookUrl, embed });
  processQueue();
}

module.exports = {
  join(guildId, member, inviteCode, inviter, webhookUrl) {
    send(webhookUrl, {
      color: 0x2ECC71, timestamp: new Date().toISOString(),
      title: '📥 成員加入',
      fields: [
        { name: '成員', value: `${member.user.tag} (<@${member.user.id}>)`, inline: true },
        { name: '帳號建立', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
        { name: '邀請碼', value: `\`${inviteCode || '無'}\``, inline: true },
        { name: '邀請者', value: inviter || '未知', inline: true },
      ],
    });
  },

  msgEdit(oldMsg, newMsg, webhookUrl) {
    send(webhookUrl, {
      color: 0xF1C40F, timestamp: new Date().toISOString(),
      title: '📝 訊息編輯',
      fields: [
        { name: '頻道', value: `<#${newMsg.channel.id}>`, inline: true },
        { name: '作者', value: newMsg.author?.tag || '?', inline: true },
        { name: '編輯前', value: `\`\`\`${(oldMsg.content || '').slice(0, 200)}\`\`\`` },
        { name: '編輯後', value: `\`\`\`${(newMsg.content || '').slice(0, 200)}\`\`\`` },
      ],
    });
  },

  msgDelete(msg, reason, webhookUrl) {
    send(webhookUrl, {
      color: 0xE74C3C, timestamp: new Date().toISOString(),
      title: '🗑️ 訊息刪除與處罰',
      fields: [
        { name: '對象', value: msg.author?.tag || '?', inline: true },
        { name: '原因', value: reason || '自動審核', inline: true },
        { name: '內容', value: `\`\`\`${(msg.content || '').slice(0, 200)}\`\`\`` },
      ],
    });
  },

  voice(member, action, channelName, webhookUrl) {
    send(webhookUrl, {
      color: 0x3498DB, timestamp: new Date().toISOString(),
      title: '🔊 語音狀態更新',
      fields: [
        { name: '成員', value: member.user?.tag || '?', inline: true },
        { name: '動作', value: action, inline: true },
        { name: '頻道', value: channelName || '?', inline: true },
      ],
    });
  },
};
