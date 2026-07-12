const RAID_WINDOW = 60000;

const joins = {};
const messages = {};

function clean() {
  const now = Date.now();
  for (const gid of Object.keys(joins)) {
    joins[gid] = joins[gid].filter(t => now - t < RAID_WINDOW);
    if (joins[gid].length === 0) delete joins[gid];
  }
  for (const gid of Object.keys(messages)) {
    for (const uid of Object.keys(messages[gid])) {
      messages[gid][uid] = messages[gid][uid].filter(t => now - t < RAID_WINDOW);
      if (messages[gid][uid].length === 0) delete messages[gid][uid];
    }
    if (Object.keys(messages[gid]).length === 0) delete messages[gid];
  }
}

setInterval(clean, 30000);

module.exports = {
  trackJoin(guildId) {
    if (!joins[guildId]) joins[guildId] = [];
    joins[guildId].push(Date.now());
    return joins[guildId].length;
  },

  trackMessage(guildId, userId) {
    if (!messages[guildId]) messages[guildId] = {};
    if (!messages[guildId][userId]) messages[guildId][userId] = [];
    messages[guildId][userId].push(Date.now());
    return messages[guildId][userId].length;
  },

  getJoinCount(guildId, windowMs) {
    const now = Date.now();
    return (joins[guildId] || []).filter(t => now - t < windowMs).length;
  },

  getSpamCount(guildId, userId, windowMs) {
    const now = Date.now();
    return (messages[guildId]?.[userId] || []).filter(t => now - t < windowMs).length;
  },
};
