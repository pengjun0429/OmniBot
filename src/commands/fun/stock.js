const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const settings = require('../../services/settings');

module.exports = {
  category: '娛樂',
  data: new SlashCommandBuilder()
    .setName('stock')
    .setDescription('📈 虛擬股市')
    .addSubcommand(s => s.setName('list').setDescription('查看所有股票'))
    .addSubcommand(s => s.setName('view').setDescription('查看股票詳情').addStringOption(o => o.setName('代號').setDescription('股票代號').setRequired(true)))
    .addSubcommand(s => s.setName('buy').setDescription('買入股票').addStringOption(o => o.setName('代號').setRequired(true)).addIntegerOption(o => o.setName('股數').setRequired(true).setMinValue(1)))
    .addSubcommand(s => s.setName('sell').setDescription('賣出股票').addStringOption(o => o.setName('代號').setRequired(true)).addIntegerOption(o => o.setName('股數').setRequired(true).setMinValue(1)))
    .addSubcommand(s => s.setName('portfolio').setDescription('查看你的持股')),
  async execute(interaction) {
    const gs = settings.getGuildSettings(interaction.guild.id);
    if (!gs.economy) gs.economy = { users: {}, stocks: {} };
    if (!gs.economy.stocks) gs.economy.stocks = {
      OMNIBOT: { name: 'OmniBot 科技', price: 100, supply: 10000 },
      DISCORD: { name: 'Discord 互動', price: 50, supply: 50000 },
      AI: { name: 'AI 人工智慧', price: 200, supply: 5000 },
    };

    const sub = interaction.options.getSubcommand();

    if (sub === 'list') {
      const list = Object.entries(gs.economy.stocks).map(([code, s]) =>
        `**${code}** - ${s.name} | 💰 $${s.price} | 流通: ${s.supply.toLocaleString()}股`
      ).join('\n');
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x22d3ee).setTitle('📈 股市列表').setDescription(list)], ephemeral: true });
    }

    if (sub === 'view') {
      const code = interaction.options.getString('代號').toUpperCase();
      const stock = gs.economy.stocks[code];
      if (!stock) return interaction.reply({ content: '❌ 找不到此股票', ephemeral: true });
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x22d3ee).setTitle(`📊 ${code}`).addFields(
        { name: '名稱', value: stock.name, inline: true },
        { name: '股價', value: `💰 $${stock.price}`, inline: true },
        { name: '流通量', value: `${stock.supply.toLocaleString()}股`, inline: true },
      )], ephemeral: true });
    }

    if (sub === 'buy' || sub === 'sell') {
      const code = interaction.options.getString('代號').toUpperCase();
      const amount = interaction.options.getInteger('股數');
      const stock = gs.economy.stocks[code];
      if (!stock) return interaction.reply({ content: '❌ 找不到此股票', ephemeral: true });

      const uid = interaction.user.id;
      if (!gs.economy.users[uid]) gs.economy.users[uid] = { cash: 10000, stocks: {} };
      const user = gs.economy.users[uid];

      if (sub === 'buy') {
        const cost = stock.price * amount;
        if (user.cash < cost) return interaction.reply({ content: `❌ 餘額不足！需要 $${cost}，你只有 $${user.cash}`, ephemeral: true });
        if (amount > stock.supply) return interaction.reply({ content: `❌ 流通量不足！只剩 ${stock.supply} 股`, ephemeral: true });

        user.cash -= cost;
        if (!user.stocks[code]) user.stocks[code] = 0;
        user.stocks[code] += amount;
        stock.supply -= amount;
        stock.price = Math.max(1, Math.round(stock.price * (1 + (amount / 10000) * 10)));
        settings.updateGuildSettings(interaction.guild.id, gs);
        return interaction.reply({ content: `✅ 以 $${cost} 買入 ${amount} 股 ${code}`, ephemeral: true });
      } else {
        const held = user.stocks[code] || 0;
        if (held < amount) return interaction.reply({ content: `❌ 你只有 ${held} 股 ${code}`, ephemeral: true });

        const revenue = stock.price * amount;
        user.cash += revenue;
        user.stocks[code] -= amount;
        stock.supply += amount;
        stock.price = Math.max(1, Math.round(stock.price * (1 - (amount / 10000) * 10)));
        settings.updateGuildSettings(interaction.guild.id, gs);
        return interaction.reply({ content: `✅ 以 $${revenue} 賣出 ${amount} 股 ${code}`, ephemeral: true });
      }
    }

    if (sub === 'portfolio') {
      const uid = interaction.user.id;
      const user = gs.economy?.users?.[uid];
      if (!user || Object.keys(user.stocks || {}).length === 0) {
        return interaction.reply({ content: '📋 你目前沒有持股。可用現金：$' + (user?.cash || 10000), ephemeral: true });
      }
      const list = Object.entries(user.stocks).filter(([, a]) => a > 0).map(([code, a]) => {
        const s = gs.economy.stocks[code];
        return `**${code}** ${a}股 × $${s?.price || 0} = 💰 $${a * (s?.price || 0)}`;
      }).join('\n');
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x22d3ee).setTitle('📋 我的持股').setDescription(`現金：$${user.cash}\n${list}`)], ephemeral: true });
    }
  },
};
