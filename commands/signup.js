const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const db = require('../data/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('signup')
    .setDescription('Create a signup post')
    .addStringOption(option =>
      option.setName('title')
        .setDescription('The title of the event')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('daytime')
        .setDescription('Day and time, e.g. "thu 20:30"')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('description')
        .setDescription('Optional description (can be multiline)')
        .setRequired(false))
    .addRoleOption(option =>
      option.setName('ping')
        .setDescription('Optional role to ping')
        .setRequired(false)),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      const userId = interaction.user.id;
      const username = interaction.user.username;
      const discriminator = interaction.user.discriminator;
      const title = interaction.options.getString('title');
      const input = interaction.options.getString('daytime');
      const description = interaction.options.getString('description') || '';
      const pingRole = interaction.options.getRole('ping');

      if (!input || !input.includes(':') || input.trim().split(/\s+/).length !== 2) {
        return interaction.editReply({
          content: '❌ Invalid format. Use format like "thu 20:30".'
        });
      }

      const [dayStr, timeStr] = input.trim().split(/\s+/);
      const weekdays = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
      const targetDay = weekdays.indexOf(dayStr.toLowerCase().slice(0, 3));

      if (targetDay === -1) {
        return interaction.editReply({ content: '❌ Invalid day provided. Use format like "thu 20:30".' });
      }

      const [hour, minute] = timeStr.split(':').map(Number);
      if (
        Number.isNaN(hour) || Number.isNaN(minute) ||
        hour < 0 || hour > 23 ||
        minute < 0 || minute > 59
      ) {
        return interaction.editReply({ content: '❌ Invalid time provided. Use 24h format like "20:30".' });
      }

      const now = new Date();
      let date = new Date(now);
      date.setHours(hour, minute, 0, 0);
      let daysUntilTarget = (targetDay - now.getDay() + 7) % 7;
      if (daysUntilTarget === 0 && date <= now) daysUntilTarget = 7;
      date.setDate(now.getDate() + daysUntilTarget);
      const unix = Math.floor(date.getTime() / 1000);

      // Ensure user exists
      await db.query(`
        INSERT INTO users (id, username, discriminator)
        VALUES ($1, $2, $3)
        ON CONFLICT (id) DO NOTHING
      `, [userId, username, discriminator]);

      // Insert event signup and retrieve ID
      let signupId;
      const client = await db.pool.connect();
      try {
        await client.query('BEGIN');

        const res = await client.query(`
          INSERT INTO event_signups (event_type, event_date, created_by, notes)
          VALUES ($1, $2, $3, $4)
          RETURNING id
        `, ['Custom', date.toISOString(), userId, title]);

        signupId = res.rows[0].id;

        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        console.error('Failed DB insert:', err);
        return interaction.editReply({ content: 'Failed to post sign-up to database.' });
      } finally {
        client.release();
      }

      const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description || '*No description provided.*')
        .addFields(
          { name: 'Date', value: `<t:${unix}:F>\n<t:${unix}:R>`, inline: false },
          { name: 'Yes (0)', value: '_None_', inline: false },
          { name: 'No (0)', value: '_None_', inline: false },
          { name: 'Backup (0)', value: '_None_', inline: false }
        )
        .setFooter({ text: `Created by ${username}#${discriminator}` })
        .setTimestamp()
        .setColor('Blurple');

      const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`signup_yes_${signupId}`).setLabel('Yes').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`signup_no_${signupId}`).setLabel('No').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(`signup_backup_${signupId}`).setLabel('Backup').setStyle(ButtonStyle.Secondary)
      );

      await interaction.editReply({
        content: pingRole ? `<@&${pingRole.id}>` : null,
        embeds: [embed],
        components: [buttons]
      });

    } catch (error) {
      console.error('Unexpected error in /signup:', error);
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ content: '❌ An error occurred while processing the sign-up.', flags: 64 });
      } else {
        await interaction.reply({ content: '❌ An error occurred while processing the sign-up.', flags: 64 });
      }
    }
  }
};
