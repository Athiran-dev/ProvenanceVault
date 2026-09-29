const API_BASE = 'http://localhost:5000';

async function request(url, options = {}) {
    const res = await fetch(`${API_BASE}${url}`, options);
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || res.statusText);
    }
    return res;
}

export async function getRecipients() {
    const res = await request('/recipients');
    return res.json();
}

export async function createRecipient(name) {
    const res = await request('/recipients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
    });
    return res.json();
}

export async function revokeRecipient(id) {
    const res = await request(`/recipients/${id}/revoke`, {
        method: 'POST',
    });
    return res.json();
}

export async function getDocuments() {
    const res = await request('/documents');
    return res.json();
}

export async function distributeDocument(file, recipientIds) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('recipientIds', JSON.stringify(recipientIds));
    const res = await request('/documents/distribute', {
        method: 'POST',
        body: formData,
    });
    return res.json();
}

export async function getDistributions(documentId) {
    const res = await request(`/documents/${documentId}/distributions`);
    return res.json();
}

export async function decryptDocument(documentId, recipientId) {
    const res = await fetch(`${API_BASE}/documents/${documentId}/decrypt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || res.statusText);
    }
    // Return blob + headers
    const blob = await res.blob();
    return {
        blob,
        watermarkId: res.headers.get('X-Watermark-Id'),
        txHash: res.headers.get('X-Tx-Hash'),
    };
}

export async function getLedgerEvents() {
    const res = await request('/ledger/events');
    return res.json();
}

export async function getLedgerStats() {
    const res = await request('/ledger/stats');
    return res.json();
}

export async function leakCheck(file) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/leak-check`, {
        method: 'POST',
        body: formData,
    });
    return res.json();
}
