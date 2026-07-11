const { ActivityType } = require('discord.js');
const logger = require('./logger');

const ACTIVITIES = [
  { name: '/help | 管理你的伺服器', type: ActivityType.Playing },
  { name: '成員的請求', type: ActivityType.Listening },
  { name: '伺服器動態', type: ActivityType.Watching },
];

let interval = null;

function start(client) {
  let index = 0;
  const set = () => {
    const activity = ACTIVITIES[index % ACTIVITIES.length];
    try {
      client.user.setPresence({ activities: [{ name: activity.name, type: activity.type }], status: 'online' });
    } catch (err) {
      logger.error('設定狀態失敗:', err.message);
    }
    index++;
  };
  set();
  interval = setInterval(set, 30_000);
}

function stop() {
  if (interval) { clearInterval(interval); interval = null; }
}

function setCustom(client, name, type = ActivityType.Playing) {
  stop();
  client.user.setPresence({ activities: [{ name, type }], status: 'online' });
  logger.info(`已設定自訂狀態: ${name}`);
}

module.exports = { start, stop, setCustom };
