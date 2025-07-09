import express from 'express';
import bodyParser from 'body-parser';
import { insertLog } from '../db/insertLog.js';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const API_KEY = process.env.UPLOADER_API_KEY; // define this in Railway environment variables

app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.status(200).send('Webhook server running!');
});

app.use((req, res, next) => {
  console.log('Raw body:', JSON.stringify(req.body, null, 2));
  next();
});


app.post('/log-uploaded', async (req, res) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== API_KEY) {
    console.log('Received API key:', apiKey);
    console.log('Expected API key:', API_KEY);
    return res.status(403).send('Forbidden: Invalid API key');
  }

    const { logUrl, logDetails } = req.body;
    console.log('Incoming payload:', req.body);
    const isSuccess = logDetails?.isSuccess;
    const duration = logDetails?.duration;
    const boss = logDetails?.enounter?.boss;

    if (!logUrl || !boss){
      return res.status(400).send('missing required fields')
    }

    try {
      await insertLog({ logUrl, isSuccess, duration, boss });
      console.log(`Log inserted for boss ${boss}: ${logUrl}`);
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
