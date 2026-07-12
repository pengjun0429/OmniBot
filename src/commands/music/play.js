const { SlashCommandBuilder } = require('discord.js');
const music = require('../../services/music');

module.exports = {
  category: '音樂',
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('播放音樂')
    .addStringOption(opt => opt.setName('關鍵字').setDescription('歌曲名稱或 YouTube 網址').setRequired(true)),
  async execute(interaction) {
    const query = interaction.options.getString('關鍵字');
    await music.play(interaction, query);
  },
};
