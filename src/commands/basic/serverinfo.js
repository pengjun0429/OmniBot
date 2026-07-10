const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('查看伺服器資訊'),
  async execute(interaction) {
    const { guild } = interaction;
    const owner = await guild.fetchOwner();

    const embed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle(guild.name)
      .setThumbnail(guild.iconURL({ size: 256 }))
      .addFields(
        { name: 'ID', value: guild.id, inline: true },
        { name: '擁有者', value: owner.user.tag, inline: true },
        { name: '成員數', value: `${guild.memberCount}`, inline: true },
        { name: '頻道數', value: `${guild.channels.cache.size}`, inline: true },
        { name: '角色數', value: `${guild.roles.cache.size}`, inline: true },
        { name: '建立時間', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
