const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const logger = require('../../utils/logger');

module.exports = {
  category: '管理',
  data: new SlashCommandBuilder()
    .setName('nick')
    .setDescription('管理成員暱稱')
    .addSubcommand(sub =>
      sub.setName('set')
        .setDescription('設定成員暱稱')
        .addUserOption(opt => opt.setName('成員').setDescription('目標成員').setRequired(true))
        .addStringOption(opt => opt.setName('名稱').setDescription('新暱稱（不填則重設為使用者名稱）').setRequired(false)))
    .addSubcommand(sub =>
      sub.setName('massreset')
        .setDescription('重設所有成員的暱稱'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'set') {
      const target = interaction.options.getMember('成員');
      if (!target) return interaction.reply({ content: '找不到該成員', ephemeral: true });

      if (target.id === interaction.client.user.id) {
        return interaction.reply({ content: '❌ 無法修改機器人暱稱', ephemeral: true });
      }
      if (target.id === interaction.guild.ownerId) {
        return interaction.reply({ content: '❌ 無法修改伺服器擁有者暱稱', ephemeral: true });
      }
      if (target.roles.highest.position >= interaction.member.roles.highest.position && interaction.member.id !== interaction.guild.ownerId) {
        return interaction.reply({ content: '❌ 你的身分組層級不足以修改該成員暱稱', ephemeral: true });
      }
      if (target.roles.highest.position >= interaction.guild.members.me.roles.highest.position) {
        return interaction.reply({ content: '❌ 機器人的身分組層級不足以修改該成員暱稱', ephemeral: true });
      }

      const nickname = interaction.options.getString('名稱');
      try {
        await target.setNickname(nickname);
        const msg = nickname ? `已將 ${target.user.tag} 的暱稱設為：${nickname}` : `已重設 ${target.user.tag} 的暱稱`;
        await interaction.reply({ content: `✅ ${msg}`, ephemeral: true });
      } catch (err) {
        logger.error(`nick set 失敗:`, err.message);
        await interaction.reply({ content: '❌ 暱稱設定失敗，請檢查機器人權限', ephemeral: true });
      }
      return;
    }

    if (sub === 'massreset') {
      if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageNicknames)) {
        return interaction.reply({ content: '❌ 機器人缺少管理暱稱權限', ephemeral: true });
      }
      await interaction.deferReply({ ephemeral: true });

      await interaction.guild.members.fetch();
      const members = [...interaction.guild.members.cache.values()];
      let success = 0;
      let fail = 0;
      const tasks = members.map(async (member) => {
        if (member.id === interaction.client.user.id) return;
        if (member.id === interaction.guild.ownerId) return;
        if (member.roles.highest.position >= interaction.guild.members.me.roles.highest.position) return;
        if (!member.nickname) return;
        try {
          await member.setNickname(null);
          success++;
        } catch {
          fail++;
        }
      });
      await Promise.allSettled(tasks);

      const totalWithNick = members.filter(m => m.nickname).length;
      await interaction.editReply({
        content: `✅ 重設暱稱完成\n已清除：${success} 人\n失敗：${fail} 人\n尚有暱稱：${totalWithNick} 人（權限不足略過）`,
      });
    }
  },
};
