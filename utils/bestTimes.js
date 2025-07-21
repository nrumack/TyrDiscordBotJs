import db from './db.js';

export async function getBestTimes() {
  const result = await db.query(`
    SELECT boss_id, boss_name, MIN(duration) AS best_time
    FROM logs
    WHERE success = true
    GROUP BY boss_id, boss_name
  `);
  return result.rows;
}