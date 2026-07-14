const { SlashCommandBuilder } = require('discord.js');
const music = require('../../services/music');

module.exports = {
  category: '音樂',
  data: new SlashCommandBuilder()
    .setName('music')
    .setDescription('音樂控制')
    .addSubcommand(s => s.setName('skip').setDescription('跳過當前歌曲'))
    .addSubcommand(s => s.setName('stop').setDescription('停止播放並離開'))
    .addSubcommand(s => s.setName('np').setDescription('查看正在播放'))
    .addSubcommand(s => s.setName('queue').setDescription('查看播放佇列'))
    .addSubcommand(s => s.setName('pause').setDescription('暫停播放'))
    .addSubcommand(s => s.setName('resume').setDescription('繼續播放'))
    .addSubcommand(s => s.setName('loop').setDescription('切換循環播放'))
    .addSubcommand(s => s.setName('volume').setDescription('調整音量').addIntegerOption(o => o.setName('音量').setDescription('0-100').setRequired(true).setMinValue(0).setMaxValue(100))),
async execute(interaction) {
  const sub = interaction.options.getSubcommand();
  if (sub === 'skip') return await music.skip(interaction);
  if (sub === 'stop') return await music.stop(interaction);
  if (sub === 'np') return await music.nowplaying(interaction);
  if (sub === 'queue') return await music.queue(interaction);
  if (sub === 'pause') return await music.pause(interaction);
  if (sub === 'resume') return await music.resume(interaction);
  if (sub === 'loop') return await music.loop(interaction);
  if (sub === 'volume') return await music.volume(interaction, interaction.options.getInteger('音量'));
  },
};
