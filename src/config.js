require('dotenv').config();

const REQUIRED_KEYS = ['DISCORD_TOKEN', 'DISCORD_CLIENT_ID'];

for (const key of REQUIRED_KEYS) {
  if (!process.env[key]) {
    console.error(`缺少必要環境變數: ${key}`);
    process.exit(1);
  }
}

module.exports = {
  discord: {
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.DISCORD_CLIENT_ID,
  },
  admin: {
    port: parseInt(process.env.ADMIN_PORT, 10) || 3000,
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD || 'admin123',
  },
  weatherApiKey: process.env.WEATHER_API_KEY || '',
  welcomeChannelId: process.env.WELCOME_CHANNEL_ID || '',
  farewellChannelId: process.env.FAREWELL_CHANNEL_ID || '',
};
