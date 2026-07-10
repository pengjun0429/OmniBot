const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const OPTIONS = [
  '大吉', '中吉', '小吉', '吉', '末吉', '凶', '大凶',
];

module.exports = {
  category: '娛樂',
  data: new SlashCommandBuilder()
    .setName('draw')
    .setDescription('抽籤占卜運勢'),
  async execute(interaction) {
    const result = OPTIONS[Math.floor(Math.random() * OPTIONS.length)];
    const colors = {
      '大吉': 0xff0000,
      '中吉': 0xff6600,
      '小吉': 0xffaa00,
      '吉': 0x00ff00,
      '末吉': 0x0099ff,
      '凶': 0x666666,
      '大凶': 0x000000,
    };

    const embed = new EmbedBuilder()
      .setColor(colors[result] || 0x0099ff)
      .setTitle('🎋 抽籤結果')
      .setDescription(`你的運勢: **${result}**`)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
