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

      if (!settings?.farewell?.enabled) return;

      const channel = member.guild.channels.cache.get(settings.farewell.channelId);
      if (!channel) return;

      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle(`再見 ${member.user.tag}！`)
        .setDescription(settings.farewell.message || `${member.user.tag} 離開了伺服器`)
        .setThumbnail(member.user.displayAvatarURL())
        .setTimestamp();

      await channel.send({ embeds: [embed] });
    } catch (err) {
      logger.error(`告別訊息發送失敗（${member.guild.id}）:`, err.message);
    }
  },
};
