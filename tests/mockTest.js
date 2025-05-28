const { formatEncounterEmbed } = require('../utils/embedFormatter');
const bestTimes = require('../data/testlogs.json'); // Your mock best times file

async function runMockTest() {
  // Simulate a session object like your sessionManager stores
  const session = {
    encounters: [],      // all encounters logged this session
    records: [],         // new records set this session
  };

  // Simulate the result of updateBestTime (mock function here)
  // For test, assume every encounter updates best time if it's better
  function updateBestTime(strikeId, time) {
    const best = bestTimes.find(b => b.strikeId === strikeId);
    if (!best || time < best.time) {
      const oldTime = best ? best.time : null;
      // Update bestTimes mock (would normally persist)
      return { updated: true, oldTime, newTime: time };
    }
    return { updated: false };
  }

  // Load all mock logs (simulate incoming encounters)
  for (const encounter of bestTimes) {
    const result = updateBestTime(encounter.strikeId, encounter.time);
    if (result.updated) {
      session.records.push({
        bossName: encounter.bossName,
        oldTime: result.oldTime,
        newTime: result.newTime,
        logUrl: encounter.logUrl,
      });
    }
    session.encounters.push(encounter);

    // Format embed for each encounter (simulate sending an update)
    const embed = formatEncounterEmbed(
      encounter,
      result,
      session.encounters,
      session.records,
      bestTimes.reduce((acc, b) => {
        acc[b.strikeId] = {
          name: b.bossName,
          bestTime: formatTime(b.time),
          logUrl: b.logUrl,
        };
        return acc;
      }, {})
    );

    // For demo: print embed fields to console
    console.log('--- Embed after encounter:', encounter.bossName, '---');
    embed.data.fields.forEach(field => {
      console.log(`**${field.name}**\n${field.value}\n`);
    });
  }
}

// Helper to format seconds as mm:ss
function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

runMockTest();
