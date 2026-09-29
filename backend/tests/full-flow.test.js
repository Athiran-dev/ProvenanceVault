/**
 * Full-Flow Integration Test
 * ==========================
 * Tests the complete PQC + AES document encryption pipeline:
 *
 *  1. Generate recipient KEM + signature key pairs
 *  2. Wrap (encapsulate) a shared secret using recipient's KEM public key
 *  3. Unwrap (decapsulate) the shared secret using recipient's KEM secret key
 *  4. Verify both sides derived the same AES key
 *  5. AES-256-GCM encrypt a sample document with the shared secret
 *  6. AES-256-GCM decrypt the ciphertext
 *  7. Verify decrypted output === original document
 *  8. Sign a decryption event and verify the signature
 *
 * Run:  node tests/full-flow.test.js
 */

import crypto from 'crypto';
import {
    generateRecipientKeys,
    wrapKeyForRecipient,
    unwrapKeyAsRecipient,
    signDecryptionEvent,
    verifyDecryptionSignature,
} from '../services/pqc.js';
import { encryptDocument, decryptDocument } from '../services/aes.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition, label) {
    if (condition) {
        console.log(`  ✅ PASS: ${label}`);
        passed++;
    } else {
        console.error(`  ❌ FAIL: ${label}`);
        failed++;
    }
}

function printSection(title) {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`  ${title}`);
    console.log('═'.repeat(60));
}

// ─── Tests ──────────────────────────────────────────────────────────────────

async function testKeyGeneration() {
    printSection('Step 1 — Generate Recipient Keys');

    const keys = await generateRecipientKeys();

    assert(typeof keys.kemPublicKey === 'string' && keys.kemPublicKey.length > 0,
        'KEM public key generated (base64)');
    assert(typeof keys.kemSecretKey === 'string' && keys.kemSecretKey.length > 0,
        'KEM secret key generated (base64)');
    assert(typeof keys.sigPublicKey === 'string' && keys.sigPublicKey.length > 0,
        'Signature public key generated (base64)');
    assert(typeof keys.sigSecretKey === 'string' && keys.sigSecretKey.length > 0,
        'Signature secret key generated (base64)');

    console.log(`\n  KEM public key length : ${Buffer.from(keys.kemPublicKey, 'base64').length} bytes`);
    console.log(`  KEM secret key length : ${Buffer.from(keys.kemSecretKey, 'base64').length} bytes`);
    console.log(`  Sig public key length : ${Buffer.from(keys.sigPublicKey, 'base64').length} bytes`);
    console.log(`  Sig secret key length : ${Buffer.from(keys.sigSecretKey, 'base64').length} bytes`);

    return keys;
}

async function testKeyWrapping(keys) {
    printSection('Step 2 — Wrap Key (KEM Encapsulate)');

    const { wrappedKey, sharedSecret: senderAesKey } = await wrapKeyForRecipient(keys.kemPublicKey);

    assert(typeof wrappedKey === 'string' && wrappedKey.length > 0,
        'Wrapped key (ciphertext) generated');
    assert(Buffer.isBuffer(senderAesKey) && senderAesKey.length === 32,
        `Sender shared secret is 32-byte Buffer (got ${senderAesKey.length} bytes)`);

    console.log(`\n  Wrapped key size : ${Buffer.from(wrappedKey, 'base64').length} bytes`);

    return { wrappedKey, senderAesKey };
}

async function testKeyUnwrapping(keys, wrappedKey, senderAesKey) {
    printSection('Step 3 — Unwrap Key (KEM Decapsulate)');

    const recipientAesKey = await unwrapKeyAsRecipient(wrappedKey, keys.kemSecretKey);

    assert(Buffer.isBuffer(recipientAesKey) && recipientAesKey.length === 32,
        `Recipient shared secret is 32-byte Buffer (got ${recipientAesKey.length} bytes)`);

    const keysMatch = Buffer.compare(senderAesKey, recipientAesKey) === 0;
    assert(keysMatch, 'Sender and recipient derived the SAME AES key');

    return recipientAesKey;
}

function testAesEncryption(aesKey) {
    printSection('Step 4 — AES-256-GCM Encrypt Document');

    // Simulate a realistic document (JSON payload)
    const originalDoc = JSON.stringify({
        title: 'Confidential Report — SIH 2024',
        content: 'This document contains highly sensitive information protected by post-quantum cryptography.',
        timestamp: new Date().toISOString(),
        randomPayload: crypto.randomBytes(256).toString('hex'),
    });
    const fileBuffer = Buffer.from(originalDoc, 'utf-8');

    console.log(`\n  Original document size : ${fileBuffer.length} bytes`);

    const { encrypted, iv, authTag } = encryptDocument(fileBuffer, aesKey);

    assert(Buffer.isBuffer(encrypted) && encrypted.length > 0,
        'Encrypted ciphertext produced');
    assert(Buffer.isBuffer(iv) && iv.length === 12,
        `IV is 12 bytes (got ${iv.length})`);
    assert(Buffer.isBuffer(authTag) && authTag.length === 16,
        `Auth tag is 16 bytes (got ${authTag.length})`);

    // Sanity: ciphertext should NOT equal plaintext
    const notPlaintext = Buffer.compare(encrypted, fileBuffer) !== 0;
    assert(notPlaintext, 'Ciphertext differs from plaintext');

    console.log(`  Encrypted size         : ${encrypted.length} bytes`);

    return { encrypted, iv, authTag, originalBuffer: fileBuffer };
}

function testAesDecryption(aesKey, encrypted, iv, authTag, originalBuffer) {
    printSection('Step 5 — AES-256-GCM Decrypt Document');

    const decrypted = decryptDocument(encrypted, aesKey, iv, authTag);

    assert(Buffer.isBuffer(decrypted), 'Decrypted output is a Buffer');

    const matches = Buffer.compare(decrypted, originalBuffer) === 0;
    assert(matches, '🔑  Decrypted document === Original document');

    if (!matches) {
        console.error('  Original :', originalBuffer.toString('utf-8').slice(0, 100), '...');
        console.error('  Decrypted:', decrypted.toString('utf-8').slice(0, 100), '...');
    }

    return decrypted;
}

function testTamperedCiphertext(aesKey, encrypted, iv, authTag) {
    printSection('Step 6 — Tamper Detection (modified ciphertext)');

    const tampered = Buffer.from(encrypted);
    tampered[0] ^= 0xff; // flip first byte

    let caught = false;
    try {
        decryptDocument(tampered, aesKey, iv, authTag);
    } catch (err) {
        caught = true;
    }

    assert(caught, 'Tampered ciphertext correctly rejected by GCM auth');
}

async function testSignatureFlow(keys) {
    printSection('Step 7 — ML-DSA Signature (Decryption Event Logging)');

    const eventMessage = new TextEncoder().encode(
        `decryption_event|recipient=Recipient-A|doc_hash=abc123|ts=${Date.now()}`
    );

    const signatureB64 = await signDecryptionEvent(eventMessage, keys.sigSecretKey);
    assert(typeof signatureB64 === 'string' && signatureB64.length > 0,
        'Signature generated (base64)');

    const isValid = await verifyDecryptionSignature(eventMessage, signatureB64, keys.sigPublicKey);
    assert(isValid === true, 'Signature verified successfully');

    // Negative test — wrong message
    const wrongMessage = new TextEncoder().encode('tampered_event');
    const isInvalid = await verifyDecryptionSignature(wrongMessage, signatureB64, keys.sigPublicKey);
    assert(isInvalid === false, 'Signature correctly rejects wrong message');
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
    console.log('\n🚀  IdentiChain — Full-Flow Integration Test');
    console.log('─'.repeat(60));

    const startTime = Date.now();

    // 1. Key Generation
    const keys = await testKeyGeneration();

    // 2. Wrap key (sender side)
    const { wrappedKey, senderAesKey } = await testKeyWrapping(keys);

    // 3. Unwrap key (recipient side)
    const recipientAesKey = await testKeyUnwrapping(keys, wrappedKey, senderAesKey);

    // 4. AES Encrypt
    const { encrypted, iv, authTag, originalBuffer } = testAesEncryption(recipientAesKey);

    // 5. AES Decrypt & Verify
    testAesDecryption(recipientAesKey, encrypted, iv, authTag, originalBuffer);

    // 6. Tamper detection
    testTamperedCiphertext(recipientAesKey, encrypted, iv, authTag);

    // 7. Signature flow
    await testSignatureFlow(keys);

    // ─── Summary ────────────────────────────────────────────────────────
    const elapsed = Date.now() - startTime;
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`  RESULTS: ${passed} passed, ${failed} failed  (${elapsed}ms)`);
    console.log('═'.repeat(60));

    if (failed > 0) {
        process.exit(1);
    } else {
        console.log('\n🎉  All tests passed! Full PQC + AES pipeline is working.\n');
    }
}

main().catch((err) => {
    console.error('\n💥  Test crashed:', err);
    process.exit(1);
});
