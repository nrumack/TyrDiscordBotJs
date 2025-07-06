const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const sessionManager = require('../utils/sessionManager');
const { formatEncounterEmbed } = require('../utils/embedFormatter');
const { updateBestTime } = require('../utils/bestTimes');
const bestTimes = require('../data/logs.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('startstrike')
    .setDescription('Start a strike session and wait for incoming logs'),

  async execute(interaction) {
    if (sessionManager.getSession()) {
      return interaction.reply({
        content: 'A strike session is already active.',
        flags: MessageFlags.Ephemeral,
      });
    }

    sessionManager.startSession(interaction.channel);
    const session = sessionManager.getSession();

    const initialEmbed = formatEncounterEmbed(
      {},
      { updated: false },
      [],
      [],
      bestTimes
    );

    try {
      await interaction.reply({
        embeds: [initialEmbed],
      });

      session.sessionMessage = await interaction.fetchReply();
    } catch (err) {
      console.error('Failed to send initial session message:', err);
    }
  },
};
