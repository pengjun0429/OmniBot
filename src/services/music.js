const { createAudioPlayer, createAudioResource, joinVoiceChannel, AudioPlayerStatus } = require('@discordjs/voice');
const ytdl = require('@distube/ytdl-core');
const { EmbedBuilder } = require('discord.js');
const axios = require('axios');
const https = require('https');

const agent = new https.Agent({
  rejectUnauthorized: false,
  keepAlive: true,
});

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
  }
}

async function searchYouTube(query) {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (apiKey) {
    try {
      const res = await axios.get('https://www.googleapis.com/youtube/v3/search', {
        params: { part: 'snippet', q: query, type: 'video', maxResults: 1, key: apiKey },
        timeout: 10000,
      });
      const item = res.data?.items?.[0];
      if (!item) return null;
      const vid = item.id.videoId;
      return { title: item.snippet.title, url: `https://www.youtube.com/watch?v=${vid}`, duration: 0 };
    } catch { return null; }
  }

  try {
    const res = await axios.get('https://www.youtube.com/results', {
      params: { search_query: query },
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 10000,
    });
    const matches = res.data.match(/watch\?v=([a-zA-Z0-9_-]{11})/g);
    if (!matches) return null;
    const vid = matches[0].replace('watch?v=', '');
    return { title: query, url: `https://www.youtube.com/watch?v=${vid}`, duration: 0 };
  } catch { return null; }
}

const music = {
  async play(interaction, query) {
    const voice = interaction.member.voice.channel;
    if (!voice) return interaction.reply({ content: '❌ 你不在語音頻道中', ephemeral: true });

    const perms = voice.permissionsFor(interaction.client.user);
    if (!perms.has('Connect') || !perms.has('Speak')) {
      return interaction.reply({ content: '❌ 機器人沒有權限加入/發聲', ephemeral: true });
    }

    await interaction.deferReply();

    let guildQueue = queues.get(interaction.guild.id);
    if (!guildQueue) {
      guildQueue = new MusicQueue(interaction.guild.id, voice, interaction.channel);
      queues.set(interaction.guild.id, guildQueue);
    }

    if (guildQueue.voiceChannel.id !== voice.id) {
      return interaction.editReply({ content: '❌ 機器人已在其他語音頻道' });
    }

    let song;
    const urlMatch = query.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (urlMatch) {
      try {
        const vid = urlMatch[1];
        const info = await ytdl.getInfo(vid);
        song = { title: info.videoDetails.title, url: info.videoDetails.video_url, duration: info.videoDetails.lengthSeconds };
      } catch {
        return interaction.editReply('❌ 無法取得影片資訊，請確認網址正確。若持續失敗，請嘗試使用 `/play 關鍵字` 搜尋');
      }
    } else {
      const result = await searchYouTube(query);
      if (!result) return interaction.editReply('❌ 找不到結果');
      song = result;
    }

    guildQueue.songs.push(song);

    if (!guildQueue.playing) {
      playSong(guildQueue);
    }

    const embed = new EmbedBuilder()
      .setColor(0x1db954)
      .setTitle('🎵 已加入佇列')
      .setDescription(`[${song.title}](${song.url})`)
      .setFooter({ text: `位置 #${guildQueue.songs.length} • ${Math.floor(song.duration / 60)}:${String(song.duration % 60).padStart(2, '0')}` });

    await interaction.editReply({ embeds: [embed] });
  },

  skip(interaction) {
    const guildQueue = queues.get(interaction.guild.id);
    if (!guildQueue || !guildQueue.playing) return interaction.reply({ content: '❌ 目前沒有播放中的音樂', ephemeral: true });
    guildQueue.player.stop(true);
    return interaction.reply({ content: '⏭️ 已跳過', ephemeral: true });
  },

  stop(interaction) {
    const guildQueue = queues.get(interaction.guild.id);
    if (!guildQueue) return interaction.reply({ content: '❌ 沒有播放中的音樂', ephemeral: true });
    guildQueue.songs = [];
    guildQueue.player.stop();
    guildQueue.connection?.destroy();
    queues.delete(interaction.guild.id);
    return interaction.reply({ content: '⏹️ 已停止播放並離開', ephemeral: true });
  },

  nowplaying(interaction) {
    const guildQueue = queues.get(interaction.guild.id);
    if (!guildQueue || !guildQueue.playing || guildQueue.songs.length === 0) {
      return interaction.reply({ content: '❌ 目前沒有播放中的音樂', ephemeral: true });
    }
    const song = guildQueue.songs[0];
    const embed = new EmbedBuilder()
      .setColor(0x1db954)
      .setTitle('🎵 正在播放')
      .setDescription(`[${song.title}](${song.url})`)
      .setFooter({ text: `佇列：${guildQueue.songs.length - 1} 首` });
    return interaction.reply({ embeds: [embed], ephemeral: true });
  },

  queue(interaction) {
    const guildQueue = queues.get(interaction.guild.id);
    if (!guildQueue || guildQueue.songs.length === 0) return interaction.reply({ content: '❌ 佇列為空', ephemeral: true });
    const list = guildQueue.songs.map((s, i) => `${i === 0 ? '▶️' : `${i}.`} [${s.title}](${s.url})`).slice(0, 10).join('\n');
    const embed = new EmbedBuilder()
      .setColor(0x1db954)
      .setTitle('🎶 播放佇列')
      .setDescription(list)
      .setFooter({ text: `共 ${guildQueue.songs.length} 首` });
    return interaction.reply({ embeds: [embed], ephemeral: true });
  },

  pause(interaction) {
    const guildQueue = queues.get(interaction.guild.id);
    if (!guildQueue || !guildQueue.playing) return interaction.reply({ content: '❌ 沒有播放中的音樂', ephemeral: true });
    guildQueue.player.pause();
    return interaction.reply({ content: '⏸️ 已暫停', ephemeral: true });
  },

  resume(interaction) {
    const guildQueue = queues.get(interaction.guild.id);
    if (!guildQueue) return interaction.reply({ content: '❌ 沒有暫停中的音樂', ephemeral: true });
    guildQueue.player.unpause();
    return interaction.reply({ content: '▶️ 已繼續播放', ephemeral: true });
  },

  volume(interaction, vol) {
    const guildQueue = queues.get(interaction.guild.id);
    if (!guildQueue || !guildQueue.playing) return interaction.reply({ content: '❌ 沒有播放中的音樂', ephemeral: true });
    guildQueue.volume = Math.max(0, Math.min(100, vol));
    guildQueue.player.state.resource?.volume?.setVolumeLogarithmic(guildQueue.volume / 100);
    return interaction.reply({ content: `🔊 音量已設為 ${guildQueue.volume}%`, ephemeral: true });
  },

  loop(interaction) {
    const guildQueue = queues.get(interaction.guild.id);
    if (!guildQueue) return interaction.reply({ content: '❌ 沒有播放中的音樂', ephemeral: true });
    guildQueue.loop = !guildQueue.loop;
    return interaction.reply({ content: `🔁 循環播放已${guildQueue.loop ? '啟用' : '停用'}`, ephemeral: true });
  },
};

async function playSong(queue) {
  queue.playing = true;

  if (!queue.connection) {
    queue.connection = joinVoiceChannel({
      channelId: queue.voiceChannel.id,
      guildId: queue.guildId,
      adapterCreator: queue.voiceChannel.guild.voiceAdapterCreator,
    });
    queue.connection.subscribe(queue.player);
    queue.connection.on('stateChange', (oldState, newState) => {
      if (newState.status === 'disconnected' || newState.status === 'destroyed') {
        queue.playing = false;
        queues.delete(queue.guildId);
      }
    });
  }

  const song = queue.songs[0];
  if (!song) { queue.playing = false; return; }

  try {
    const stream = ytdl(song.url, {
      filter: 'audioonly',
      quality: 'lowestaudio',
      highWaterMark: 1 << 25,
      agent,
      requestOptions: {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
        },
      },
    });

    const resource = createAudioResource(stream, { inlineVolume: true });
    resource.volume?.setVolumeLogarithmic(queue.volume / 100);
    queue.player.play(resource);

    if (queue.textChannel) {
      const embed = new EmbedBuilder()
        .setColor(0x1db954)
        .setTitle('▶️ 正在播放')
        .setDescription(`[${song.title}](${song.url})`)
        .setFooter({ text: `音量 ${queue.volume}%` });
      queue.textChannel.send({ embeds: [embed] }).catch(() => {});
    }
  } catch (err) {
    console.error('[音樂] 播放失敗:', err.message);
    queue.songs.shift();
    if (queue.songs.length > 0) playSong(queue);
    else {
      queue.playing = false;
      queue.connection?.destroy();
      queues.delete(queue.guildId);
      if (queue.textChannel) queue.textChannel.send('❌ 無法播放此歌曲').catch(() => {});
    }
    return;
  }

  const idleHandler = () => {
    if (queue.loop) queue.songs.push(queue.songs.shift());
    else queue.songs.shift();

    if (queue.songs.length > 0) playSong(queue);
    else {
      queue.playing = false;
      setTimeout(() => { queue.connection?.destroy(); queues.delete(queue.guildId); }, 60000);
      if (queue.textChannel) queue.textChannel.send('🎵 佇列已播放完畢').catch(() => {});
    }
  };

  queue.player.removeAllListeners(AudioPlayerStatus.Idle);
  queue.player.on(AudioPlayerStatus.Idle, idleHandler);

  queue.player.removeAllListeners('error');
  queue.player.on('error', (err) => {
    console.error('[音樂] 串流錯誤:', err.message);
    if (queue.textChannel) queue.textChannel.send('❌ 播放時發生串流錯誤').catch(() => {});
  });
}

module.exports = music;
