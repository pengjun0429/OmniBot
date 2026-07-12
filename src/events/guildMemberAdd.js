const { EmbedBuilder } = require('discord.js');
const settings = require('../services/settings');
const config = require('../config');
const logger = require('../utils/logger');
const raidTracker = require('../services/raid-tracker');

module.exports = {
  async execute(member) {
    const gs = settings.getGuildSettings(member.guild.id);

    if (gs.antiRaid?.enabled) {
      raidTracker.trackJoin(member.guild.id);
      const window = (gs.antiRaid.joinWindow || 10) * 1000;
      const threshold = gs.antiRaid.joinThreshold || 5;
      const recent = raidTracker.getJoinCount(member.guild.id, window);

      if (recent >= threshold) {
        try {
          if (gs.antiRaid.action === 'kick') {
            await member.kick('防轟炸：大量加入').catch(() => {});
          }

          const logCh = gs.antiRaid.logChannelId ? member.guild.channels.cache.get(gs.antiRaid.logChannelId) : null;
          if (logCh) {
            logCh.send(`🚨 **防轟炸觸發**\n偵測到 ${recent} 人在 ${gs.antiRaid.joinWindow || 10} 秒內加入，已${gs.antiRaid.action === 'kick' ? '踢出新成員' : '記錄'}`);
          }
        } catch (err) {
          logger.error(`防轟炸處理失敗:`, err.message);
        }
        return;
      }
    }

    const channelId = gs?.welcome?.channelId || config.welcomeChannelId;
    if (!channelId) return;

    try {
      const channel = member.guild.channels.cache.get(channelId);
      if (!channel) return;

      const firstRole = gs.selfRoles?.[0] ? member.guild.roles.cache.get(gs.selfRoles[0]) : null;
      const memberCount = member.guild.memberCount;

      const msg = (gs?.welcome?.message || `哈囉 {mention}，歡迎來到 {server}！\n👋 目前伺服器總人數：{count}人\n請先去 {channel} | 領取身分組 {role}\n祝你聊天愉快！`)
        .replace(/{mention}/g, `<@${member.id}>`)
        .replace(/{user}/g, member.user.tag)
        .replace(/{server}/g, member.guild.name)
        .replace(/{count}/g, memberCount)
        .replace(/{channel}/g, `<#${channel.id}>`)
        .replace(/{role}/g, firstRole ? `<@&${firstRole.id}>` : '@身分組');

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('🎉 歡迎加入伺服器')
        .setDescription(msg)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 128 }))
        .setFooter({ text: member.guild.name, icon_url: member.guild.iconURL() })
        .setTimestamp();

      const imageUrl = gs?.welcome?.image;
      if (imageUrl) embed.setImage(imageUrl);

      await channel.send({ embeds: [embed] });
    } catch (err) {
      logger.error(`歡迎訊息發送失敗:`, err.message);
    }
  },
};
