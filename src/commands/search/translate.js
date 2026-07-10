const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
  category: '查詢',
  data: new SlashCommandBuilder()
    .setName('translate')
    .setDescription('翻譯文字（使用 LibreTranslate）')
    .addStringOption(option =>
      option.setName('文字').setDescription('要翻譯的文字').setRequired(true))
    .addStringOption(option =>
      option.setName('目標語言').setDescription('目標語言代碼（預設 zh-TW，例如 en, ja, ko）').setRequired(false)),
  async execute(interaction) {
    const text = interaction.options.getString('文字');
    const targetLang = interaction.options.getString('目標語言') || 'zh-TW';

    await interaction.deferReply();

    try {
      const res = await axios.post('https://libretranslate.de/translate', {
        q: text,
        source: 'auto',
        target: targetLang,
        format: 'text',
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000,
      });

      const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle('🌐 翻譯結果')
        .addFields(
          { name: '原文', value: text },
          { name: '翻譯', value: res.data.translatedText },
        )
        .setFooter({ text: `目標語言: ${targetLang}` })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch {
      await interaction.editReply({ content: '翻譯服務暫時無法使用，請稍後再試' });
    }
  },
};
