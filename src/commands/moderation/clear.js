const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  category: '管理',
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('清除指定數量的訊息')
    .addIntegerOption(option =>
      option.setName('數量').setDescription('要清除的訊息數（1-100）').setRequired(true).setMinValue(1).setMaxValue(100))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  async execute(interaction) {
    const amount = interaction.options.getInteger('數量');

    const messages = await interaction.channel.bulkDelete(amount, true);

    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setDescription(`已清除 ${messages.size} 則訊息`)
      .setTimestamp();

    const reply = await interaction.reply({ embeds: [embed] });
    setTimeout(() => reply.delete().catch(() => {}), 3000);
  },
};
