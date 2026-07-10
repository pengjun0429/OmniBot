const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');
const config = require('../config');

function loadCommands() {
  const commands = [];
  const commandsPath = path.join(__dirname, '..', 'commands');
  const categories = fs.readdirSync(commandsPath);

  for (const category of categories) {
    const categoryPath = path.join(commandsPath, category);
    const files = fs.readdirSync(categoryPath).filter(f => f.endsWith('.js'));

    for (const file of files) {
      const command = require(path.join(categoryPath, file));
      if ('data' in command && 'execute' in command) {
        commands.push(command.data.toJSON());
      } else {
        logger.warn(`指令 ${file} 缺少 data 或 execute 屬性`);
      }
    }
  }

  return commands;
}

async function deploy() {
  const commands = loadCommands();
  const rest = new REST({ version: '10' }).setToken(config.discord.token);

  try {
    logger.info(`正在註冊 ${commands.length} 個斜線指令...`);

    await rest.put(Routes.applicationCommands(config.discord.clientId), {
      body: commands,
    });

    logger.info('斜線指令註冊成功');
  } catch (err) {
    logger.error('指令註冊失敗:', err);
  }
}

module.exports = { deploy, loadCommands };
