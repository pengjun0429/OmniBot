const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  category: '管理',
  data: new SlashCommandBuilder()
    .setName('notify')
    .setDescription('發送手機通知到指定頻道（@提及所有人）')
    .addStringOption(opt => opt.setName('訊息').setDescription('通知內容').setRequired(true))
    .addChannelOption(opt => opt.setName('頻道').setDescription('發送頻道（預設當前）').setRequired(false))
    .addStringOption(opt => opt.setName('提及').setDescription('要提及的對象').setRequired(false)
      .addChoices(
        { name: '@everyone', value: 'everyone' },
        { name: '@here', value: 'here' },
      ))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    const msg = interaction.options.getString('訊息');
    const channel = interaction.options.getChannel('頻道') || interaction.channel;
    const ping = interaction.options.getString('提及');

    const embed = new EmbedBuilder()
      .setColor(0xef4444)
      .setTitle('🔔 通知')
      .setDescription(msg)
      .setFooter({ text: `來自 ${interaction.user.tag}` })
      .setTimestamp();

    const content = ping === 'everyone' ? '@everyone' : ping === 'here' ? '@here' : '';
    await channel.send({ content, embeds: [embed] });
    await interaction.reply({ content: `✅ 通知已發送到 ${channel}`, ephemeral: true });
  },
};
