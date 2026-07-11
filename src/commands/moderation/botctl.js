const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { isTopAdmin } = require('../../utils/permissions');
const { setCustom } = require('../../utils/presence');

module.exports = {
  category: '管理',
  data: new SlashCommandBuilder()
    .setName('botctl')
    .setDescription('機器人 root 指令（可愛的管管們專用）')
    .addSubcommand(sub =>
      sub.setName('reload')
        .setDescription('重新載入所有指令'))
    .addSubcommand(sub =>
      sub.setName('ping')
        .setDescription('查看機器人詳細狀態'))
    .addSubcommand(sub =>
      sub.setName('presence')
        .setDescription('設定機器人狀態')
        .addStringOption(opt => opt.setName('訊息').setDescription('狀態文字').setRequired(true))
        .addStringOption(opt =>
          opt.setName('類型').setDescription('狀態類型')
            .addChoices(
              { name: '🎮 Playing', value: '0' },
              { name: '📺 Streaming', value: '1' },
              { name: '🎧 Listening', value: '2' },
              { name: '👀 Watching', value: '3' },
              { name: '🏆 Competing', value: '5' },
            ).setRequired(false)))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    if (!isTopAdmin(interaction.member)) {
      return interaction.reply({ content: '只有可愛的管管們才能使用此指令', ephemeral: true });
    }

    const sub = interaction.options.getSubcommand();

    if (sub === 'ping') {
      const uptime = process.uptime();
      const hours = Math.floor(uptime / 3600);
      const minutes = Math.floor((uptime % 3600) / 60);
      const seconds = Math.floor(uptime % 60);
      const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle('🤖 機器人狀態')
        .addFields(
          { name: '延遲', value: `${interaction.client.ws.ping}ms`, inline: true },
          { name: '運行時間', value: `${hours}h ${minutes}m ${seconds}s`, inline: true },
          { name: '伺服器數', value: `${interaction.client.guilds.cache.size}`, inline: true },
          { name: '指令數', value: `${interaction.client.commands.size}`, inline: true },
          { name: 'Node.js', value: process.version, inline: true },
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === 'reload') {
      try {
        delete require.cache;
        interaction.client.commands.clear();
        const { registerCommands } = require('../../utils/command-handler');
        registerCommands(interaction.client);
        await interaction.reply({ content: `✅ 已重新載入 ${interaction.client.commands.size} 個指令`, ephemeral: true });
      } catch (err) {
        await interaction.reply({ content: `❌ 重新載入失敗: ${err.message}`, ephemeral: true });
      }
    }

    if (sub === 'presence') {
      const text = interaction.options.getString('訊息');
      const typeNum = parseInt(interaction.options.getString('類型') || '0', 10);
      setCustom(interaction.client, text, typeNum);
      await interaction.reply({ content: `✅ 已設定狀態：${text}`, ephemeral: true });
    }
  },
};
