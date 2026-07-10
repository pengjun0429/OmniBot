const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const settings = require('../../services/settings');

module.exports = {
  category: '身分組',
  data: new SlashCommandBuilder()
    .setName('rolepanel')
    .setDescription('發送身分組領取面板到當前頻道（任何人點按鈕即可領取/移除）')
    .addStringOption(option =>
      option.setName('標題').setDescription('面板標題（預設：🎭 自助領取身分組）').setRequired(false))
    .addStringOption(option =>
      option.setName('說明').setDescription('面板說明文字（預設：點擊下方按鈕領取或移除身分組）').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    const gs = settings.getGuildSettings(interaction.guild.id);
    const allowedIds = gs.selfRoles || [];

    if (allowedIds.length === 0) {
      return interaction.reply({ content: '請先在後臺設定可領取的身分組', ephemeral: true });
    }

    const roles = allowedIds
      .map(id => interaction.guild.roles.cache.get(id))
      .filter(Boolean)
      .slice(0, 25);

    if (roles.length === 0) {
      return interaction.reply({ content: '可領取的身分組已不存在', ephemeral: true });
    }

    const title = interaction.options.getString('標題') || '🎭 自助領取身分組';
    const desc = interaction.options.getString('說明') || '點擊下方按鈕領取或移除身分組';

    const embed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle(title)
      .setDescription(desc)
      .setFooter({ text: interaction.guild.name })
      .setTimestamp();

    const rows = [];
    let row = new ActionRowBuilder();

    for (const role of roles) {
      const btn = new ButtonBuilder()
        .setCustomId(`role_toggle_${interaction.guild.id}_${role.id}`)
        .setLabel(role.name.length > 25 ? role.name.slice(0, 22) + '...' : role.name)
        .setStyle(ButtonStyle.Secondary);

      if (row.components.length >= 5) {
        rows.push(row);
        row = new ActionRowBuilder();
      }
      row.addComponents(btn);
    }
    if (row.components.length > 0) rows.push(row);

    await interaction.channel.send({ embeds: [embed], components: rows });
    await interaction.reply({ content: '✅ 面板已發送', ephemeral: true });
  },
};
