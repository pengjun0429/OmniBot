const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const settings = require('../../services/settings');

module.exports = {
  category: '管理',
  data: new SlashCommandBuilder()
    .setName('inviteguard')
    .setDescription('邀請連結管理')
    .addSubcommand(sub =>
      sub.setName('toggle')
        .setDescription('啟用/停用邀請連結過濾'))
    .addSubcommand(sub =>
      sub.setName('whitelist')
        .setDescription('管理白名單邀請碼')
        .addStringOption(opt => opt.setName('動作').setDescription('add/remove/list').setRequired(true)
          .addChoices(
            { name: '新增', value: 'add' },
            { name: '刪除', value: 'remove' },
            { name: '列表', value: 'list' },
          ))
        .addStringOption(opt => opt.setName('邀請碼').setDescription('discord.gg/XXX 的 XXX').setRequired(false)))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const gs = settings.getGuildSettings(interaction.guild.id);
    if (!gs.inviteGuard) gs.inviteGuard = { enabled: false, whitelist: [], logChannelId: '' };

    if (sub === 'toggle') {
      gs.inviteGuard.enabled = !gs.inviteGuard.enabled;
      settings.updateGuildSettings(interaction.guild.id, gs);
      return interaction.reply({ content: `✅ 邀請連結過濾已${gs.inviteGuard.enabled ? '啟用' : '停用'}`, ephemeral: true });
    }

    if (sub === 'whitelist') {
      const action = interaction.options.getString('動作');
      const code = interaction.options.getString('邀請碼');
      if (action === 'list') {
        const list = gs.inviteGuard.whitelist.join(', ') || '（無）';
        return interaction.reply({ content: `📋 白名單邀請碼：${list}`, ephemeral: true });
      }
      if (!code) return interaction.reply({ content: '請輸入邀請碼', ephemeral: true });
      if (action === 'add') {
        gs.inviteGuard.whitelist.push(code);
        settings.updateGuildSettings(interaction.guild.id, gs);
        return interaction.reply({ content: `✅ 已新增白名單：${code}`, ephemeral: true });
      }
      if (action === 'remove') {
        gs.inviteGuard.whitelist = gs.inviteGuard.whitelist.filter(c => c !== code);
        settings.updateGuildSettings(interaction.guild.id, gs);
        return interaction.reply({ content: `✅ 已刪除白名單：${code}`, ephemeral: true });
      }
    }
  },
};
