const { SlashCommandBuilder } = require('discord.js');
const music = require('../../services/music');

module.exports = {
  category: '音樂',
  data: new SlashCommandBuilder()
    .setName('music')
    .setDescription('音樂播放控制')
    .addSubcommand(sub =>
      sub.setName('skip')
        .setDescription('跳過目前歌曲'))
    .addSubcommand(sub =>
      sub.setName('stop')
        .setDescription('停止播放並離開語音頻道'))
    .addSubcommand(sub =>
      sub.setName('np')
        .setDescription('顯示目前正在播放的歌曲'))
    .addSubcommand(sub =>
      sub.setName('queue')
        .setDescription('顯示播放佇列'))
    .addSubcommand(sub =>
      sub.setName('pause')
        .setDescription('暫停播放'))
    .addSubcommand(sub =>
      sub.setName('resume')
        .setDescription('繼續播放'))
    .addSubcommand(sub =>
      sub.setName('loop')
        .setDescription('切換循環播放'))
    .addSubcommand(sub =>
      sub.setName('volume')
        .setDescription('調整音量')
        .addIntegerOption(opt =>
          opt.setName('百分比').setDescription('音量 0-100').setRequired(true).setMinValue(0).setMaxValue(100))),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    switch (sub) {
      case 'skip': return music.skip(interaction);
      case 'stop': return music.stop(interaction);
      case 'np': return music.np(interaction);
      case 'queue': return music.queue(interaction);
      case 'pause': return music.pause(interaction);
      case 'resume': return music.resume(interaction);
      case 'loop': return music.loop(interaction);
      case 'volume': return music.volume(interaction, interaction.options.getInteger('百分比'));
    }
  },
};
