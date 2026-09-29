import fs from 'fs';
import path from 'path';

const API_BASE = 'http://localhost:5000';

async function request(url, options = {}) {
    const res = await fetch(`${API_BASE}${url}`, options);
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`API Error ${res.status}: ${text}`);
    }
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
        return res.json();
    }
    return {
        blob: await res.blob(),
        headers: res.headers
    };
}

async function run() {
    console.log("=== 1. Onboard Recipient C ===");
    const rC = await request('/recipients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Recipient C' })
    });
    console.log("Recipient C onboarded:", rC);

    console.log("\n=== 2. Distribute document ===");
    fs.writeFileSync('dummyC.pdf', '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> >>\nendobj\n4 0 obj\n<< /Length 53 >>\nstream\nBT\n/F1 24 Tf\n100 700 Td\n(Hello World) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000288 00000 n \ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n392\n%%EOF');
    const formData = new FormData();
    formData.append('file', new Blob([fs.readFileSync('dummyC.pdf')]), 'dummyC.pdf');
    formData.append('recipientIds', JSON.stringify([rC.id]));

    const distRes = await request('/documents/distribute', {
        method: 'POST',
        body: formData
    });
    const documentId = distRes.documentId;
    console.log("Distributed, documentId:", documentId);

    console.log("\n=== 3. Decrypt as Recipient C ===");
    const decryptRes = await request(`/documents/${documentId}/decrypt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId: rC.id })
    });
    const watermarkId = decryptRes.headers.get('x-watermark-id');
    fs.writeFileSync('watermarked_C.pdf', Buffer.from(await decryptRes.blob.arrayBuffer()));
    console.log("Decrypted. Watermark ID:", watermarkId);

    // Wait a second to ensure timestamps are strictly less/greater
    await new Promise(resolve => setTimeout(resolve, 1500));

    console.log("\n=== 4. Revoke Recipient C ===");
    const revokeRes = await request(`/recipients/${rC.id}/revoke`, { method: 'POST' });
    console.log("Revoke response:", revokeRes);

    console.log("\n=== 5. Run leak-check ===");
    const leakFormData = new FormData();
    leakFormData.append('file', new Blob([fs.readFileSync('watermarked_C.pdf')]), 'watermarked_C.pdf');
    const leakRes = await request('/leak-check', {
        method: 'POST',
        body: leakFormData
    });
    console.log("Leak check result:\n", JSON.stringify(leakRes, null, 2));
}

run().catch(console.error);
