const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const encounter = require('../encounters/aetherblade.json');
const recordsPath = path.join(__dirname, '../data', encounter.recordFile);

module.exports = {
  data: new SlashCommandBuilder()
    .setName('aetherblade_record')
    .setDescription(`Displays best phase times and top DPS for ${encounter.name}`),

  async execute(interaction) {
    if (!fs.existsSync(recordsPath)) {
      return interaction.reply('No records have been saved yet.');
    }

    const records = JSON.parse(fs.readFileSync(recordsPath, 'utf8'));

    const embed = new EmbedBuilder()
      .setTitle(encounter.displayName)
      .setColor(encounter.color || 0x3498db)
      .setFooter({ text: 'Last updated automatically on log upload' });

    Object.entries(records).forEach(([phaseName, data]) => {
      if (!data.bestTime || !data.topDPS) return;

      embed.addFields({
        name: `${phaseName}`,
        value: `Time: \`${data.bestTime}\`\nTop DPS: \`${data.topDPS.name} (${data.topDPS.account})\` — \`${(data.topDPS.dps / 1000).toFixed(1)}k DPS\`\n📎 [View Log](${data.permalink})`,
        inline: false
      });
    });

    await interaction.reply({ embeds: [embed] });
  }
};
