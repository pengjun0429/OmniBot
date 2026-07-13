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
    clientSecret: process.env.DISCORD_CLIENT_SECRET || '',
    redirectUri: process.env.DISCORD_REDIRECT_URI || '',
  },
  weatherApiKey: process.env.WEATHER_API_KEY || '',
};
