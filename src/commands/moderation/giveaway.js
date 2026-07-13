const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');

const giveaways = new Map();

module.exports = {
  category: '管理',
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('🎁 抽獎系統')
    .addSubcommand(s => s.setName('start').setDescription('開始一個抽獎')
      .addStringOption(o => o.setName('獎品').setDescription('抽什麼').setRequired(true))
      .addIntegerOption(o => o.setName('人數').setDescription('中獎人數').setRequired(true).setMinValue(1))
      .addIntegerOption(o => o.setName('時間').setDescription('抽獎時間(秒)').setRequired(true).setMinValue(30)))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    const prize = interaction.options.getString('獎品');
    const winners = interaction.options.getInteger('人數');
    const duration = interaction.options.getInteger('時間');

    const embed = new EmbedBuilder()
      .setColor(0xf59e0b).setTitle('🎁 抽獎')
      .setDescription(`**獎品：** ${prize}\n**名額：** ${winners} 人\n**結束時間：** <t:${Math.floor(Date.now() / 1000) + duration}:R>\n\n點擊下方按鈕參加！`)
      .setFooter({ text: interaction.guild.name });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('giveaway_join').setLabel('🎁 參加抽獎').setStyle(ButtonStyle.Success)
    );

    const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
    const participants = new Set();
    giveaways.set(msg.id, { prize, winners, participants });

    const collector = msg.createMessageComponentCollector({ time: duration * 1000 });
    collector.on('collect', async (btn) => {
      if (btn.customId === 'giveaway_join') {
        if (participants.has(btn.user.id)) return btn.reply({ content: '✅ 你已經參加了！', ephemeral: true });
        participants.add(btn.user.id);
        await btn.reply({ content: '✅ 已成功參加抽獎！', ephemeral: true });
      }
    });

    collector.on('end', async () => {
      const list = [...participants];
      const chosen = list.sort(() => Math.random() - 0.5).slice(0, winners);
      const resultEmbed = new EmbedBuilder()
        .setColor(chosen.length > 0 ? 0x4ade80 : 0x888888)
        .setTitle('🎁 抽獎結果')
        .setDescription(chosen.length > 0 ? `**獎品：** ${prize}\n**中獎者：**\n${chosen.map(id => `<@${id}>`).join('\n')}` : '😢 沒有人參加抽獎');
      await interaction.editReply({ embeds: [resultEmbed], components: [] });
      giveaways.delete(msg.id);
    });
  },
};
