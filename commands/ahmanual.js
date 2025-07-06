const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('check_aetherblade_log')
    .setDescription('Upload and check a past log for possible record improvements.')
    .addAttachmentOption(option =>
      option.setName('log')
        .setDescription('Upload a .zevtc or .evtc file')
        .setRequired(true)
    ),

  async execute(interaction) {
    const file = interaction.options.getAttachment('log');

    // Validate file type
    if (!file.name.endsWith('.evtc') && !file.name.endsWith('.zevtc')) {
      return interaction.reply({ content: '❌ Please upload a valid `.evtc` or `.zevtc` file.', ephemeral: true });
    }

    await interaction.deferReply();

    try {
      // Download the file to a temp path
      const tempDir = path.join(__dirname, '../temp');
        if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
        }

        const tempPath = path.join(tempDir, file.name);
        const writer = fs.createWriteStream(tempPath);

      const response = await axios({
        method: 'get',
        url: file.url,
        responseType: 'stream'
      });

      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      // Now process the log
      const result = await logUploader(tempPath);

      // Clean up
      fs.unlinkSync(tempPath);

      if (!result) {
        return interaction.editReply('❌ Log could not be processed.');
      }

      return interaction.editReply(`✅ Log processed. Records were checked and updated if improved.\n🔗 ${result.permalink}`);

    } catch (err) {
      console.error(err);
      return interaction.editReply('❌ Something went wrong processing that log.');
    }
  }
};
