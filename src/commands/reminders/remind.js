const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getDb, isReady } = require('../../services/firebase');
const logger = require('../../utils/logger');

module.exports = {
  category: '提醒',
  data: new SlashCommandBuilder()
    .setName('remind')
    .setDescription('設定提醒')
    .addStringOption(option =>
      option.setName('內容').setDescription('提醒內容').setRequired(true))
    .addIntegerOption(option =>
      option.setName('分鐘').setDescription('幾分鐘後提醒').setRequired(true).setMinValue(1).setMaxValue(10080)),
  async execute(interaction) {
    const content = interaction.options.getString('內容');
    const minutes = interaction.options.getInteger('分鐘');

    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle('⏰ 提醒已設定')
      .setDescription(`將在 ${minutes} 分鐘後提醒你`)
      .addFields({ name: '內容', value: content })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    const reminderData = {
      userId: interaction.user.id,
      channelId: interaction.channelId,
      guildId: interaction.guildId,
      content,
      remindAt: Date.now() + minutes * 60 * 1000,
    };

    if (isReady()) {
      try {
        await getDb().collection('reminders').add(reminderData);
      } catch (err) {
        logger.error('儲存提醒失敗:', err.message);
      }
    }

    setTimeout(async () => {
      try {
        const reminderEmbed = new EmbedBuilder()
          .setColor(0xff6600)
          .setTitle('⏰ 提醒')
          .setDescription(content)
          .setTimestamp();

        const channel = interaction.client.channels.cache.get(interaction.channelId);
        if (channel) {
          await channel.send({ content: `<@${interaction.user.id}>`, embeds: [reminderEmbed] });
        }
      } catch (err) {
        logger.error('發送提醒失敗:', err.message);
      }
    }, minutes * 60 * 1000);
  },
};
