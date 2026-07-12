const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  category: '管理',
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('踢出成員')
    .addUserOption(option =>
      option.setName('成員').setDescription('要踢出的成員').setRequired(true))
    .addStringOption(option =>
      option.setName('原因').setDescription('踢出原因').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  async execute(interaction) {
    const target = interaction.options.getMember('成員');
    const reason = interaction.options.getString('原因') || '未提供原因';

    if (!target) {
      return interaction.reply({ content: '找不到該成員', ephemeral: true });
    }

    if (!target.kickable) {
      return interaction.reply({ content: '無法踢出該成員（權限不足）', ephemeral: true });
    }

    try {
      await target.send(`你已被伺服器 **${interaction.guild.name}** 踢出\n原因: ${reason}\n\n📋 申訴：https://omnibot-yzti.onrender.com/appeal`);
    } catch {}

    await target.kick(reason);

    const embed = new EmbedBuilder()
      .setColor(0xffa500)
      .setTitle('成員已踢出')
      .addFields(
        { name: '成員', value: target.user.tag, inline: true },
        { name: '原因', value: reason, inline: true },
        { name: '執行者', value: interaction.user.tag, inline: true },
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
