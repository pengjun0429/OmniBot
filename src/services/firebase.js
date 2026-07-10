const admin = require('firebase-admin');
const path = require('path');
const config = require('../config');
const logger = require('../utils/logger');

let db = null;
let ready = false;

function init() {
  if (db) return db;

  const serviceAccountPath = path.resolve(config.firebase.serviceAccountPath);

  try {
    const serviceAccount = require(serviceAccountPath);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: config.firebase.databaseURL || undefined,
    });

    db = admin.firestore();
    ready = true;
    logger.info('Firebase 初始化成功');
  } catch (err) {
    logger.warn('Firebase 初始化失敗，部分功能將不可用:', err.message);
    ready = false;
  }

  return db;
}

function getDb() {
  return db;
}

function isReady() {
  return ready;
}

module.exports = { init, getDb, admin, isReady };
