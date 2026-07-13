const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const pinyin = require('pinyin');

const games = new Map();

function getPinyin(char) {
  const res = pinyin(char, { style: pinyin.STYLE_NORMAL });
  return (res[0] || [''])[0];
}

module.exports = {
  category: '娛樂',
  data: new SlashCommandBuilder()
    .setName('idiom')
    .setDescription('🧩 成語接龍')
    .addStringOption(o => o.setName('詞').setDescription('你要接的成語').setRequired(false)),
  async execute(interaction) {
    const word = interaction.options.getString('詞');
    const channelId = interaction.channel.id;

    if (!word) {
      if (games.has(channelId)) {
        return interaction.reply({ content: `🧩 目前正在接龍中，上一個詞是：**${games.get(channelId).lastWord}**`, ephemeral: true });
      }
      return interaction.reply({ content: '❌ 使用方式：`/idiom 成語` 開始或加入接龍', ephemeral: true });
    }

    if (word.length < 2) return interaction.reply({ content: '❌ 請輸入至少 2 個字', ephemeral: true });

    let game = games.get(channelId);

    if (!game) {
      game = { lastWord: word, players: [], lastPlayer: null };
      games.set(channelId, game);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x22d3ee).setTitle('🧩 成語接龍開始！').setDescription(`第一個詞：**${word}**\n下一位請接以「**${word[word.length - 1]}**」開頭的成語`)] });
    }

    if (game.lastPlayer === interaction.user.id) {
      return interaction.reply({ content: '❌ 不能連續接龍，等別人接！', ephemeral: true });
    }

    const lastChar = game.lastWord[game.lastWord.length - 1];
    const firstChar = word[0];

    const lastPinyin = getPinyin(lastChar);
    const firstPinyin = getPinyin(firstChar);

    if (lastPinyin !== firstPinyin) {
      return interaction.reply({ content: `❌ 「${firstChar}」的發音是 **${firstPinyin}**，需要以「${lastChar}」的發音 **${lastPinyin}** 開頭`, ephemeral: true });
    }

    game.lastWord = word;
    game.lastPlayer = interaction.user.id;
    if (!game.players.includes(interaction.user.id)) game.players.push(interaction.user.id);

    await interaction.reply({ embeds: [new EmbedBuilder().setColor(0x22d3ee).setDescription(`✅ ${interaction.user} → **${word}**\n下一個以「**${word[word.length - 1]}**」開頭`)] });
  },
};
