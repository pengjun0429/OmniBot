const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const googleDb = require('./google-db');

const SETTINGS_DIR = path.join(__dirname, '..', '..', 'data');
const SETTINGS_PATH = path.join(SETTINGS_DIR, 'settings.json');

let cache = null;
let useGoogle = false;

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
    ticket: { categoryId: '', roleIds: [], channelId: '' },
    autoMod: { enabled: false, words: [], blockLinks: false, logChannelId: '', punishment: 'delete', timeoutMinutes: 10, logLevel: 'all', strikes: { 2: 'timeout', 3: 'kick' }, strikeResetHours: 24, userStrikes: {} },
    roleGive: { channelId: '' },
    messageLog: { channelId: '' },
    messageLogAll: { channelId: '' },
    adminRoles: { topIds: [], modIds: [] },
    blockedUsers: [],
    customCommands: {},
  };
}

async function loadFromGoogle() {
  try {
    const all = await googleDb.getAll();
    if (all && Object.keys(all).length > 0) {
      cache = {};
      for (const [gid, data] of Object.entries(all)) {
        cache[gid] = { ...getDefaults(), ...data };
      }
      save(); // backup to JSON
      logger.info(`從 Google Sheets 載入 ${Object.keys(cache).length} 個伺服器設定`);
      return true;
    }
  } catch {}
  return false;
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
    data[guildId] = { ...getDefaults() };
    save();
  }
  return data[guildId];
}

function updateGuildSettings(guildId, settings) {
  const data = load();
  data[guildId] = { ...data[guildId], ...settings };
  save();
  if (useGoogle) {
    googleDb.set(guildId, data[guildId]).catch(() => {});
  }
  return data[guildId];
}

async function init() {
  if (process.env.GOOGLE_DB_URL) {
    googleDb.setUrl(process.env.GOOGLE_DB_URL);
    const ok = await googleDb.health();
    if (ok) {
      useGoogle = true;
      logger.info('Google Sheets 資料庫連線成功');
      await loadFromGoogle();
    } else {
      logger.warn('Google Sheets 連線失敗，使用本地 JSON');
    }
  }
}

module.exports = { load, getGuildSettings, updateGuildSettings, init };
