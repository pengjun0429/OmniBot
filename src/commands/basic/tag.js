const { SlashCommandBuilder } = require('discord.js');
const settings = require('../../services/settings');

module.exports = {
  category: '基本',
  data: new SlashCommandBuilder()
    .setName('tag')
    .setDescription('查看自訂回覆')
    .addStringOption(opt =>
      opt.setName('名稱').setDescription('自訂指令名稱').setRequired(true).setAutocomplete(true)),
  async execute(interaction) {
    const gs = settings.getGuildSettings(interaction.guild.id);
    const cmds = gs.customCommands || {};
    const name = interaction.options.getString('名稱');

    if (!cmds[name]) {
      return interaction.reply({ content: `❌ 找不到自訂指令 \`${name}\``, ephemeral: true });
    }

    await interaction.reply(cmds[name]);
  },
};
