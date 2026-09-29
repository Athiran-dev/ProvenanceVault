/**
 * POST /leak-check — Admin uploads a leaked PDF.
 * Extracts watermark, looks up in DB + on-chain, verifies ML-DSA signature.
 */
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { extractWatermark } from '../services/extractWatermark.js';
import { verifyDecryptionSignature } from '../services/pqc.js';
import { getRecord, contract } from '../services/ledger.js';
import pool from '../db/pool.js';
import { generateForensicReport } from '../services/forensicReport.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LEAK_UPLOADS = path.resolve(__dirname, '../uploads/leak-check');

if (!fs.existsSync(LEAK_UPLOADS)) {
    fs.mkdirSync(LEAK_UPLOADS, { recursive: true });
}

const upload = multer({ dest: LEAK_UPLOADS });
const router = Router();

router.post('/', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'PDF file is required' });
        }

        const pdfBuffer = fs.readFileSync(req.file.path);

        // 1. Extract watermark
        let watermarkId;
        try {
            watermarkId = await extractWatermark(pdfBuffer);
        } catch (parseErr) {
            try { fs.unlinkSync(req.file.path); } catch(e){}
            return res.status(400).json({
                found: false,
                message: 'Invalid or corrupt PDF file.',
            });
        }

        if (!watermarkId) {
            // Clean up uploaded file
            try { fs.unlinkSync(req.file.path); } catch(e){}
            return res.status(404).json({
                found: false,
                message: 'No watermark found in this PDF.',
            });
        }

        // 2. Look up in Postgres
        const dbResult = await pool.query(
            `SELECT de.*, r.name as recipient_name, r.sig_public_key, r.eth_address, doc.filename, doc.original_hash
             FROM decryption_events de
             JOIN recipients r ON r.id = de.recipient_id
             JOIN documents doc ON doc.id = de.document_id
             WHERE de.watermark_id = $1`,
            [watermarkId]
        );

        if (dbResult.rows.length === 0) {
            try { fs.unlinkSync(req.file.path); } catch(e){}
            return res.status(404).json({
                found: true,
                watermarkId,
                message: 'Watermark found but no matching decryption event in database.',
            });
        }

        const event = dbResult.rows[0];

        // 3. Look up on-chain record
        let onChainRecord = null;
        try {
            onChainRecord = await getRecord(watermarkId);
        } catch (chainErr) {
            console.warn('On-chain lookup failed (Hardhat node may be down):', chainErr.message);
        }

        // 4. Verify ML-DSA signature off-chain
        const eventPayload = `${watermarkId}:${event.original_hash}:${event.event_timestamp}`;
        const eventMessage = new TextEncoder().encode(eventPayload);
        let signatureVerified = false;
        try {
            signatureVerified = await verifyDecryptionSignature(
                eventMessage,
                event.signature,
                event.sig_public_key
            );
        } catch (sigErr) {
            console.warn('Signature verification failed:', sigErr.message);
        }

        // 5. Check revocation status
        let keyStatus = 'unknown';
        let currentlyRevoked = false;
        if (onChainRecord && event.eth_address) {
            try {
                // Check if revoked at the time of decryption
                const isRevoked = await contract.isRevoked(event.eth_address, onChainRecord.timestamp);
                if (isRevoked) {
                    keyStatus = 'revoked-before-decryption';
                } else {
                    keyStatus = 'valid-at-time-of-decryption';
                }
                
                // Check if currently revoked
                currentlyRevoked = await contract.isCurrentlyRevoked(event.eth_address);
            } catch (revErr) {
                console.warn('Revocation check failed:', revErr.message);
            }
        }

        // 6. Update verified status in DB if needed
        if (signatureVerified && !event.verified) {
            await pool.query(
                'UPDATE decryption_events SET verified = true WHERE watermark_id = $1',
                [watermarkId]
            );
        }

        // Clean up
        try { fs.unlinkSync(req.file.path); } catch(e){}

        res.json({
            found: true,
            watermarkId,
            recipient: {
                id: event.recipient_id,
                name: event.recipient_name,
                eth_address: event.eth_address,
            },
            document: {
                id: event.document_id,
                filename: event.filename,
                originalHash: event.original_hash,
            },
            decryptionEvent: {
                timestamp: event.event_timestamp,
                sessionNonce: event.session_nonce,
                txHash: event.tx_hash,
            },
            signatureVerified,
            keyStatus,
            currentlyRevoked,
            onChainRecord: onChainRecord ? {
                timestamp: Number(onChainRecord.timestamp),
                recipient: onChainRecord.recipient,
                docHash: onChainRecord.docHash,
            } : null,
            message: signatureVerified
                ? '✅ Leak attributed — cryptographic signature verified.'
                : '⚠️ Watermark matched but signature verification failed.',
        });

    } catch (err) {
        console.error('POST /leak-check error:', err);
        res.status(500).json({ error: err.message });
    }
});

router.get('/:watermarkId/report', async (req, res) => {
    try {
        const { watermarkId } = req.params;
        
        // Lookup event in Postgres
        const dbResult = await pool.query(
            `SELECT de.*, r.name as recipient_name, r.eth_address, doc.filename, doc.original_hash
             FROM decryption_events de
             JOIN recipients r ON r.id = de.recipient_id
             JOIN documents doc ON doc.id = de.document_id
             WHERE de.watermark_id = $1`,
            [watermarkId]
        );

        if (dbResult.rows.length === 0) {
            return res.status(404).json({ error: 'Watermark ID not found in database.' });
        }
        
        const event = dbResult.rows[0];
        
        // Re-check revocation status on-chain
        let onChainRecord = null;
        let keyStatus = 'unknown';
        let currentlyRevoked = false;
        try {
            onChainRecord = await getRecord(watermarkId);
            if (onChainRecord && event.eth_address) {
                const isRevoked = await contract.isRevoked(event.eth_address, onChainRecord.timestamp);
                keyStatus = isRevoked ? 'revoked-before-decryption' : 'valid-at-time-of-decryption';
                currentlyRevoked = await contract.isCurrentlyRevoked(event.eth_address);
            }
        } catch (chainErr) {
            console.warn('On-chain lookup failed for report:', chainErr.message);
        }

        const reportData = {
            watermarkId,
            recipient: {
                name: event.recipient_name,
                eth_address: event.eth_address,
            },
            document: {
                filename: event.filename,
                originalHash: event.original_hash,
            },
            decryptionEvent: {
                timestamp: event.event_timestamp,
                txHash: event.tx_hash,
            },
            signatureVerified: event.verified,
            keyStatus,
            currentlyRevoked
        };

        const pdfBytes = await generateForensicReport(reportData);
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=ForensicReport_${watermarkId.slice(0,8)}.pdf`);
        res.send(Buffer.from(pdfBytes));
    } catch (err) {
        console.error('GET /leak-check/:watermarkId/report error:', err);
        res.status(500).json({ error: err.message });
    }
});

export default router;
