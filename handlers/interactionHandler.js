// signupInteractionHandler.js
import { EmbedBuilder, userMention } from 'discord.js';
import db from '../data/db.js';

export default (client) => {
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    const match = interaction.customId.match(/^signup_(yes|no|backup)_(\d+)$/);
    if (!match) return;

    const [, typeRaw, signupId] = match;
    const userId = interaction.user.id;
    const type = typeRaw.toLowerCase();

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

      // Fetch updated list
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
        const role = r.role_preference.toLowerCase();
        if (group[role]) group[role].push(userMention(r.user_id));
      }

      const format = (arr, label) => ({
        name: `${label} (${arr.length})`,
        value: arr.length ? arr.join('\n') : '_None_',
        inline: false
      });

      const originalEmbed = interaction.message.embeds[0];
      if (!originalEmbed) {
        return await interaction.reply({ content: '❌ Could not update embed. No embed found.', flags: 64 });
      }

      const updatedEmbed = EmbedBuilder.from(originalEmbed).spliceFields(
        1, 3,
        format(group.yes, 'Yes'),
        format(group.no, 'No'),
        format(group.backup, 'Backup')
      );

      await interaction.update({ embeds: [updatedEmbed] });

    } catch (error) {
      console.error('Error processing signup interaction:', error);
      const errorResponse = { content: '❌ Failed to update sign-up.', flags: 64 };
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp(errorResponse);
      } else {
        await interaction.reply(errorResponse);
      }
    }
  });
};
