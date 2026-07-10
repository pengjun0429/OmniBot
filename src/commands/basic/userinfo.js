const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('查看使用者資訊')
    .addUserOption(option =>
      option.setName('使用者')
        .setDescription('要查看的使用者（預設為自己）')
        .setRequired(false)),
  async execute(interaction) {
    const target = interaction.options.getUser('使用者') || interaction.user;
    const member = await interaction.guild.members.fetch(target.id);

    const embed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle(target.tag)
      .setThumbnail(target.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: 'ID', value: target.id, inline: true },
        { name: '暱稱', value: member.nickname || '無', inline: true },
        { name: '帳號建立時間', value: `<t:${Math.floor(target.createdTimestamp / 1000)}:R>`, inline: true },
        { name: '加入伺服器時間', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
        { name: '機器人', value: target.bot ? '是' : '否', inline: true },
      )
      .setFooter({ text: `請求者: ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
