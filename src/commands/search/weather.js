const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const config = require('../../config');

module.exports = {
  category: '查詢',
  data: new SlashCommandBuilder()
    .setName('weather')
    .setDescription('查詢天氣')
    .addStringOption(option =>
      option.setName('城市').setDescription('城市名稱（例如 Taipei）').setRequired(true)),
  async execute(interaction) {
    const city = interaction.options.getString('城市');

    if (!config.weatherApiKey) {
      return interaction.reply({ content: '天氣功能尚未設定 API Key', ephemeral: true });
    }

    await interaction.deferReply();

    try {
      const res = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
        params: {
          q: city,
          appid: config.weatherApiKey,
          units: 'metric',
          lang: 'zh_tw',
        },
      });

      const data = res.data;

      const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle(`🌤 ${data.name} 天氣`)
        .setDescription(data.weather[0].description)
        .addFields(
          { name: '🌡 溫度', value: `${data.main.temp}°C`, inline: true },
          { name: '🤗 體感溫度', value: `${data.main.feels_like}°C`, inline: true },
          { name: '💧 濕度', value: `${data.main.humidity}%`, inline: true },
          { name: '💨 風速', value: `${data.wind.speed} m/s`, inline: true },
          { name: '☁️ 雲量', value: `${data.clouds.all}%`, inline: true },
        )
        .setThumbnail(`https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      if (err.response?.status === 404) {
        await interaction.editReply({ content: '找不到該城市' });
      } else {
        await interaction.editReply({ content: '查詢天氣失敗，請稍後再試' });
      }
    }
  },
};
