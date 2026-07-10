const client = require('./src/client');
const config = require('./src/config');
const logger = require('./src/utils/logger');
const { deploy } = require('./src/utils/deploy-commands');
const { registerCommands, registerEvents } = require('./src/utils/command-handler');

registerCommands(client);
registerEvents(client);

async function startBot() {
  await deploy();
  await client.login(config.discord.token);
  logger.info('Bot 已上線');
}

startBot().catch(err => {
  logger.error('Bot 啟動失敗:', err);
});

const express = require('express');
const path = require('path');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'admin/views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  secret: 'omnibot-replit-session',
  resave: false,
  saveUninitialized: true,
}));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

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

function requireAuth(req, res, next) {
  if (req.session.authenticated) return next();
  res.redirect('/login');
}

app.get('/', requireAuth, (req, res) => {
  res.render('dashboard', {
    botName: 'OmniBot',
    nodeVersion: process.version,
    uptime: Math.floor(process.uptime()),
  });
});

app.listen(PORT, () => {
  logger.info(`管理後臺 + 健康檢查端點已啟動: 端口 ${PORT}`);
});

process.on('unhandledRejection', (err) => {
  logger.error('未捕捉的 Promise 拒絕:', err);
});
