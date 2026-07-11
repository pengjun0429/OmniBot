const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  category: '娛樂',
  data: new SlashCommandBuilder()
    .setName('patrick')
    .setDescription('派大星！'),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(0xf472b6)
      .setTitle('⭐ 派大星！')
      .setImage('https://cdn.discordapp.com/attachments/1525471809267306607/1525474042528796845/image.png?ex=6a5383e9&is=6a523269&hm=4914c5e30c8792bf7f7d1f94b39304b05a41b34ff1172cf9ecc32535c2e99609&');
    await interaction.reply({ embeds: [embed] });
  },
};
