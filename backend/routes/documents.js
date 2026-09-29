/**
 * POST /documents/distribute — Upload a PDF and distribute to selected recipients.
 * Each recipient gets their own AES key via KEM wrapping.
 * The document is encrypted separately per recipient.
 */
import { Router } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { wrapKeyForRecipient } from '../services/pqc.js';
import { encryptDocument } from '../services/aes.js';
import pool from '../db/pool.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.resolve(__dirname, '../uploads');
const ENCRYPTED_DIR = path.resolve(__dirname, '../encrypted');

// Ensure directories exist
[UPLOADS_DIR, ENCRYPTED_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const upload = multer({ dest: UPLOADS_DIR });
const router = Router();

router.post('/distribute', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'PDF file is required' });
        }

        // Parse recipient IDs from body (comma-separated or JSON array)
        let recipientIds;
        if (typeof req.body.recipientIds === 'string') {
            try {
                recipientIds = JSON.parse(req.body.recipientIds);
            } catch {
                recipientIds = req.body.recipientIds.split(',').map(s => parseInt(s.trim()));
            }
        } else if (Array.isArray(req.body.recipientIds)) {
            recipientIds = req.body.recipientIds.map(Number);
        } else {
            return res.status(400).json({ error: 'recipientIds is required' });
        }

        if (!recipientIds.length) {
            return res.status(400).json({ error: 'At least one recipient is required' });
        }

        // Read uploaded file
        const fileBuffer = fs.readFileSync(req.file.path);
        const originalHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

        // Save original file with proper name
        const originalFileName = req.file.originalname || 'document.pdf';
        const savedPath = path.join(UPLOADS_DIR, `${Date.now()}-${originalFileName}`);
        fs.renameSync(req.file.path, savedPath);

        // Insert document record
        const docResult = await pool.query(
            `INSERT INTO documents (filename, original_hash, file_path)
             VALUES ($1, $2, $3) RETURNING id`,
            [originalFileName, originalHash, savedPath]
        );
        const documentId = docResult.rows[0].id;

        // Fetch recipients' public keys
        const recipientResult = await pool.query(
            'SELECT id, name, kem_public_key FROM recipients WHERE id = ANY($1)',
            [recipientIds]
        );

        if (recipientResult.rows.length === 0) {
            return res.status(404).json({ error: 'No valid recipients found' });
        }

        const distributions = [];

        // Encrypt per recipient
        for (const recipient of recipientResult.rows) {
            // KEM wrap → unique AES key per recipient
            const { wrappedKey, sharedSecret: aesKey } = await wrapKeyForRecipient(recipient.kem_public_key);

            // AES-256-GCM encrypt
            const { encrypted, iv, authTag } = encryptDocument(fileBuffer, aesKey);

            // Save encrypted blob to disk
            const encryptedPath = path.join(ENCRYPTED_DIR, `doc${documentId}_r${recipient.id}_${Date.now()}.enc`);
            fs.writeFileSync(encryptedPath, encrypted);

            // Store distribution record
            const distResult = await pool.query(
                `INSERT INTO distributions (document_id, recipient_id, wrapped_key, encrypted_blob, iv, auth_tag)
                 VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
                [
                    documentId,
                    recipient.id,
                    wrappedKey,
                    encryptedPath,
                    iv.toString('base64'),
                    authTag.toString('base64'),
                ]
            );

            distributions.push({
                distributionId: distResult.rows[0].id,
                recipientId: recipient.id,
                recipientName: recipient.name,
            });
        }

        res.status(201).json({
            documentId,
            filename: originalFileName,
            originalHash,
            distributions,
            message: `Document distributed to ${distributions.length} recipient(s).`,
        });
    } catch (err) {
        console.error('POST /documents/distribute error:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /documents — list all documents
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, filename, original_hash, created_at FROM documents ORDER BY id DESC'
        );
        res.json(result.rows);
    } catch (err) {
        console.error('GET /documents error:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /documents/:id/distributions — list distributions for a document
router.get('/:id/distributions', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `SELECT d.id, d.recipient_id, r.name as recipient_name, d.created_at
             FROM distributions d
             JOIN recipients r ON r.id = d.recipient_id
             WHERE d.document_id = $1
             ORDER BY d.id`,
            [id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('GET /documents/:id/distributions error:', err);
        res.status(500).json({ error: err.message });
    }
});

export default router;
