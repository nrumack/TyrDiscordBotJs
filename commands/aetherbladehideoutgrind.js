import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import logUploader from '../utils/logUploader.js';
import { getWatcher } from '../utils/logWatcherInstance.js';
import encounter from '../encounters/aetherblade.json' assert { type: 'json' };

// 🧭 __dirname workaround for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// === Paths ===
const recordsPath = path.join(__dirname, '../data', encounter.recordFile);

// === Session State ===
let sessionLogMessages = [];
let sessionMessage = null;
let sessionChannel = null;
let watcherInitialized = false;

// === Format recent attempts
function formatLogSummary() {
  return sessionLogMessages.map(log =>
    `- [${log.success ? '✅' : '❌'} ${log.bossName}](${log.permalink})`
  ).join('\n');
}

// === Build dynamic encounter embed
function buildEmbed() {
  const embed = new EmbedBuilder()
    .setTitle(encounter.displayName)
    .setColor(encounter.color || 0x3498db)
    .setFooter({ text: 'Last updated automatically on log upload' });

  // Add record data
  if (fs.existsSync(recordsPath)) {
    const records = JSON.parse(fs.readFileSync(recordsPath, 'utf8'));
    for (const [phaseName, data] of Object.entries(records)) {
      if (!data.bestTime || !data.topDPS) continue;
      embed.addFields({
        name: phaseName,
        value:
          `Time: [${data.bestTime}](${data.bestTimePermalink})\n` +
          `Top DPS: \`${data.topDPS.name} (${data.topDPS.account})\` — \`${(data.topDPS.dps / 1000).toFixed(1)}k DPS\`\n` +
          `📎 [DPS Log](${data.topDPS.permalink})`,
        inline: false
      });
    }
  }

  // Add recent attempts
  if (sessionLogMessages.length > 0) {
    embed.addFields({
      name: 'Attempts this session',
      value: formatLogSummary(),
      inline: false
    });
  }

  return embed;
}

// === Update session message in place
async function updateSessionMessage() {
  if (!sessionMessage) return;
  try {
    await sessionMessage.edit({ embeds: [buildEmbed()] });
  } catch (err) {
    console.error('[updateSessionMessage] Failed to edit message:', err);
  }
}

// === Watcher for new logs
function setupWatcher() {
  if (watcherInitialized) return;
  watcherInitialized = true;

  const logDir = encounter.logDirectory;
  if (!logDir) {
    console.error('[setupWatcher] No log directory specified in encounter.json');
    return;
  }

  const watcher = getWatcher(logDir);
  watcher.on('encounter', async (encounterData) => {
    try {
      const uploaded = await logUploader(encounterData.filePath, {
        trackPhases: true,
        encounter
      });

      if (!uploaded || uploaded.result !== 'Success') return;

      sessionLogMessages.push({
        bossName: encounterData.bossName,
        permalink: uploaded.permalink,
        success: uploaded.result === 'Success'
      });

      if (sessionLogMessages.length > 25) sessionLogMessages.shift();

      // === Update records
      if (uploaded.phaseRecords) {
        let updated = false;
        let records = fs.existsSync(recordsPath)
          ? JSON.parse(fs.readFileSync(recordsPath, 'utf8'))
          : {};

        for (const [phaseName, data] of Object.entries(uploaded.phaseRecords)) {
          if (!records[phaseName]) records[phaseName] = {};

          if (
            !records[phaseName].bestTimeSeconds ||
            data.bestTimeSeconds < records[phaseName].bestTimeSeconds
          ) {
            Object.assign(records[phaseName], {
              bestTime: data.bestTime,
              bestTimeSeconds: data.bestTimeSeconds,
              bestTimePermalink: uploaded.permalink
            });
            updated = true;
          }

          if (
            data.topDPS &&
            (!records[phaseName].topDPS || data.topDPS.dps > records[phaseName].topDPS.dps)
          ) {
            records[phaseName].topDPS = {
              ...data.topDPS,
              permalink: uploaded.permalink
            };
            updated = true;
          }
        }

        if (updated) {
          fs.writeFileSync(recordsPath, JSON.stringify(records, null, 2), 'utf8');
        }
      }

      await updateSessionMessage();
    } catch (error) {
      console.error('[Watcher] Error during log upload or record update:', error);
    }
  });
}

// === Slash Command Export
export default {
  data: new SlashCommandBuilder()
    .setName('aetherblade_record')
    .setDescription(`Shows ${encounter.displayName} records and recent attempts.`),

  async execute(interaction) {
    sessionChannel = interaction.channel;
    await interaction.reply({ embeds: [buildEmbed()] });
    sessionMessage = await interaction.fetchReply();
    setupWatcher();
  }
};
