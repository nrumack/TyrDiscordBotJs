const { SlashCommandBuilder } = require('discord.js');
const { getWatcher } = require('../utils/logWatcherInstance');
const logUploader = require('../utils/logUploader');
const sessionManager = require('../utils/sessionManager');
const { formatEncounterEmbed } = require('../utils/embedFormatter');
const { updateBestTime } = require('../utils/bestTimes');
const bestTimes = require('../data/logs.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('startstrike')
    .setDescription('Start a strike session and watch logs'),

  async execute(interaction) {
    if (sessionManager.getSession()) {
      return interaction.reply({
        content: 'A strike session is already active.',
        ephemeral: true,
      });
    }

    sessionManager.startSession(interaction.channel);
    const session = sessionManager.getSession();

    // Get the singleton watcher
    const logWatcher = getWatcher('C:/Users/nruma/Documents/Guild Wars 2/addons/arcdps/arcdps.cbtlogs');

    // Clear previous listeners and add the new one
    logWatcher.removeAllListeners('encounter');
    logWatcher.on('encounter', async (encounter) => {
      console.log('Encounter fired:', JSON.stringify(encounter, null, 2));

      let logResult;
      try {
        logResult = await logUploader(encounter.filePath);
        encounter.logUrl = logResult?.permalink;
        encounter.players = logResult?.players || [];
      } catch (error) {
        console.error('Error uploading log:', error);
        return;
      }

      if (!session) return;

      const encounterData = {
        bossName: encounter.bossName,
        strikeId: encounter.strikeId,
        success: encounter.success,
        logUrl: encounter.logUrl,
        time: encounter.time,
      };

      session.encounters.push(encounterData);

      session.failedLogs = session.failedLogs || {};
      if (!encounter.success) {
        session.failedLogs[encounter.strikeId] = session.failedLogs[encounter.strikeId] || [];
        session.failedLogs[encounter.strikeId].push(encounter.logUrl);
      }

      const result = updateBestTime(encounter.strikeId, encounter.time);
      if (result.updated) {
        session.records = session.records || [];
        session.records.push({
          bossName: encounter.bossName,
          oldTime: result.oldTime,
          newTime: result.newTime,
          logUrl: encounter.logUrl,
        });
      }

      const embed = formatEncounterEmbed(
        encounterData,
        result,
        session.encounters,
        session.records || [],
        bestTimes,
        session.failedLogs
      );

      try {
        if (session.sessionMessage) {
          await session.sessionMessage.edit({ embeds: [embed] });
        } else {
          session.sessionMessage = await session.channel.send({ embeds: [embed] });
        }
      } catch (err) {
        console.error('Failed to send or edit session message:', err);
      }
    });

    const initialEmbed = formatEncounterEmbed(
      {},
      { updated: false },
      [],
      [],
      bestTimes
    );

    try {
      const initialMessage = await interaction.reply({
        embeds: [initialEmbed],
        withResponse: true,
      });

      session.sessionMessage = initialMessage;
    } catch (err) {
      console.error('Failed to send initial session message:', err);
    }
  },
};
