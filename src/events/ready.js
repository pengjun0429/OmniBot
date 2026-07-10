const logger = require('../utils/logger');

module.exports = {
  once: true,
  execute(client) {
    logger.info(`已登入為 ${client.user.tag}`);
    client.user.setActivity('/help 查看指令', { type: 3 });
  },
};
