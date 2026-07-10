const { EmbedBuilder } = require('discord.js');
const { getDb, isReady } = require('../services/firebase');
const logger = require('../utils/logger');

module.exports = {
  async execute(member) {
    if (!isReady()) return;

    try {
      const db = getDb();
      if (!db) return;

      const doc = await db.collection('guilds').doc(member.guild.id).get();
      const settings = doc.data();

      if (!settings?.welcome?.enabled) return;

      const channel = member.guild.channels.cache.get(settings.welcome.channelId);
      if (!channel) return;

      const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle(`歡迎 ${member.user.tag}！`)
        .setDescription(settings.welcome.message || `歡迎加入 ${member.guild.name}！`)
        .setThumbnail(member.user.displayAvatarURL())
        .setTimestamp();

      await channel.send({ embeds: [embed] });
    } catch (err) {
      logger.error(`歡迎訊息發送失敗（${member.guild.id}）:`, err.message);
    }
  },
};
