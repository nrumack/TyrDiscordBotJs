const { EmbedBuilder, userMention } = require('discord.js');
const db = require('../data/db');

module.exports = (client) => {
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    const match = interaction.customId.match(/^signup_(yes|no|backup)_(\d+)$/);
    if (!match) return;

    const [, type, signupId] = match;
    const userId = interaction.user.id;

    try {
      // Remove previous signup
      await db.query(
        `DELETE FROM signup_participants WHERE signup_id = $1 AND user_id = $2`,
        [signupId, userId]
      );

      // Insert new signup
      await db.query(
        `INSERT INTO signup_participants (signup_id, user_id, role_preference)
         VALUES ($1, $2, $3)`,
        [signupId, userId, type]
      );

      // Fetch all current participants
      const { rows } = await db.query(
        `SELECT user_id, role_preference FROM signup_participants WHERE signup_id = $1`,
        [signupId]
      );

      const group = {
        yes: [],
        no: [],
        backup: []
      };

      for (const r of rows) {
        group[r.role_preference]?.push(userMention(r.user_id));
      }

      const format = (arr, label) =>
        ({ name: `**${label} (${arr.length})**`, value: arr.length ? arr.join('\n') : '_None_', inline: false });

      // Update the embed
      const embed = EmbedBuilder.from(interaction.message.embeds[0])
        .spliceFields(1, 3, 
          format(group.yes, 'Yes'), 
          format(group.no, 'No'), 
          format(group.backup, 'Backup')
        );

      await interaction.update({ embeds: [embed] });

    } catch (error) {
      console.error('Error processing signup interaction:', error);
      await interaction.reply({ content: '❌ Failed to update sign-up.', ephemeral: true });
    }
  });
};
