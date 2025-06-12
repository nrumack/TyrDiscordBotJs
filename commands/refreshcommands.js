// in refreshcommands.js
const { REST, Routes } = require('discord.js');
const { clientId, guildId, token } = require('../config.json');
const deployCommands = require('../deploy-commands');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('refreshcommands')
    .setDescription('Admin only: Refreshes slash commands'),

  async execute(interaction) {
    if (interaction.user.id !== 'YOUR_DISCORD_ID') {
      return interaction.reply({ content: '❌ Not authorized.', ephemeral: true });
    }

    await deployCommands(); // refactor your deploy-commands.js to export a function
    await interaction.reply({ content: '✅ Commands refreshed.', ephemeral: true });
  }
};
