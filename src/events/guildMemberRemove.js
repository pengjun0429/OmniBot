const { EmbedBuilder } = require('discord.js');
const settings = require('../services/settings');
const config = require('../config');
const logger = require('../utils/logger');

module.exports = {
  async execute(member) {
    const gs = settings.getGuildSettings(member.guild.id);
    const channelId = gs?.farewell?.channelId || '';

    if (!channelId) return;

    try {
      const channel = member.guild.channels.cache.get(channelId);
      if (!channel) return;

      const msg = (gs?.farewell?.message || `{user} 離開了 {server}`)
        .replace(/{mention}/g, `<@${member.id}>`)
        .replace(/{user}/g, member.user.tag)
        .replace(/{server}/g, member.guild.name);

      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle(`再見 ${member.user.tag}！`)
        .setDescription(msg)
        .setThumbnail(member.user.displayAvatarURL())
        .setTimestamp();

      await channel.send({ embeds: [embed] });
    } catch (err) {
      logger.error(`告別訊息發送失敗:`, err.message);
    }
  },
};
