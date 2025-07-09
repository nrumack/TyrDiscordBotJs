import { SlashCommandBuilder } from 'discord.js';
import sessionManager from '../utils/sessionManager.js';

export default {
  data: new SlashCommandBuilder()
    .setName('endstrike')
    .setDescription('End the current strike session and summarize top performance'),

  async execute(interaction) {
    const session = sessionManager.getSession();

    if (!session || !session.encounters?.length) {
      return interaction.reply({
        content: 'No active strike session found or no encounters recorded.',
        ephemeral: true,
      });
    }

    const encounters = session.encounters;
    const startTime = new Date(encounters[0].timestamp);
    const endTime = new Date(encounters[encounters.length - 1].timestamp);
    const msDuration = endTime - startTime;
    const mins = Math.floor(msDuration / 60000);
    const secs = Math.floor((msDuration % 60000) / 1000);

    let topDps = null;
    let topCc = null;
    let topDowns = null;
    let topRez = null;

    for (const encounter of encounters) {
      for (const player of encounter.players || []) {
        if (!topDps || player.dps > topDps.dps) topDps = player;
        if (!topCc || player.cc > topCc.cc) topCc = player;
        if (!topDowns || player.downs > topDowns.downs) topDowns = player;
        if (!topRez || player.resurrectTime < topRez.resurrectTime) topRez = player;
      }
    }

    const fields = [
      {
        name: 'Total Duration',
        value: `**${mins}m ${secs}s**`,
      },
      topDps && {
        name: 'Top DPS',
        value: `**${topDps.name}** – ${topDps.dps.toLocaleString()} DPS`,
      },
      topCc && {
        name: 'Top CC',
        value: `**${topCc.name}** – ${topCc.cc.toLocaleString()} Breakbar`,
      },
      topDowns && {
        name: 'Most Downstates',
        value: `**${topDowns.name}** – ${topDowns.downs}`,
      },
      topRez && {
        name: 'Fastest Rez',
        value: `**${topRez.name}** – ${topRez.resurrectTime.toFixed(2)}s`,
      },
    ].filter(Boolean);

    const summaryEmbed = {
      title: 'Strike Session Summary',
      color: 0x00ff99,
      fields,
      footer: {
        text: `Session ended • ${endTime.toLocaleString('en-US')}`,
      },
    };

    try {
      await session.channel.send({ embeds: [summaryEmbed] });
    } catch (err) {
      console.error('Failed to post session summary:', err);
    }

    session.sessionMessage = null;
    sessionManager.endSession();

    await interaction.reply({
      content: 'Strike session ended and summary posted.',
      ephemeral: true,
    });
  },
};
