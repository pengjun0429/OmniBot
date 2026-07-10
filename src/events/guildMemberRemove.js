const { EmbedBuilder } = require('discord.js');
const config = require('../config');
const logger = require('../utils/logger');

module.exports = {
  async execute(member) {
    if (!config.farewellChannelId) return;

    try {
      const channel = member.guild.channels.cache.get(config.farewellChannelId);
      if (!channel) return;

      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle(`再見 ${member.user.tag}！`)
        .setDescription(`${member.user.tag} 離開了伺服器`)
        .setThumbnail(member.user.displayAvatarURL())
        .setTimestamp();

      await channel.send({ embeds: [embed] });
    } catch (err) {
      logger.error(`告別訊息發送失敗:`, err.message);
    }
  },
};
