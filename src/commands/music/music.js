process.env.YTDL_NO_UPDATE = '1';
const { createAudioPlayer, createAudioResource, joinVoiceChannel, AudioPlayerStatus } = require('@discordjs/voice');
const ytdl = require('@distube/ytdl-core');
const { EmbedBuilder } = require('discord.js');
const axios = require('axios');
const { Client: SCClient } = require('soundcloud-scraper');

const sc = new SCClient();
const queues = new Map();

const ytdlOptions = {
  filter: 'audioonly',
  quality: 'lowestaudio',
  highWaterMark: 1 << 25,
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
  }
}

/**
 * 将 Spotify 曲目转换为 SoundCloud 曲目
 * @param {string} spotifyUrl - Spotify 网址或 URI
 * @returns {Promise<Object|null>} SoundCloud 曲目对象
 */
async function spotifyUrlToSoundCloudTrack(spotifyUrl) {
  try {
    const idMatch = spotifyUrl.match(/(?:open\.spotify\.com\/track\/|spotify:track:)([A-Za-z0-9]+)/);
    if (!idMatch) return null;

    const trackUrl = spotifyUrl.startsWith('spotify:') 
      ? `https://open.spotify.com/track/${idMatch[1]}` 
      : spotifyUrl;

    // 从 Spotify oEmbed 获取歌曲标题
    const oembedRes = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(trackUrl)}`);
    if (!oembedRes.ok) return null;
    
    const oembed = await oembedRes.json();
    const results = await sc.search(oembed.title, 'track');
    return results?.[0] || null;
  } catch (err) {
    console.error('[Spotify→SoundCloud] 转换失败:', err.message);
    return null;
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
    const you*

