const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
  category: '查詢',
  data: new SlashCommandBuilder()
    .setName('suspension')
    .setDescription('查詢停班停課資訊'),
  async execute(interaction) {
    await interaction.deferReply();
    try {
      const res = await axios.get('https://www.dgpa.gov.tw/api/getlist', {
        params: { type: 'json' },
        timeout: 10000,
      });

      const data = res.data?.list || res.data || [];
      const cities = Array.isArray(data) ? data : (data.xml ? data.xml : []);

      if (cities.length > 0) {
        const embed = new EmbedBuilder()
          .setColor(0xffaa00)
          .setTitle('🏢 停班停課資訊')
          .setFooter({ text: '資料來源：行政院人事行政總處' })
          .setTimestamp();

        const items = cities.slice(0, 10).map(c => ({
          name: c.city || c.City || c.cityName || '?',
          status: c.status || c.Status || c.suspension || '正常上班上課',
        }));

        const fields = items.map(i => ({ name: i.name, value: i.status, inline: true }));
        for (let i = 0; i < fields.length; i += 3) {
          embed.addFields(fields.slice(i, i + 3));
        }

        return interaction.editReply({ embeds: [embed] });
      }

      return interaction.editReply('✅ 目前全台正常上班上課');
    } catch {
      return interaction.editReply('❌ 停班停課服務暫時無法使用\n請參考：https://www.dgpa.gov.tw/');
    }
  },
};
