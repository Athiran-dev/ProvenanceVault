/**
 * Ledger Service — ethers.js wrapper for DecryptionLedger smart contract.
 * Reads contract address from .env (never hardcoded).
 */
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));

// ABI from Hardhat compilation artifact
const artifactPath = resolve(__dirname, '../../smart_contract/artifacts/contracts/DecryptionLedger.sol/DecryptionLedger.json');
const artifact = JSON.parse(readFileSync(artifactPath, 'utf-8'));
const ABI = artifact.abi;

const RPC_URL = process.env.HARDHAT_RPC_URL || 'http://127.0.0.1:8545';
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const PRIVATE_KEY = process.env.HARDHAT_PRIVATE_KEY;

if (!CONTRACT_ADDRESS) throw new Error('CONTRACT_ADDRESS not set in .env');
if (!PRIVATE_KEY) throw new Error('HARDHAT_PRIVATE_KEY not set in .env');

const provider = new ethers.JsonRpcProvider(RPC_URL);
const baseSigner = new ethers.Wallet(PRIVATE_KEY, provider);
const signer = new ethers.NonceManager(baseSigner);
const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

/**
 * Commit a decryption record on-chain.
 * @param {string} watermarkIdHex - 64-char hex watermark ID
 * @param {string} recipientAddress - Ethereum address for recipient
 * @param {Buffer|Uint8Array} signatureBytes - raw ML-DSA signature
 * @param {string} docHashHex - 64-char hex document hash
 * @returns {{ txHash: string }}
 */
export async function commitRecord(watermarkIdHex, recipientAddress, signatureBytes, docHashHex) {
    const watermarkId = '0x' + watermarkIdHex;
    const docHash = '0x' + docHashHex;

    const tx = await contract.commitRecord(watermarkId, recipientAddress, signatureBytes, docHash);
    const receipt = await tx.wait();

    return { txHash: receipt.hash };
}

/**
 * Get a decryption record from on-chain by watermark ID.
 * @param {string} watermarkIdHex - 64-char hex
 * @returns {object} DecryptionRecord struct
 */
export async function getRecord(watermarkIdHex) {
    const watermarkId = '0x' + watermarkIdHex;
    const record = await contract.getRecord(watermarkId);

    return {
        watermarkId: record.watermarkId,
        recipient: record.recipient,
        signature: record.signature,
        docHash: record.docHash,
        timestamp: Number(record.timestamp),
    };
}

/**
 * Get total number of records on-chain.
 */
export async function totalRecords() {
    const count = await contract.totalRecords();
    return Number(count);
}

/**
 * Get the signer's address (used as the "recipient address" on-chain).
 * For the hackathon demo, we use a deterministic mapping: recipient DB id → Hardhat account.
 */
export function getSignerAddress() {
    return baseSigner.address;
}

export { provider, contract };
