const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const settings = require('../../services/settings');

module.exports = {
  category: '身分組',
  data: new SlashCommandBuilder()
    .setName('role')
    .setDescription('自助領取或移除身分組')
    .addSubcommand(sub =>
      sub.setName('add')
        .setDescription('領取身分組')
        .addRoleOption(opt => opt.setName('身分組').setDescription('要領取的身分組').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('remove')
        .setDescription('移除身分組')
        .addRoleOption(opt => opt.setName('身分組').setDescription('要移除的身分組').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('查看可領取的身分組列表')),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const gs = settings.getGuildSettings(interaction.guild.id);
    const allowedRoles = gs.selfRoles || [];

    if (sub === 'list') {
      if (allowedRoles.length === 0) {
        return interaction.reply({ content: '此伺服器尚未設定可領取的身分組', ephemeral: true });
      }
      const roles = allowedRoles
        .map(id => interaction.guild.roles.cache.get(id))
        .filter(Boolean)
        .map(r => `${r.name}`);
      const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle('📋 可領取的身分組')
        .setDescription(roles.map(r => `• ${r}`).join('\n') || '無可用身分組')
        .setFooter({ text: '使用 /role add 領取，/role remove 移除' })
        .setTimestamp();
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const role = interaction.options.getRole('身分組');

    if (!allowedRoles.includes(role.id)) {
      return interaction.reply({ content: '該身分組不在可領取清單中', ephemeral: true });
    }

    if (role.position >= interaction.guild.members.me.roles.highest.position) {
      return interaction.reply({ content: '機器人權限不足以管理該身分組', ephemeral: true });
    }

    const member = interaction.member;

    if (sub === 'add') {
      if (member.roles.cache.has(role.id)) {
        return interaction.reply({ content: `你已經有了 ${role.name} 身分組`, ephemeral: true });
      }
      await member.roles.add(role);
      await interaction.reply({ content: `✅ 已為你加入 ${role.name} 身分組`, ephemeral: true });
    } else if (sub === 'remove') {
      if (!member.roles.cache.has(role.id)) {
        return interaction.reply({ content: `你目前沒有 ${role.name} 身分組`, ephemeral: true });
      }
      await member.roles.remove(role);
      await interaction.reply({ content: `✅ 已為你移除 ${role.name} 身分組`, ephemeral: true });
    }
  },
};
