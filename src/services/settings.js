const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'settings.db');

let db;

function getDb() {
  if (!db) {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');

    db.exec(`
      CREATE TABLE IF NOT EXISTS guild_settings (
        guild_id TEXT PRIMARY KEY,
        settings TEXT NOT NULL
      )
    `);

    logger.info(`SQLite 資料庫已連線: ${DB_PATH}`);
  }
  return db;
}

function getDefaults() {
  return {
    welcome: { enabled: false, channelId: '', message: '' },
    farewell: { enabled: false, channelId: '', message: '' },
    selfRoles: [],
    autoVoice: { channelId: '' },
  };
}

function getGuildSettings(guildId) {
  try {
    const row = getDb().prepare('SELECT settings FROM guild_settings WHERE guild_id = ?').get(guildId);
    if (row) {
      return { ...getDefaults(), ...JSON.parse(row.settings) };
    }
    const defaults = getDefaults();
    updateGuildSettings(guildId, defaults);
    return defaults;
  } catch (err) {
    logger.error(`讀取設定失敗 (${guildId}):`, err.message);
    return getDefaults();
  }
}

function updateGuildSettings(guildId, settings) {
  try {
    getDb().prepare(
      'INSERT INTO guild_settings (guild_id, settings) VALUES (?, ?) ON CONFLICT(guild_id) DO UPDATE SET settings = excluded.settings'
    ).run(guildId, JSON.stringify(settings));
    return settings;
  } catch (err) {
    logger.error(`儲存設定失敗 (${guildId}):`, err.message);
    return settings;
  }
}

function load() {
  try {
    const rows = getDb().prepare('SELECT guild_id, settings FROM guild_settings').all();
    const result = {};
    for (const row of rows) {
      result[row.guild_id] = JSON.parse(row.settings);
    }
    return result;
  } catch (err) {
    logger.error('載入所有設定失敗:', err.message);
    return {};
  }
}

function close() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = { load, getGuildSettings, updateGuildSettings, close };
