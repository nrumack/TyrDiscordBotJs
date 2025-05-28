const { SlashCommandBuilder } = require('discord.js');
const sessionManager = require('../utils/sessionManager');
const { formatEncounterEmbed } = require('../utils/embedFormatter');
const bestTimes = require('../data/logs.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('endstrike')
    .setDescription('End the strike session and summarize results'),

async execute(interaction) {
  const session = sessionManager.getSession();
  if (!session) {
    return interaction.reply({ content: 'No active session to end.', ephemeral: true });
  }

  // Aggregate all players across encounters
  const allPlayers = [];
  for (const enc of session.encounters || []) {
    if (Array.isArray(enc.players)) {
      allPlayers.push(...enc.players);
    }
  }

  // Find top DPS and top CC performers
  const topDps = allPlayers
    .filter(p => p.dps !== undefined)
    .sort((a, b) => b.dps - a.dps)[0];

  const topCc = allPlayers
    .filter(p => p.cc !== undefined)
    .sort((a, b) => b.cc - a.cc)[0];

  // Format the top performer summary
  const footerText = [
    topDps ? `Top DPS: ${topDps.name} (${topDps.dps.toLocaleString()})` : null,
    topCc ? `Top CC: ${topCc.name} (${topCc.cc.toLocaleString()})` : null,
  ].filter(Boolean).join(' • ');

  // Build the final summary embed
  const embed = formatEncounterEmbed(
    null,
    { updated: false },
    session.encounters || [],
    session.records || [],
    bestTimes,
    'Strike Clear Finished'
  );

  // Add footer to embed
  if (footerText && embed?.data) {
    embed.setFooter({ text: footerText });
  }

  try {
    if (session.sessionMessage) {
      await session.sessionMessage.edit({ embeds: [embed] });
    } else {
      await interaction.channel.send({ embeds: [embed] });
    }
  } catch (error) {
    console.error('Failed to update session message:', error);
  }

  sessionManager.endSession();

  await interaction.reply({ content: 'Strike session ended and summarized.', flags: 64 });
}

};
