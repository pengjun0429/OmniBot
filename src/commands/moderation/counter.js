const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const settings = require('../../services/settings');

module.exports = {
  category: '管理',
  data: new SlashCommandBuilder()
    .setName('counter')
    .setDescription('📊 設定計數語音頻道')
    .addChannelOption(o => o.setName('頻道').setDescription('要設為計數器的語音頻道').setRequired(true))
    .addStringOption(o => o.setName('類型').setDescription('顯示內容').setRequired(true)
      .addChoices(
        { name: '👥 成員總數', value: 'members' },
        { name: '📶 在線人數', value: 'online' },
      ))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    const channel = interaction.options.getChannel('頻道');
    const type = interaction.options.getString('類型');
    if (channel.type !== ChannelType.GuildVoice) {
      return interaction.reply({ content: '❌ 請選擇一個語音頻道', ephemeral: true });
    }
    const gs = settings.getGuildSettings(interaction.guild.id);
    if (!gs.counters) gs.counters = {};
    gs.counters[channel.id] = { type, channelId: channel.id };
    settings.updateGuildSettings(interaction.guild.id, gs);

    await updateCounter(channel, type);
    await interaction.reply({ content: `✅ 已將 ${channel.name} 設為${type === 'members' ? '成員總數' : '在線人數'}計數器`, ephemeral: true });
  },
};

async function updateCounter(channel, type) {
  try {
    const guild = channel.guild;
    await guild.members.fetch().catch(() => {});
    const total = guild.memberCount;
    const online = guild.members.cache.filter(m => m.presence?.status === 'online' || m.presence?.status === 'idle' || m.presence?.status === 'dnd').size;
    const count = type === 'members' ? total : online;
    const name = type === 'members' ? `👥 成員：${count}` : `📶 在線：${count}`;
    await channel.setName(name).catch(() => {});
  } catch {}
}

setInterval(async () => {
  const fs = require('fs');
  const path = require('path');
  const p = path.join(__dirname, '..', '..', 'data', 'settings.json');
  if (!fs.existsSync(p)) return;
  try {
    const cache = JSON.parse(fs.readFileSync(p, 'utf-8'));
    for (const [, gs] of Object.entries(cache)) {
      if (!gs.counters) continue;
      for (const [, cfg] of Object.entries(gs.counters)) {
        if (!global.client) continue;
        const guild = global.client.guilds.cache.get(global.client.guilds.cache.first()?.id);
        // counters are updated from ready.js
      }
    }
  } catch {}
}, 300000);
