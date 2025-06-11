const { Events, userMention } = require('discord.js');
const db = require('../data/db');

module.exports = (client) => {
  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isButton()) return;

    const { customId, user, message } = interaction;
    if (!['signup_yes', 'signup_no', 'signup_backup'].includes(customId)) return;

    // Find signup ID from message (you might want to store messageId in the DB to match)
    const signupIdResult = await db.query(
      `SELECT id FROM event_signups WHERE notes = $1 ORDER BY created_at DESC LIMIT 1`,
      [message.content.match(/\*\*(.*?)\*\*/)?.[1] || '']
    );
    const signupId = signupIdResult.rows[0]?.id;
    if (!signupId) return interaction.reply({ content: 'Signup not found in DB.', ephemeral: true });

    // Remove any existing entry by this user
    await db.query(`DELETE FROM signup_participants WHERE signup_id = $1 AND user_id = $2`, [
      signupId,
      user.id,
    ]);

    // Insert new participation
    const role = customId === 'signup_yes' ? 'Yes' : customId === 'signup_no' ? 'No' : 'Backup';
    await db.query(
      `INSERT INTO signup_participants (signup_id, user_id, role_preference)
       VALUES ($1, $2, $3)`,
      [signupId, user.id, role]
    );

    // Fetch updated list
    const { rows } = await db.query(
      `SELECT user_id, role_preference FROM signup_participants WHERE signup_id = $1`,
      [signupId]
    );

    const yes = [], no = [], backup = [];
    for (const r of rows) {
      const mention = userMention(r.user_id);
      if (r.role_preference === 'Yes') yes.push(mention);
      else if (r.role_preference === 'No') no.push(mention);
      else if (r.role_preference === 'Backup') backup.push(mention);
    }

    const header = message.content.split('\n').slice(0, 3).join('\n');
    const format = (arr, label) => `**${label} (${arr.length})**\n${arr.length ? arr.join('\n') : '_None_'}\n`;

    const updatedMessage = `${header}\n\n${format(yes, 'Yes')}${format(no, 'No')}${format(backup, 'Backup')}`;

    await interaction.update({
      content: updatedMessage,
      components: message.components,
    });
  });
};
