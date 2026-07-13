const logger = require('../utils/logger');
const inviteTracker = require('../services/invite-tracker');

module.exports = {
  once: true,
  execute(client) {
    logger.info(`已登入為 ${client.user.tag}`);
    for (const [, guild] of client.guilds.cache) {
      inviteTracker.refresh(guild).catch(() => {});
    }
    logger.info('邀請快取已初始化');
  },
};
