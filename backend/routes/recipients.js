/**
 * POST /recipients — Onboard a new recipient
 * Generates PQC key pairs, stores public keys in Postgres,
 * writes secret keys to a local keystore file (simulating recipient's device).
 */
import { Router } from 'express';
import { generateRecipientKeys } from '../services/pqc.js';
import pool from '../db/pool.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ethers } from 'ethers';
import * as ledgerService from '../services/ledger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KEYSTORE_DIR = path.resolve(__dirname, '../recipient-keystore');

// Ensure keystore directory exists
if (!fs.existsSync(KEYSTORE_DIR)) {
    fs.mkdirSync(KEYSTORE_DIR, { recursive: true });
}

const router = Router();

router.post('/', async (req, res) => {
    try {
        const { name } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Recipient name is required' });
        }

        // Generate PQC keys
        const keys = await generateRecipientKeys();

        // Generate a random Ethereum address for this recipient for revocation tracking
        const ethWallet = ethers.Wallet.createRandom();
        const ethAddress = ethWallet.address;

        // Store public keys in Postgres
        const result = await pool.query(
            `INSERT INTO recipients (name, kem_public_key, sig_public_key, eth_address)
             VALUES ($1, $2, $3, $4) RETURNING id, name, eth_address, created_at`,
            [name.trim(), keys.kemPublicKey, keys.sigPublicKey, ethAddress]
        );
        const recipient = result.rows[0];

        // Write secret keys to local keystore (simulating recipient's private device)
        const keystoreFile = path.join(KEYSTORE_DIR, `${recipient.id}.json`);
        fs.writeFileSync(keystoreFile, JSON.stringify({
            recipientId: recipient.id,
            name: recipient.name,
            kemSecretKey: keys.kemSecretKey,
            sigSecretKey: keys.sigSecretKey,
        }, null, 2));

        res.status(201).json({
            id: recipient.id,
            name: recipient.name,
            created_at: recipient.created_at,
            keystoreFile: keystoreFile,
            message: `Recipient onboarded. Secret keys saved to keystore.`,
        });
    } catch (err) {
        console.error('POST /recipients error:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /recipients — list all recipients (for UI dropdown)
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, name, eth_address, created_at FROM recipients ORDER BY id'
        );
        
        const recipients = await Promise.all(result.rows.map(async (r) => {
            let isRevoked = 0n;
            if (r.eth_address) {
                isRevoked = await ledgerService.contract.revokedAt(r.eth_address);
            }
            return {
                ...r,
                revoked: isRevoked > 0n
            };
        }));
        
        res.json(recipients);
    } catch (err) {
        console.error('GET /recipients error:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /recipients/:id/revoke — revoke a recipient's keys on-chain
router.post('/:id/revoke', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT eth_address FROM recipients WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Recipient not found' });
        }
        const ethAddress = result.rows[0].eth_address;
        
        const isRevoked = await ledgerService.contract.revokedAt(ethAddress);
        if (isRevoked > 0n) {
             return res.status(400).json({ error: 'Recipient is already revoked' });
        }
        
        const tx = await ledgerService.contract.revokeRecipient(ethAddress);
        await tx.wait();
        
        res.json({ success: true, message: 'Recipient revoked on-chain' });
    } catch (err) {
        console.error('POST /recipients/:id/revoke error:', err);
        res.status(500).json({ error: err.message });
    }
});

export default router;
