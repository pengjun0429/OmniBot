const settings = require('../services/settings');
const logger = require('../utils/logger');

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

    if (!gs.autoMod || !gs.autoMod.enabled) return;

    const { words, blockLinks, logChannelId, punishment, timeoutMinutes, logLevel } = gs.autoMod;
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

    try {
      await message.delete();
      logger.info(`自動審核：已刪除 ${message.author.tag} 的訊息（${reason}）`);

      let punished = false;

      if (punishment === 'timeout' || punishment === 'warn') {
        await message.member.timeout(timeoutMinutes * 60 * 1000, `自動審核：${reason}`).catch(err => logger.error(`自動審核 timeout 失敗:`, err.message));
        punished = true;
      } else if (punishment === 'kick') {
        await message.member.kick(`自動審核：${reason}`).catch(err => logger.error(`自動審核 kick 失敗:`, err.message));
        punished = true;
      }

      const shouldLog = logLevel === 'all' || (logLevel === 'punish_only' && punished);
      if (logChannelId && shouldLog) {
        const logChannel = message.guild.channels.cache.get(logChannelId);
        if (logChannel) {
          const punishText = punished ? `\n懲罰：${punishment === 'timeout' ? `禁言 ${timeoutMinutes} 分鐘` : punishment}` : '';
          logChannel.send(`🛡️ **${message.author.tag}** ${reason}${punishText}\n內容：\`${message.content.slice(0, 200)}\``);
        }
      }
    } catch (err) {
      logger.error(`自動審核處理失敗:`, err.message);
    }
  },
};
