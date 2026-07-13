const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const settings = require('../../services/settings');

module.exports = {
  category: '基本',
  data: new SlashCommandBuilder()
    .setName('birthday')
    .setDescription('🎂 生日系統')
    .addSubcommand(s => s.setName('set').setDescription('登記你的生日').addStringOption(o => o.setName('日期').setDescription('MM-DD 例如 03-15').setRequired(true)))
    .addSubcommand(s => s.setName('check').setDescription('查看今日壽星')),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    if (sub === 'set') {
      const date = interaction.options.getString('日期');
      if (!/^\d{2}-\d{2}$/.test(date)) return interaction.reply({ content: '❌ 格式錯誤，請使用 MM-DD 格式（例如 03-15）', ephemeral: true });
      const gs = settings.getGuildSettings(interaction.guild.id);
      if (!gs.birthdays) gs.birthdays = {};
      gs.birthdays[interaction.user.id] = date;
      settings.updateGuildSettings(interaction.guild.id, gs);
      return interaction.reply({ content: `✅ 已登記生日為 ${date}！當天會自動祝福 🎉`, ephemeral: true });
    }
    if (sub === 'check') {
      const gs = settings.getGuildSettings(interaction.guild.id);
      if (!gs.birthdays) return interaction.reply({ content: '📋 目前沒有成員登記生日', ephemeral: true });
      const today = new Date().toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit', timeZone: 'Asia/Taipei' });
      const celebrants = Object.entries(gs.birthdays).filter(([, d]) => d === today);
      if (celebrants.length === 0) return interaction.reply({ content: '📋 今天沒有壽星', ephemeral: true });
      const embed = new EmbedBuilder()
        .setColor(0xf472b6).setTitle('🎂 今日壽星')
        .setDescription(celebrants.map(([id]) => `<@${id}>`).join('\n'))
        .setTimestamp();
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};
