const express = require('express');
const path = require('path');
const session = require('express-session');
const config = require('../src/config');
const logger = require('../src/utils/logger');

const app = express();
const PORT = config.admin.port;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  secret: 'omnibot-admin-session',
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

app.get('/', requireAuth, (req, res) => {
  res.render('dashboard', {
    botName: 'OmniBot',
    nodeVersion: process.version,
    uptime: Math.floor(process.uptime()),
  });
});

app.listen(PORT, () => {
  logger.info(`管理員後臺已啟動: http://localhost:${PORT}`);
});

module.exports = app;
