const { EmbedBuilder } = require('discord.js');
const store = require('../utils/signupStore'); // Adjust path if needed

module.exports = async (interaction, client) => {
  // Slash command handling
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: 'There was an error executing the command.', flags: 64 });
    }
    return;
  }

  // Button interaction handling
  if (interaction.isButton()) {
    const messageId = interaction.message.id;
    const userId = interaction.user.id;
    const customId = interaction.customId;

    const parts = customId.split('_');
    if (parts.length !== 2 || parts[0] !== 'signup') return;
    const category = parts[1]; // 'yes', 'no', 'backup'

    const signup = store.get(messageId);
    if (!signup) {
      return interaction.reply({ content: 'This signup is no longer active.', flags: 64 });
    }

    // ✅ Count users in 'yes' category and limit to 10
    if (category === 'yes') {
      const yesCount = signup.yes?.length || 0;
      if (yesCount >= 10 && !signup.yes.includes(userId)) {
        return interaction.reply({ content: 'The Yes list is full (max 10).', flags: 64 });
      }
    }

    // ✅ Add user and re-fetch updated signup
    store.addUser(messageId, category, userId);
    const updatedSignup = store.get(messageId); // Re-fetch after mutation

    // ✅ Rebuild embed with updated fields
    const embed = EmbedBuilder.from(interaction.message.embeds[0]);

    embed.spliceFields(1, 3); // Remove old yes/no/backup fields

    embed.addFields(
      {
        name: 'Yes',
        value: updatedSignup.yes?.length ? updatedSignup.yes.map(id => `<@${id}>`).join(', ') : 'None',
        inline: false,
      },
      {
        name: 'No',
        value: updatedSignup.no?.length ? updatedSignup.no.map(id => `<@${id}>`).join(', ') : 'None',
        inline: false,
      },
      {
        name: 'Backup',
        value: updatedSignup.backup?.length ? updatedSignup.backup.map(id => `<@${id}>`).join(', ') : 'None',
        inline: false,
      },
    );

    await interaction.update({ embeds: [embed] });
  }
};
