const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const IMAGES = [
  'https://i.imgur.com/9qUkLpD.png',
  'https://i.imgur.com/0VXoQ3q.png',
  'https://i.imgur.com/YQJLJ1r.png',
  'https://i.imgur.com/ZGnJ0g6.png',
  'https://i.imgur.com/yL1ZVKk.png',
];

module.exports = {
  category: '娛樂',
  data: new SlashCommandBuilder()
    .setName('patrick')
    .setDescription('派大星！'),
  async execute(interaction) {
    const img = IMAGES[Math.floor(Math.random() * IMAGES.length)];
    const embed = new EmbedBuilder()
      .setColor(0xf472b6)
      .setTitle('⭐ 派大星！')
      .setImage(img);
    await interaction.reply({ embeds: [embed] });
  },
};
