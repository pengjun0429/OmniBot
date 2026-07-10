const client = require('./src/client');
const config = require('./src/config');
const logger = require('./src/utils/logger');
const { deploy } = require('./src/utils/deploy-commands');
const { registerCommands, registerEvents } = require('./src/utils/command-handler');
const logCapture = require('./src/utils/log-capture');
const settings = require('./src/services/settings');
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
  if (username === config.admin.username && password === config.admin.password) {
    req.session.authenticated = true;
    return res.redirect('/dashboard');
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

app.get('/dashboard', requireAuth, (req, res) => {
  const guilds = client.guilds.cache.map(g => ({
    id: g.id, name: g.name, memberCount: g.memberCount,
    icon: g.icon ? `<img src="https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png?size=48" style="width:48px;height:48px;border-radius:10px;">` : '🌐',
  }));
  const totalUsers = guilds.reduce((s, g) => s + g.memberCount, 0);
  res.render('dashboard', {
    online: client.ws.status === 0, guilds, totalUsers, ping: client.ws.ping,
  });
});

app.get('/logs', requireAuth, (req, res) => {
  res.render('logs', { logs: logCapture.getLogs() });
});

app.get('/api/logs/stream', requireAuth, (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  let index = parseInt(req.query.index, 10) || 0;
  const interval = setInterval(() => {
    const newLogs = logCapture.getLogsSince(index);
    if (newLogs.length > 0) { index += newLogs.length; res.write(`data: ${JSON.stringify(newLogs)}\n\n`); }
  }, 1000);
  req.on('close', () => clearInterval(interval));
});

app.get('/cmd', requireAuth, (req, res) => {
  const commands = [];
  for (const [, cmd] of client.commands) commands.push({ name: cmd.data.name, desc: cmd.data.description });
  res.render('cmd', { commands });
});

app.get('/server/:id', requireAuth, async (req, res) => {
  const guild = client.guilds.cache.get(req.params.id);
  if (!guild) return res.status(404).send('找不到伺服器');

  await guild.channels.fetch();
  await guild.members.fetch();
  const owner = await guild.fetchOwner().catch(() => null);
  const gs = settings.getGuildSettings(guild.id);

  const channels = guild.channels.cache.filter(c => c.type === 0).map(c => ({ id: c.id, name: c.name }));
  const roles = guild.roles.cache
    .filter(r => r.id !== guild.id && r.name !== '@everyone' && r.position < guild.members.me.roles.highest.position)
    .map(r => ({ id: r.id, name: r.name, color: r.hexColor }))
    .sort((a, b) => b.name.localeCompare(a.name));

  res.render('server', {
    guild: {
      id: guild.id, name: guild.name, icon: guild.icon || '',
      memberCount: guild.memberCount,
      ownerTag: owner?.user?.tag || '未知',
      createdTimestamp: guild.createdTimestamp,
      channels,
      roles,
      roleCount: roles.length,
      selfRoles: gs.selfRoles || [],
      welcome: gs.welcome || { enabled: false, channelId: '', message: '' },
      farewell: gs.farewell || { enabled: false, channelId: '', message: '' },
    },
  });
});

app.post('/api/cmd/info', requireAuth, (req, res) => {
  const cmd = client.commands.get(req.body.command);
  if (!cmd) return res.json({ error: '未知指令' });
  res.json({ success: true, data: { name: cmd.data.name, description: cmd.data.description, options: cmd.data.options?.map(o => ({ name: o.name, description: o.description, required: o.required })) || [] } });
});

app.get('/settings', requireAuth, async (req, res) => {
  const guilds = [];
  for (const g of client.guilds.cache.values()) {
    await g.channels.fetch();
    const gs = settings.getGuildSettings(g.id);
    const allRoles = g.roles.cache
      .filter(r => r.id !== g.id && r.name !== '@everyone' && r.position < g.members.me.roles.highest.position)
      .map(r => ({ id: r.id, name: r.name, color: r.hexColor }))
      .sort((a, b) => a.name.localeCompare(b.name));
    guilds.push({
      id: g.id, name: g.name,
      channels: g.channels.cache.filter(c => c.type === 0).map(c => ({ id: c.id, name: c.name })),
      allRoles,
      selfRoles: gs.selfRoles || [],
      welcomeChannel: gs?.welcome?.channelId || '',
      welcomeMessage: gs?.welcome?.message || '',
      welcomeEnabled: gs?.welcome?.enabled || false,
      farewellChannel: gs?.farewell?.channelId || '',
      farewellMessage: gs?.farewell?.message || '',
      farewellEnabled: gs?.farewell?.enabled || false,
    });
  }
  res.render('settings', { guilds });
});

app.post('/api/settings/:guildId', requireAuth, (req, res) => {
  const { type, channelId, message, enabled } = req.body;
  const gs = settings.getGuildSettings(req.params.guildId);
  gs[type] = { channelId: channelId || '', message: message || '', enabled: enabled === '1' || enabled === true };
  settings.updateGuildSettings(req.params.guildId, gs);
  res.redirect('/settings');
});

app.post('/api/settings/:guildId/roles', requireAuth, (req, res) => {
  const selected = req.body.roles;
  const gs = settings.getGuildSettings(req.params.guildId);
  gs.selfRoles = Array.isArray(selected) ? selected : (selected ? [selected] : []);
  settings.updateGuildSettings(req.params.guildId, gs);
  res.redirect('/settings');
});

app.get('/api/channels', requireAuth, async (req, res) => {
  const result = [];
  for (const g of client.guilds.cache.values()) {
    await g.channels.fetch();
    result.push({
      id: g.id, name: g.name,
      channels: g.channels.cache.filter(c => c.type === 0).map(c => ({ id: c.id, name: c.name })),
    });
  }
  res.json(result);
});

app.get('/announce', requireAuth, async (req, res) => {
  const guilds = [];
  for (const g of client.guilds.cache.values()) {
    await g.channels.fetch();
    guilds.push({
      id: g.id, name: g.name,
      channels: g.channels.cache.filter(c => c.type === 0).map(c => ({ id: c.id, name: c.name })),
    });
  }
  res.render('announce', { guilds });
});

app.post('/api/announce/send', requireAuth, async (req, res) => {
  const { channelId, message } = req.body;
  try {
    const channel = client.channels.cache.get(channelId);
    if (!channel) return res.json({ success: false, error: '找不到頻道' });
    await channel.send(message);
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  logger.info(`管理後臺已啟動: 端口 ${PORT}`);
});

process.on('unhandledRejection', (err) => {
  logger.error('未捕捉的 Promise 拒絕:', err);
});
