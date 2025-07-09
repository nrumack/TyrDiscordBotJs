import express from 'express';
import sessionManager from '../utils/sessionManager.js';
import { formatEncounterEmbed } from '../utils/embedFormatter.js';
import { bestTimes } from '../data/logs.json' assert { type: 'json' };
import { insertLog } from '../db/insertLog.js';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const API_KEY = process.env.UPLOADER_API_KEY; // define this in Railway environment variables

app.use(express.json());

app.get('/', (req, res) => {
  res.status(200).send('Webhook server running!');
});

app.post('/log-uploaded', async (req, res) => {
  console.log('Raw body:', JSON.stringify(req.body, null, 2));
  console.log('Headers:', req.headers);
  console.log('typeof logUrl:', typeof req.body.logUrl);
  console.log('logUrl value:', req.body.logUrl);


  const apiKey = req.headers['x-api-key'];
  if (apiKey !== API_KEY) {
    return res.status(403).send('Forbidden: Invalid API key');
  }

    const { logUrl, logDetails } = req.body;
    console.log('Incoming payload:', req.body);
    const isSuccess = logDetails?.isSuccess;
    const duration = Math.floor(logDetails?.duration ?? 0);
    const bossId = logDetails?.encounter.bossId;
    const boss = logDetails?.encounter?.boss;

  if (!logUrl || !boss) {
    console.error('Validation failed:', { logUrl, boss });
    return res.status(400).send('Missing required fields');
  }

    try {
      await insertLog({ logUrl, isSuccess, duration, bossId, boss });
      console.log(`Log inserted for boss ${boss}: ${logUrl}`);

      const session = sessionManager.getSession();
      console.log('✅ sessionMessage exists:', session.sessionMessage?.id);

      if (!session || !session.sessionMessage) {
        console.warn('⏳ Embed not ready — delaying update or skipping this log.');
        return res.sendStatus(202); // Accepted but skipped
      }

      if (session && session.sessionMessage) {
        sessionManager.addEncounter({
          bossName: boss,
          strikeId: bossId,
          success: isSuccess,
          logUrl
        });
        
        const updatedEmbed = formatEncounterEmbed(
          { bossName: boss },
          { updated: true },
          sessionManager.getEncounters(),
          sessionManager.getRecords(),
          bestTimes
        );

        await session.sessionMessage.edit({ embeds: [updatedEmbed] });
      }

      res.sendStatus(200);
    } catch (error) {
      console.error('InsertLog failed:', error);
      res.status(500).send('Database error');
    }

});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
