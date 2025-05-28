const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('signup')
    .setDescription('Create a sign-up message')
    .addStringOption(option =>
      option.setName('title')
        .setDescription('Title of the signup')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('timestamp')
        .setDescription('Unix timestamp')
        .setRequired(true)),

  async execute(interaction) {
    const title = interaction.options.getString('title');
    const timestamp = interaction.options.getString('timestamp');

    const message = `📢 **${title}**\n\n` +
      `React to sign up:\n\n` +
      `:PeepoPants:  Count me in\n` +
      `:sadpeepopants:  Can't make it\n` +
      `:FeelsNecroMan:  I can be a reliable backup\n\n` +
      `<t:${timestamp}:F>`;

    const sent = await interaction.channel.send(message);

    // Add reactions
    await sent.react("PeepoPants:721444235198595155");  // Or custom: "<:PeepoPants:emojiID>"
    await sent.react("😢");
    await sent.react("🧙");

    await interaction.reply({ content: 'Sign-up message sent!', ephemeral: true });
  }
};
