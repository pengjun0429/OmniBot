const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const settings = require('../../services/settings');
const logger = require('../../utils/logger');

module.exports = {
  category: '管理',
  data: new SlashCommandBuilder()
    .setName('give')
    .setDescription('公開派發身分組給成員（自動公告）')
    .addUserOption(opt => opt.setName('成員').setDescription('要給的成員').setRequired(true))
    .addRoleOption(opt => opt.setName('身分組').setDescription('要派發的身分組').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    const target = interaction.options.getMember('成員');
    const role = interaction.options.getRole('身分組');

    if (!target) return interaction.reply({ content: '❌ 找不到該成員', ephemeral: true });
    if (role.position >= interaction.guild.members.me.roles.highest.position) {
      return interaction.reply({ content: '❌ 機器人權限不足以管理該身分組', ephemeral: true });
    }
    if (target.roles.cache.has(role.id)) {
      return interaction.reply({ content: `❌ ${target} 已經有 ${role} 了`, ephemeral: true });
    }

    try {
      await target.roles.add(role);
      const gs = settings.getGuildSettings(interaction.guild.id);
      const channelId = gs.roleGive?.channelId;

      const embed = new EmbedBuilder()
        .setColor(role.hexColor || 0x0099ff)
        .setTitle('🎉 身分組派發')
        .setDescription(`${target} 獲得了 ${role}！`)
        .setThumbnail(target.user.displayAvatarURL())
        .setFooter({ text: `派發者：${interaction.user.tag}` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });

      if (channelId) {
        const channel = interaction.guild.channels.cache.get(channelId);
        if (channel) {
          await channel.send({ embeds: [embed] });
        }
      }
    } catch (err) {
      logger.error(`派發身分組失敗:`, err);
      await interaction.reply({ content: '❌ 派發失敗，請檢查機器人權限', ephemeral: true });
    }
  },
};
