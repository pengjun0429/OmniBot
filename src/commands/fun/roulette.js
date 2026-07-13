const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  category: '娛樂',
  data: new SlashCommandBuilder()
    .setName('roulette')
    .setDescription('🎰 睡眠輪盤 - 50% 贏金幣，50% 被禁言！'),
  async execute(interaction) {
    if (interaction.member.permissions.has('Administrator')) {
      return interaction.reply({ content: '❌ 管理員不能玩這個', ephemeral: true });
    }
    const hour = new Date().getHours();
    if (hour < 0 || hour > 23) {
      return interaction.reply({ content: '❌ 睡眠輪盤只能在深夜 0:00~5:00 遊玩', ephemeral: true });
    }

    const won = Math.random() < 0.5;
    if (won) {
      const coins = Math.floor(Math.random() * 3000) + 2000;
      const embed = new EmbedBuilder()
        .setColor(0x4ade80).setTitle('🎰 輪盤結果')
        .setDescription(`🎉 你贏了 **${coins}** 金幣！今晚運氣不錯！`)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    } else {
      try {
        await interaction.member.timeout(24 * 60 * 60 * 1000, '睡眠輪盤：輸了，滾去睡覺！');
        const embed = new EmbedBuilder()
          .setColor(0xef4444).setTitle('💤 輪盤結果')
          .setDescription('😴 你輸了... 已被禁言 24 小時，乖乖去睡覺！')
          .setTimestamp();
        await interaction.reply({ embeds: [embed] });
      } catch {
        await interaction.reply({ content: '❌ 無法禁言，可能權限不足', ephemeral: true });
      }
    }
  },
};
