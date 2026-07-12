const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const settings = require('../../services/settings');

module.exports = {
  category: '管理',
  data: new SlashCommandBuilder()
    .setName('verify')
    .setDescription('設定驗證系統')
    .addSubcommand(sub =>
      sub.setName('setup')
        .setDescription('發送驗證面板到當前頻道')
        .addStringOption(opt => opt.setName('訊息').setDescription('驗證訊息').setRequired(false)))
    .addSubcommand(sub =>
      sub.setName('role')
        .setDescription('設定驗證通過給的身分組')
        .addRoleOption(opt => opt.setName('身分組').setDescription('驗證後給的身分組').setRequired(true)))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const gs = settings.getGuildSettings(interaction.guild.id);

    if (sub === 'role') {
      const role = interaction.options.getRole('身分組');
      gs.verify = { ...gs.verify, roleId: role.id };
      settings.updateGuildSettings(interaction.guild.id, gs);
      return interaction.reply({ content: `✅ 驗證身分組已設為 ${role}`, ephemeral: true });
    }

    if (sub === 'setup') {
      if (!gs.verify?.roleId) {
        return interaction.reply({ content: '❌ 請先用 `/verify role` 設定驗證身分組', ephemeral: true });
      }
      const msg = interaction.options.getString('訊息') || '點擊下方按鈕完成驗證，即可查看其他頻道！';
      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('🚪 成員驗證')
        .setDescription(msg);
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('verify_click').setLabel('✅ 點我驗證').setStyle(ButtonStyle.Success)
      );
      await interaction.channel.send({ embeds: [embed], components: [row] });
      return interaction.reply({ content: '✅ 驗證面板已發送', ephemeral: true });
    }
  },
};
