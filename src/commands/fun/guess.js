const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const games = new Map();

module.exports = {
  category: '娛樂',
  data: new SlashCommandBuilder()
    .setName('guess')
    .setDescription('🔢 多人猜數字遊戲')
    .addIntegerOption(o => o.setName('最小值').setDescription('預設 1').setRequired(false))
    .addIntegerOption(o => o.setName('最大值').setDescription('預設 100').setRequired(false)),
  async execute(interaction) {
    if (games.has(interaction.channel.id)) {
      return interaction.reply({ content: '❌ 此頻道已有進行中的遊戲', ephemeral: true });
    }
    const min = interaction.options.getInteger('最小值') || 1;
    const max = interaction.options.getInteger('最大值') || 100;
    const target = Math.floor(Math.random() * (max - min + 1)) + min;
    const maxTries = Math.ceil(Math.log2(max - min + 1));

    games.set(interaction.channel.id, { target, tries: 0, active: true });

    const embed = new EmbedBuilder()
      .setColor(0x3b82f6).setTitle('🔢 猜數字')
      .setDescription(`範圍：**${min}** ~ **${max}**\n最大嘗試次數：**${maxTries}** 次\n\n在頻道中輸入數字來猜！`)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    const filter = m => {
      const num = parseInt(m.content);
      return !isNaN(num) && num >= min && num <= max;
    };
    const collector = interaction.channel.createMessageCollector({ filter, time: 120000 });

    collector.on('collect', async (msg) => {
      const game = games.get(interaction.channel.id);
      if (!game || !game.active) return;
      const guess = parseInt(msg.content);
      game.tries++;
      if (guess === game.target) {
        const bonus = game.tries === 1 ? '🎯 **一發入魂！太神啦！**' : '';
        await interaction.channel.send(`🎉 ${msg.author} 猜中了！答案就是 **${target}**（共猜了 ${game.tries} 次）\n${bonus}`);
        game.active = false;
        collector.stop();
        games.delete(interaction.channel.id);
      } else if (game.tries >= maxTries) {
        await interaction.channel.send(`😢 沒有人猜中... 答案是 **${target}**`);
        game.active = false;
        collector.stop();
        games.delete(interaction.channel.id);
      } else {
        const hint = guess < target ? '太小了 ⬆️' : '太大了 ⬇️';
        await msg.react(guess < target ? '⬆️' : '⬇️');
      }
    });

    collector.on('end', () => {
      const game = games.get(interaction.channel.id);
      if (game && game.active) {
        games.delete(interaction.channel.id);
        interaction.channel.send('⏰ 時間到！遊戲結束').catch(() => {});
      }
    });
  },
};
