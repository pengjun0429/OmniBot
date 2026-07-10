const { EmbedBuilder } = require('discord.js');
const config = require('../config');
const logger = require('../utils/logger');

module.exports = {
  async execute(member) {
    if (!config.welcomeChannelId) return;

    try {
      const channel = member.guild.channels.cache.get(config.welcomeChannelId);
      if (!channel) return;

      const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle(`歡迎 ${member.user.tag}！`)
        .setDescription(`歡迎加入 ${member.guild.name}！`)
        .setThumbnail(member.user.displayAvatarURL())
        .setTimestamp();

      await channel.send({ embeds: [embed] });
    } catch (err) {
      logger.error(`歡迎訊息發送失敗:`, err.message);
    }
  },
};
