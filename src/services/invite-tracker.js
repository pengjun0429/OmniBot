const logger = require('../utils/logger');

const inviteCache = new Map();

module.exports = {
  async refresh(guild) {
    try {
      const invites = await guild.invites.fetch();
      const map = new Map();
      for (const [, invite] of invites) {
        map.set(invite.code, { code: invite.code, uses: invite.uses || 0, inviter: invite.inviter });
      }
      inviteCache.set(guild.id, map);
    } catch { /* 無權限 */ }
  },

  getCache(guildId) {
    return inviteCache.get(guildId) || new Map();
  },

  async detectJoin(guild) {
    try {
      const oldCache = inviteCache.get(guild.id);
      if (!oldCache) return null;
      const current = await guild.invites.fetch();
      for (const [, invite] of current) {
        const old = oldCache.get(invite.code);
        if (old && invite.uses > old.uses) {
          return { code: invite.code, inviter: invite.inviter, uses: invite.uses };
        }
      }
      const oldKeys = [...oldCache.keys()];
      for (const code of oldKeys) {
        if (!current.has(code)) {
          return { code, inviter: oldCache.get(code)?.inviter, uses: -1 };
        }
      }
      return null;
    } catch { return null; }
  },
};
