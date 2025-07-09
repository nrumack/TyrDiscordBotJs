import fs from 'fs';
import path from 'path';
import bossMap from './displayNames.js';

const logPath = path.join(__dirname, '../data/logs.json');
let logs = JSON.parse(fs.readFileSync(logPath, 'utf8'));

/**
 * Updates best time for a boss if the new time is faster.
 * @param {string} bossName
 * @param {string} newTime - formatted as "mm:ss"
 * @param {string} logUrl - link to the DPS report
 * @returns {object} result of update check
 */
export function bestTimes(bossName, newTime, logUrl) {
  const id = bossMap[bossName];
  if (!id || !logs[id]) return { updated: false };

  const [newMin, newSec] = newTime.split(':').map(Number);
  const [bestMin, bestSec] = logs[id].bestTime.split(':').map(Number);

  const newTotal = newMin * 60 + newSec;
  const bestTotal = bestMin * 60 + bestSec;

  if (newTotal < bestTotal) {
    const oldTime = logs[id].bestTime;
    logs[id].bestTime = newTime;
    logs[id].logUrl = logUrl;
    fs.writeFileSync(logPath, JSON.stringify(logs, null, 2));
    return { updated: true, oldTime, newTime };
  }

  return { updated: false, oldTime: logs[id].bestTime };
}
