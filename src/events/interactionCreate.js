const logger = require('../utils/logger');
const settings = require('../services/settings');

module.exports = {
  async execute(interaction) {
    if (interaction.isButton() && interaction.customId.startsWith('role_toggle_')) {
      return handleRoleToggle(interaction);
    }

    if (interaction.isButton() && interaction.customId === 'ticket_open') {
      return handleTicketCreate(interaction);
    }

    if (interaction.isButton() && interaction.customId === 'ticket_close') {
      return handleTicketClose(interaction);
    }

    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) return;

    const { cooldowns } = interaction.client;

    if (!cooldowns.has(command.data.name)) {
      cooldowns.set(command.data.name, new Map());
    }

    const now = Date.now();
    const timestamps = cooldowns.get(command.data.name);
    const cooldownAmount = (command.cooldown || 3) * 1000;

    if (timestamps.has(interaction.user.id)) {
      const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;

      if (now < expirationTime) {
        const timeLeft = (expirationTime - now) / 1000;
        return interaction.reply({
          content: `請稍等 ${timeLeft.toFixed(1)} 秒後再使用此指令`,
          ephemeral: true,
        });
      }
    }

    timestamps.set(interaction.user.id, now);
    setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

    try {
      await command.execute(interaction);
    } catch (err) {
      logger.error(`執行指令 ${interaction.commandName} 時發生錯誤:`, err);

      const reply = {
        content: '執行指令時發生錯誤，請稍後再試',
        ephemeral: true,
      };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(reply);
      } else {
        await interaction.reply(reply);
      }
    }
  },
};

async function handleTicketClose(interaction) {
  if (!interaction.channel.name.startsWith('ticket-')) {
    return interaction.reply({ content: '❌ 這不是工單頻道', ephemeral: true });
  }
  const gs = settings.getGuildSettings(interaction.guild.id);
  const ticketRoles = gs.ticket?.roleIds || [];
  const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator) || interaction.member.roles.cache.some(r => (gs.adminRoles?.topIds || []).includes(r.id));
  const hasRole = ticketRoles.length === 0 || interaction.member.roles.cache.some(r => ticketRoles.includes(r.id));
  if (!isAdmin && !hasRole) {
    return interaction.reply({ content: '❌ 只有管理員可以關閉工單', ephemeral: true });
  }
  await interaction.reply({ content: '🔒 此工單將在 5 秒後關閉...' });
  setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
}

async function handleTicketCreate(interaction) {
  try {
    const gs = settings.getGuildSettings(interaction.guild.id);
    const ticketConfig = gs.ticket || {};
    const categoryId = ticketConfig.categoryId;
    const roleIds = ticketConfig.roleIds.length > 0 ? ticketConfig.roleIds : [interaction.guild.roles.everyone.id];

    const ticketNumber = Date.now().toString(36).slice(-4);
    const channelName = `ticket-${interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}-${ticketNumber}`;

    const channel = await interaction.guild.channels.create({
      name: channelName,
      type: 0,
      parent: categoryId || null,
      permissionOverwrites: [
        { id: interaction.guild.roles.everyone.id, deny: ['ViewChannel'] },
        { id: interaction.user.id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] },
        ...roleIds.map(id => ({ id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] })),
      ],
    });

    const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`🎫 ${interaction.user.username} 的工單`)
      .setDescription('管理員即將為你處理，請描述你的問題。')
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ticket_close').setLabel('🔒 關閉工單').setStyle(ButtonStyle.Danger)
    );

    await channel.send({ content: `<@${interaction.user.id}>`, embeds: [embed], components: [row] });
    await interaction.reply({ content: `✅ 已建立工單 ${channel}`, ephemeral: true });
  } catch (err) {
    logger.error('建立工單失敗:', err);
    await interaction.reply({ content: '❌ 建立工單失敗', ephemeral: true });
  }
}

async function handleRoleToggle(interaction) {
  const [, , guildId, roleId] = interaction.customId.split('_');

  if (interaction.guild.id !== guildId) {
    return interaction.reply({ content: '此按鈕不屬於此伺服器', ephemeral: true });
  }

  const role = interaction.guild.roles.cache.get(roleId);
  if (!role) {
    return interaction.reply({ content: '身分組已不存在', ephemeral: true });
  }

  const me = interaction.guild.members.me;
  if (!me.permissions.has('ManageRoles')) {
    return interaction.reply({ content: '❌ 機器人缺少「管理身分組」權限', ephemeral: true });
  }

  if (role.position >= me.roles.highest.position) {
    return interaction.reply({ content: '❌ 機器人的角色層級不足以管理該身分組（請將機器人角色往上移）', ephemeral: true });
  }

  const member = interaction.member;
  const has = member.roles.cache.has(roleId);

  try {
    if (has) {
      await member.roles.remove(role);
      await interaction.reply({ content: `✅ 已移除 ${role.name}`, ephemeral: true });
    } else {
      await member.roles.add(role);
      await interaction.reply({ content: `✅ 已為你加入 ${role.name}`, ephemeral: true });
    }
  } catch (err) {
      logger.error(`身分組操作失敗 (${role.name}):`, err);
    await interaction.reply({ content: `❌ ${err.code === 50013 ? '機器人缺少權限（Missing Permissions），請檢查角色層級與管理身分組權限' : '操作失敗：' + err.message}`, ephemeral: true });
  }
}
