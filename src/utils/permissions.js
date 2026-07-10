const { PermissionFlagsBits } = require('discord.js');

function isTopAdmin(member) {
  return member.permissions.has(PermissionFlagsBits.Administrator) ||
         member.permissions.has(PermissionFlagsBits.ManageGuild);
}

function isModerator(member) {
  return member.permissions.has(PermissionFlagsBits.ModerateMembers) ||
         member.permissions.has(PermissionFlagsBits.KickMembers);
}

function canTarget(member, target) {
  if (member.id === target.id) return false;
  if (member.id === member.guild.ownerId) return true;
  return member.roles.highest.position > target.roles.highest.position;
}

module.exports = { isTopAdmin, isModerator, canTarget };
