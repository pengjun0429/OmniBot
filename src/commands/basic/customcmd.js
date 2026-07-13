const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isTopAdmin } = require('../../utils/permissions');
const settings = require('../../services/settings');

module.exports = {
  category: '基本',
  data: new SlashCommandBuilder()
    .setName('customcmd')
    .setDescription('管理自訂指令')
    .addSubcommand(sub =>
      sub.setName('create')
        .setDescription('建立自訂指令')
        .addStringOption(opt => opt.setName('名稱').setDescription('指令名稱（用 /tag 呼叫）').setRequired(true))
        .addStringOption(opt => opt.setName('回覆').setDescription('回覆內容').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('delete')
        .setDescription('刪除自訂指令')
        .addStringOption(opt => opt.setName('名稱').setDescription('要刪除的指令名稱').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('列出所有自訂指令')),
  async execute(interaction) {
    const gs = settings.getGuildSettings(interaction.guild.id);
    if (!isTopAdmin(interaction.member, gs.adminRoles?.topIds || [])) {
      return interaction.reply({ content: '只有可愛的管管們才能使用此指令', ephemeral: true });
    }
    if (!gs.customCommands) gs.customCommands = {};
    const sub = interaction.options.getSubcommand();

    if (sub === 'create') {
      const name = interaction.options.getString('名稱');
      const reply = interaction.options.getString('回覆');
      if (gs.customCommands[name]) {
        return interaction.reply({ content: `❌ 自訂指令 \`${name}\` 已存在`, ephemeral: true });
      }
      gs.customCommands[name] = reply;
      settings.updateGuildSettings(interaction.guild.id, gs);
      return interaction.reply({ content: `✅ 已建立自訂指令 \`${name}\``, ephemeral: true });
    }

    if (sub === 'delete') {
      const name = interaction.options.getString('名稱');
      if (!gs.customCommands[name]) {
        return interaction.reply({ content: `❌ 找不到自訂指令 \`${name}\``, ephemeral: true });
      }
      delete gs.customCommands[name];
      settings.updateGuildSettings(interaction.guild.id, gs);
      return interaction.reply({ content: `✅ 已刪除自訂指令 \`${name}\``, ephemeral: true });
    }

    if (sub === 'list') {
      const names = Object.keys(gs.customCommands);
      if (names.length === 0) return interaction.reply({ content: '📋 目前沒有自訂指令', ephemeral: true });
      const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle('📋 自訂指令列表')
        .setDescription(names.map(n => `\`${n}\``).join('\n'));
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};
