const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
  category: '查詢',
  data: new SlashCommandBuilder()
    .setName('dictionary')
    .setDescription('查詢英文單字定義')
    .addStringOption(option =>
      option.setName('單字').setDescription('要查詢的英文單字').setRequired(true)),
  async execute(interaction) {
    const word = interaction.options.getString('單字');

    await interaction.deferReply();

    try {
      const res = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
      const data = res.data[0];

      const meanings = data.meanings.slice(0, 3).map(m =>
        `*${m.partOfSpeech}*: ${m.definitions.slice(0, 2).map(d => d.definition).join('; ')}`
      ).join('\n\n');

      const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle(`📖 ${data.word}`)
        .setDescription(meanings || '無定義')
        .setTimestamp();

      if (data.phonetic) {
        embed.addFields({ name: '發音', value: data.phonetic });
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      if (err.response?.status === 404) {
        await interaction.editReply({ content: '找不到該單字' });
      } else {
        await interaction.editReply({ content: '查詢失敗，請稍後再試' });
      }
    }
  },
};
