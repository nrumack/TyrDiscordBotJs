import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import sessionManager from '../utils/sessionManager.js';
import { formatEncounterEmbed } from '../utils/embedFormatter.js';
import { updateBestTime } from '../utils/bestTimes.js';
import bestTimes from '../data/logs.json' assert { type: 'json' };


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
