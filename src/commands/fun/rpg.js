const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const settings = require('../../services/settings');

const RANKS = ['戰士', '法師', '盜賊'];
const MONSTERS = ['哥布林', '骷髏兵', '石像鬼', '暗黑騎士', '巨龍'];
const ITEMS = ['木劍', '鐵盔', '魔法書', '敏捷靴', '龍鱗盾', '神聖之劍'];

module.exports = {
  category: '娛樂',
  data: new SlashCommandBuilder()
    .setName('rpg')
    .setDescription('⚔️ RPG 冒險')
    .addSubcommand(s => s.setName('create').setDescription('創建你的角色').addStringOption(o => o.setName('職業').setDescription('選擇職業').setRequired(true).addChoices(
      { name: '⚔️ 戰士', value: '戰士' }, { name: '🔮 法師', value: '法師' }, { name: '🗡️ 盜賊', value: '盜賊' })))
    .addSubcommand(s => s.setName('profile').setDescription('查看角色狀態'))
    .addSubcommand(s => s.setName('adventure').setDescription('出發探險！')),
  async execute(interaction) {
    const gs = settings.getGuildSettings(interaction.guild.id);
    if (!gs.rpg) gs.rpg = {};
    const uid = interaction.user.id;

    if (interaction.options.getSubcommand() === 'create') {
      if (gs.rpg[uid]) return interaction.reply({ content: '❌ 你已經有角色了！', ephemeral: true });
      const job = interaction.options.getString('職業');
      gs.rpg[uid] = { job, hp: 100, maxHp: 100, atk: 10, def: 5, lv: 1, exp: 0, gold: 0, items: [] };
      settings.updateGuildSettings(interaction.guild.id, gs);
      return interaction.reply({ content: `⚔️ **${interaction.user.username}** 創建了 **${job}**！開始冒險吧！`, ephemeral: true });
    }

    if (!gs.rpg[uid]) return interaction.reply({ content: '❌ 請先用 `/rpg create` 創建角色', ephemeral: true });

    const char = gs.rpg[uid];

    if (interaction.options.getSubcommand() === 'profile') {
      const embed = new EmbedBuilder()
        .setColor(0xf59e0b).setTitle(`⚔️ ${interaction.user.username} 的冒險者`).setDescription(`**職業：** ${char.job}\n**等級：** ${char.lv}\n**經驗：** ${char.exp}/${char.lv * 100}`)
        .addFields(
          { name: '❤️ HP', value: `${char.hp}/${char.maxHp}`, inline: true },
          { name: '⚔️ 攻擊', value: `${char.atk}`, inline: true },
          { name: '🛡️ 防禦', value: `${char.def}`, inline: true },
          { name: '💰 金幣', value: `${char.gold}`, inline: true },
          { name: '🎒 裝備', value: char.items?.join(', ') || '無', inline: true },
        );
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (interaction.options.getSubcommand() === 'adventure') {
      const cooldown = 120000;
      if (char._lastAdventure && Date.now() - char._lastAdventure < cooldown) {
        const remaining = Math.ceil((cooldown - (Date.now() - char._lastAdventure)) / 1000);
        return interaction.reply({ content: `⏳ 冷卻中，還需 ${remaining} 秒`, ephemeral: true });
      }

      const monster = MONSTERS[Math.floor(Math.random() * MONSTERS.length)];
      const monsterHp = 30 + char.lv * 10;
      const monsterAtk = 5 + char.lv * 3;
      let mHp = monsterHp;
      let dmg = Math.max(1, char.atk - Math.floor(monsterAtk * 0.3) + Math.floor(Math.random() * 5));
      mHp -= dmg;
      let result = '';
      let won = false;

      if (mHp <= 0) {
        won = true;
        const gold = Math.floor(Math.random() * 100) + char.lv * 10;
        const exp = Math.floor(Math.random() * 50) + char.lv * 5;
        char.gold += gold;
        char.exp += exp;
        result = `⚔️ 你對 **${monster}** 造成 ${dmg} 點傷害，擊敗了它！\n💰 獲得 ${gold} 金幣，📈 ${exp} 經驗`;

        if (Math.random() < 0.3) {
          const item = ITEMS[Math.floor(Math.random() * ITEMS.length)];
          char.items.push(item);
          result += `\n🎁 獲得裝備：**${item}**`;
        }

        if (char.exp >= char.lv * 100) {
          char.exp = 0;
          char.lv++;
          char.maxHp += 20;
          char.hp = char.maxHp;
          char.atk += 3;
          char.def += 2;
          result += `\n🎉 **升級！** 等級 ${char.lv}！全能力提升！`;
        }
      } else {
        const monsterDmg = Math.max(1, monsterAtk - char.def + Math.floor(Math.random() * 5));
        char.hp -= monsterDmg;
        result = `⚔️ 你對 **${monster}** 造成 ${dmg} 點傷害\n💢 **${monster}** 反擊造成 ${monsterDmg} 點傷害！`;
        if (char.hp <= 0) {
          char.hp = Math.floor(char.maxHp / 2);
          result += '\n💀 你被擊敗了... 在重生點醒來（HP 回復 50%）';
        }
      }

      char._lastAdventure = Date.now();
      settings.updateGuildSettings(interaction.guild.id, gs);

      const embed = new EmbedBuilder()
        .setColor(won ? 0x4ade80 : 0xef4444)
        .setTitle(`⚔️ ${won ? '勝利！' : '戰鬥！'}`)
        .setDescription(`遭遇了 **${monster}**！\n${result}`)
        .setFooter({ text: `HP: ${char.hp}/${char.maxHp} | LV: ${char.lv}` });

      return interaction.reply({ embeds: [embed] });
    }
  },
};
