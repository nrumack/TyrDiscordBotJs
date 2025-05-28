const chokidar = require("chokidar");
const path = require("path");
const fs = require('fs');
const logUploader = require("./logUploader");

module.exports = function (client) {
    const logsFolder = path.join(__dirname, "../data/logs");
    const watcher = chokidar.watch(logsFolder, {persistent: true});

    watcher.on('add', async filePath => {
        if (!filePath.endsWith('.zevtc')) return;

        const bossName = path.basename(filePath).split('-')[1];
        const uploadUrl = await uploadToDPSReport(filePath);

        const line = `**${bossName}** - [View Log](${uploadUrl})`;

        if (client.strikeSession && client.strikeSession.message) {
            client.strikeSession.lohs.push(line);
            const newContent = `**Strike Missions Session Started**\n\n${client.strikeSession.logs.join('\n')}`;
            client.strikeSession.message.edit(newContent);
        }
    });

/*     chokidar.watch(logsPath, {ignoreInitial: true}).on("add", (filePath) => {
        logUploader(client, filePath);
    }); */
};