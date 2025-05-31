const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');

const store = require('../utils/signupStore');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('signup')
    .setDescription('Create a signup event')
    .addStringOption(option =>
      option.setName('title').setDescription('Title of the event').setRequired(true))
    .addStringOption(option =>
      option.setName('day').setDescription('Day of the week (e.g. Monday)').setRequired(true))
    .addStringOption(option =>
      option.setName('time').setDescription('Time (HH:MM 24h)').setRequired(true))
    .addStringOption(option =>
      option.setName('description').setDescription('Optional description').setRequired(false))
    .addRoleOption(option =>
      option.setName('role')
        .setDescription('Optional role to mention')
        .setRequired(false)),


  async execute(interaction) {
    const title = interaction.options.getString('title');
    const description = interaction.options.getString('description') || 'No description provided.';
    const dayInput = interaction.options.getString('day');

    const time = interaction.options.getString('time');

    const nextDate = getNextWeekdayDate(dayInput);

    if (!nextDate) {
      return interaction.reply({ content: 'Invalid day name. Use full day name like Monday, Tuesday, etc.', ephemeral: true });
    }

    // Parse time input "HH:MM"
    const [hourStr, minuteStr] = time.split(':');
    const hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);

    if (isNaN(hour) || isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      return interaction.reply({ content: 'Invalid time format. Use HH:MM 24h format.', ephemeral: true });
    }

    // Set the time to the date object (assuming local timezone)
    nextDate.setHours(hour, minute, 0, 0);

    // Convert to unix timestamp in seconds
    const unixTimestamp = Math.floor(nextDate.getTime() / 1000);

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .addFields(
        { name: 'Event Time', value: `<t:${unixTimestamp}:F>`, inline: false },
        { name: 'Yes', value: 'None', inline: false },
        { name: 'No', value: 'None', inline: false },
        { name: 'Backup', value: 'None', inline: false },
      )
      .setColor('Blue');

    const buttons = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('signup_yes')
          .setLabel('Yes')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('signup_no')
          .setLabel('No')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('signup_backup')
          .setLabel('Backup')
          .setStyle(ButtonStyle.Secondary),
      );

    // Send the signup message with buttons
    try {
    await interaction.reply({ embeds: [embed], components: [buttons] });
    const message = await interaction.fetchReply();

    console.log('Signup message ID:', message.id);
    store.create(message.id, {
      title,
      description,
      yes: [],
      no: [],
      backup: [],
    });
  } catch (error) {
    console.error(error);
    // If reply not sent yet, send a reply, else send a followUp
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: 'There was an error creating the signup.', flags: 64 });
    } else {
      await interaction.followUp({ content: 'There was an error creating the signup.', flags: 64 });
    }
  }
}
};

function getNextWeekdayDate(dayName) {
  const daysOfWeekFull = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  const daysOfWeekShort = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  
  const input = dayName.toLowerCase();

  let dayIndex = daysOfWeekFull.indexOf(input);
  if (dayIndex === -1) {
    dayIndex = daysOfWeekShort.indexOf(input);
  }
  
  if (dayIndex === -1) return null; // invalid day name

  const today = new Date();
  const todayIndex = today.getDay();

  let diff = dayIndex - todayIndex;
  if (diff <= 0) diff += 7; // If today or past in this week, get next week's day

  const nextDate = new Date(today);
  nextDate.setDate(today.getDate() + diff);

  return nextDate;
}


