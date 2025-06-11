const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // or use user/password/host/port/dbname
  ssl: {
    rejectUnauthorized: false // Required for Railway/Render/etc.
  }
});

module.exports = pool;
