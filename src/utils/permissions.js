const { PermissionFlagsBits } = require('discord.js');

function isTopAdmin(member, topRoleIds = []) {
  return member.permissions.has(PermissionFlagsBits.Administrator) ||
         member.permissions.has(PermissionFlagsBits.ManageGuild) ||
         (topRoleIds.length > 0 && member.roles.cache.some(r => topRoleIds.includes(r.id)));
}

function isModerator(member, modRoleIds = []) {
  return member.permissions.has(PermissionFlagsBits.Administrator) ||
         member.permissions.has(PermissionFlagsBits.ModerateMembers) ||
         member.permissions.has(PermissionFlagsBits.KickMembers) ||
         (modRoleIds.length > 0 && member.roles.cache.some(r => modRoleIds.includes(r.id)));
}

function canTarget(member, target) {
  if (member.id === target.id) return false;
  if (member.id === member.guild.ownerId) return true;
  return member.roles.highest.position > target.roles.highest.position;
}

module.exports = { isTopAdmin, isModerator, canTarget };
