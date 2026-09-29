-- ProvenanceVault — PostgreSQL Schema
-- Run: psql -U postgres -d sih_ledger -f schema.sql

-- Recipients (public keys stored server-side, private keys in keystore files)
CREATE TABLE IF NOT EXISTS recipients (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(255) NOT NULL,
    kem_public_key  TEXT NOT NULL,
    sig_public_key  TEXT NOT NULL,
    eth_address   VARCHAR(42) NOT NULL,
    created_at    TIMESTAMP DEFAULT NOW()
);

-- Documents (original uploads)
CREATE TABLE IF NOT EXISTS documents (
    id            SERIAL PRIMARY KEY,
    filename      VARCHAR(512) NOT NULL,
    original_hash VARCHAR(64) NOT NULL,  -- sha256 hex
    file_path     TEXT NOT NULL,          -- path to original file on disk
    created_at    TIMESTAMP DEFAULT NOW()
);

-- Distributions (per-recipient encrypted copies)
CREATE TABLE IF NOT EXISTS distributions (
    id            SERIAL PRIMARY KEY,
    document_id   INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    recipient_id  INTEGER NOT NULL REFERENCES recipients(id) ON DELETE CASCADE,
    wrapped_key   TEXT NOT NULL,          -- base64 KEM ciphertext
    encrypted_blob TEXT NOT NULL,         -- path to encrypted file on disk
    iv            TEXT NOT NULL,          -- base64
    auth_tag      TEXT NOT NULL,          -- base64
    created_at    TIMESTAMP DEFAULT NOW()
);

-- Decryption events (audit trail)
CREATE TABLE IF NOT EXISTS decryption_events (
    id              SERIAL PRIMARY KEY,
    watermark_id    VARCHAR(64) NOT NULL UNIQUE,
    recipient_id    INTEGER NOT NULL REFERENCES recipients(id),
    document_id     INTEGER NOT NULL REFERENCES documents(id),
    session_nonce   VARCHAR(128) NOT NULL,
    event_timestamp VARCHAR(64) NOT NULL,
    signature       TEXT NOT NULL,          -- base64 ML-DSA signature
    tx_hash         VARCHAR(66),            -- Ethereum tx hash from commitRecord
    verified        BOOLEAN DEFAULT FALSE,
    burst_flag      BOOLEAN DEFAULT FALSE,
    off_hours_flag  BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP DEFAULT NOW()
);
