import { createKyber768, createMLDSA65 } from '@openforge-sh/liboqs';

async function testKem() {
    console.log("=== ML-KEM-768 (Kyber768) Test ===");
    const kem = await createKyber768();

    const { publicKey, secretKey } = await kem.generateKeyPair();
    const { ciphertext, sharedSecret: senderSecret } = await kem.encapsulate(publicKey);
    const receiverSecret = await kem.decapsulate(ciphertext, secretKey);

    const match = Buffer.compare(Buffer.from(senderSecret), Buffer.from(receiverSecret)) === 0;
    console.log("Shared secrets match:", match);

    kem.destroy();
}

async function testSig() {
    console.log("\n=== ML-DSA-65 (Dilithium) Test ===");
    const sig = await createMLDSA65();

    const { publicKey, secretKey } = await sig.generateKeyPair();
    const message = new TextEncoder().encode("decryption event: recipient A, doc hash XYZ");

    const signature = await sig.sign(message, secretKey);
    const isValid = await sig.verify(message, signature, publicKey);

    console.log("Signature valid:", isValid);

    sig.destroy();
}

async function main() {
    await testKem();
    await testSig();
}

main().catch(console.error);