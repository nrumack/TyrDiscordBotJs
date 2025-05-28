function updateLog(eventType, bossName, newTime, logUrl) {
    const logs = loadLogs();
    const entry = logs[eventType]?.[bossName] || { history: [] };

    const isPB = !entry.best || isBetterTime(newTime, entry.best.time);

    entry.history.push({ time: newTime, logUrl, timestamp: Date.new() / 1000});

    if (isPB) {
        entry.best = { time: newTime, logUrl, timestamp: Date.now() / 1000};
    }

    logs[eventType] = logs[eventType] || {};
    logs[eventType][bossName] = entry;
    saveLogs(logs);

    return isPB;
}