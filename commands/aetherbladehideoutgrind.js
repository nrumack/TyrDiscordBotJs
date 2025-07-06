const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { getWatcher } = require('../utils/logWatcherInstance');

const encounter = require('../encounters/aetherblade.json');

// === Paths ===
const recordsPath = path.join(__dirname, '../data', encounter.recordFile);

// === Session State ===
let sessionLogMessages = [];
let sessionMessage = null;
let sessionChannel = null;
let watcherInitialized = false;

// === Helpers ===
function formatLogSummary() {
  console.log('[formatLogSummary] Formatting log summary with', sessionLogMessages.length, 'entries');
  return sessionLogMessages.map(log =>
    `- [${log.success ? '✅' : '❌'} ${log.bossName}](${log.permalink})`
  ).join('\n');
}

function buildEmbed() {
  console.log('[buildEmbed] Building embed...');
  const embed = new EmbedBuilder()
    .setTitle(encounter.displayName)
    .setColor(encounter.color || 0x3498db)
    .setFooter({ text: 'Last updated automatically on log upload' });

  // Add record data
  if (fs.existsSync(recordsPath)) {
    console.log('[buildEmbed] Reading records from', recordsPath);
    const records = JSON.parse(fs.readFileSync(recordsPath, 'utf8'));

    Object.entries(records).forEach(([phaseName, data]) => {
      if (!data.bestTime || !data.topDPS) {
        console.log(`[buildEmbed] Skipping phase "${phaseName}" due to missing bestTime or topDPS`);
        return;
      }

      embed.addFields({
        name: `${phaseName}`,
        value:
          `Time: [${data.bestTime}](${data.bestTimePermalink})\n` +
          `Top DPS: \`${data.topDPS.name} (${data.topDPS.account})\` — \`${(data.topDPS.dps / 1000).toFixed(1)}k DPS\`\n` +
          `📎 [DPS Log](${data.topDPS.permalink})`,
        inline: false
      });
    });
  } else {
    console.log('[buildEmbed] Records file does not exist:', recordsPath);
  }

  // Add attempts section
  if (sessionLogMessages.length > 0) {
    console.log('[buildEmbed] Adding attempts section with', sessionLogMessages.length, 'attempts');
    embed.addFields({
      name: 'Attempts this session',
      value: formatLogSummary(),
      inline: false
    });
  } else {
    console.log('[buildEmbed] No attempts this session to add');
  }

  return embed;
}

async function updateSessionMessage() {
  if (!sessionMessage) {
    console.warn('[updateSessionMessage] No session message to update');
    return;
  }

  try {
    console.log('[updateSessionMessage] Editing session message...');
    await sessionMessage.edit({ embeds: [buildEmbed()] });
    console.log('[updateSessionMessage] Session message updated successfully');
  } catch (err) {
    console.error('[updateSessionMessage] Failed to edit session message:', err);
  }
}

function setupWatcher() {
  if (watcherInitialized) return;
  watcherInitialized = true;

  const logDir = encounter.logDirectory;
  if (!logDir || typeof logDir !== 'string') {
    console.error('[setupWatcher] Invalid or missing logDirectory in encounter config.');
    return;
  }

  const watcher = getWatcher(logDir);
  console.log('[setupWatcher] Creating watcher for log directory:', logDir);

  watcher.on('encounter', async (encounterData) => {
  console.log('[Watcher] Encounter detected:', encounterData);

  try {
    const uploaded = await logUploader(encounterData.filePath, {
      trackPhases: true,
      encounter, // your imported JSON config (e.g., aetherblade.json)
    });

    if (!uploaded) {
      console.warn('[Watcher] Upload failed or returned null, skipping.');
      return;
    }

    if (uploaded.result !== 'Success') {
      console.log('[Watcher] Skipping — encounter was a fail');
    }

    const logEntry = {
      bossName: encounterData.bossName,
      permalink: uploaded.permalink,
      success: uploaded.result === 'Success',
    };

    sessionLogMessages.push(logEntry);
    if (sessionLogMessages.length > 25) sessionLogMessages.shift();

    // === Record update logic ===
    if (uploaded.result === 'Success' && uploaded.phaseRecords) {
      let updated = false;
      let records = {};

      if (fs.existsSync(recordsPath)) {
        records = JSON.parse(fs.readFileSync(recordsPath, 'utf8'));
      }

      for (const [phaseName, recordData] of Object.entries(uploaded.phaseRecords)) {
        if (!records[phaseName]) records[phaseName] = {};

        // Update best time
        if (
          !records[phaseName].bestTimeSeconds ||
          recordData.bestTimeSeconds < records[phaseName].bestTimeSeconds
        ) {
          records[phaseName].bestTime = recordData.bestTime;
          records[phaseName].bestTimeSeconds = recordData.bestTimeSeconds;
          records[phaseName].bestTimePermalink = uploaded.permalink;
          console.log(`[Records] New best time for ${phaseName}: ${recordData.bestTime}`);
          updated = true;
        }

        // Update top DPS
        if (
          recordData.topDPS &&
          (!records[phaseName].topDPS || recordData.topDPS.dps > records[phaseName].topDPS.dps)
        ) {
          records[phaseName].topDPS = {
            ...recordData.topDPS,
            permalink: uploaded.permalink,
          };
          console.log(
            `[Records] New top DPS for ${phaseName}: ${recordData.topDPS.name} (${Math.round(recordData.topDPS.dps)} DPS)`
          );
          updated = true;
        }
      }

      if (updated) {
        fs.writeFileSync(recordsPath, JSON.stringify(records, null, 2), 'utf8');
      }
    }

    await updateSessionMessage();
  } catch (error) {
    console.error('[Watcher] Error uploading or updating:', error);
  }
});


  console.log('[Command] Watcher setup complete');
}


// === Exported Command ===
module.exports = {
  data: new SlashCommandBuilder()
    .setName('aetherblade_record')
    .setDescription(`Displays best phase times and live logs for ${encounter.name}`),

  async execute(interaction) {
    console.log('[Command] Executing aetherblade_record command');

    sessionChannel = interaction.channel;
    console.log('[Command] sessionChannel set:', sessionChannel.id);

    await interaction.reply({ embeds: [buildEmbed()] });
    sessionMessage = await interaction.fetchReply();

    console.log('[Command] Initial session message sent, ID:', sessionMessage.id);

    setupWatcher();
    console.log('[Command] Watcher setup complete');
  }
};
