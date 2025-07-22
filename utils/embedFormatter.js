import { EmbedBuilder } from 'discord.js';

/**
 * Formats the strike session embed — consistent layout, additive log updates.
 * @param {object} encounter - Latest log info
 * @param {object} result - { updated: boolean }
 * @param {Array<object>} allEncounters - All session logs
 * @param {Array<object>} newRecords - New best times this session
 * @param {object} bestTimes - Static best time reference
 * @returns {EmbedBuilder}
 */
function formatEncounterEmbed(encounter, result, allEncounters, newRecords, bestTimes = {}) {
  const embed = new EmbedBuilder()
    .setTitle('Strike Mission Progress')
    .setColor(result.updated ? 0x00ff00 : 0x5865f2)
    .setDescription('Strike session active. Logs will appear below.')
    .setFooter({
      text: encounter?.bossName
        ? `Latest log: ${encounter.bossName}`
        : 'Session ongoing'
    })
    .setTimestamp();

    function formatTime(seconds) {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}m ${secs}s`;
    }

  // === FIELD: Current Best Times ===
  const bestTimesText = bestTimes
    .filter(bt => bt.boss_name && bt.dps_report_url)
    .map(({ boss_name, best_time, dps_report_url }) =>
      `• [${boss_name}](${dps_report_url}) – **${formatTime(best_time)}**`
    )
    .join('\n');

    embed.addFields({
    name: 'Current Best Times',
    value: bestTimesText,
    inline: false
  });

  // === FIELD: Clears This Session ===
  const grouped = {};
  for (const e of allEncounters) {
    if (!grouped[e.strikeId]) {
      grouped[e.strikeId] = { bossName: e.bossName, success: null, fails: [] };
    }
    e.success
      ? (grouped[e.strikeId].success = e)
      : grouped[e.strikeId].fails.push(e);
  }

  const sessionSummary = Object.entries(grouped).map(([strikeId, { bossName, success, fails }]) => {
    const failLinks = fails.map((f, i) => `[(${i + 1})](${f.dps_report_url})`).join(' ');
    const bossDisplay = success
      ? `[${bossName}](${success.dps_report_url})`
      : bossName;
    return `• ${bossDisplay}${failLinks ? ' ' + failLinks : ''}`;
  }).join('\n') || 'No logs yet.';

  embed.addFields({
    name: 'Clears This Session',
    value: sessionSummary,
    inline: false
  });

  // === FIELD: New Records ===
  const recordsSummary = newRecords.length
    ? newRecords.map(r =>
        `• [${r.bossName}](${r.logUrl}): ${r.oldTime || '—'} → **${r.newTime}**`
      ).join('\n')
    : 'No new records set.';

  embed.addFields({
    name: 'New Records',
    value: recordsSummary,
    inline: false
  });

  return embed;
}

export { formatEncounterEmbed };
