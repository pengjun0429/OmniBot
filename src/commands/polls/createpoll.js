const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getDb, isReady } = require('../../services/firebase');
const logger = require('../../utils/logger');

const EMOJIS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

module.exports = {
  category: '投票',
  data: new SlashCommandBuilder()
    .setName('createpoll')
    .setDescription('建立投票')
    .addStringOption(option =>
      option.setName('問題').setDescription('投票問題').setRequired(true))
    .addStringOption(option =>
      option.setName('選項').setDescription('以逗號分隔選項（最多 10 個）').setRequired(true))
    .addIntegerOption(option =>
      option.setName('時長').setDescription('投票時長（分鐘，預設 60）').setRequired(false).setMinValue(1).setMaxValue(1440)),
  async execute(interaction) {
    const question = interaction.options.getString('問題');
    const optionsText = interaction.options.getString('選項');
    const duration = interaction.options.getInteger('時長') || 60;

    const options = optionsText.split(',').map(o => o.trim()).filter(o => o);

    if (options.length < 2) {
      return interaction.reply({ content: '至少需要 2 個選項', ephemeral: true });
    }

    if (options.length > 10) {
      return interaction.reply({ content: '選項最多 10 個', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle('📊 ' + question)
      .setDescription(options.map((opt, i) => `${EMOJIS[i]} ${opt}`).join('\n'))
      .setFooter({ text: `投票將在 ${duration} 分鐘後結束 | 由 ${interaction.user.tag} 發起` })
      .setTimestamp();

    const message = await interaction.reply({ embeds: [embed], fetchReply: true });

    for (let i = 0; i < options.length; i++) {
      await message.react(EMOJIS[i]);
    }

    if (isReady()) {
      try {
        await getDb().collection('polls').doc(message.id).set({
        guildId: interaction.guildId,
        channelId: interaction.channelId,
        messageId: message.id,
        question,
        options,
        authorId: interaction.user.id,
        endsAt: Date.now() + duration * 60 * 1000,
      });
      } catch (err) {
        logger.error('儲存投票資料失敗:', err.message);
      }
    }

    setTimeout(async () => {
      if (!isReady()) return;

      try {
        const pollDoc = await getDb().collection('polls').doc(message.id).get();
        if (!pollDoc.exists) return;

        await message.reactions.removeAll();

        const fetched = await message.fetch();
        const results = [];

        for (let i = 0; i < options.length; i++) {
          const reaction = fetched.reactions.cache.get(EMOJIS[i]);
          const count = reaction ? reaction.count - 1 : 0;
          results.push({ option: options[i], count });
        }

        results.sort((a, b) => b.count - a.count);

        const resultEmbed = new EmbedBuilder()
          .setColor(0x00ff00)
          .setTitle('📊 投票結果: ' + question)
          .setDescription(results.map((r, i) => `**#${i + 1}** ${r.option} — ${r.count} 票`).join('\n'))
          .setTimestamp();

        await message.edit({ embeds: [resultEmbed] });
        await getDb().collection('polls').doc(message.id).delete();
      } catch (err) {
        logger.error('結束投票失敗:', err.message);
      }
    }, duration * 60 * 1000);
  },
};
