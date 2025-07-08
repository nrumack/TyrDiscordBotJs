import { SlashCommandBuilder }  from 'discord.js';
import deployCommands from '../deploy-commands';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('refreshcommands')
    .setDescription('Admin only: Refresh slash commands from server'),

  async execute(interaction) {
    // Replace with your Discord user ID
    const ownerId = 'YOUR_DISCORD_USER_ID';
    if (interaction.user.id !== ownerId) {
      return interaction.reply({ content: '❌ You are not authorized to use this command.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    const success = await deployCommands();

    if (success) {
      await interaction.editReply('✅ Slash commands have been refreshed.');
    } else {
      await interaction.editReply('❌ Failed to refresh commands. Check logs.');
    }
  }
};
