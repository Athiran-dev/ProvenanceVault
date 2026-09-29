import pool from '../db/pool.js';

export async function checkAnomalies(recipientId, documentId) {
    let burstActivity = false;
    let offHoursActivity = false;

    try {
        // 1. Burst Activity Check (more than 3 decryptions in the last 5 minutes)
        // Note: SQLite doesn't have NOW() - 5 minutes, but we're using Postgres.
        const burstQuery = await pool.query(
            `SELECT COUNT(*) FROM decryption_events 
             WHERE recipient_id = $1 
             AND created_at >= NOW() - INTERVAL '5 minutes'`,
            [recipientId]
        );
        
        // If there are 3 or more (this current one isn't in DB yet, so >= 3 means 4 total including this)
        if (parseInt(burstQuery.rows[0].count) >= 3) {
            burstActivity = true;
        }

        // 2. Off-Hours Activity Check (between 00:00 and 05:00 local server time)
        const currentHour = new Date().getHours();
        if (currentHour >= 0 && currentHour < 5) {
            offHoursActivity = true;
        }

    } catch (err) {
        console.error('Error in anomaly detection:', err);
    }

    return { burstActivity, offHoursActivity };
}
