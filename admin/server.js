const express = require('express');
const path = require('path');
const session = require('express-session');
const config = require('../src/config');
const firebase = require('../src/services/firebase');
const logger = require('../src/utils/logger');

firebase.init();
const fbReady = firebase.isReady();

const app = express();
const PORT = config.admin.port;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  secret: 'discord-bot-admin-secret',
  resave: false,
  saveUninitialized: true,
}));

function requireAuth(req, res, next) {
  if (req.session.authenticated) return next();
  res.redirect('/login');
}

app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (username === config.admin.username && password === config.admin.password) {
    req.session.authenticated = true;
    return res.redirect('/');
  }

  res.render('login', { error: '帳號或密碼錯誤' });
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

app.get('/', requireAuth, async (req, res) => {
  if (!fbReady) {
    return res.render('dashboard', {
      collections: [],
      totalCollections: 0,
      totalDocuments: 0,
      error: 'Firebase 尚未初始化，請確認 service-account.json 已放置',
    });
  }

  try {
    const db = firebase.getDb();

    const collections = await db.listCollections();
    const stats = [];

    for (const col of collections) {
      const snapshot = await col.get();
      stats.push({ name: col.id, count: snapshot.size });
    }

    res.render('dashboard', {
      collections: stats,
      totalCollections: stats.length,
      totalDocuments: stats.reduce((sum, c) => sum + c.count, 0),
    });
  } catch (err) {
    logger.error('Admin dashboard error:', err.message);
    res.render('dashboard', {
      collections: [],
      totalCollections: 0,
      totalDocuments: 0,
      error: err.message,
    });
  }
});

app.get('/collection/:name', requireAuth, async (req, res) => {
  if (!fbReady) return res.status(503).send('Firebase 未初始化');

  try {
    const db = firebase.getDb();
    const snapshot = await db.collection(req.params.name).get();
    const docs = [];

    snapshot.forEach(doc => {
      docs.push({ id: doc.id, data: doc.data() });
    });

    res.render('collection', {
      collectionName: req.params.name,
      documents: docs,
    });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.post('/collection/:name/delete/:docId', requireAuth, async (req, res) => {
  if (!fbReady) return res.status(503).send('Firebase 未初始化');

  try {
    const db = firebase.getDb();
    await db.collection(req.params.name).doc(req.params.docId).delete();
    res.redirect(`/collection/${req.params.name}`);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.get('/guilds', requireAuth, async (req, res) => {
  if (!fbReady) return res.status(503).send('Firebase 未初始化');

  try {
    const db = firebase.getDb();
    const snapshot = await db.collection('guilds').get();
    const guilds = [];

    snapshot.forEach(doc => {
      guilds.push({ id: doc.id, ...doc.data() });
    });

    res.render('guilds', { guilds });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.post('/guilds/:guildId/welcome', requireAuth, async (req, res) => {
  if (!fbReady) return res.status(503).send('Firebase 未初始化');

  try {
    const db = firebase.getDb();
    const { channelId, message, enabled } = req.body;

    await db.collection('guilds').doc(req.params.guildId).set({
      welcome: {
        channelId: channelId || '',
        message: message || '',
        enabled: enabled === 'on',
      },
    }, { merge: true });

    res.redirect('/guilds');
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.listen(PORT, () => {
  logger.info(`管理員後臺已啟動: http://localhost:${PORT}`);
  logger.info(`預設帳號: ${config.admin.username}`);
});

module.exports = app;
