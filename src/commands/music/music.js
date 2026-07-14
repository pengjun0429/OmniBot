process.env.YTDL_NO_UPDATE = '1';
const { createAudioPlayer, createAudioResource, joinVoiceChannel, AudioPlayerStatus, StreamType } = require('@discordjs/voice');
const ytdl = require('@distube/ytdl-core');
const { EmbedBuilder } = require('discord.js');
const axios = require('axios');
const { Client: SCClient } = require('soundcloud-scraper');

const sc = new SCClient();
const queues = new Map();

// 改良的 ytdl 選項：提高緩衝以減少網路抖動導致的卡頓
const ytdlOptions = {
  filter: 'audioonly',
  quality: 'highestaudio',
  // 提高 highWaterMark，減少讀流時因網路小幅波動而中斷
  highWaterMark: 1 << 26, // 64 MB
  // 可視情況加入 requestOptions 來延長 http timeout
  requestOptions: { timeout: 30000 },
};

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

    // 監聽 player state 以便 debug 與排查卡頓
    this.player.on('stateChange', (oldState, newState) => {
      try {
        console.log(`[MusicQueue:${this.guildId}] Player state: ${oldState.status} -> ${newState.status}`);
      } catch (e) { console.error(e); }
    });

    this.player.on('error', (err) => {
      console.error(`[MusicQueue:${this.guildId}] Player error:`, err);
    });
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
    } catch (e) { return null; }
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
  } catch (e) { return null; }
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

    // 建立或取得 voice connection
    try {
      if (!guildQueue.connection) {
        const connection = joinVoiceChannel({
          channelId: voice.id,
          guildId: interaction.guild.id,
          adapterCreator: interaction.guild.voiceAdapterCreator,
          selfDeaf: true,
        });
        guildQueue.connection = connection;
        // 將 player 訂閱到 connection
        connection.subscribe(guildQueue.player);
      }
    } catch (err) {
      console.error('[music.play] joinVoiceChannel error:', err);
      return interaction.editReply({ content: '❌ 無法加入語音頻道' });
    }

    // 找歌（支援 YouTube、SoundCloud、Spotify 轉換等，可依原實作補充）
    let song = null;
    if (/^(https?:\/\/|www\.)/.test(query)) {
      song = { title: query, url: query };
    } else {
      song = await searchYouTube(query) || { title: query, url: query };
    }

    if (!song || !song.url) return interaction.editReply({ content: '❌ 找不到歌曲' });

    // 推入歌曲隊列並開始播放（若未在播放中）
    guildQueue.songs.push(song);

    if (!guildQueue.playing) {
      guildQueue.playing = true;
      await interaction.editReply({ content: `▶️ 開始播放：${song.title}` });
      try {
        await playSong(guildQueue);
      } catch (err) {
        console.error('[music.play] playSong error:', err);
        guildQueue.playing = false;
        return interaction.followUp({ content: '❌ 播放時發生錯誤' });
      }
    } else {
      return interaction.editReply({ content: `✅ 已加入隊列：${song.title}` });
    }
  },
};

async function playSong(guildQueue) {
  const song = guildQueue.songs.shift();
  if (!song) {
    guildQueue.playing = false;
    // 可斷開連線：guildQueue.connection?.destroy?.();
    return;
  }

  console.log(`[playSong] guild=${guildQueue.guildId} playing ${song.url}`);

  // 建立 ytdl 流並包成 AudioResource
  const stream = ytdl(song.url, ytdlOptions);

  const resource = createAudioResource(stream, {
    inputType: StreamType.Arbitrary,
    inlineVolume: true,
  });

  // 設定音量（logarithmic 以獲得更自然的音量控制）
  try {
    resource.volume.setVolumeLogarithmic(guildQueue.volume / 100);
  } catch (e) { /* ignore if volume not available */ }

  guildQueue.player.play(resource);

  // 監聽播放完成或錯誤
  const onIdle = () => {
    guildQueue.player.removeListener('stateChange', stateChangeHandler);
    // 若開啟 loop，則把歌放回隊列
    if (guildQueue.loop) guildQueue.songs.unshift(song);
    // 播下一首
    setImmediate(() => playSong(guildQueue));
  };

  const stateChangeHandler = (oldState, newState) => {
    // 當變成空閒（Idle）時代表歌曲結束或中斷
    if (oldState.status !== AudioPlayerStatus.Idle && newState.status === AudioPlayerStatus.Idle) {
      onIdle();
    }

    if (newState.status === AudioPlayerStatus.Buffering) {
      console.log(`[playSong] Buffering for guild=${guildQueue.guildId}`);
    }
  };

  guildQueue.player.on('stateChange', stateChangeHandler);

  guildQueue.player.on('error', (err) => {
    console.error('[playSong] player error:', err);
    // 嘗試跳下一首
    setImmediate(() => playSong(guildQueue));
  });
}

module.exports = music;
