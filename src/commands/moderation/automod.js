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
    .addSubcommand(sub =>
      sub.setName('punishment')
        .setDescription('設定違規懲罰方式')
        .addStringOption(opt => opt.setName('方式').setDescription('懲罰方式').setRequired(true)
          .addChoices(
            { name: '刪除訊息', value: 'delete' },
            { name: '刪除+禁言', value: 'timeout' },
            { name: '刪除+踢出', value: 'kick' },
          ))
        .addIntegerOption(opt => opt.setName('分鐘').setDescription('禁言分鐘數（僅 timeout 有效）').setRequired(false)))
    .addSubcommand(sub =>
      sub.setName('log')
        .setDescription('設定公告級別')
        .addStringOption(opt => opt.setName('級別').setDescription('公告級別').setRequired(true)
          .addChoices(
            { name: '全部紀錄', value: 'all' },
            { name: '僅懲罰紀錄', value: 'punish_only' },
            { name: '不紀錄', value: 'off' },
          )))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const gs = settings.getGuildSettings(interaction.guild.id);
    if (!gs.autoMod) gs.autoMod = { enabled: false, words: [], blockLinks: false, logChannelId: '', punishment: 'delete', timeoutMinutes: 10, logLevel: 'all' };

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

    if (sub === 'punishment') {
      gs.autoMod.punishment = interaction.options.getString('方式');
      const minutes = interaction.options.getInteger('分鐘');
      if (minutes) gs.autoMod.timeoutMinutes = minutes;
      settings.updateGuildSettings(interaction.guild.id, gs);
      return interaction.reply({ content: `✅ 懲罰方式已設為：${gs.autoMod.punishment === 'delete' ? '刪除訊息' : gs.autoMod.punishment === 'timeout' ? `刪除+禁言 ${gs.autoMod.timeoutMinutes} 分鐘` : '刪除+踢出'}`, ephemeral: true });
    }

    if (sub === 'log') {
      gs.autoMod.logLevel = interaction.options.getString('級別');
      settings.updateGuildSettings(interaction.guild.id, gs);
      const labels = { all: '全部紀錄', punish_only: '僅懲罰紀錄', off: '不紀錄' };
      return interaction.reply({ content: `✅ 公告級別已設為：${labels[gs.autoMod.logLevel]}`, ephemeral: true });
    }
  },
};
