process.env.YTDL_NO_UPDATE = '1';
const { createAudioPlayer, createAudioResource, joinVoiceChannel, AudioPlayerStatus } = require('@discordjs/voice');
const play = require('play-dl');
const { EmbedBuilder } = require('discord.js');
const axios = require('axios');

const queues = new Map();

if (process.env.YOUTUBE_COOKIES) {
  play.setToken({ youtube: { cookie: process.env.YOUTUBE_COOKIES } });
}

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

async function getVideoInfo(query) {
  const urlMatch = query.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (urlMatch) {
    const videoUrl = `https://www.youtube.com/watch?v=${urlMatch[1]}`;
    const info = await play.video_info(videoUrl).catch(() => null);
    if (!info) return { title: 'Unknown', url: videoUrl, duration: 0 };
    return { title: info.video_details.title, url: videoUrl, duration: info.video_details.durationInSec };
  }
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
  const results = await play.search(query, { limit: 1 });
  if (results.length === 0) return null;
  return { title: results[0].title, url: results[0].url, duration: results[0].durationInSec };
}

const music = {
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

    try {
      const song = await getVideoInfo(query);
      if (!song) return interaction.editReply('❌ 找不到結果');

      guildQueue.songs.push(song);
      if (!guildQueue.playing) playSong(guildQueue);

      const embed = new EmbedBuilder()
        .setColor(0x1db954).setTitle('🎵 已加入佇列')
        .setDescription(`[${song.title}](${song.url})`)
        .setFooter({ text: `位置 #${guildQueue.songs.length} • ${Math.floor(song.duration / 60)}:${String(song.duration % 60).padStart(2, '0')}` });
      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error('[音樂] 搜尋失敗:', err.message);
      await interaction.editReply('❌ 找不到結果');
    }
  },

  skip(interaction) {
    const guildQueue = queues.get(interaction.guild.id);
    if (!guildQueue || !guildQueue.playing) return interaction.reply({ content: '❌ 目前沒有播放中的音樂', ephemeral: true });
    guildQueue.player.stop();
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
    if (!guildQueue || !guildQueue.playing || guildQueue.songs.length === 0) return interaction.reply({ content: '❌ 目前沒有播放中的音樂', ephemeral: true });
    const song = guildQueue.songs[0];
    return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x1db954).setTitle('🎵 正在播放').setDescription(`[${song.title}](${song.url})`)], ephemeral: true });
  },

  queue(interaction) {
    const guildQueue = queues.get(interaction.guild.id);
    if (!guildQueue || guildQueue.songs.length === 0) return interaction.reply({ content: '❌ 佇列為空', ephemeral: true });
    const list = guildQueue.songs.map((s, i) => `${i === 0 ? '▶️' : `${i}.`} [${s.title}](${s.url})`).slice(0, 10).join('\n');
    return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x1db954).setTitle('🎶 播放佇列').setDescription(list)], ephemeral: true });
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
      channelId: queue.voiceChannel.id, guildId: queue.guildId,
      adapterCreator: queue.voiceChannel.guild.voiceAdapterCreator,
    });
    queue.connection.subscribe(queue.player);
  }

  const song = queue.songs[0];
  if (!song) { queue.playing = false; return; }

  try {
    console.log('[音樂] 正在串流:', song.url);
    const stream = await play.stream(song.url, { quality: 0 });
    const resource = createAudioResource(stream.stream, { inputType: stream.type, inlineVolume: true });
    resource.volume?.setVolumeLogarithmic(queue.volume / 100);
    queue.player.play(resource);

    if (queue.textChannel) {
      const embed = new EmbedBuilder()
        .setColor(0x1db954).setTitle('▶️ 正在播放')
        .setDescription(`[${song.title}](${song.url})`).setFooter({ text: `音量 ${queue.volume}%` });
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
