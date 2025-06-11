const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

function parseDayTimeToUnix(input) {
  const daysMap = {
    sun: 0,
    mon: 1,
    tue: 2,
    wed: 3,
    thu: 4,
    fri: 5,
    sat: 6,
  };

  const match = input.toLowerCase().match(/(sun|mon|tue|wed|thu|fri|sat)[a-z]*\s+(\d{1,2}):(\d{2})/);
  if (!match) return null;

  const [, dayStr, hourStr, minuteStr] = match;
  const targetDay = daysMap[dayStr];
  const now = new Date();

  const result = new Date();
  result.setHours(parseInt(hourStr), parseInt(minuteStr), 0, 0);

  // calculate days until target
  let daysAhead = (targetDay + 7 - now.getDay()) % 7;
  if (daysAhead === 0 && result <= now) daysAhead = 7; // if it's today but already passed

  result.setDate(now.getDate() + daysAhead);

  return Math.floor(result.getTime() / 1000); // Unix timestamp (seconds)
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('signup')
    .setDescription('Create a sign-up message')
    .addStringOption(option =>
      option.setName('title')
        .setDescription('Title of the event')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('time')
        .setDescription('When is it? (e.g., thu 20:30)')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('description')
        .setDescription('Optional extra info')
        .setRequired(false)),

  async execute(interaction) {
    const title = interaction.options.getString('title');
    const timeInput = interaction.options.getString('time');
    const description = interaction.options.getString('description') || '';

    const unixTimestamp = parseDayTimeToUnix(timeInput);
    if (!unixTimestamp) {
      return interaction.reply({ content: '❌ Invalid time format. Use something like `thu 20:30`.', ephemeral: true });
    }

    const eventTime = `<t:${unixTimestamp}:F> (<t:${unixTimestamp}:R>)`;

    const content = `**${title}**\n${description ? `${description}\n` : ''}\n**Event Time:** ${eventTime}`;

    const row = new ActionRowBuilder().addComponents(
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

    await interaction.reply({ content: 'Sign-up message sent!', ephemeral: true });
    await interaction.channel.send({ content, components: [row] });
  }
};
