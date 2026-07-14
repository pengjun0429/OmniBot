const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { logModAction } = require('../../services/modlog');
const { canTarget } = require('../../utils/permissions');

module.exports = {
  category: '管理',
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('封鎖成員，並透過私訊告知原因')
    .addUserOption(option =>
      option.setName('成員').setDescription('要封鎖的成員').setRequired(true))
    .addStringOption(option =>
      option.setName('原因').setDescription('封鎖原因').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  async execute(interaction) {
    const target = interaction.options.getMember('成員');
    const reason = interaction.options.getString('原因') || '未提供原因';

    if (!target) {
      return interaction.reply({ content: '找不到該成員', ephemeral: true });
    }

    if (target.id === interaction.client.user.id) {
      return interaction.reply({ content: '❌ 無法封鎖機器人自己', ephemeral: true });
    }
    if (!canTarget(interaction.member, target)) {
      return interaction.reply({ content: '❌ 你的身分組層級不足以封鎖該成員', ephemeral: true });
    }
    if (!target.bannable) {
      return interaction.reply({ content: '無法封鎖該成員（權限不足）', ephemeral: true });
    }

    try {
      await target.send(`你已在伺服器 **${interaction.guild.name}** 被封鎖\n原因: ${reason}\n\n📋 申訴：https://omnibot-yzti.onrender.com/appeal`);
    } catch {
      // 私訊失敗不影響封鎖
    }

    await target.ban({ reason });
    await logModAction(interaction.guild, 'ban', target.user, interaction.user, reason);

    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle('成員已封鎖')
      .addFields(
        { name: '成員', value: target.user.tag, inline: true },
        { name: '原因', value: reason, inline: true },
        { name: '執行者', value: interaction.user.tag, inline: true },
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
