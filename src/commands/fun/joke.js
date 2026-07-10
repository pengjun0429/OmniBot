const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
  category: '娛樂',
  data: new SlashCommandBuilder()
    .setName('joke')
    .setDescription('隨機笑話'),
  async execute(interaction) {
    try {
      const res = await axios.get('https://official-joke-api.appspot.com/random_joke');
      const joke = res.data;

      const embed = new EmbedBuilder()
        .setColor(0xffcc00)
        .setTitle('😂 笑話時間')
        .setDescription(`${joke.setup}\n\n**${joke.punchline}**`)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch {
      const jokes = [
        { setup: '為什麼程式設計師總是搞混萬聖節和聖誕節？', punchline: '因為 Oct 31 等於 Dec 25' },
        { setup: '0 跟 1 在路上走，0 說我們去喝酒吧', punchline: '1 說好，結果 0 喝了卻沒付錢，因為 0 是 free 的' },
        { setup: '為什麼函數要減肥？', punchline: '因為它 call 了太多 function，stack overflow 了' },
      ];
      const joke = jokes[Math.floor(Math.random() * jokes.length)];

      const embed = new EmbedBuilder()
        .setColor(0xffcc00)
        .setTitle('😂 笑話時間')
        .setDescription(`${joke.setup}\n\n**${joke.punchline}**`)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }
  },
};
