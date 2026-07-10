const client = require('./src/client');
const config = require('./src/config');
const logger = require('./src/utils/logger');
const { deploy } = require('./src/utils/deploy-commands');
const { registerCommands, registerEvents } = require('./src/utils/command-handler');
const logCapture = require('./src/utils/log-capture');
const path = require('path');

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

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.get('/', requireAuth, (req, res) => {
  const guilds = client.guilds.cache.map(g => ({
    id: g.id,
    name: g.name,
    memberCount: g.memberCount,
    icon: g.icon ? `<img src="https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png?size=32" style="width:36px;height:36px;border-radius:8px;">` : '🌐',
  }));

  const totalUsers = guilds.reduce((sum, g) => sum + g.memberCount, 0);

  const commands = [];
  for (const [, cmd] of client.commands) {
    commands.push({ name: cmd.data.name, desc: cmd.data.description });
  }

  const uptime = process.uptime();
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const uptimeFormatted = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  res.render('dashboard', {
    page: 'dashboard',
    online: client.ws.status === 0,
    guilds, totalUsers, commands,
    ping: client.ws.ping,
    uptimeFormatted, nodeVersion: process.version,
    error: null,
  });
});

app.get('/logs', requireAuth, (req, res) => {
  const logs = logCapture.getLogs();
  res.render('logs', { page: 'logs', logs });
});

app.get('/api/logs/stream', requireAuth, (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  let index = parseInt(req.query.index, 10) || 0;

  const interval = setInterval(() => {
    const newLogs = logCapture.getLogsSince(index);
    if (newLogs.length > 0) {
      index += newLogs.length;
      res.write(`data: ${JSON.stringify(newLogs)}\n\n`);
    }
  }, 1000);

  req.on('close', () => clearInterval(interval));
});

app.get('/guild/:id', requireAuth, async (req, res) => {
  const guild = client.guilds.cache.get(req.params.id);
  if (!guild) return res.status(404).send('找不到伺服器');

  await guild.members.fetch();

  const channels = guild.channels.cache
    .filter(c => c.type === 0)
    .map(c => ({ id: c.id, name: c.name }));

  res.render('guild', {
    page: 'guild',
    guild: {
      id: guild.id, name: guild.name,
      memberCount: guild.memberCount,
      ownerTag: guild.fetchOwner().then(o => o.user.tag).catch(() => '未知'),
      createdAt: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`,
      channels,
    },
  });
});

app.post('/api/guild/:id/say', requireAuth, async (req, res) => {
  const { channelId, message } = req.body;
  if (!channelId || !message) return res.status(400).json({ error: '缺少參數' });

  try {
    const channel = client.channels.cache.get(channelId);
    if (!channel) return res.status(404).json({ error: '找不到頻道' });

    await channel.send(message);
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

app.get('/cmd', requireAuth, (req, res) => {
  const commands = [];
  for (const [, cmd] of client.commands) {
    commands.push({ name: cmd.data.name, desc: cmd.data.description });
  }
  res.render('cmd', { page: 'cmd', commands, result: null });
});

app.post('/api/cmd/run', requireAuth, async (req, res) => {
  const { command } = req.body;
  if (!command) return res.json({ error: '請輸入指令' });

  const cmd = client.commands.get(command);
  if (!cmd) return res.json({ error: `未知指令: ${command}` });

  res.json({
    success: true,
    data: {
      name: cmd.data.name,
      description: cmd.data.description,
      options: cmd.data.options?.map(o => ({ name: o.name, description: o.description, required: o.required })) || [],
    },
  });
});

app.listen(PORT, () => {
  logger.info(`管理後臺已啟動: 端口 ${PORT}`);
});

process.on('unhandledRejection', (err) => {
  logger.error('未捕捉的 Promise 拒絕:', err);
});
