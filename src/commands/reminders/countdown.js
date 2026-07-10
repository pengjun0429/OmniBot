const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  category: '提醒',
  data: new SlashCommandBuilder()
    .setName('countdown')
    .setDescription('顯示倒數計時')
    .addStringOption(option =>
      option.setName('名稱').setDescription('倒數事件名稱').setRequired(true))
    .addStringOption(option =>
      option.setName('日期').setDescription('目標日期（YYYY-MM-DD HH:mm）').setRequired(true)),
  async execute(interaction) {
    const name = interaction.options.getString('名稱');
    const dateStr = interaction.options.getString('日期');

    const target = new Date(dateStr);
    if (isNaN(target.getTime())) {
      return interaction.reply({ content: '日期格式無效，請使用 YYYY-MM-DD HH:mm 格式', ephemeral: true });
    }

    const now = Date.now();
    if (target.getTime() <= now) {
      return interaction.reply({ content: '目標日期必須在未來', ephemeral: true });
    }

    const diff = target.getTime() - now;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    const embed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle('⏳ 倒數計時')
      .addFields(
        { name: '事件', value: name, inline: true },
        { name: '目標日期', value: `<t:${Math.floor(target.getTime() / 1000)}:F>`, inline: true },
        { name: '剩餘時間', value: `**${days}** 天 **${hours}** 小時 **${minutes}** 分鐘` },
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
