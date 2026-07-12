const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
  category: '查詢',
  data: new SlashCommandBuilder()
    .setName('earthquake')
    .setDescription('查詢最近地震資訊'),
  async execute(interaction) {
    await interaction.deferReply();
    try {
      const res = await axios.get('https://opendata.cwa.gov.tw/api/v1/rest/datastore/E-A0015-001', {
        params: {
          Authorization: process.env.CWA_API_KEY || '',
          limit: 5,
          format: 'JSON',
        },
        timeout: 10000,
      });

      if (res.data?.records?.Earthquake?.length > 0) {
        const eq = res.data.records.Earthquake[0];
        const eqInfo = eq.EarthquakeInfo;
        const loc = eqInfo?.Epicenter?.Location || '未知';
        const mag = eqInfo?.Magnitude?.MagnitudeValue || '?';
        const depth = eqInfo?.Depth?.Value || '?';
        const time = eqInfo?.OriginTime || '?';
        const img = eq.ReportImageURI || '';

        const embed = new EmbedBuilder()
          .setColor(0xff4444)
          .setTitle(`🌍 地震報告 - ${loc}`)
          .addFields(
            { name: '規模', value: `${mag}`, inline: true },
            { name: '深度', value: `${depth} 公里`, inline: true },
            { name: '時間', value: time, inline: true },
          )
          .setFooter({ text: '資料來源：中央氣象署' })
          .setTimestamp();

        const areas = eqInfo?.Intensity?.ShakingArea || [];
        const areaStr = areas.slice(0, 5).map(a => `${a.AreaDesc || a.LocationDesc}：${a.Intensity?.Value || '?'}級`).join('\n');
        if (areaStr) embed.addFields({ name: '📊 最大震度', value: areaStr });

        if (img) embed.setImage(img);
        return interaction.editReply({ embeds: [embed] });
      }

      const usgs = await axios.get('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson', { timeout: 10000 });
      if (usgs.data?.features?.length > 0) {
        const eq = usgs.data.features[0];
        const props = eq.properties;
        const coords = eq.geometry.coordinates;
        const embed = new EmbedBuilder()
          .setColor(0xff4444)
          .setTitle(`🌍 最近地震`)
          .setDescription(props.title || '?')
          .addFields(
            { name: '規模', value: `${props.mag}`, inline: true },
            { name: '深度', value: `${coords?.[2]?.toFixed(1) || '?'} 公里`, inline: true },
            { name: '時間', value: new Date(props.time).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }), inline: true },
          )
          .setFooter({ text: '資料來源：USGS' })
          .setTimestamp();
        return interaction.editReply({ embeds: [embed] });
      }

      return interaction.editReply('❌ 無法取得地震資訊');
    } catch {
      return interaction.editReply('❌ 地震服務暫時無法使用');
    }
  },
};
