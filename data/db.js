import pg from 'pg';
const { Pool } = pg;

import dotenv from 'dotenv';
dotenv.config();

// Fail fast if DATABASE_URL isn’t defined
if (!process.env.DATABASE_URL) {
  throw new Error('❌ DATABASE_URL not defined in environment variables');
}

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Optional: Log successful pool creation
console.log('🔌 Connected to PostgreSQL');

// Export a default query interface
const db = {
  query: (text, params) => pool.query(text, params),
  pool, // in case you need to access the raw pool
};

export default db;
