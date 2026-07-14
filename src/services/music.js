const { createAudioPlayer, createAudioResource, joinVoiceChannel, AudioPlayerStatus } = require('@discordjs/voice');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const play = require('play-dl');
const fs = require('fs');
const path = require('path');

// Initialize SoundCloud
play.getFreeClientID().then(id => {
  if (id) play.setToken({ soundcloud: { client_id: id } });
}).catch(() => {});

// Detect cookies.txt in workspace root
try {
  const cookiePath = path.join(process.cwd(), 'cookies.txt');
  if (fs.existsSync(cookiePath)) {
    const cookieData = fs.readFileSync(cookiePath, 'utf8');
    play.setToken({ youtube: { cookie: cookieData } });
    console.log('[音樂] 成功載入 cookies.txt');
  }
} catch (err) {
  console.error('[音樂] 載入 cookies.txt 失敗:', err.message);
}

const queues = new Map();

class MusicQueue {
  constructor(guildId, channel, textChannel) {
    this.guildId = guildId;
    this.voiceChannel = channel;
    this.textChannel = textChannel;
    this.songs = [];
    this.playing = false;
    this.loop = false;
    this.volume = 50;
    this.connection = null;
    this.player = createAudioPlayer();
    this.controllerMessage = null;
    this.interval = null;
  }
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function createPlayerCard(queue) {
  const song = queue.songs[0];
  if (!song) return null;

  const currentMs = queue.player.state.resource?.playbackDuration || 0;
  const currentSec = Math.floor(currentMs / 1000);
  const totalSec = song.duration || 0;
  
  let progressStr = '';
  if (totalSec === 0) {
    progressStr = '🔴 直播中 / 未知長度';
  } else {
    const barLength = 12;
    const pct = Math.min(1, currentSec / totalSec);
    const active = Math.floor(pct * barLength);
    const bar = '▬'.repeat(active) + '🔘' + '▬'.repeat(Math.max(0, barLength - active - 1));
    progressStr = `${bar} \`[${formatTime(currentSec)} / ${formatTime(totalSec)}]\``;
  }

  const embed = new EmbedBuilder()
    .setColor(song.source === 'youtube' ? 0xff0000 : 0xff7700)
    .setTitle(`▶️ 正在播放：${song.title}`)
    .setURL(song.url)
    .addFields(
      { name: '來源', value: song.source === 'youtube' ? '🎥 YouTube' : '🎵 SoundCloud', inline: true },
      { name: '音量', value: `🔊 ${queue.volume}%`, inline: true },
      { name: '循環模式', value: queue.loop ? '🔁 啟用' : '❌ 停用', inline: true },
      { name: '進度條', value: progressStr }
    )
    .setFooter({ text: `佇列內還有 ${queue.songs.length - 1} 首歌曲` });

  if (song.thumbnail) {
    embed.setThumbnail(song.thumbnail);
  }

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('music_toggle')
      .setLabel(queue.player.state.status === 'paused' ? '▶️ 繼續' : '⏸️ 暫停')
      .setStyle(queue.player.state.status === 'paused' ? ButtonStyle.Success : ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('music_skip')
      .setLabel('⏭️ 跳過')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('music_stop')
      .setLabel('⏹️ 停止')
      .setStyle(ButtonStyle.Danger)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('music_loop')
      .setLabel(queue.loop ? '🔁 循環中' : '🔁 單曲循環')
      .setStyle(queue.loop ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('music_vol_down')
      .setLabel('🔉 音量 -')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('music_vol_up')
      .setLabel('🔊 音量 +')
      .setStyle(ButtonStyle.Secondary)
  );

  return { embeds: [embed], components: [row1, row2] };
}

async function updateController(guildId) {
  const queue = queues.get(guildId);
  if (queue && queue.controllerMessage) {
    const card = createPlayerCard(queue);
    if (card) {
      await queue.controllerMessage.edit(card).catch(() => {});
    }
  }
}

async function searchTrack(query) {
  // 1. YouTube 連結解析與播放
  const isYtUrl = play.yt_validate(query) !== false;
  if (isYtUrl) {
    try {
      const info = await play.video_basic_info(query);
      if (info) {
        return {
          title: info.video_details.title,
          url: info.video_details.url,
          duration: info.video_details.durationInSec,
          source: 'youtube',
          thumbnail: info.video_details.thumbnails?.[0]?.url || null
        };
      }
    } catch (err) {
      console.warn(`[音樂] YouTube 連結解析失敗，自動降級至 SoundCloud:`, err.message);
    }
  }

  // 2. YouTube 搜尋
  try {
    const ytResults = await play.search(query, { source: { youtube: 'video' }, limit: 1 }).catch(() => []);
    if (ytResults && ytResults.length > 0) {
      return {
        title: ytResults[0].title,
        url: ytResults[0].url,
        duration: ytResults[0].durationInSec,
        source: 'youtube',
        thumbnail: ytResults[0].thumbnails?.[0]?.url || null
      };
    }
  } catch (err) {
    console.warn(`[音樂] YouTube 搜尋失敗，自動降級至 SoundCloud:`, err.message);
  }

  // 3. SoundCloud 搜尋備用
  try {
    const scResults = await play.search(query, { source: { soundcloud: 'tracks' }, limit: 1 }).catch(() => []);
    if (scResults && scResults.length > 0) {
      return {
        title: scResults[0].name || scResults[0].title,
        url: scResults[0].url,
        duration: Math.floor((scResults[0].duration || 0) / 1000),
        source: 'soundcloud',
        thumbnail: scResults[0].thumbnail || null
      };
    }
  } catch (err) {
    console.error(`[音樂] SoundCloud 搜尋亦失敗:`, err.message);
  }

  return null;
}

const music = {
  queues,
  createPlayerCard,
  updateController,
  async play(interaction, query) {
    const voice = interaction.member.voice.channel;
    if (!voice) return interaction.reply({ content: '❌ 你不在語音頻道中', ephemeral: true });
    
    const perms = voice.permissionsFor(interaction.client.user);
    if (!perms.has('Connect') || !perms.has('Speak')) return interaction.reply({ content: '❌ 機器人沒有權限加入/發聲', ephemeral: true });
    
    await interaction.deferReply();

    let guildQueue = queues.get(interaction.guild.id);
    if (!guildQueue) { 
      guildQueue = new MusicQueue(interaction.guild.id, voice, interaction.channel); 
      queues.set(interaction.guild.id, guildQueue); 
    }
    if (guildQueue.voiceChannel.id !== voice.id) return interaction.editReply({ content: '❌ 機器人已在其他語音頻道' });

    const song = await searchTrack(query);
    if (!song) return interaction.editReply('❌ 找不到任何音樂結果 (YouTube 與 SoundCloud 搜尋均未回應)');

    guildQueue.songs.push(song);
    if (!guildQueue.playing) {
      await playSong(guildQueue);
    } else {
      updateController(interaction.guild.id);
    }

    const embed = new EmbedBuilder()
      .setColor(song.source === 'youtube' ? 0xff0000 : 0xff7700)
      .setTitle('🎵 已加入佇列')
      .setDescription(song.title)
      .setFooter({ text: `位置 #${guildQueue.songs.length} • 來源: ${song.source}` });
      
    await interaction.editReply({ embeds: [embed] });
  },

  async skip(i) { 
    const gq = queues.get(i.guild.id); 
    if (!gq || !gq.playing) return i.reply({ content: '❌ 沒有播放中的音樂', ephemeral: true }); 
    gq.player.stop(); 
    return i.reply({ content: '⏭️ 已跳過歌曲', ephemeral: true }); 
  },
  
  async stop(i) { 
    const gq = queues.get(i.guild.id); 
    if (!gq) return i.reply({ content: '❌ 沒有播放中的音樂', ephemeral: true }); 
    gq.songs = []; 
    gq.player.stop(); 
    gq.connection?.destroy(); 
    if (gq.interval) clearInterval(gq.interval);
    if (gq.controllerMessage) {
      await gq.controllerMessage.delete().catch(() => {});
    }
    queues.delete(i.guild.id); 
    return i.reply({ content: '⏹️ 已停止播放並離開語音頻道', ephemeral: true }); 
  },
  
  async np(i) { 
    const gq = queues.get(i.guild.id); 
    if (!gq || !gq.playing || !gq.songs[0]) return i.reply({ content: '❌ 沒有播放中的音樂', ephemeral: true }); 
    const card = createPlayerCard(gq);
    return i.reply({ embeds: card.embeds, components: card.components, ephemeral: true }); 
  },
  
  async queue(i) { 
    const gq = queues.get(i.guild.id); 
    if (!gq || gq.songs.length === 0) return i.reply({ content: '❌ 佇列為空', ephemeral: true }); 
    return i.reply({ embeds: [new EmbedBuilder().setColor(0xff7700).setTitle('🎶 播放佇列').setDescription(gq.songs.map((s, idx) => `${idx === 0 ? '▶️' : `${idx}.`} ${s.title}`).slice(0, 10).join('\n'))], ephemeral: true }); 
  },
  
  async pause(i) { 
    const gq = queues.get(i.guild.id); 
    if (!gq || !gq.playing) return i.reply({ content: '❌ 沒有播放中的音樂', ephemeral: true }); 
    gq.player.pause(); 
    updateController(i.guild.id);
    return i.reply({ content: '⏸️ 已暫停播放', ephemeral: true }); 
  },
  
  async resume(i) { 
    const gq = queues.get(i.guild.id); 
    if (!gq) return i.reply({ content: '❌ 沒有暫停中的音樂', ephemeral: true }); 
    gq.player.unpause(); 
    updateController(i.guild.id);
    return i.reply({ content: '▶️ 已繼續播放', ephemeral: true }); 
  },
  
  async volume(i, vol) { 
    const gq = queues.get(i.guild.id); 
    if (!gq || !gq.playing) return i.reply({ content: '❌ 沒有播放中的音樂', ephemeral: true }); 
    gq.volume = Math.max(0, Math.min(100, vol)); 
    gq.player.state.resource?.volume?.setVolumeLogarithmic(gq.volume / 100); 
    updateController(i.guild.id);
    return i.reply({ content: `🔊 音量已調整至 ${gq.volume}%`, ephemeral: true }); 
  },
  
  async loop(i) { 
    const gq = queues.get(i.guild.id); 
    if (!gq) return i.reply({ content: '❌ 沒有播放中的音樂', ephemeral: true }); 
    gq.loop = !gq.loop; 
    updateController(i.guild.id);
    return i.reply({ content: `🔁 循環播放已${gq.loop ? '啟用' : '停用'}`, ephemeral: true }); 
  },
};

async function playSong(queue) {
  queue.playing = true;
  if (!queue.connection) {
    queue.connection = joinVoiceChannel({ channelId: queue.voiceChannel.id, guildId: queue.guildId, adapterCreator: queue.voiceChannel.guild.voiceAdapterCreator });
    queue.connection.subscribe(queue.player);
  }
  const song = queue.songs[0];
  if (!song) { 
    queue.playing = false; 
    if (queue.interval) clearInterval(queue.interval);
    return; 
  }

  try {
    const stream = await play.stream(song.url);
    const resource = createAudioResource(stream.stream, { inputType: stream.type, inlineVolume: true });
    resource.volume?.setVolumeLogarithmic(queue.volume / 100);
    queue.player.play(resource);

    // 刪除舊的控制台消息，保持最新
    if (queue.controllerMessage) {
      await queue.controllerMessage.delete().catch(() => {});
      queue.controllerMessage = null;
    }

    if (queue.interval) clearInterval(queue.interval);

    // 發送全新互動控制面板
    const card = createPlayerCard(queue);
    if (queue.textChannel && card) {
      queue.controllerMessage = await queue.textChannel.send(card).catch(() => null);

      // 每 10 秒動態編輯一次 Embed，刷新進度條
      queue.interval = setInterval(async () => {
        if (!queue.playing || !queue.controllerMessage || queue.songs[0] !== song) {
          clearInterval(queue.interval);
          return;
        }
        const updatedCard = createPlayerCard(queue);
        if (updatedCard) {
          await queue.controllerMessage.edit(updatedCard).catch(() => {});
        }
      }, 10000);
    }
  } catch (err) {
    console.error('[音樂] 播放失敗:', err.message);
    if (queue.textChannel) queue.textChannel.send(`❌ 播放歌曲「${song.title}」失敗，自動跳過並嘗試下一首...`).catch(() => {});
    
    queue.songs.shift();
    if (queue.songs.length > 0) playSong(queue);
    else { 
      queue.playing = false; 
      queue.connection?.destroy(); 
      queues.delete(queue.guildId); 
    }
    return;
  }

  queue.player.removeAllListeners(AudioPlayerStatus.Idle);
  queue.player.on(AudioPlayerStatus.Idle, () => {
    if (queue.interval) clearInterval(queue.interval);
    if (queue.loop) queue.songs.push(queue.songs.shift()); else queue.songs.shift();
    
    if (queue.songs.length > 0) playSong(queue);
    else { 
      queue.playing = false; 
      if (queue.controllerMessage) {
        queue.controllerMessage.delete().catch(() => {});
        queue.controllerMessage = null;
      }
      setTimeout(() => { 
        const freshQ = queues.get(queue.guildId);
        if (freshQ && freshQ.songs.length === 0) {
          freshQ.connection?.destroy(); 
          queues.delete(queue.guildId); 
        }
      }, 60000); 
      if (queue.textChannel) queue.textChannel.send('🎵 所有歌曲播放完畢').catch(() => {}); 
    }
  });

  queue.player.removeAllListeners('error');
  queue.player.on('error', (err) => { 
    console.error('[音樂] 播放器錯誤:', err.message); 
    if (queue.textChannel) queue.textChannel.send('❌ 音頻播放器解碼出錯').catch(() => {}); 
  });
}

module.exports = music;
