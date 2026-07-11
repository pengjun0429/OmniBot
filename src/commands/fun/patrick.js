const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const IMAGES = [
  'https://cdn.discordapp.com/attachments/1525471809267306607/1525474042528796845/image.png?ex=6a5383e9&is=6a523269&hm=4914c5e30c8792bf7f7d1f94b39304b05a41b34ff1172cf9ecc32535c2e99609&',
  'https://cdn.discordapp.com/attachments/1525471809267306607/1525479911794675862/745123364_1338905114436835_3964202501601655462_n.png?ex=6a538961&is=6a5237e1&hm=30855d2556a522f31115ceff2026b0579b98dd53153dbb6bb238cb1e070cef16&',
  'https://cdn.discordapp.com/attachments/1525471809267306607/1525480011832758393/746398865_1034326205753547_8518726655737336023_n.png?ex=6a538978&is=6a5237f8&hm=e8357096167b65677e5b257487f4411653898b12ac663e1792e45b3fbf1f95ba&',
  'https://cdn.discordapp.com/attachments/1525471809267306607/1525479813568270377/742695413_18081160472280775_7015780953622115591_n.png?ex=6a538949&is=6a5237c9&hm=c3192e858f532239e087307c37df2b911c2026973f04ad4061008a479d6f47ed&',
  'https://cdn.discordapp.com/attachments/1525471809267306607/1525479813140316220/743261776_17958386490174008_8581042178372120510_n.png?ex=6a538949&is=6a5237c9&hm=a57bd6a3c7ad15ccee8437b0079d528c8da2997190b585a9bff612feba84f3d0&',
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
