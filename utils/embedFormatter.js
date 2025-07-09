import { EmbedBuilder } from 'discord.js';

/**
 * Formats a rich embed showing strike mission progress.
 * @param {object} encounter - The latest encounter
 * @param {object} result - { updated: boolean }
 * @param {Array<object>} allEncounters - All encounters this session [{ bossName, strikeId, success, logUrl }]
 * @param {Array<object>} newRecords - [{ bossName, oldTime, newTime, logUrl }]
 * @param {object} bestTimes - Mapping of strikeId to { name, bestTime, logUrl }
 * @returns {EmbedBuilder}
 */
function formatEncounterEmbed(encounter, result, allEncounters, newRecords, bestTimes = {}) {
  const embed = new EmbedBuilder()
    .setTitle('Strike Mission Progress')
    .setColor(result.updated ? 0x00ff00 : 0x5865f2)
    .setTimestamp()
    .setDescription(
      'Strike session in progress.\n' +
      (encounter?.bossName ? `New log received for **${encounter.bossName}**.` : '')
    );

  // === CURRENT BEST TIMES ===
  const bestTimesText =
    Object.values(bestTimes)
      .map(entry => `• [${entry.name}](${entry.logUrl}) – **${entry.bestTime}**`)
      .join('\n') || 'No records yet.';

  embed.addFields({
    name: 'Current Best Times',
    value: bestTimesText,
    inline: false,
  });

  // === CLEARS THIS SESSION ===
  const grouped = {};
  for (const e of allEncounters) {
    if (!grouped[e.strikeId]) grouped[e.strikeId] = { success: null, fails: [] };
    e.success ? (grouped[e.strikeId].success = e) : grouped[e.strikeId].fails.push(e);
  }

  const sessionSummary =
    Object.entries(grouped).map(([strikeId, { success, fails }]) => {
      const bossName = success?.bossName || fails[0]?.bossName || 'Unknown';
      const failLinks = fails.map((f, i) => `[(${i + 1})](${f.logUrl})`).join(' ');
      const bossDisplay = success ? `[${bossName}](${success.logUrl})` : bossName;
      return `• ${bossDisplay}${failLinks ? ' ' + failLinks : ''}`;
    }).join('\n') || 'No clears yet.';

  embed.addFields({
    name: 'Clears This Session',
    value: sessionSummary,
    inline: false,
  });

  // === NEW RECORDS ===
  const recordsSummary = newRecords.length
    ? newRecords.map(r =>
        `• [${r.bossName}](${r.logUrl}): ${r.oldTime || '—'} → **${r.newTime}**`
      ).join('\n')
    : 'No new records set.';

  embed.addFields({
    name: 'New Records',
    value: recordsSummary,
    inline: false,
  });

  return embed;
}

export { formatEncounterEmbed };
