const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('查看所有可用指令'),
  async execute(interaction) {
    const commands = interaction.client.commands;

    const categories = {};
    for (const [, cmd] of commands) {
      const category = cmd.category || '其他';
      if (!categories[category]) categories[category] = [];
      categories[category].push(`\`/${cmd.data.name}\` - ${cmd.data.description}`);
    }

    const embed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle('🤖 機器人指令列表')
      .setDescription('以下是所有可用的斜線指令')
      .setTimestamp();

    for (const [category, cmds] of Object.entries(categories)) {
      embed.addFields({ name: category, value: cmds.join('\n'), inline: false });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
