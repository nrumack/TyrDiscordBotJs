import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import sessionManager from '../utils/sessionManager.js';
import { formatEncounterEmbed } from '../utils/embedFormatter.js';
import bestTimes from '../data/logs.json' assert { type: 'json' };

export default {
  data: new SlashCommandBuilder()
    .setName('startstrike')
    .setDescription('Start a strike session and wait for incoming logs'),

  async execute(interaction) {
    // 💥 Reject if session already exists
    if (sessionManager.isActive()) {
      return interaction.reply({
        content: 'A strike session is already active.',
        flags: MessageFlags.Ephemeral,
      });
    }

    // 🧠 Start the session and set up tracking
    sessionManager.startSession(interaction.channel);

    // 🖼️ Initial embed with empty log data
    const initialEmbed = formatEncounterEmbed(
      {},                     // No current encounter
      { updated: false },     // Fresh session
      [],                     // No logs yet
      [],                     // No records yet
      bestTimes               // Static best time data
    );

    try {
      await interaction.reply({ embeds: [initialEmbed] });
      const sessionMessage = await interaction.fetchReply();
      sessionManager.setSessionMessage(sessionMessage); 

      console.log('🚀 Strike session started and message stored!');
    } catch (err) {
      console.error('❌ Failed to initialize strike session message:', err);
    }
  }
};
