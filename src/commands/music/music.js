const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const music = require('../../services/music');

const panelChannels = new Map();
let embedCache = null;

function buildPanel(guildId) {
  const gq = music.getQueue(guildId);
  const embed = new EmbedBuilder()
    .setColor(0xff7700)
    .setTitle('🎵 音樂控制面板')
    .setFooter({ text: gq?.playing ? '正在播放' : '已暫停' })
    .setTimestamp();

  if (gq?.songs?.[0]) {
    embed.setDescription(`▶️ **${gq.songs[0].title}**\n🔊 音量: ${gq.volume}%  ${gq.loop ? '🔁 循環' : ''}`);
    if (gq.songs.length > 1) {
      embed.addFields({ name: '📋 即將播放', value: gq.songs.slice(1, 4).map((s, i) => `${i + 1}. ${s.title}`).join('\n') || '無' });
    }
  } else {
    embed.setDescription('❌ 目前沒有播放中的音樂\n使用 `/play` 搜尋歌曲');
  }
  return embed;
}

function buildButtons(guildId) {
  const gq = music.getQueue(guildId);
  const playing = gq?.playing || false;
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('music_prev').setEmoji('⏮️').setStyle(ButtonStyle.Secondary).setDisabled(true),
      new ButtonBuilder().setCustomId(playing ? 'music_pause' : 'music_resume').setEmoji(playing ? '⏸️' : '▶️').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('music_skip').setEmoji('⏭️').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('music_stop').setEmoji('⏹️').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('music_loop').setEmoji('🔁').setStyle(gq?.loop ? ButtonStyle.Success : ButtonStyle.Secondary),
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('music_voldown').setEmoji('🔉').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('music_volup').setEmoji('🔊').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('music_queue').setEmoji('📋').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('music_refresh').setEmoji('🔄').setStyle(ButtonStyle.Secondary),
    ),
  ];
}

module.exports = {
  category: '音樂',
  data: new SlashCommandBuilder()
    .setName('music')
    .setDescription('🎵 音樂控制面板')
    .addSubcommand(s => s.setName('panel').setDescription('📋 顯示音樂控制面板'))
    .addSubcommand(s => s.setName('play').setDescription('🔍 搜尋並播放歌曲').addStringOption(o => o.setName('關鍵字').setDescription('歌曲名稱').setRequired(true))),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'play') {
      const voice = interaction.member.voice.channel;
      if (!voice) return interaction.reply({ content: '❌ 你不在語音頻道中', ephemeral: true });
      await interaction.deferReply({ ephemeral: true });

      try {
        const query = interaction.options.getString('關鍵字');
        const gq = music.getQueue(interaction.guild.id);
        if (!gq?.connection) {
          const member = await interaction.guild.members.fetch(interaction.client.user.id);
          if (!member.voice.channel) {
            const queue = new (require('../../services/music').MusicQueue || Object)(interaction.guild.id, voice, null);
            global.queues?.set(interaction.guild.id, queue);
          }
        }

        await music.playFromWeb(interaction.guild.id, voice.id, query, interaction.user.id);
        await interaction.editReply({ content: '✅ 已加入佇列' });
        
        const panelCh = panelChannels.get(interaction.guild.id);
        if (panelCh) {
          const ch = interaction.guild.channels.cache.get(panelCh);
          if (ch) {
            const msgs = await ch.messages.fetch({ limit: 5 });
            const panelMsg = msgs.find(m => m.author.id === interaction.client.user.id && m.components.length > 0);
            if (panelMsg) {
              await panelMsg.edit({ embeds: [buildPanel(interaction.guild.id)], components: buildButtons(interaction.guild.id) });
            }
          }
        }
      } catch (err) {
        await interaction.editReply({ content: `❌ ${err.message}` });
      }
      return;
    }

    if (sub === 'panel') {
      const voice = interaction.member.voice.channel;
      if (!voice) return interaction.reply({ content: '❌ 你不在語音頻道中', ephemeral: true });

      const msg = await interaction.reply({ embeds: [buildPanel(interaction.guild.id)], components: buildButtons(interaction.guild.id), fetchReply: true, ephemeral: false });
      panelChannels.set(interaction.guild.id, interaction.channel.id);
      embedCache = msg.id;

      const collector = msg.createMessageComponentCollector({ time: 600000 });
      collector.on('collect', async (btn) => {
        const gq = music.getQueue(interaction.guild.id);
        if (btn.customId === 'music_refresh') {
          await btn.update({ embeds: [buildPanel(interaction.guild.id)], components: buildButtons(interaction.guild.id) });
          return;
        }
        if (!gq) { await btn.reply({ content: '❌ 沒有播放中的音樂', ephemeral: true }); return; }

        switch (btn.customId) {
          case 'music_pause': gq.player.pause(); break;
          case 'music_resume': gq.player.unpause(); break;
          case 'music_skip': gq.player.stop(); break;
          case 'music_stop': gq.songs = []; gq.player.stop(); gq.connection?.destroy(); music.queues.delete(interaction.guild.id); break;
          case 'music_loop': gq.loop = !gq.loop; break;
          case 'music_volup': gq.volume = Math.min(100, gq.volume + 10); gq.player.state.resource?.volume?.setVolumeLogarithmic(gq.volume / 100); break;
          case 'music_voldown': gq.volume = Math.max(0, gq.volume - 10); gq.player.state.resource?.volume?.setVolumeLogarithmic(gq.volume / 100); break;
          case 'music_queue': await btn.reply({ embeds: [new (require('discord.js').EmbedBuilder)().setColor(0xff7700).setTitle('📋 播放佇列').setDescription(gq.songs.map((s, i) => `${i === 0 ? '▶️' : `${i}.`} ${s.title}`).slice(0, 10).join('\n') || '無')], ephemeral: true }); return;
        }
        await btn.update({ embeds: [buildPanel(interaction.guild.id)], components: buildButtons(interaction.guild.id) });
      });
      collector.on('end', async () => {
        try { await msg.edit({ components: [] }); } catch {}
      });
    }
  },
};
