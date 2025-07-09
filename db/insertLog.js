import { pool } from './pool.js';

/**
 * Inserts a log entry into the database.
 * @param {Object} params
 * @param {string} params.logUrl - The DPS.report permalink
 * @param {boolean} params.isSuccess - Whether the encounter was a kill
 * @param {number|null} params.duration - The duration in milliseconds
 * @param {string|number} params.boss - Boss name or ID
 */

export async function insertLog({ logUrl, isSuccess, duration, bossId, boss}) {
    if (!logUrl || !boss) {
        throw new Error('Missing required log data');
    }

    const query = `
    INSERT INTO logs (dps_report_url, success, duration, boss_id, boss_name)
    VALUES ($1, $2, $3, $4, $5)
    `;

    const values = [logUrl, isSuccess ?? false, duration ?? null, bossId, boss];

    try {
        await pool.query(query, values);
    } catch (error) {
        console.error(' insertLog DB Error', error.message);
        throw error;
    }
}