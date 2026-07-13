const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

const games = new Map();

module.exports = {
  category: '娛樂',
  data: new SlashCommandBuilder()
    .setName('turtlesoup')
    .setDescription('🔮 AI 海龜湯 - Gemini 驅動的推理遊戲')
    .addSubcommand(s => s.setName('start').setDescription('開始一局海龜湯'))
    .addSubcommand(s => s.setName('guess').setDescription('提出你的問題').addStringOption(o => o.setName('問題').setDescription('是非題').setRequired(true)))
    .addSubcommand(s => s.setName('answer').setDescription('猜答案').addStringOption(o => o.setName('答案').setDescription('你覺得真相是什麼').setRequired(true))),
  async execute(interaction) {
    const key = process.env.GEMINI_API_KEY;

    if (interaction.options.getSubcommand() === 'start') {
      if (!key) return interaction.reply({ content: '❌ 未設定 GEMINI_API_KEY', ephemeral: true });
      if (games.has(interaction.channel.id)) return interaction.reply({ content: '❌ 此頻道已有進行中的海龜湯', ephemeral: true });

      await interaction.deferReply();
      try {
        const res = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`, {
          contents: [{ parts: [{ text: '請創作一個簡短的原創海龜湯（懸疑推理謎題），格式：\n題目：[簡短描述一個奇怪的情境]\n答案：[合理的解釋]\n只需要這兩個欄位，不要其他文字。' }] }],
        }, { timeout: 15000 });

        const text = res.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const titleMatch = text.match(/題目[：:]\s*(.+)/);
        const answerMatch = text.match(/答案[：:]\s*(.+)/);
        const title = titleMatch?.[1] || '未知謎題';
        const answer = answerMatch?.[1] || '未知答案';

        games.set(interaction.channel.id, { answer, questions: 0 });

        const embed = new EmbedBuilder()
          .setColor(0x8b5cf6).setTitle('🔮 海龜湯')
          .setDescription(title)
          .setFooter({ text: '使用 /turtlesoup guess 提問（只能問是非題）或 /turtlesoup answer 猜答案' });

        await interaction.editReply({ embeds: [embed] });
      } catch {
        await interaction.editReply('❌ Gemini API 錯誤');
      }
      return;
    }

    const game = games.get(interaction.channel.id);
    if (!game) return interaction.reply({ content: '❌ 此頻道沒有進行中的海龜湯，請用 `/turtlesoup start` 開始', ephemeral: true });

    if (interaction.options.getSubcommand() === 'guess') {
      if (!key) return interaction.reply({ content: '❌ 未設定 GEMINI_API_KEY', ephemeral: true });
      const question = interaction.options.getString('問題');
      await interaction.deferReply();

      try {
        const res = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`, {
          contents: [{ parts: [{ text: `海龜湯謎題的答案是：${game.answer}\n玩家問：${question}\n請只回答「是」、「否」或「無關」，並簡短解釋原因。` }] }],
        }, { timeout: 15000 });

        const reply = res.data?.candidates?.[0]?.content?.parts?.[0]?.text || '無法回答';
        game.questions++;
        await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x8b5cf6).setDescription(`❓ **${question}**\n🤖 ${reply}`)] });
      } catch {
        await interaction.editReply('❌ Gemini API 錯誤');
      }
      return;
    }

    if (interaction.options.getSubcommand() === 'answer') {
      const ans = interaction.options.getString('答案');
      const correct = ans.includes(game.answer) || game.answer.includes(ans);
      games.delete(interaction.channel.id);
      if (correct) {
        return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x4ade80).setTitle('✅ 答對了！').setDescription(`答案是：**${game.answer}**\n共提問 ${game.questions} 次`)] });
      }
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xef4444).setTitle('❌ 不對喔').setDescription(`答案是：**${game.answer}**`)] });
    }
  },
};
