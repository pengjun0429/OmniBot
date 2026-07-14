const express = require('express');
const path = require('path');
const session = require('express-session');
const config = require('../src/config');
const logger = require('../src/utils/logger');

const app = express();
const PORT = process.env.ADMIN_PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET || 'omnibot-admin-session-fallback-change-me',
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax'
  }
}));

function requireAuth(req, res, next) {
  if (req.session.authenticated) return next();
  res.redirect('/login');
}

app.get('/', (req, res) => {
  if (req.session.authenticated) return res.redirect('/dashboard');
  res.render('login', { error: null });
});

app.get('/login', (req, res) => {
  if (req.session.authenticated) return res.redirect('/dashboard');
  res.render('login', { error: null });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const isProduction = process.env.NODE_ENV === 'production';
  const adminUser = process.env.ADMIN_USERNAME;
  const adminPass = process.env.ADMIN_PASSWORD;

  if (isProduction && (!adminUser || !adminPass)) {
    return res.render('login', { error: '安全限制：生產環境必須設定 ADMIN_USERNAME 與 ADMIN_PASSWORD' });
  }

  const finalUser = adminUser || 'admin';
  const finalPass = adminPass || 'admin123';

  if (username === finalUser && password === finalPass) {
    req.session.authenticated = true;
    return res.redirect('/dashboard');
  }
  res.render('login', { error: '帳號或密碼錯誤' });
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

app.get('/dashboard', requireAuth, (req, res) => {
  res.render('dashboard', {
    online: false, guilds: [], totalUsers: 0, commands: [],
    ping: 0, uptimeFormatted: '0m', nodeVersion: process.version,
  });
});

app.listen(PORT, () => {
  logger.info(`管理員後臺已啟動: http://localhost:${PORT}`);
});

module.exports = app;
