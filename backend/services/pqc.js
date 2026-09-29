import { createKyber768, createMLDSA65 } from '@openforge-sh/liboqs';

export async function generateRecipientKeys() {
    const kem = await createKyber768();
    const kemKeys = await kem.generateKeyPair();
    kem.destroy();

    const sig = await createMLDSA65();
    const sigKeys = await sig.generateKeyPair();
    sig.destroy();

    return {
        kemPublicKey: Buffer.from(kemKeys.publicKey).toString('base64'),
        kemSecretKey: Buffer.from(kemKeys.secretKey).toString('base64'),
        sigPublicKey: Buffer.from(sigKeys.publicKey).toString('base64'),
        sigSecretKey: Buffer.from(sigKeys.secretKey).toString('base64'),
    };
}

export async function wrapKeyForRecipient(kemPublicKeyB64) {
    const kem = await createKyber768();
    const publicKey = new Uint8Array(Buffer.from(kemPublicKeyB64, 'base64'));
    const { ciphertext, sharedSecret } = await kem.encapsulate(publicKey);
    kem.destroy();

    return {
        wrappedKey: Buffer.from(ciphertext).toString('base64'),
        sharedSecret: Buffer.from(sharedSecret), // used as AES key
    };
}

export async function unwrapKeyAsRecipient(wrappedKeyB64, kemSecretKeyB64) {
    const kem = await createKyber768();
    const ciphertext = new Uint8Array(Buffer.from(wrappedKeyB64, 'base64'));
    const secretKey = new Uint8Array(Buffer.from(kemSecretKeyB64, 'base64'));
    const sharedSecret = await kem.decapsulate(ciphertext, secretKey);
    kem.destroy();

    return Buffer.from(sharedSecret);
}

export async function signDecryptionEvent(message, sigSecretKeyB64) {
    const sig = await createMLDSA65();
    const secretKey = new Uint8Array(Buffer.from(sigSecretKeyB64, 'base64'));
    const signature = await sig.sign(message, secretKey);
    sig.destroy();

    return Buffer.from(signature).toString('base64');
}

export async function verifyDecryptionSignature(message, signatureB64, sigPublicKeyB64) {
    const sig = await createMLDSA65();
    const signature = new Uint8Array(Buffer.from(signatureB64, 'base64'));
    const publicKey = new Uint8Array(Buffer.from(sigPublicKeyB64, 'base64'));
    const isValid = await sig.verify(message, signature, publicKey);
    sig.destroy();

    return isValid;
}