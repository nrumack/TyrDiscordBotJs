const path = require('path');
const chokidar = require('chokidar');
const EventEmitter = require('events');

// Mappings
const validStrikes = {
  'Captain Mai Trin': 'maitrin',
  'Ankka': 'ankka',
  'Minister Li': 'ministerli',
  'Prototype Vermilion': 'prototypevermilion',
  'The Dragonvoid': 'thedragonvoid',
  'Dagda': 'dagda',
  'Cerus': 'cerus',
};

const displayNames = {
  'Captain Mai Trin': 'Aetherblade Hideout',
  'Ankka': 'Xunlai Jade Junkyard',
  'Minister Li': 'Kaineng Overlook',
  'Prototype Vermilion': 'Old Lion’s Court',
  'The Dragonvoid': 'Harvest Temple',
  'Dagda': 'Cosmic Observatory',
  'Cerus': 'Temple of Febe',
};

class LogWatcher extends EventEmitter {
  constructor(logsPath) {
    super();
    this.logsPath = logsPath;
    this.watcher = chokidar.watch(logsPath, { ignoreInitial: true, depth: 1 });

    this.watcher.on('add', filePath => {
      if (!filePath.endsWith('.zevtc') && !filePath.endsWith('.evtc')) return;

      const folderName = path.basename(path.dirname(filePath));
      const bossName = this.extractBossName(folderName);

      if (!validStrikes[bossName]) {
        console.log(`Boss not in valid strikes list: ${bossName}`);
        return;
      }

      const encounter = {
        bossName: displayNames[bossName] || bossName, // 🟢 pretty name for Discord
        rawBossName: bossName,                        // 🛠 raw internal name
        strikeId: validStrikes[bossName],
        time: new Date().toISOString(),
        filePath,
      };

      console.log('Emitting encounter:', encounter);
      this.emit('encounter', encounter);
    });
  }

  extractBossName(folderName) {
    return folderName.replace(/\s*\(\d+\)$/, '').trim(); // e.g., "Ankka (1)" → "Ankka"
  }

  close() {
    this.watcher.close();
  }
}

module.exports = LogWatcher;
