const { text } = require('body-parser');
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('signup')
    .setDescription('Create a sign-up message')
    .addStringOption(option =>
      option.setName('title')
        .setDescription('Title of the signup')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('description')
        .setDescription('Optional description')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('timestamp')
        .setDescription('Unix timestamp for event (e.g. 1718223000)')
        .setRequired(true)),

  async execute(interaction) {
    const title = interaction.options.getString('title');
    const description = interaction.options.getString('description') || '';
    const timestamp = interaction.options.getString('timestamp');

    const embed = new EmbedBuilder()
      .setTitle(`📢 ${title}`)
      .setDescription(description || '*No description provided*')
      .addFields(
        {
          name: 'Event Time',
          value: `<t:${timestamp}:F>`,
        },
        {
          name: 'Yes (0)',
          value: 'None',
          inline: true,
        },
        {
          name: 'No (0)',
          value: 'None',
          inline: true,
        },
        {
          name: 'Backup (0)',
          value: 'None',
          inline: true,
        }
      )
      .setColor(0x00AE86)
      .setTimestamp()
      .setFooter({ text: `signup-${sent.id}` });

    const sent = await interaction.channel.send({ embeds: [embed] });

    // Add reactions (these can be custom if your bot/server has them)
    await sent.react('✅');
    await sent.react('❌');
    await sent.react('🕗');

    await interaction.reply({ content: '📨 Sign-up message sent!', flags: 64 });
  }
};
