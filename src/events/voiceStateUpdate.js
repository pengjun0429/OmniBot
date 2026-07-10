const { ChannelType, PermissionFlagsBits } = require('discord.js');
const settings = require('../services/settings');
const logger = require('../utils/logger');

const TEMP_CHANNEL_PREFIX = '🛋️ ';

module.exports = {
  async execute(oldState, newState) {
    const guild = newState.guild || oldState.guild;
    const gs = settings.getGuildSettings(guild.id);
    const creationId = gs?.autoVoice?.channelId;
    if (!creationId) return;

    const member = newState.member || oldState.member;
    if (!member) return;

    const client = guild.client;
    if (!client.voiceOwners) client.voiceOwners = new Map();

    if (newState.channelId === creationId) {
      try {
        const creationChannel = newState.channel;
        const parentId = creationChannel.parentId;
        const everyoneRole = guild.roles.everyone;

        const tempChannel = await guild.channels.create({
          name: `${TEMP_CHANNEL_PREFIX}${member.displayName} 的包房`,
          type: ChannelType.GuildVoice,
          parent: parentId,
          permissionOverwrites: [
            { id: everyoneRole.id, allow: [PermissionFlagsBits.Connect] },
            { id: member.id,
              allow: [
                PermissionFlagsBits.Connect,
                PermissionFlagsBits.ManageChannels,
                PermissionFlagsBits.MuteMembers,
                PermissionFlagsBits.DeafenMembers,
                PermissionFlagsBits.MoveMembers,
              ],
            },
          ],
        });

        await member.voice.setChannel(tempChannel);
        client.voiceOwners.set(tempChannel.id, member.id);
        logger.info(`${member.user.tag} 創建了語音包房 ${tempChannel.name}`);
      } catch (err) {
        logger.error(`創建語音包房失敗:`, err);
      }
    }

    if (oldState.channelId && oldState.channelId !== creationId) {
      const oldChannel = oldState.channel;
      if (!oldChannel) return;

      if (client.voiceOwners.has(oldChannel.id)) {
        setTimeout(async () => {
          try {
            const channel = guild.channels.cache.get(oldChannel.id);
            if (channel && channel.members.size === 0) {
              client.voiceOwners.delete(channel.id);
              await channel.delete();
              logger.info(`語音包房 ${channel.name} 已自動刪除`);
            }
          } catch (err) {
            logger.error(`刪除語音包房失敗:`, err);
          }
        }, 3000);
      }
    }
  },
};
