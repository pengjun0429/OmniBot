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
      logger.info(`[GSheet] 準備記錄 ${message.author.tag} 的訊息到 ${GOOGLE_DB_URL()}`);
      const now = new Date();
      const twTime = now.toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false });
      const entry = {
        time: twTime,
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
        .catch(err => logger.error(`[GSheet] 記錄失敗:`, err.message));
    } else {
      if (!gs.messageLogAll?.enabled) logger.info('[GSheet] 未啟用');
      if (!GOOGLE_DB_URL()) logger.info('[GSheet] 未設定 GOOGLE_DB_URL');
    }

    if (gs.inviteGuard?.enabled) {
      const inviteRegex = /(?:discord\.(?:gg|io|me|plus|com\/invite)\/)([a-zA-Z0-9_-]+)/gi;
      let match;
      while ((match = inviteRegex.exec(message.content)) !== null) {
        const code = match[1];
        if (!gs.inviteGuard.whitelist?.includes(code)) {
          try {
            await message.delete();
            const warn = await message.channel.send(`${message.author} 不允許張貼邀請連結`).catch(() => {});
            setTimeout(() => warn?.delete().catch(() => {}), 3000);
            if (gs.inviteGuard.logChannelId) {
              const logCh = message.guild.channels.cache.get(gs.inviteGuard.logChannelId);
              if (logCh) logCh.send(`🚫 ${message.author} 張貼了非白名單邀請：\`${code}\``);
            }
          } catch {}
          break;
        }
      }
    }

    if (gs.antiRaid?.enabled) {
      const raidTracker = require('../services/raid-tracker');
      raidTracker.trackMessage(message.guild.id, message.author.id);
      const window = (gs.antiRaid.spamWindow || 5) * 1000;
      const threshold = gs.antiRaid.spamThreshold || 5;
      const recent = raidTracker.getSpamCount(message.guild.id, message.author.id, window);
      if (recent >= threshold) {
        try {
          const channel = message.channel;
          const fetched = await channel.messages.fetch({ limit: 50 }).catch(() => null);
          if (fetched) {
            const userMsgs = fetched.filter(m => m.author.id === message.author.id && m.deletable);
            await channel.bulkDelete(userMsgs).catch(() => {});
          }
          await message.member.timeout((gs.antiRaid.spamTimeout || 1) * 60 * 1000, '防轟炸：短時間大量訊息').catch(() => {});
          const logCh = gs.antiRaid.logChannelId ? message.guild.channels.cache.get(gs.antiRaid.logChannelId) : null;
          if (logCh) logCh.send(`🚨 **防轟炸** ${message.author} 短時間發送大量訊息，已禁言 ${gs.antiRaid.spamTimeout || 1} 分鐘`);
        } catch {}
      }
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
      let effectiveDuration = timeoutMinutes || 10;

      if (strikes) {
        const sorted = Object.entries(strikes).sort((a, b) => Number(b[0]) - Number(a[0]));
        for (const [threshold, config] of sorted) {
          if (strikeCount >= Number(threshold)) {
            if (typeof config === 'object') {
              effectivePunishment = config.action || 'timeout';
              effectiveDuration = config.duration || timeoutMinutes || 10;
            } else {
              effectivePunishment = config;
            }
            break;
          }
        }
      }

      let punished = false;

      if (effectivePunishment === 'timeout' || effectivePunishment === 'warn') {
        await message.member.timeout(effectiveDuration * 60 * 1000, `自動審核(${strikeCount}次)：${reason}`).catch(err => logger.error(`自動審核 timeout 失敗:`, err.message));
        punished = true;
      } else if (effectivePunishment === 'kick') {
        await message.member.kick(`自動審核(${strikeCount}次)：${reason}`).catch(err => logger.error(`自動審核 kick 失敗:`, err.message));
        punished = true;
      }

      const shouldLog = logLevel === 'all' || (logLevel === 'punish_only' && punished);
      if (logChannelId && shouldLog) {
        const logChannel = message.guild.channels.cache.get(logChannelId);
        if (logChannel) {
          const punishText = punished ? `\n懲罰(${strikeCount}犯)：${effectivePunishment === 'timeout' ? `禁言 ${effectiveDuration} 分鐘` : effectivePunishment}` : '';
          logChannel.send(`🛡️ ${message.author} ${reason}\n內容：${censored.slice(0, 200)}${punishText}`);
        }
      }
    } catch (err) {
      logger.error(`自動審核處理失敗:`, err.message);
    }
  },
};
