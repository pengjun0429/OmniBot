const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  category: '娛樂',
  data: new SlashCommandBuilder()
    .setName('dice')
    .setDescription('擲骰子')
    .addIntegerOption(option =>
      option.setName('面數').setDescription('骰子面數（預設 6）').setRequired(false).setMinValue(2).setMaxValue(100)),
  async execute(interaction) {
    const sides = interaction.options.getInteger('面數') || 6;
    const result = Math.floor(Math.random() * sides) + 1;

    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle('🎲 擲骰子')
      .setDescription(`骰子面數: d${sides}\n結果: **${result}**`)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
