const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
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
  const userId = interaction.user.id;
  const username = interaction.user.username;
  const discriminator = interaction.user.discriminator;
  const title = interaction.options.getString('title');
  const input = interaction.options.getString('daytime');

    if (!input || !input.includes(':') || input.trim().split(/\s+/).length !== 2) {
      return interaction.reply({
        content: '❌ Invalid format. Use format like "thu 20:30".',
        flags: 64
      });
    }

  const description = interaction.options.getString('description') || '';
  const pingRole = interaction.options.getRole('ping');

  if (!input) {
    return interaction.reply({
      content: 'You must provide the date/time in the format like "thu 20:30".',
      flags: 64
    });
  }
  
  const [dayStr, timeStr] = input.split(/\s+/);
  const weekdays = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const targetDay = weekdays.indexOf(dayStr.toLowerCase().slice(0, 3));

  if (targetDay === -1) {
    return interaction.reply({ content: 'Invalid day provided. Use format like "thu 20:30".', flags: 64 });
  }

  const [hour, minute] = timeStr.split(':').map(Number);
  if (
    Number.isNaN(hour) || Number.isNaN(minute) ||
    hour < 0 || hour > 23 ||
    minute < 0 || minute > 59
  ) {
    return interaction.reply({ content: 'Invalid time provided. Use 24h format like "20:30".', flags: 64 });
  }

  // Calculate date
  const now = new Date();
  let date = new Date(now);
  date.setHours(hour, minute, 0, 0);
  let daysUntilTarget = (targetDay - now.getDay() + 7) % 7;
  if (daysUntilTarget === 0 && date <= now) daysUntilTarget = 7;
  date.setDate(now.getDate() + daysUntilTarget);
  const unix = Math.floor(date.getTime() / 1000);

  // Ensure user exists before inserting event
  try {
    const userRes = await db.query('SELECT id FROM users WHERE id = $1', [userId]);
    if (userRes.rowCount === 0) {
      await db.query(
        'INSERT INTO users (id, username, discriminator) VALUES ($1, $2, $3)',
        [userId, username, discriminator]
      );
    }
  } catch (err) {
    console.error('Error ensuring user exists:', err);
    return interaction.reply({ content: '❌ Error creating user in database.', flags: 64 });
  }

  const mention = pingRole ? `<@&${pingRole.id}>\n\n` : '';
  const embedMessage = `${mention}**${title}**\n\n<t:${unix}:F>\n<t:${unix}:R>\n\n${description ? `*${description}*\n\n` : ''}**Yes (0)**\n_None_\n\n**No (0)**\n_None_\n\n**Backup (0)**\n_None_`;

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('signup_yes').setLabel('Yes').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('signup_no').setLabel('No').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('signup_backup').setLabel('Backup').setStyle(ButtonStyle.Secondary)
  );

  const client = await db.pool.connect(); // Make sure `pool` is exported from your db module

  try {
    await client.query('BEGIN');

    // Step 1: Ensure user exists
    await client.query(`
      INSERT INTO users (id, username, discriminator)
      VALUES ($1, $2, $3)
      ON CONFLICT (id) DO NOTHING
    `, [userId, interaction.user.username, interaction.user.discriminator]);

    // Step 2: Insert sign-up event
    await client.query(`
      INSERT INTO event_signups (event_type, event_date, created_by, notes)
      VALUES ($1, $2, $3, $4)
    `, ['Custom', date.toISOString(), userId, title]);

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Failed to post sign-up:', error);
    await interaction.reply({ content: '❌ Failed to post sign-up.', flags: 64 });
    return;
  } finally {
    client.release();
  }
}};