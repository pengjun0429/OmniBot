const settings = require('../services/settings');
const logger = require('../utils/logger');

module.exports = {
  async execute(message) {
    if (message.author.bot) return;
    if (!message.guild) return;

    const gs = settings.getGuildSettings(message.guild.id);
    if (!gs.autoMod || !gs.autoMod.enabled) return;

    const { words, blockLinks, logChannelId } = gs.autoMod;
    const content = message.content.toLowerCase();
    let flagged = false;

    if (blockLinks && /https?:\/\/[^\s]+/.test(content)) {
      flagged = true;
    }

    if (words.some(w => content.includes(w.toLowerCase()))) {
      flagged = true;
    }

    if (flagged) {
      try {
        await message.delete();
        const log = `已刪除 ${message.author} 的訊息：\`${message.content.slice(0, 50)}\``;
        if (logChannelId) {
          const logChannel = message.guild.channels.cache.get(logChannelId);
          if (logChannel) logChannel.send(`🛡️ ${log}`);
        }
      } catch (err) {
        logger.error(`自動審核刪除訊息失敗:`, err.message);
      }
    }
  },
};
