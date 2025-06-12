// deploy-commands.js
module.exports = async function deploy() {
  const { REST, Routes } = require('discord.js');
  const fs = require('fs');
  const path = require('path');
  const { clientId, guildId, token } = require('./config.json');

  const commands = [];
  const commandsPath = path.join(__dirname, 'commands');
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

  for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    if (command.data && typeof command.data.toJSON === 'function') {
      commands.push(command.data.toJSON());
    }
  }

  const rest = new REST({ version: '10' }).setToken(token);

  try {
    console.log('Refreshing application (/) commands...');
    await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands }
    );
    console.log('✅ Commands refreshed.');
  } catch (err) {
    console.error(err);
  }
};
