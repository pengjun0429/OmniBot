const settings = require('../services/settings');
const logger = require('../utils/logger');
const axios = require('axios');

const GOOGLE_DB_URL = () => process.env.GOOGLE_DB_URL;

module.exports = {
  async execute(message) {
    if (message.author.bot) return;
    if (!message.guild) return;

    const gs = settings.getGuildSettings(message.guild.id);

    const mention = `<@${message.client.user.id}>`;
    const mentionNick = `<@!${message.client.user.id}>`;
    if (message.content.startsWith(mention) || message.content.startsWith(mentionNick)) {
      const prefix = message.content.startsWith(mention) ? mention : mentionNick;
      const args = message.content.slice(prefix.length).trim().split(/\s+/);
      const cmdName = args[0]?.toLowerCase();
      if (cmdName && gs.customCommands?.[cmdName]) {
        return message.channel.send(gs.customCommands[cmdName]);
      }
    }

    if (gs.messageLogAll?.enabled && GOOGLE_DB_URL()) {
      const entry = {
        time: new Date().toISOString(),
        guildId: message.guild.id,
        channelId: message.channel.id,
        channelName: message.channel.name,
        authorId: message.author.id,
        authorTag: message.author.tag,
        content: message.content?.slice(0, 1000) || '',
        url: message.url,
      };
      axios.post(GOOGLE_DB_URL(), { action: 'log', logEntry: entry }, { timeout: 5000 })
        .then(() => logger.info(`[GSheet] ${message.author.tag} 的訊息已記錄`))
        .catch(() => {});
    }

    if (!gs.autoMod || !gs.autoMod.enabled) return;

    const { words, blockLinks, logChannelId, punishment, timeoutMinutes, logLevel, strikes, strikeResetHours } = gs.autoMod;
    const content = message.content.toLowerCase();
    let flagged = false;
    let reason = '';

    if (blockLinks && /https?:\/\/[^\s]+/.test(content)) {
      flagged = true;
      reason = '發送了連結';
    }

    if (!flagged && words.length > 0) {
      const found = words.find(w => content.includes(w.toLowerCase()));
      if (found) {
        flagged = true;
        reason = `使用了過濾詞：${found}`;
      }
    }

    if (!flagged) return;

    const censored = words.reduce((c, w) => c.replace(new RegExp(w, 'gi'), '****'), message.content);

    try {
      await message.delete();
      logger.info(`自動審核：已刪除 ${message.author.tag} 的訊息（${reason}）`);

      if (!gs.autoMod.userStrikes) gs.autoMod.userStrikes = {};
      const uid = message.author.id;
      const now = Date.now();
      const userStrike = gs.autoMod.userStrikes[uid];

      if (!userStrike || (now - userStrike.time) > (strikeResetHours || 24) * 3600000) {
        gs.autoMod.userStrikes[uid] = { count: 1, time: now };
      } else {
        gs.autoMod.userStrikes[uid].count++;
        gs.autoMod.userStrikes[uid].time = now;
      }

      settings.updateGuildSettings(message.guild.id, gs);

      const strikeCount = gs.autoMod.userStrikes[uid].count;
      let effectivePunishment = punishment;

      if (strikes) {
        const sorted = Object.entries(strikes).sort((a, b) => Number(b[0]) - Number(a[0]));
        for (const [threshold, action] of sorted) {
          if (strikeCount >= Number(threshold)) {
            effectivePunishment = action;
            break;
          }
        }
      }

      let punished = false;

      if (effectivePunishment === 'timeout' || effectivePunishment === 'warn') {
        await message.member.timeout((timeoutMinutes || 10) * 60 * 1000, `自動審核(${strikeCount}次)：${reason}`).catch(err => logger.error(`自動審核 timeout 失敗:`, err.message));
        punished = true;
      } else if (effectivePunishment === 'kick') {
        await message.member.kick(`自動審核(${strikeCount}次)：${reason}`).catch(err => logger.error(`自動審核 kick 失敗:`, err.message));
        punished = true;
      }

      const shouldLog = logLevel === 'all' || (logLevel === 'punish_only' && punished);
      if (logChannelId && shouldLog) {
        const logChannel = message.guild.channels.cache.get(logChannelId);
        if (logChannel) {
          const punishText = punished ? `\n懲罰(${strikeCount}犯)：${effectivePunishment === 'timeout' ? `禁言 ${timeoutMinutes} 分鐘` : effectivePunishment}` : '';
          logChannel.send(`🛡️ ${message.author} ${reason}\n內容：${censored.slice(0, 200)}${punishText}`);
        }
      }
    } catch (err) {
      logger.error(`自動審核處理失敗:`, err.message);
    }
  },
};
