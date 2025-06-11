const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const db = require('../data/db'); // Adjust path as needed

module.exports = {
  data: new SlashCommandBuilder()
    .setName('signup')
    .setDescription('Create a sign-up message')
    .addStringOption(option =>
      option.setName('title').setDescription('Event Title').setRequired(true))
    .addStringOption(option =>
      option.setName('description').setDescription('Optional description').setRequired(false))
    .addStringOption(option =>
      option.setName('timestamp').setDescription('Unix timestamp').setRequired(true)),

  async execute(interaction) {
    const title = interaction.options.getString('title');
    const description = interaction.options.getString('description') || '';
    const timestamp = interaction.options.getString('timestamp');
    const eventDate = new Date(parseInt(timestamp) * 1000).toISOString().slice(0, 10); // YYYY-MM-DD

    // Insert into event_signups
    const result = await db.query(
      `INSERT INTO event_signups (event_type, event_date, created_by, notes)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [title, eventDate, interaction.user.id, description]
    );
    const signupId = result.rows[0].id;

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .addFields(
        { name: 'Event Time', value: `<t:${timestamp}:F>`, inline: false },
        { name: 'Yes (0)', value: 'None', inline: false },
        { name: 'No (0)', value: 'None', inline: false },
        { name: 'Backup (0)', value: 'None', inline: false },
      )
      .setFooter({ text: `Signup ID: ${signupId}` })
      .setColor('Blue');

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`signup_yes_${signupId}`).setLabel('Yes').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`signup_no_${signupId}`).setLabel('No').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId(`signup_backup_${signupId}`).setLabel('Backup').setStyle(ButtonStyle.Secondary)
    );

    await interaction.reply({ embeds: [embed], components: [buttons] });
  }
};
