const client = require('./src/client');
const config = require('./src/config');
const logger = require('./src/utils/logger');
const { deploy } = require('./src/utils/deploy-commands');
const { registerCommands, registerEvents } = require('./src/utils/command-handler');
const logCapture = require('./src/utils/log-capture');
const settings = require('./src/services/settings');
const presence = require('./src/utils/presence');
const path = require('path');

registerCommands(client);
registerEvents(client);

async function startBot() {
  await deploy();
  await client.login(config.discord.token);
  presence.start(client);
  logger.info('Bot 已上線');
}

startBot().catch(err => {
  logger.error('Bot 啟動失敗:', err);
});

const express = require('express');
const session = require('express-session');
const FileStore = require('session-file-store')(session);

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'admin/views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  store: new FileStore({ path: path.join(__dirname, 'data', 'sessions'), ttl: 86400 }),
  secret: 'omnibot-replit-session',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 },
}));

function requireAuth(req, res, next) {
  if (req.session.authenticated) return next();
  res.redirect('/login');
}

function requireTopAdmin(req, res, next) {
  if (req.session.adminLevel === 'top') return next();
  res.status(403).send('只有👑可愛的管管們才能執行此操作');
}

app.get('/', (req, res) => {
  if (req.session.authenticated) return res.redirect('/dashboard');
  res.render('login', { error: null });
});

app.get('/login', (req, res) => {
  if (req.session.authenticated) return res.redirect('/dashboard');
  res.render('login', { error: null });
});

const axios = require('axios');

app.get('/auth/discord', (req, res) => {
  const clientId = config.discord.clientId;
  const redirectUri = config.discord.redirectUri;
  if (!clientId || !redirectUri) return res.render('login', { error: '未設定 Discord OAuth' });
  const url = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=identify%20guilds`;
  res.redirect(url);
});

app.get('/auth/discord/callback', async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) return res.render('login', { error: '缺少授權碼' });

    const tokenRes = await axios.post('https://discord.com/api/oauth2/token',
      new URLSearchParams({
        client_id: config.discord.clientId,
        client_secret: config.discord.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: config.discord.redirectUri,
        scope: 'identify guilds',
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const accessToken = tokenRes.data.access_token;
    const userRes = await axios.get('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const discordUser = userRes.data;

    const guildsRes = await axios.get('https://discord.com/api/users/@me/guilds', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const mutualGuilds = guildsRes.data
      .filter(g => client.guilds.cache.has(g.id))
      .map(g => g.id);

    let allowed = false;
    let adminLevel = null;
    const { isTopAdmin, isModerator } = require('./src/utils/permissions');

    for (const guildId of mutualGuilds) {
      const guild = client.guilds.cache.get(guildId);
      if (!guild) continue;
      const member = guild.members.cache.get(discordUser.id) || await guild.members.fetch(discordUser.id).catch(() => null);
      if (!member) continue;

      const memberRoleIds = member.roles.cache.map(r => r.id);
      const gs = settings.getGuildSettings(guildId);
      const blockedUsers = Array.isArray(gs.blockedUsers) ? gs.blockedUsers : [];

      if (blockedUsers.includes(discordUser.id) && member.id !== guild.ownerId) {
        logger.info(`[封鎖] ${discordUser.username} 被封鎖於 ${guild.name}，跳過`);
        continue;
      }

      const topIds = gs.adminRoles?.topIds?.length > 0 ? gs.adminRoles.topIds : config.admin.topRoleIds;
      const modIds = gs.adminRoles?.modIds?.length > 0 ? gs.adminRoles.modIds : config.admin.modRoleIds;

      if (isTopAdmin(member) || memberRoleIds.some(r => topIds.includes(r))) {
        allowed = true;
        adminLevel = 'top';
        logger.info(`[登入] ${discordUser.username} 以 ${guild.name} 的 TOP 權限登入`);
        break;
      }
      if (isModerator(member) || memberRoleIds.some(r => modIds.includes(r))) {
        allowed = true;
        adminLevel = 'mod';
        logger.info(`[登入] ${discordUser.username} 以 ${guild.name} 的 MOD 權限登入`);
        break;
      }
    }

    if (!allowed) {
      return res.render('login', { error: '❌ 你沒有管理員權限（需要可愛的管管們或可惡的管管們身分組）' });
    }

    req.session.authenticated = true;
    req.session.adminLevel = adminLevel;
    req.session.discordUser = { id: discordUser.id, username: discordUser.username, avatar: discordUser.avatar, global_name: discordUser.global_name };
    res.redirect('/dashboard');
  } catch (err) {
    logger.error('Discord OAuth 失敗:', err.response?.data || err.message);
    res.render('login', { error: 'Discord 登入失敗，請稍後再試' });
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), bot: client.ws.status === 0 ? 'online' : 'offline' });
});

app.get('/privacy', (req, res) => {
  res.render('privacy');
});

app.get('/up', (req, res) => {
  res.send('ok');
});

app.get('/dashboard', requireAuth, (req, res) => {
  const guilds = client.guilds.cache.map(g => ({
    id: g.id, name: g.name, memberCount: g.memberCount,
    icon: g.icon ? `<img src="https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png?size=48" style="width:48px;height:48px;border-radius:10px;">` : '🌐',
  }));
  const totalUsers = guilds.reduce((s, g) => s + g.memberCount, 0);
  res.render('dashboard', {
    online: client.ws.status === 0, guilds, totalUsers, ping: client.ws.ping,
    user: req.session.discordUser || null,
    adminLevel: req.session.adminLevel || null,
  });
});

app.get('/logs', requireAuth, (req, res) => {
  res.render('logs', { logs: logCapture.getLogs(), user: req.session.discordUser || null, adminLevel: req.session.adminLevel || null });
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
  res.render('cmd', { commands, user: req.session.discordUser || null, adminLevel: req.session.adminLevel || null });
});

app.get('/server/:id', requireAuth, async (req, res) => {
  try {
    const guild = client.guilds.cache.get(req.params.id);
    if (!guild) return res.status(404).send('找不到伺服器');

    const gs = settings.getGuildSettings(guild.id);

    await guild.channels.fetch().catch(() => {});
    const channels = guild.channels.cache.filter(c => c.type === 0).map(c => ({ id: c.id, name: c.name }));
    const voiceChannels = guild.channels.cache.filter(c => c.type === 2).map(c => ({ id: c.id, name: c.name }));
    const categories = guild.channels.cache.filter(c => c.type === 4).map(c => ({ id: c.id, name: c.name }));
    const roles = guild.roles.cache
      .filter(r => r.id !== guild.id && r.name !== '@everyone' && r.position < guild.members.me.roles.highest.position)
      .map(r => ({ id: r.id, name: r.name, color: r.hexColor }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const owner = guild.members.cache.get(guild.ownerId);

    res.render('server', {
      adminLevel: req.session.adminLevel || null,
      guild: {
        id: guild.id, name: guild.name, icon: guild.icon || '',
        memberCount: guild.memberCount,
        roleCount: roles.length,
        ownerTag: owner?.user?.tag || '未知',
        channels,
        voiceChannels,
        categories,
        roles,
        selfRoles: gs.selfRoles || [],
        autoVoice: gs.autoVoice || { channelId: '' },
        ticket: gs.ticket || { categoryId: '', roleIds: [], channelId: '' },
        autoMod: gs.autoMod || { enabled: false, words: [], blockLinks: false, logChannelId: '', punishment: 'delete', timeoutMinutes: 10, logLevel: 'all' },
        roleGive: gs.roleGive || { channelId: '' },
        welcome: gs.welcome || { enabled: false, channelId: '', message: '' },
        farewell: gs.farewell || { enabled: false, channelId: '', message: '' },
      },
    });
  } catch (err) {
    logger.error('伺服器頁面錯誤:', err.message);
    res.status(500).send('載入伺服器資料時發生錯誤');
  }
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

app.post('/api/settings/:guildId', requireAuth, requireTopAdmin, (req, res) => {
  const { type, channelId, message, enabled, _tab } = req.body;
  const gs = settings.getGuildSettings(req.params.guildId);
  gs[type] = { channelId: channelId || '', message: message || '', enabled: enabled === '1' || enabled === true };
  settings.updateGuildSettings(req.params.guildId, gs);
  res.redirect(`/server/${req.params.guildId}#${_tab || ''}`);
});

app.post('/api/settings/:guildId/roles', requireAuth, requireTopAdmin, (req, res) => {
  const selected = req.body.roles;
  const gs = settings.getGuildSettings(req.params.guildId);
  gs.selfRoles = Array.isArray(selected) ? selected : (selected ? [selected] : []);
  settings.updateGuildSettings(req.params.guildId, gs);
  res.redirect(`/server/${req.params.guildId}#roles`);
});

app.post('/api/settings/:guildId/automod', requireAuth, requireTopAdmin, (req, res) => {
  const gs = settings.getGuildSettings(req.params.guildId);
  const words = req.body.words ? req.body.words.split(',').map(w => w.trim()).filter(Boolean) : [];
  gs.autoMod = {
    enabled: req.body.enabled === '1',
    words,
    blockLinks: req.body.blockLinks === '1',
    logChannelId: req.body.logChannelId || '',
    punishment: req.body.punishment || 'delete',
    timeoutMinutes: parseInt(req.body.timeoutMinutes, 10) || 10,
    logLevel: req.body.logLevel || 'all',
  };
  settings.updateGuildSettings(req.params.guildId, gs);
  res.redirect(`/server/${req.params.guildId}#automod`);
});

app.post('/api/settings/:guildId/autovoice', requireAuth, requireTopAdmin, (req, res) => {
  const gs = settings.getGuildSettings(req.params.guildId);
  gs.autoVoice = { channelId: req.body.channelId || '', categoryId: req.body.categoryId || '' };
  settings.updateGuildSettings(req.params.guildId, gs);
  res.redirect(`/server/${req.params.guildId}#voice`);
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

app.post('/api/settings/:guildId/ticket', requireAuth, requireTopAdmin, (req, res) => {
  const gs = settings.getGuildSettings(req.params.guildId);
  const roleIds = Array.isArray(req.body.roleIds) ? req.body.roleIds : (req.body.roleIds ? [req.body.roleIds] : []);
  gs.ticket = { categoryId: req.body.categoryId || '', roleIds, channelId: '' };
  settings.updateGuildSettings(req.params.guildId, gs);
  res.redirect(`/server/${req.params.guildId}#ticket`);
});

app.post('/api/settings/:guildId/rolegive', requireAuth, requireTopAdmin, (req, res) => {
  const gs = settings.getGuildSettings(req.params.guildId);
  gs.roleGive = { channelId: req.body.channelId || '' };
  settings.updateGuildSettings(req.params.guildId, gs);
  res.redirect(`/server/${req.params.guildId}#rolegive`);
});

app.post('/api/server/:id/send-ticket-panel', requireAuth, requireTopAdmin, async (req, res) => {
  try {
    const guild = client.guilds.cache.get(req.params.id);
    if (!guild) return res.json({ success: false, error: '找不到伺服器' });
    const channel = guild.channels.cache.get(req.body.channelId);
    if (!channel) return res.json({ success: false, error: '找不到頻道' });

    const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
    const embed = new EmbedBuilder().setColor(0x5865F2).setTitle('🎫 建立工單').setDescription('點擊下方按鈕建立工單，管理員將為你協助');
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ticket_open').setLabel('📩 建立工單').setStyle(ButtonStyle.Primary)
    );
    await channel.send({ embeds: [embed], components: [row] });
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

app.post('/api/server/:id/send-panel', requireAuth, requireTopAdmin, async (req, res) => {
  try {
    const guild = client.guilds.cache.get(req.params.id);
    if (!guild) return res.json({ success: false, error: '找不到伺服器' });

    const channel = guild.channels.cache.get(req.body.channelId);
    if (!channel) return res.json({ success: false, error: '找不到頻道' });

    const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
    const gs = settings.getGuildSettings(guild.id);
    const allowedIds = gs.selfRoles || [];

    const roles = allowedIds.map(id => guild.roles.cache.get(id)).filter(Boolean).slice(0, 25);
    if (roles.length === 0) return res.json({ success: false, error: '尚未設定可領取的身分組' });

    const embed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle('🎭 自助領取身分組')
      .setDescription('點擊下方按鈕領取或移除身分組')
      .setFooter({ text: guild.name })
      .setTimestamp();

    const rows = [];
    let row = new ActionRowBuilder();
    for (const role of roles) {
      const btn = new ButtonBuilder()
        .setCustomId(`role_toggle_${guild.id}_${role.id}`)
        .setLabel(role.name.length > 25 ? role.name.slice(0, 22) + '...' : role.name)
        .setStyle(ButtonStyle.Secondary);
      if (row.components.length >= 5) { rows.push(row); row = new ActionRowBuilder(); }
      row.addComponents(btn);
    }
    if (row.components.length > 0) rows.push(row);

    await channel.send({ embeds: [embed], components: rows });
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
