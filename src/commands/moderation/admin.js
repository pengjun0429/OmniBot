const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const settings = require('../../services/settings');

module.exports = {
  category: '管理',
  data: new SlashCommandBuilder()
    .setName('admin')
    .setDescription('即時更改機器人管理員權限設定')
    .addSubcommand(sub =>
      sub.setName('role')
        .setDescription('設定管理員身分組')
        .addStringOption(opt => opt.setName('層級').setDescription('管理層級').setRequired(true)
          .addChoices(
            { name: '👑 可愛的管管們 (top)', value: 'top' },
            { name: '🔨 可惡的管管們 (mod)', value: 'mod' },
          ))
        .addRoleOption(opt => opt.setName('身分組').setDescription('要設定的身分組').setRequired(true))
        .addStringOption(opt => opt.setName('動作').setDescription('新增或移除').setRequired(true)
          .addChoices(
            { name: '新增', value: 'add' },
            { name: '移除', value: 'remove' },
          )))
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('查看目前管理員身分組設定'))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const gs = settings.getGuildSettings(interaction.guild.id);
    if (!gs.adminRoles) gs.adminRoles = { topIds: [], modIds: [] };

    if (sub === 'role') {
      const level = interaction.options.getString('層級');
      const role = interaction.options.getRole('身分組');
      const action = interaction.options.getString('動作');
      const key = level === 'top' ? 'topIds' : 'modIds';

      if (action === 'add') {
        if (gs.adminRoles[key].includes(role.id)) {
          return interaction.reply({ content: `❌ ${role} 已在列表中`, ephemeral: true });
        }
        gs.adminRoles[key].push(role.id);
      } else {
        gs.adminRoles[key] = gs.adminRoles[key].filter(id => id !== role.id);
      }

      settings.updateGuildSettings(interaction.guild.id, gs);
      return interaction.reply({ content: `✅ 已${action === 'add' ? '新增' : '移除'} ${role} 至 ${level === 'top' ? '👑可愛' : '🔨可惡'} 管理員列表`, ephemeral: true });
    }

    if (sub === 'list') {
      const topRoles = gs.adminRoles.topIds.map(id => interaction.guild.roles.cache.get(id)).filter(Boolean);
      const modRoles = gs.adminRoles.modIds.map(id => interaction.guild.roles.cache.get(id)).filter(Boolean);
      const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle('🔐 管理員身分組設定')
        .addFields(
          { name: '👑 可愛的管管們', value: topRoles.map(r => r.toString()).join('\n') || '（無）', inline: true },
          { name: '🔨 可惡的管管們', value: modRoles.map(r => r.toString()).join('\n') || '（無）', inline: true },
        );
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};
