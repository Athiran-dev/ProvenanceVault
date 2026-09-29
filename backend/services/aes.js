import crypto from 'crypto';

export function encryptDocument(fileBuffer, aesKey) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', aesKey, iv);
    const encrypted = Buffer.concat([cipher.update(fileBuffer), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return { encrypted, iv, authTag };
}

export function decryptDocument(encrypted, aesKey, iv, authTag) {
    const decipher = crypto.createDecipheriv('aes-256-gcm', aesKey, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}