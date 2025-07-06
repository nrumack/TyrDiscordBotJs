import { SlashCommandBuilder } from 'discord.js';
import { resetWatcher } from '../utils/logWatcherInstance.js';
import sessionManager from '../utils/sessionManager.js'

module.exports = {
  data: new SlashCommandBuilder()
    .setName('endstrike')
    .setDescription('End the current strike session and summarize top DPS'),

  async execute(interaction) {
    const session = sessionManager.getSession();
    if (!session) {
      return interaction.reply({
        content: 'No active strike session found.',
        ephemeral: true,
      });
    }

    const encounters = session.encounters || [];

    // Generate top DPS summary
    const topDpsSummary = encounters.map(encounter => {
      if (!encounter.players || encounter.players.length === 0) {
        return `**${encounter.bossName}**: No DPS data available`;
      }

      const topPlayer = encounter.players.reduce((max, player) =>
        player.dps > max.dps ? player : max, encounter.players[0]);

      return `**${encounter.bossName}**: **${topPlayer.name}** - ${topPlayer.dps.toLocaleString()} DPS`;
    }).join('\n');

    const summaryEmbed = {
      title: 'Strike Session Summary',
      description: topDpsSummary || 'No encounters recorded.',
      color: 0x00ff99,
      timestamp: new Date().toISOString(),
    };

    // Edit the session message with summary
    try {
        await session.channel.send({ embeds: [summaryEmbed] });
    } catch (err) {
      console.error('Failed to post session message:', err);
    }

    // Cleanup
    resetWatcher();
    session.sessionMessage = null;
    sessionManager.endSession();

    await interaction.reply({
      content: 'Strike clear ended and summary posted.',
      flags: 64,
    });
  },
};
