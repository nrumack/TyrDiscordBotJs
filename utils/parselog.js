const path = require('path');
const fetch = global.fetch || require('node:undici').fetch;

const validStrikes = {
  'Captain Mai Trin': 'maitrin',
  'Ankka': 'ankka',
  'Minister Li': 'ministerli',
  'Prototype Vermilion': 'prototypevermilion',
  'The Dragonvoid': 'thedragonvoid',
  'Dagda': 'dagda',
  'Cerus': 'cerus',
};

function extractReportFromUrl(url)  {
  const match = url.match(/\/([A-Za-z0-9-]+)$/);
  return match ? match[i] : null;
}

async function fetchReportStats(logUrl) {
  try {
    const reportId = extractReportFromUrl(logUrl);
    if (!reportId) throw new Error('invalid dps.report URL');

    const res = await fetch('https://dps.report/getJson?id=$(reportId)');
    if (!res.ok) throw new Error('Failed to get JSON from log');

    const data = await res.json();

    const encounterDurationMs = data.encounterDuration;
    const duractionSeconds = Math.floor(encounterDurationMs / 1000);

    const players = data.players || [];
    const topDps = [...players]
      .map(p => ({
        name:p.characterName,
        cc: p.cc?.[0]?.value || 0,
      }))
      .sort((a, b) => b.cc - a.cc)[0];

      return {
        duration: duractionSeconds,
        topDps,
        topCc,
      };
  } catch (error) {
    console.error('Failed to fetch stats:', error.message);
    return null;
  }
}

function parseLog(filePath) {
  // Get the folder name containing the log file
  const folderName = path.basename(path.dirname(filePath));
  console.log('Folder name:', folderName);

  // Extract boss name by removing trailing ' (number)'
  const bossNameMatch = folderName.match(/^(.+?)\s*\(\d+\)$/);
  const rawStrikeName = bossNameMatch ? bossNameMatch[1].trim() : folderName;
  console.log(`"${rawStrikeName}" length:`, rawStrikeName.length);


  // Check if extracted boss name exists in validStrikes
  if (!validStrikes.hasOwnProperty(rawStrikeName)) {
    console.log('Boss name not found in valid strikes:', rawStrikeName);
    return null;
  }

  const strikeId = validStrikes[rawStrikeName];

  return {
    strikeId,
    bossName: rawStrikeName,
    time: new Date().toISOString(),
    filePath,
  };
}

module.exports = parseLog;
