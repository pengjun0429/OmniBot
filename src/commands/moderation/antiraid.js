const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const settings = require('../../services/settings');

module.exports = {
  category: '管理',
  data: new SlashCommandBuilder()
    .setName('antiraid')
    .setDescription('防轟炸設定')
    .addSubcommand(sub =>
      sub.setName('toggle')
        .setDescription('啟用/停用防轟炸'))
    .addSubcommand(sub =>
      sub.setName('join')
        .setDescription('設定大量加入偵測')
        .addIntegerOption(opt => opt.setName('次數').setDescription('幾次加入觸發').setRequired(true).setMinValue(2))
        .addIntegerOption(opt => opt.setName('秒數').setDescription('在幾秒內').setRequired(true).setMinValue(3)))
    .addSubcommand(sub =>
      sub.setName('spam')
        .setDescription('設定大量訊息偵測')
        .addIntegerOption(opt => opt.setName('次數').setDescription('幾則訊息觸發').setRequired(true).setMinValue(3))
        .addIntegerOption(opt => opt.setName('秒數').setDescription('在幾秒內').setRequired(true).setMinValue(3)))
    .addSubcommand(sub =>
      sub.setName('action')
        .setDescription('設定觸發後的動作')
        .addStringOption(opt => opt.setName('動作').setDescription('處理方式').setRequired(true)
          .addChoices(
            { name: '踢出', value: 'kick' },
            { name: '僅記錄', value: 'log' },
          )))
    .addSubcommand(sub =>
      sub.setName('status')
        .setDescription('查看目前設定'))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const gs = settings.getGuildSettings(interaction.guild.id);
    if (!gs.antiRaid) gs.antiRaid = { enabled: false, joinThreshold: 5, joinWindow: 10, spamThreshold: 5, spamWindow: 5, action: 'kick', logChannelId: '' };

    if (sub === 'toggle') {
      gs.antiRaid.enabled = !gs.antiRaid.enabled;
      settings.updateGuildSettings(interaction.guild.id, gs);
      return interaction.reply({ content: `✅ 防轟炸已${gs.antiRaid.enabled ? '啟用' : '停用'}`, ephemeral: true });
    }

    if (sub === 'join') {
      gs.antiRaid.joinThreshold = interaction.options.getInteger('次數');
      gs.antiRaid.joinWindow = interaction.options.getInteger('秒數');
      settings.updateGuildSettings(interaction.guild.id, gs);
      return interaction.reply({ content: `✅ 大量加入已設為 ${gs.antiRaid.joinThreshold} 次 / ${gs.antiRaid.joinWindow} 秒`, ephemeral: true });
    }

    if (sub === 'spam') {
      gs.antiRaid.spamThreshold = interaction.options.getInteger('次數');
      gs.antiRaid.spamWindow = interaction.options.getInteger('秒數');
      settings.updateGuildSettings(interaction.guild.id, gs);
      return interaction.reply({ content: `✅ 大量訊息已設為 ${gs.antiRaid.spamThreshold} 則 / ${gs.antiRaid.spamWindow} 秒`, ephemeral: true });
    }

    if (sub === 'action') {
      gs.antiRaid.action = interaction.options.getString('動作');
      settings.updateGuildSettings(interaction.guild.id, gs);
      return interaction.reply({ content: `✅ 觸發動作已設為：${gs.antiRaid.action === 'kick' ? '踢出' : '僅記錄'}`, ephemeral: true });
    }

    if (sub === 'status') {
      const embed = new EmbedBuilder()
        .setColor(0xef4444)
        .setTitle('🚨 防轟炸設定')
        .addFields(
          { name: '狀態', value: gs.antiRaid.enabled ? '✅ 啟用' : '❌ 停用', inline: true },
          { name: '大量加入', value: `${gs.antiRaid.joinThreshold} 次 / ${gs.antiRaid.joinWindow} 秒`, inline: true },
          { name: '大量訊息', value: `${gs.antiRaid.spamThreshold} 則 / ${gs.antiRaid.spamWindow} 秒`, inline: true },
          { name: '觸發動作', value: gs.antiRaid.action === 'kick' ? '踢出' : '僅記錄', inline: true },
        );
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};
