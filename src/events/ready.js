const logger = require('../utils/logger');
const inviteTracker = require('../services/invite-tracker');
const counterService = require('../services/counter-service');

module.exports = {
  once: true,
  async execute(client) {
    logger.info(`已登入為 ${client.user.tag}`);
    const guilds = [...client.guilds.cache.values()];
    const results = await Promise.allSettled(guilds.map(g => inviteTracker.refresh(g)));
    const ok = results.filter(r => r.status === 'fulfilled').length;
    logger.info(`邀請快取已初始化: ${ok}/${guilds.length} 個伺服器成功`);
    counterService.init(client);
    logger.info('計數器服務已啟動');
  },
};
