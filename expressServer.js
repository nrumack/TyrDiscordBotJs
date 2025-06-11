import express from 'express';
import bodyParser from 'body-parser';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// ✅ PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // from Railway env
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.UPLOADER_API_KEY; // define this in Railway environment variables

app.use(bodyParser.json());

app.post('/log-uploaded', async (req, res) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== API_KEY) {
    return res.status(403).send('Forbidden: Invalid API key');
  }

  const { logUrl, fileName, isSuccess, duration, boss } = req.body;

  if (!logUrl || !boss) {
    return res.status(400).send('Missing required fields: logUrl or boss');
  }

  try {
    await pool.query(`
      INSERT INTO logs (dps_report_url, success, duration, boss_id)
      VALUES ($1, $2, $3, $4)
    `, [logUrl, isSuccess ?? false, duration ?? null, boss]);

    console.log(`✅ Log inserted for boss ${boss}: ${logUrl}`);
    res.sendStatus(200);
  } catch (err) {
    console.error('❌ Failed to insert log into DB:', err.message);
    res.status(500).send('Database error');
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Express webhook server running on port ${PORT}`);
});
