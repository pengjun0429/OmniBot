const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const SETTINGS_PATH = path.join(__dirname, '..', '..', 'data', 'settings.json');

let cache = null;

function ensureDir() {
  const dir = path.dirname(SETTINGS_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
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
    data[guildId] = {
      welcome: { enabled: false, channelId: '', message: '' },
      farewell: { enabled: false, channelId: '', message: '' },
    };
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
