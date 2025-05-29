const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

// Helpers
function parseDuration(duration) {
  const [min, sec] = duration.split(':').map(Number);
  return (min * 60) + sec;
}

function formatDuration(ms) {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Main uploader
async function logUploader(filePath, options = {}) {
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));

  try {
    // Upload to dps.report
    const response = await axios.post('https://dps.report/uploadContent?json=1', form, {
      headers: form.getHeaders(),
      maxBodyLength: Infinity,
    });

    const data = response.data;
    const permalink = data.permalink;

    if (!permalink) {
      console.error('Upload succeeded but no permalink found.');
      return null;
    }

    const reportId = permalink.match(/\/([A-Za-z0-9-]+)(?:_.*)?$/)?.[1];
    if (!reportId) {
      console.error('Could not extract report ID from permalink');
      return { permalink, players: [] };
    }

    const statsRes = await axios.get(`https://dps.report/getJson?id=${reportId}`);
    const json = statsRes.data;
    const players = json.players || [];
    const phases = json.phases || [];

    // Optional: save full JSON for debugging
    // fs.writeFileSync('full_log.json', JSON.stringify(json, null, 2));

    // Optional phase tracking
    if (options.trackPhases && options.encounter?.phases?.length) {
      const PHASES_TO_TRACK = options.encounter.phases;
      const recordPath = path.join(__dirname, 'data', options.encounter.recordFile);

      let bestRecords = fs.existsSync(recordPath)
        ? JSON.parse(fs.readFileSync(recordPath, 'utf8'))
        : Object.fromEntries(PHASES_TO_TRACK.map(p => [p, {}]));

      PHASES_TO_TRACK.forEach(phaseName => {
        const phaseIndex = phases.findIndex(p => p.name === phaseName);
        const phase = phases[phaseIndex];
        if (!phase || typeof phase.start !== 'number' || typeof phase.end !== 'number') {
          console.warn(`Invalid or missing data for phase: ${phaseName}`);
          return;
        }

        let topPlayer = null;
        let topDps = 0;

        players.forEach(player => {
          if (!player.dpsTargets) return;
          let playerPhaseDps = 0;

          (phase.targets || []).forEach(targetIndex => {
            const dpsData = player.dpsTargets[targetIndex]?.[phaseIndex];
            if (dpsData?.dps) {
              playerPhaseDps += dpsData.dps;
            }
          });

          if (playerPhaseDps > topDps) {
            topDps = playerPhaseDps;
            topPlayer = player;
          }
        });

        const duration = formatDuration(phase.end - phase.start);
        const newTime = parseDuration(duration);
        const current = bestRecords[phaseName];
        const existingTime = current?.bestTime ? parseDuration(current.bestTime) : Infinity;

        if (newTime < existingTime) {
          bestRecords[phaseName] = {
            bestTime: duration,
            topDPS: {
              name: topPlayer?.characterName || topPlayer?.name || 'Unknown',
              account: topPlayer?.account || topPlayer?.displayName || 'Unknown',
              dps: Math.round(topDps)
            },
            permalink
          };
          console.log(`New record for ${phaseName}: ${duration}`);
        }
      });

      fs.writeFileSync(recordPath, JSON.stringify(bestRecords, null, 2));
    }

    return {
      permalink,
      players: players.map(p => ({
        name: p.characterName,
        account: p.displayName,
        dps: p.dpsTargets?.[0]?.[0]?.dps || 0,
        cc: p.cc?.[0]?.value || 0
      }))
    };

  } catch (err) {
    console.error('Upload failed:', err.message);
    return null;
  }
}

module.exports = logUploader;
