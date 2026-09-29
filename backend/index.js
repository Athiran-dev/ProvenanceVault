/**
 * ProvenanceVault — Express Backend Entry Point
 */
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import recipientsRouter from './routes/recipients.js';
import documentsRouter from './routes/documents.js';
import decryptRouter from './routes/decrypt.js';
import leakCheckRouter from './routes/leakCheck.js';
import ledgerRouter from './routes/ledger.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/recipients', recipientsRouter);
app.use('/documents', documentsRouter);
app.use('/documents', decryptRouter);      // POST /documents/:id/decrypt
app.use('/leak-check', leakCheckRouter);
app.use('/ledger', ledgerRouter);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`\n🔐 ProvenanceVault backend running on http://localhost:${PORT}`);
    console.log(`   Hardhat RPC: ${process.env.HARDHAT_RPC_URL || 'http://127.0.0.1:8545'}`);
    console.log(`   Contract:    ${process.env.CONTRACT_ADDRESS}\n`);
});

export default app;
