/**
 * GET /ledger/events — List all decryption events across all documents
 * Used by the frontend Ledger Viewer page.
 */
import { Router } from 'express';
import pool from '../db/pool.js';
import { totalRecords } from '../services/ledger.js';

const router = Router();

// GET /ledger/events — all decryption events
router.get('/events', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT de.*, r.name as recipient_name, doc.filename
             FROM decryption_events de
             JOIN recipients r ON r.id = de.recipient_id
             JOIN documents doc ON doc.id = de.document_id
             ORDER BY de.created_at DESC`
        );
        res.json(result.rows);
    } catch (err) {
        console.error('GET /ledger/events error:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /ledger/stats — on-chain record count
router.get('/stats', async (req, res) => {
    try {
        const onChainCount = await totalRecords();
        const dbResult = await pool.query('SELECT COUNT(*) as count FROM decryption_events');
        res.json({
            onChainRecords: onChainCount,
            dbRecords: parseInt(dbResult.rows[0].count),
        });
    } catch (err) {
        console.error('GET /ledger/stats error:', err);
        res.status(500).json({ error: err.message });
    }
});

export default router;
