const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const settings = require('../../services/settings');

module.exports = {
  category: '管理',
  data: new SlashCommandBuilder()
    .setName('automod')
    .setDescription('自動審核設定')
    .addSubcommand(sub =>
      sub.setName('toggle')
        .setDescription('啟用/停用自動審核'))
    .addSubcommand(sub =>
      sub.setName('word')
        .setDescription('管理過濾詞')
        .addStringOption(opt => opt.setName('動作').setDescription('add/remove/list').setRequired(true)
          .addChoices(
            { name: '新增', value: 'add' },
            { name: '刪除', value: 'remove' },
            { name: '列表', value: 'list' },
          ))
        .addStringOption(opt => opt.setName('詞').setDescription('要新增或刪除的詞（list 不需填）').setRequired(false)))
    .addSubcommand(sub =>
      sub.setName('links')
        .setDescription('啟用/停用連結過濾'))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const gs = settings.getGuildSettings(interaction.guild.id);
    if (!gs.autoMod) gs.autoMod = { enabled: false, words: [], blockLinks: false, logChannelId: '' };

    if (sub === 'toggle') {
      gs.autoMod.enabled = !gs.autoMod.enabled;
      settings.updateGuildSettings(interaction.guild.id, gs);
      return interaction.reply({ content: `✅ 自動審核已${gs.autoMod.enabled ? '啟用' : '停用'}`, ephemeral: true });
    }

    if (sub === 'word') {
      const action = interaction.options.getString('動作');
      const word = interaction.options.getString('詞');

      if (action === 'list') {
        const list = gs.autoMod.words.join(', ') || '（無）';
        return interaction.reply({ content: `📋 過濾詞列表：${list}`, ephemeral: true });
      }

      if (!word) return interaction.reply({ content: '請輸入詞彙', ephemeral: true });

      if (action === 'add') {
        gs.autoMod.words.push(word);
        settings.updateGuildSettings(interaction.guild.id, gs);
        return interaction.reply({ content: `✅ 已新增過濾詞：${word}`, ephemeral: true });
      }

      if (action === 'remove') {
        gs.autoMod.words = gs.autoMod.words.filter(w => w !== word);
        settings.updateGuildSettings(interaction.guild.id, gs);
        return interaction.reply({ content: `✅ 已刪除過濾詞：${word}`, ephemeral: true });
      }
    }

    if (sub === 'links') {
      gs.autoMod.blockLinks = !gs.autoMod.blockLinks;
      settings.updateGuildSettings(interaction.guild.id, gs);
      return interaction.reply({ content: `✅ 連結過濾已${gs.autoMod.blockLinks ? '啟用' : '停用'}`, ephemeral: true });
    }
  },
};
