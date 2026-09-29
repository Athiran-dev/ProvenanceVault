/**
 * POST /documents/:id/decrypt — Simulate a recipient decrypting their copy.
 *
 * Flow:
 * 1. Look up distribution (wrapped key + encrypted blob)
 * 2. Read recipient's secret key from keystore
 * 3. KEM unwrap → AES key
 * 4. AES-GCM decrypt → original PDF bytes
 * 5. Generate watermark ID + embed invisible watermark
 * 6. Sign decryption event with ML-DSA
 * 7. Commit record on-chain via DecryptionLedger
 * 8. Save decryption event in Postgres
 * 9. Return watermarked PDF
 */
import { Router } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { unwrapKeyAsRecipient, signDecryptionEvent } from '../services/pqc.js';
import { decryptDocument } from '../services/aes.js';
import { generateWatermarkId, embedWatermark } from '../services/watermark.js';
import { commitRecord } from '../services/ledger.js';
import pool from '../db/pool.js';
import { checkAnomalies } from '../services/anomalyDetection.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KEYSTORE_DIR = path.resolve(__dirname, '../recipient-keystore');

const router = Router();

router.post('/:id/decrypt', async (req, res) => {
    try {
        const documentId = parseInt(req.params.id);
        const { recipientId } = req.body;

        if (!recipientId) {
            return res.status(400).json({ error: 'recipientId is required' });
        }

        // 1. Look up the distribution
        const distResult = await pool.query(
            `SELECT d.*, doc.original_hash, doc.filename, r.eth_address
             FROM distributions d
             JOIN documents doc ON doc.id = d.document_id
             JOIN recipients r ON r.id = d.recipient_id
             WHERE d.document_id = $1 AND d.recipient_id = $2`,
            [documentId, recipientId]
        );

        if (distResult.rows.length === 0) {
            return res.status(404).json({ error: 'No distribution found for this recipient and document' });
        }

        const dist = distResult.rows[0];

        // 2. Read recipient's secret keys from keystore
        const keystoreFile = path.join(KEYSTORE_DIR, `${recipientId}.json`);
        if (!fs.existsSync(keystoreFile)) {
            return res.status(404).json({ error: 'Recipient keystore not found' });
        }
        const keystore = JSON.parse(fs.readFileSync(keystoreFile, 'utf-8'));

        // 3. KEM unwrap → AES key
        const aesKey = await unwrapKeyAsRecipient(dist.wrapped_key, keystore.kemSecretKey);

        // 4. AES-GCM decrypt
        const encryptedBlob = fs.readFileSync(dist.encrypted_blob);
        const iv = Buffer.from(dist.iv, 'base64');
        const authTag = Buffer.from(dist.auth_tag, 'base64');
        const decryptedPdf = decryptDocument(encryptedBlob, aesKey, iv, authTag);

        // 5. Generate watermark + embed
        const sessionNonce = crypto.randomBytes(16).toString('hex');
        const { watermarkId, timestamp } = generateWatermarkId(String(recipientId), sessionNonce);
        const watermarkedPdf = await embedWatermark(decryptedPdf, watermarkId);

        // 6. Sign the decryption event
        const eventPayload = `${watermarkId}:${dist.original_hash}:${timestamp}`;
        const eventMessage = new TextEncoder().encode(eventPayload);
        const signatureB64 = await signDecryptionEvent(eventMessage, keystore.sigSecretKey);

        // 7. Commit on-chain
        const sigBytes = Buffer.from(signatureB64, 'base64');
        const { txHash } = await commitRecord(
            watermarkId,
            dist.eth_address,
            sigBytes,
            dist.original_hash
        );

        // 8. Anomaly detection
        const { burstActivity, offHoursActivity } = await checkAnomalies(recipientId, documentId);

        // 9. Save decryption event in Postgres
        await pool.query(
            `INSERT INTO decryption_events
             (watermark_id, recipient_id, document_id, session_nonce, event_timestamp, signature, tx_hash, verified, burst_flag, off_hours_flag)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [watermarkId, recipientId, documentId, sessionNonce, timestamp, signatureB64, txHash, true, burstActivity, offHoursActivity]
        );

        // 10. Return watermarked PDF
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="watermarked_${dist.filename}"`,
            'X-Watermark-Id': watermarkId,
            'X-Tx-Hash': txHash,
        });
        res.send(Buffer.from(watermarkedPdf));

    } catch (err) {
        console.error('POST /documents/:id/decrypt error:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /documents/:id/events — list decryption events for a document
router.get('/:id/events', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `SELECT de.*, r.name as recipient_name
             FROM decryption_events de
             JOIN recipients r ON r.id = de.recipient_id
             WHERE de.document_id = $1
             ORDER BY de.created_at DESC`,
            [id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('GET /documents/:id/events error:', err);
        res.status(500).json({ error: err.message });
    }
});

export default router;
