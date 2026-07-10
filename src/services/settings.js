const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const SETTINGS_DIR = path.join(__dirname, '..', '..', 'data');
const SETTINGS_PATH = path.join(SETTINGS_DIR, 'settings.json');

let cache = null;

function ensureDir() {
  if (!fs.existsSync(SETTINGS_DIR)) {
    fs.mkdirSync(SETTINGS_DIR, { recursive: true });
    logger.info(`建立資料目錄: ${SETTINGS_DIR}`);
  }
}

function getDefaults() {
  return {
    welcome: { enabled: false, channelId: '', message: '' },
    farewell: { enabled: false, channelId: '', message: '' },
    selfRoles: [],
    autoVoice: { channelId: '' },
  };
}

function load() {
  if (cache) return cache;
  ensureDir();
  try {
    if (fs.existsSync(SETTINGS_PATH)) {
      cache = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8'));
    } else {
      cache = {};
      save();
    }
  } catch (err) {
    logger.error('讀取設定檔失敗:', err.message);
    cache = {};
  }
  return cache;
}

function save() {
  ensureDir();
  try {
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(cache, null, 2), 'utf-8');
  } catch (err) {
    logger.error('儲存設定檔失敗:', err.message);
  }
}

function getGuildSettings(guildId) {
  const data = load();
  if (!data[guildId]) {
    data[guildId] = getDefaults();
    save();
  }
  return data[guildId];
}

function updateGuildSettings(guildId, settings) {
  const data = load();
  data[guildId] = { ...data[guildId], ...settings };
  save();
  return data[guildId];
}

module.exports = { load, getGuildSettings, updateGuildSettings };
