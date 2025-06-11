client.on('interactionCreate', async interaction => {
  if (!interaction.isButton()) return;

  const match = interaction.customId.match(/^signup_(yes|no|backup)_(\d+)$/);
  if (!match) return;

  const [, type, signupId] = match;
  const userId = interaction.user.id;

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

  const yes = rows.filter(r => r.role_preference === 'yes').map(r => `<@${r.user_id}>`);
  const no = rows.filter(r => r.role_preference === 'no').map(r => `<@${r.user_id}>`);
  const backup = rows.filter(r => r.role_preference === 'backup').map(r => `<@${r.user_id}>`);

  const format = arr => arr.length > 0 ? arr.join('\n') : 'None';

  // Update embed
  const embed = EmbedBuilder.from(interaction.message.embeds[0])
    .spliceFields(1, 3,
      { name: `Yes (${yes.length})`, value: format(yes), inline: false },
      { name: `No (${no.length})`, value: format(no), inline: false },
      { name: `Backup (${backup.length})`, value: format(backup), inline: false }
    );

  await interaction.update({ embeds: [embed] });
});
