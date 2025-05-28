const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');
const { clientId, guildId, token } = require('./config.json');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);

  // ✅ Ensure it's a valid slash command object
  if ('data' in command && 'execute' in command) {
    if (command.data && typeof command.data.toJSON === 'function') {
  commands.push(command.data.toJSON());
} else {
  console.warn(`⚠️ Skipped ${filePath} - no valid "data.toJSON" found`);
}

  } else {
    console.warn(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
  }
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands },
    );

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
})();
