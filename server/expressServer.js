import express from 'express';
import bodyParser from 'body-parser';
import { insertLog } from '../db/insertLog.js';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
app.use = express();
const API_KEY = process.env.UPLOADER_API_KEY; // define this in Railway environment variables

app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.status(200).send('Webhook server running!');
});



app.post('/log-uploaded', async (req, res) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== API_KEY) {
    return res.status(403).send('Forbidden: Invalid API key');
  }

    const { logUrl, isSuccess, duration, boss } = req.body;

    try {
      await insertLog({ logUrl, isSuccess, duration, boss });
      console.log(`Log inserted for boss ${boss}: ${logUrl}`);
      res.sendStatus(200);
    } catch (error) {
      res.status(500).send('Database error');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
