const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

async function logUploader(filePath) {
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));

  try {
    const response = await axios.post('https://dps.report/uploadContent?json=1', form, {
      headers: form.getHeaders(),
      maxBodyLength: Infinity,
    });

    const data = response.data;
    console.log('Upload response data:', data);

    if (!data?.permalink) {
      console.error('Upload succeeded but no permalink found.');
      return null;
    }

    const permalink = data.permalink;

    // Extract report ID for JSON fetch
    const idMatch = permalink.match(/\/([A-Za-z0-9-]+)(?:_.*)?$/);
    if (!idMatch) {
      console.error('Could not extract report ID from permalink');
      return { permalink, players: [] };
    }

    const reportId = idMatch[1];

    // Fetch detailed stats JSON
    const statsRes = await axios.get(`https://dps.report/getJson?id=${reportId}`);
    if (!statsRes?.data) {
      console.warn('No JSON data found for report:', reportId);
      return { permalink, players: [] };
    }

    const json = statsRes.data;
    const players = (json.players || []).map((p) => ({
      name: p.characterName,
      account: p.displayName,
      dps: p.dpsTargets?.[0]?.[0]?.dps || 0,
      cc: p.cc?.[0]?.value || 0,
    }));

    return {
      permalink,
      players,
    };

  } catch (err) {
    console.error('Upload failed:', err.message);
    return null;
  }
}

module.exports = logUploader;
