import express from 'express';
import bodyParser from 'body-parser';
import { insertLog } from '../db/insertLog.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.UPLOADER_API_KEY; // define this in Railway environment variables

app.use(bodyParser.json());

app.post('/log-uploaded', async (req, res) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== API_KEY) {
    return res.status(403).send('Forbidden: Invalid API key');
  }

    const { logUrl, isSuccess, duration, boss } = req.body;

    try {
      await insertLog({ logUrl, isSuccess, duration, boss });
      console.log('Log inserted for boss ${boss}: ${logUrl}');
      res.sendStatus(200);
    } catch (error) {
      res.status(500).send('Database error');
    }
});

app.listen(PORT, () => {
  console.log(`🚀 Express webhook server running on port ${PORT}`);
});
