// deploy-commands.js
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;
const token = process.env.TOKEN;

async function deployCommands() {
  const commands = [];
  const commandsPath = path.join(__dirname, 'commands');
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

  for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    if (command.data && typeof command.data.toJSON === 'function') {
      commands.push(command.data.toJSON());
    } else {
      console.warn(`⚠️ Skipped command ${file}`);
    }
  }

  const rest = new REST({ version: '10' }).setToken(token);

  try {
    console.log('🔁 Deploying slash commands to guild...');
    console.log('Commands to deploy:', commands.map(c => c.name));
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
      body: commands,
    });
    console.log('✅ Slash commands refreshed.');
    return true;
  } catch (error) {
    console.error('❌ Failed to refresh commands:', error);
    return false;
  }
}

// 👇 THIS is the missing piece
if (require.main === module) {
  deployCommands();
}

module.exports = deployCommands;
