const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../data/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('signup')
    .setDescription('Create a sign-up message')
    .addStringOption(option =>
      option.setName('title')
        .setDescription('Title of the signup')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('daytime')
        .setDescription('Like "thu 20:30"')
        .setRequired(true)),

  async execute(interaction) {
    const title = interaction.options.getString('title');
    const input = interaction.options.getString('daytime');

    // Parse human input to Date
    const [dayStr, timeStr] = input.split(/\s+/);
    const weekdays = ['sun','mon','tue','wed','thu','fri','sat'];
    const targetDay = weekdays.indexOf(dayStr.toLowerCase().slice(0,3));
    if (targetDay === -1) return interaction.reply({ content: 'Invalid day provided.', ephemeral: true });

    const [hour, minute] = timeStr.split(':').map(Number);
    const now = new Date();
    const date = new Date(now);
    date.setHours(hour, minute, 0, 0);
    date.setDate(now.getDate() + ((7 + targetDay - now.getDay()) % 7 || 7));

    const unix = Math.floor(date.getTime() / 1000);

    const embedMessage = `**${title}**\n\n <t:${unix}:F>\n<t:${unix}:R>\n\n**Yes (0)**\n_None_\n\n**No (0)**\n_None_\n\n**Backup (0)**\n_None_`;

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('signup_yes').setLabel('Yes').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('signup_no').setLabel('No').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('signup_backup').setLabel('Backup').setStyle(ButtonStyle.Secondary),
    );

    const sent = await interaction.channel.send({ content: embedMessage, components: [buttons] });

    // Store in DB
    await db.query(
      `INSERT INTO event_signups (event_type, event_date, created_by, notes)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      ['Custom', date.toISOString(), interaction.user.id, title]
    );

    await interaction.reply({ content: 'Sign-up message posted!', ephemeral: true });
  }
};
