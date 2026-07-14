const express = require('express');
const path = require('path');
const session = require('express-session');
const config = require('../src/config');
const logger = require('../src/utils/logger');
const settings = require('../src/services/settings');

function startAdmin(client) {
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

  function getGuildData(guild) {
    const gs = settings.getGuildSettings(guild.id);
    const channels = [...guild.channels.cache.filter(c => c.type === 0).values()];
    const voiceChannels = [...guild.channels.cache.filter(c => c.type === 2).values()];
    const categories = [...guild.channels.cache.filter(c => c.type === 4).values()];
    const roles = [...guild.roles.cache.filter(r => r.name !== '@everyone').values()].sort((a, b) => b.position - a.position);

    return {
      id: guild.id,
      name: guild.name,
      icon: guild.iconURL({ size: 64 }),
      memberCount: guild.memberCount,
      ownerTag: guild.members.cache.get(guild.ownerId)?.user?.tag || '?',
      channels: channels.map(c => ({ id: c.id, name: c.name })),
      voiceChannels: voiceChannels.map(c => ({ id: c.id, name: c.name })),
      categories: categories.map(c => ({ id: c.id, name: c.name })),
      roles: roles.map(r => ({ id: r.id, name: r.name, color: r.hexColor })),
      selfRoles: gs.selfRoles || [],
      autoRoleId: gs.autoRoleId || '',
      welcome: gs.welcome || { enabled: false, channelId: '', message: '', image: '' },
      farewell: gs.farewell || { enabled: false, channelId: '', message: '' },
      autoVoice: gs.autoVoice || {},
      ticket: gs.ticket || { categoryId: '', roleIds: [], channelId: '' },
      autoMod: gs.autoMod || {},
      roleGive: gs.roleGive || { channelId: '' },
      inviteGuard: gs.inviteGuard || {},
      appeal: gs.appeal || { channelId: '' },
      antiRaid: gs.antiRaid || {},
      inviteLog: gs.inviteLog || { channelId: '' },
      messageLog: gs.messageLog || { channelId: '' },
      messageLogAll: gs.messageLogAll || { enabled: false },
      verification: gs.verification || { enabled: false },
      modLog: gs.modLog || { channelId: '' },
    };
  }

  app.get('/', (req, res) => {
    if (req.session.authenticated) return res.redirect('/dashboard');
    res.render('landing', {
      guildCount: client.guilds.cache.size,
      userCount: client.guilds.cache.reduce((s, g) => s + g.memberCount, 0),
      ping: client.ws.ping,
      commands: client.commands.size,
    });
  });

  app.get('/login', (req, res) => {
    if (req.session.authenticated) return res.redirect('/dashboard');
    res.render('login', { error: null });
  });

  app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const adminUser = process.env.ADMIN_USERNAME;
    const adminPass = process.env.ADMIN_PASSWORD;
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
    const guilds = [...client.guilds.cache.values()].map(g => ({
      id: g.id, name: g.name,
      icon: g.iconURL({ size: 64 }),
      memberCount: g.memberCount,
    }));
    res.render('dashboard', {
      online: true,
      guilds,
      totalUsers: guilds.reduce((s, g) => s + g.memberCount, 0),
      commands: client.commands.size,
      ping: client.ws.ping,
      uptimeFormatted: (() => {
        const u = process.uptime();
        const h = Math.floor(u / 3600);
        const m = Math.floor((u % 3600) / 60);
        return `${h}h ${m}m`;
      })(),
      nodeVersion: process.version,
      user: req.session.user || null,
    });
  });

  app.get('/settings', requireAuth, (req, res) => {
    const guilds = [...client.guilds.cache.values()].map(g => getGuildData(g));
    res.render('settings', { guilds });
  });

  app.get('/server/:id', requireAuth, async (req, res) => {
    const guild = client.guilds.cache.get(req.params.id);
    if (!guild) return res.redirect('/dashboard');
    const guildData = getGuildData(guild);
    const userGuilds = [...client.guilds.cache.values()].map(g => ({ id: g.id, name: g.name }));
    res.render('server', { guild: guildData, userGuilds, user: req.session.user || null, adminLevel: 'top' });
  });

  app.get('/logs', requireAuth, (req, res) => {
    const logCapture = require('../src/utils/log-capture');
    const logs = logCapture.getLogs();
    res.render('logs', { logs });
  });

  app.get('/cmd', requireAuth, (req, res) => {
    const commands = [...client.commands.values()].map(c => ({
      name: c.data.name,
      description: c.data.description,
      category: c.category || '其他',
    }));
    res.render('cmd', { commands });
  });

  app.get('/analytics', requireAuth, (req, res) => {
    res.render('analytics', { guilds: [...client.guilds.cache.values()] });
  });

  app.get('/appeal', (req, res) => {
    res.render('appeal', { error: null, success: null });
  });

  app.get('/privacy', (req, res) => {
    res.render('privacy');
  });

  app.get('/announce', requireAuth, (req, res) => {
    res.render('announce', { guilds: [...client.guilds.cache.values()].map(g => ({ id: g.id, name: g.name })) });
  });

  // ─── API Routes ───────────────────────────────────────────────

  app.get('/api/guilds', requireAuth, (req, res) => {
    const guilds = [...client.guilds.cache.values()].map(g => getGuildData(g));
    res.json({ guilds });
  });

  app.get('/api/guilds/:id', requireAuth, (req, res) => {
    const guild = client.guilds.cache.get(req.params.id);
    if (!guild) return res.status(404).json({ error: '找不到伺服器' });
    res.json({ guild: getGuildData(guild) });
  });

  app.post('/api/settings/:id', requireAuth, async (req, res) => {
    const guild = client.guilds.cache.get(req.params.id);
    if (!guild) return res.status(404).json({ success: false, error: '找不到伺服器' });
    const gs = settings.getGuildSettings(guild.id);
    const { type, channelId, message, enabled, image, _tab } = req.body;

    if (type === 'welcome') {
      gs.welcome = {
        channelId: channelId || '',
        message: message || '',
        image: image || '',
        enabled: enabled === '1',
      };
    } else if (type === 'farewell') {
      gs.farewell = {
        channelId: channelId || '',
        message: message || '',
        enabled: enabled === '1',
      };
    } else {
      return res.json({ success: false, error: '未知的設定類型' });
    }

    settings.updateGuildSettings(guild.id, gs);
    const redirect = _tab ? `/server/${guild.id}#${_tab}` : `/settings`;
    res.redirect(redirect);
  });

  app.post('/api/settings/:id/roles', requireAuth, async (req, res) => {
    const guild = client.guilds.cache.get(req.params.id);
    if (!guild) return res.status(404).json({ success: false, error: '找不到伺服器' });
    const gs = settings.getGuildSettings(guild.id);
    gs.selfRoles = Array.isArray(req.body.roles) ? req.body.roles : [];
    settings.updateGuildSettings(guild.id, gs);
    res.redirect('/settings');
  });

  app.post('/api/settings/:id/autovoice', requireAuth, async (req, res) => {
    const guild = client.guilds.cache.get(req.params.id);
    if (!guild) return res.status(404).json({ success: false, error: '找不到伺服器' });
    const gs = settings.getGuildSettings(guild.id);
    gs.autoVoice = {
      channelId: req.body.channelId || '',
      categoryId: req.body.categoryId || '',
      nameTemplate: req.body.nameTemplate || '',
      userLimit: parseInt(req.body.userLimit) || 0,
      bitrate: parseInt(req.body.bitrate) || 64000,
    };
    settings.updateGuildSettings(guild.id, gs);
    res.redirect(`/server/${guild.id}#voice`);
  });

  app.post('/api/settings/:id/ticket', requireAuth, async (req, res) => {
    const guild = client.guilds.cache.get(req.params.id);
    if (!guild) return res.status(404).json({ success: false, error: '找不到伺服器' });
    const gs = settings.getGuildSettings(guild.id);
    gs.ticket = {
      categoryId: req.body.categoryId || '',
      roleIds: Array.isArray(req.body.roleIds) ? req.body.roleIds : [],
      channelId: req.body.channelId || '',
    };
    settings.updateGuildSettings(guild.id, gs);
    res.redirect(`/server/${guild.id}#ticket`);
  });

  app.post('/api/settings/:id/automod', requireAuth, async (req, res) => {
    const guild = client.guilds.cache.get(req.params.id);
    if (!guild) return res.status(404).json({ success: false, error: '找不到伺服器' });
    const gs = settings.getGuildSettings(guild.id);
    gs.autoMod.enabled = req.body.enabled === '1';
    gs.autoMod.words = (req.body.words || '').split(',').map(w => w.trim()).filter(Boolean);
    gs.autoMod.regexWords = (req.body.regexWords || '').split('\n').map(w => w.trim()).filter(Boolean);
    gs.autoMod.blockLinks = req.body.blockLinks === '1';
    gs.autoMod.phishingProtection = req.body.phishingProtection === '1';
    gs.autoMod.punishment = req.body.punishment || 'delete';
    gs.autoMod.timeoutMinutes = parseInt(req.body.timeoutMinutes) || 10;
    gs.autoMod.logLevel = req.body.logLevel || 'all';
    gs.autoMod.logChannelId = req.body.logChannelId || '';

    if (!gs.autoMod.strikes) gs.autoMod.strikes = {};
    for (let i = 2; i <= 5; i++) {
      const action = req.body[`strike_action_${i}`];
      const duration = parseInt(req.body[`strike_duration_${i}`]) || gs.autoMod.timeoutMinutes || 10;
      if (action) {
        gs.autoMod.strikes[String(i)] = { action, duration };
      } else {
        delete gs.autoMod.strikes[String(i)];
      }
    }
    gs.autoMod.strikeResetHours = parseInt(req.body.strikeResetHours) || 24;
    settings.updateGuildSettings(guild.id, gs);
    res.redirect(`/server/${guild.id}#automod`);
  });

  app.post('/api/settings/:id/antiraid', requireAuth, async (req, res) => {
    const guild = client.guilds.cache.get(req.params.id);
    if (!guild) return res.status(404).json({ success: false, error: '找不到伺服器' });
    const gs = settings.getGuildSettings(guild.id);
    gs.antiRaid = {
      enabled: req.body.enabled === '1',
      joinThreshold: parseInt(req.body.joinThreshold) || 5,
      joinWindow: parseInt(req.body.joinWindow) || 10,
      spamThreshold: parseInt(req.body.spamThreshold) || 5,
      spamWindow: parseInt(req.body.spamWindow) || 5,
      spamTimeout: parseInt(req.body.spamTimeout) || 1,
      action: req.body.action || 'kick',
      logChannelId: req.body.logChannelId || '',
    };
    settings.updateGuildSettings(guild.id, gs);
    res.redirect(`/server/${guild.id}#antiraid`);
  });

  app.post('/api/settings/:id/inviteguard', requireAuth, async (req, res) => {
    const guild = client.guilds.cache.get(req.params.id);
    if (!guild) return res.status(404).json({ success: false, error: '找不到伺服器' });
    const gs = settings.getGuildSettings(guild.id);
    gs.inviteGuard.enabled = req.body.enabled === '1';
    gs.inviteGuard.whitelist = (req.body.whitelist || '').split(',').map(c => c.trim()).filter(Boolean);
    gs.inviteGuard.logChannelId = req.body.logChannelId || '';
    settings.updateGuildSettings(guild.id, gs);
    res.redirect(`/server/${guild.id}#inviteguard`);
  });

  app.post('/api/settings/:id/invitelog', requireAuth, async (req, res) => {
    const guild = client.guilds.cache.get(req.params.id);
    if (!guild) return res.status(404).json({ success: false, error: '找不到伺服器' });
    const gs = settings.getGuildSettings(guild.id);
    gs.inviteLog.channelId = req.body.channelId || '';
    settings.updateGuildSettings(guild.id, gs);
    res.redirect(`/server/${guild.id}#invitelog`);
  });

  app.post('/api/settings/:id/messagelog', requireAuth, async (req, res) => {
    const guild = client.guilds.cache.get(req.params.id);
    if (!guild) return res.status(404).json({ success: false, error: '找不到伺服器' });
    const gs = settings.getGuildSettings(guild.id);
    if (req.body.messageLogAllEnabled !== undefined) {
      gs.messageLogAll.enabled = req.body.messageLogAllEnabled === '1';
    } else {
      gs.messageLog.channelId = req.body.channelId || '';
    }
    settings.updateGuildSettings(guild.id, gs);
    res.redirect(`/server/${guild.id}#messagelog`);
  });

  app.post('/api/settings/:id/rolegive', requireAuth, async (req, res) => {
    const guild = client.guilds.cache.get(req.params.id);
    if (!guild) return res.status(404).json({ success: false, error: '找不到伺服器' });
    const gs = settings.getGuildSettings(guild.id);
    gs.roleGive.channelId = req.body.channelId || '';
    settings.updateGuildSettings(guild.id, gs);
    res.redirect(`/server/${guild.id}#rolegive`);
  });

  app.post('/api/settings/:id/appeal', requireAuth, async (req, res) => {
    const guild = client.guilds.cache.get(req.params.id);
    if (!guild) return res.status(404).json({ success: false, error: '找不到伺服器' });
    const gs = settings.getGuildSettings(guild.id);
    gs.appeal.channelId = req.body.channelId || '';
    settings.updateGuildSettings(guild.id, gs);
    res.redirect(`/server/${guild.id}#appeal`);
  });

  app.post('/api/server/:id/send-panel', requireAuth, async (req, res) => {
    const guild = client.guilds.cache.get(req.params.id);
    if (!guild) return res.status(404).json({ success: false, error: '找不到伺服器' });
    const channel = guild.channels.cache.get(req.body.channelId);
    if (!channel) return res.json({ success: false, error: '找不到頻道' });
    try {
      const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
      const gs = settings.getGuildSettings(guild.id);
      const allowedIds = gs.selfRoles || [];
      const roles = allowedIds.map(id => guild.roles.cache.get(id)).filter(Boolean).slice(0, 25);
      if (roles.length === 0) return res.json({ success: false, error: '沒有可領取的身分組' });
      const embed = new EmbedBuilder()
        .setColor(0x0099ff).setTitle('🎭 自助領取身分組')
        .setDescription('點擊下方按鈕領取或移除身分組').setTimestamp();
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
    } catch (err) { res.json({ success: false, error: err.message }); }
  });

  app.post('/api/server/:id/send-ticket-panel', requireAuth, async (req, res) => {
    const guild = client.guilds.cache.get(req.params.id);
    if (!guild) return res.status(404).json({ success: false, error: '找不到伺服器' });
    const channel = guild.channels.cache.get(req.body.channelId);
    if (!channel) return res.json({ success: false, error: '找不到頻道' });
    try {
      const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
      const embed = new EmbedBuilder().setColor(0x5865F2).setTitle('🎫 建立工單').setDescription('點擊下方按鈕建立工單，管理員將為你協助');
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ticket_open').setLabel('📩 建立工單').setStyle(ButtonStyle.Primary)
      );
      await channel.send({ embeds: [embed], components: [row] });
      res.json({ success: true });
    } catch (err) { res.json({ success: false, error: err.message }); }
  });

  app.post('/api/announce/send', requireAuth, async (req, res) => {
    const { channelId, title, message, color } = req.body;
    const channel = client.channels.cache.get(channelId);
    if (!channel) return res.json({ success: false, error: '找不到頻道' });
    try {
      const { EmbedBuilder } = require('discord.js');
      const embed = new EmbedBuilder()
        .setColor(parseInt(color?.replace('#', ''), 16) || 0x7c6ff0)
        .setTitle(title || '📢 公告').setDescription(message).setTimestamp();
      await channel.send({ embeds: [embed] });
      res.json({ success: true });
    } catch (err) { res.json({ success: false, error: err.message }); }
  });

  app.get('/api/export/:id', requireAuth, async (req, res) => {
    const guild = client.guilds.cache.get(req.params.id);
    if (!guild) return res.status(404).json({ error: '找不到伺服器' });
    const gs = settings.getGuildSettings(guild.id);
    res.json({ guild: guild.name, id: guild.id, settings: gs });
  });

  app.listen(PORT, () => {
    logger.info(`管理員後臺已啟動: http://localhost:${PORT}`);
  });
}

module.exports = { startAdmin };
