const { EmbedBuilder } = require('discord.js');
const settings = require('../services/settings');
const config = require('../config');
const logger = require('../utils/logger');

module.exports = {
  async execute(member) {
    const gs = settings.getGuildSettings(member.guild.id);
    const channelId = gs?.welcome?.channelId || config.welcomeChannelId;

    if (!channelId) return;

    try {
      const channel = member.guild.channels.cache.get(channelId);
      if (!channel) return;

      const msg = (gs?.welcome?.message || `歡迎加入 {server}！`)
        .replace(/{user}/g, member.user.tag)
        .replace(/{server}/g, member.guild.name);

      const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle(`歡迎 ${member.user.tag}！`)
        .setDescription(msg)
        .setThumbnail(member.user.displayAvatarURL())
        .setTimestamp();

      await channel.send({ embeds: [embed] });
    } catch (err) {
      logger.error(`歡迎訊息發送失敗:`, err.message);
    }
  },
};
