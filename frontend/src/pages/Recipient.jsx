import React, { useState, useEffect } from 'react';
import { Download, Lock, Unlock, User, FileText, CheckCircle, AlertCircle, Loader, Hash } from 'lucide-react';
import { getRecipients, getDocuments, getDistributions, decryptDocument, revokeRecipient } from '../api';

export default function Recipient() {
  const [recipients, setRecipients] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [distributions, setDistributions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [decryptResult, setDecryptResult] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    loadInitial();
  }, []);

  async function loadInitial() {
    try {
      const [r, d] = await Promise.all([getRecipients(), getDocuments()]);
      setRecipients(r);
      setDocuments(d);
    } catch (err) {
      showToast('error', err.message);
    }
  }

  function showToast(type, message) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 6000);
  }

  async function handleSelectRecipient(recipient) {
    setSelectedRecipient(recipient);
    setDecryptResult(null);
    setDistributions([]);

    // Load all distributions for all documents that include this recipient
    try {
      const allDists = [];
      for (const doc of documents) {
        const dists = await getDistributions(doc.id);
        const myDists = dists.filter(d => d.recipient_id === recipient.id);
        myDists.forEach(d => allDists.push({ ...d, documentId: doc.id, filename: doc.filename }));
      }
      setDistributions(allDists);
    } catch (err) {
      showToast('error', err.message);
    }
  }

  async function handleRevoke(id) {
      if (!window.confirm("Are you sure you want to revoke this recipient's access? This action is recorded on-chain and cannot be undone.")) return;
      try {
          await revokeRecipient(id);
          showToast('success', 'Recipient access revoked successfully.');
          await loadInitial();
          if (selectedRecipient && selectedRecipient.id === id) {
             setSelectedRecipient(prev => ({ ...prev, revoked: true }));
          }
      } catch (err) {
          showToast('error', err.message);
      }
  }

  async function handleDecrypt(documentId) {
    if (!selectedRecipient) return;
    setLoading(true);
    setDecryptResult(null);
    try {
      const result = await decryptDocument(documentId, selectedRecipient.id);
      setDecryptResult(result);

      // Auto-download the watermarked PDF
      const url = URL.createObjectURL(result.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `watermarked_doc${documentId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      showToast('success', 'Decrypted successfully! Watermarked PDF downloaded.');
    } catch (err) {
      showToast('error', err.message);
    }
    setLoading(false);
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', margin: 0 }}>Recipient View</h1>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
          Simulate switching between recipients. Select a recipient, then decrypt their copy.
        </p>
      </div>

      <div className="dashboard-2col-layout">
        {/* Left: Recipient selector + their documents */}
        <div>
          {/* Recipient selector */}
          <div className="glass-card-primary" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <User size={20} /> Select Recipient
            </h2>
            {recipients.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No recipients available. Onboard one from the Dashboard.</p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {recipients.map(r => (
                  <button
                    key={r.id}
                    onClick={() => handleSelectRecipient(r)}
                    style={{
                      padding: '0.6rem 1.2rem',
                      borderRadius: '999px',
                      border: 'none',
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      background: 'var(--neo-bg)',
                      color: selectedRecipient?.id === r.id ? 'var(--primary-blue)' : 'var(--text-dark)',
                      boxShadow: selectedRecipient?.id === r.id ? 'var(--neo-inset)' : 'var(--neo-outset-sm)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <User size={14} style={{ marginRight: '0.25rem', verticalAlign: 'middle' }} />
                    {r.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Distributions for this recipient */}
          {selectedRecipient && (
            <div className="glass-card-primary" style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h2 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Lock size={20} /> Encrypted Documents for {selectedRecipient.name}
                  </h2>
                  {!selectedRecipient.revoked ? (
                    <button
                      onClick={() => handleRevoke(selectedRecipient.id)}
                      className="btn-primary"
                      style={{ background: 'var(--neo-bg)', color: '#e53e3e', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                    >
                       Revoke Access
                    </button>
                  ) : (
                    <span style={{ color: '#e53e3e', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                       <AlertCircle size={16} /> Revoked
                    </span>
                  )}
              </div>
              {distributions.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>No documents distributed to this recipient yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {distributions.map(dist => (
                    <div key={dist.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '1rem 1.25rem', borderRadius: '12px',
                      background: 'var(--neo-bg)', boxShadow: 'var(--neo-outset-sm)',
                    }}>
                      <div>
                        <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <FileText size={16} /> {dist.filename}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                          Distributed: {new Date(dist.created_at).toLocaleString()}
                        </div>
                      </div>
                      <button
                        className="btn-primary"
                        onClick={() => handleDecrypt(dist.documentId)}
                        disabled={loading}
                        style={{ padding: '0.5em 1em', fontSize: '0.85rem' }}
                      >
                        <span>
                          {loading ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Unlock size={14} />}
                          {' '}Decrypt
                        </span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Decryption Result */}
        <div>
          <div className="glass-card-primary" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Unlock size={20} /> Decryption Result
            </h2>
            {!decryptResult ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                <Lock size={48} style={{ marginBottom: '1rem', opacity: 0.3 }} />
                <p>Select a recipient and decrypt a document to see results here.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '1rem', borderRadius: '12px',
                  background: 'var(--neo-bg)', boxShadow: 'var(--neo-inset)',
                  color: 'var(--success-green)',
                }}>
                  <CheckCircle size={24} />
                  <div>
                    <div style={{ fontWeight: 700 }}>Decryption Successful</div>
                    <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>
                      Watermarked PDF downloaded to your device.
                    </div>
                  </div>
                </div>

                {decryptResult.watermarkId && (
                  <InfoRow icon={<Hash size={16} />} label="Watermark ID" value={decryptResult.watermarkId} mono />
                )}
                {decryptResult.txHash && (
                  <InfoRow icon={<CheckCircle size={16} />} label="TX Hash" value={decryptResult.txHash} mono />
                )}

                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                  ✓ Invisible watermark embedded via PDF render mode 3<br />
                  ✓ ML-DSA signature committed to local blockchain<br />
                  ✓ Decryption event logged in database
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="glass-card-secondary" style={{
          position: 'fixed', bottom: '2rem', right: '2rem', padding: '1rem 1.5rem',
          zIndex: 1000, maxWidth: '400px',
          borderLeft: `4px solid ${toast.type === 'error' ? '#e53e3e' : '#38a169'}`,
          display: 'flex', alignItems: 'center', gap: '0.75rem',
        }}>
          {toast.type === 'error' ? <AlertCircle size={20} color="#e53e3e" /> : <CheckCircle size={20} color="#38a169" />}
          <span style={{ fontSize: '0.9rem' }}>{toast.message}</span>
        </div>
      )}
    </div>
  );
}

function InfoRow({ icon, label, value, mono }) {
  return (
    <div style={{
      padding: '0.75rem 1rem', borderRadius: '10px',
      background: 'var(--neo-bg)', boxShadow: 'var(--neo-outset-sm)',
    }}>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.25rem' }}>
        {icon} {label}
      </div>
      <div style={{
        fontSize: '0.85rem', fontWeight: 600,
        fontFamily: mono ? 'monospace' : 'inherit',
        wordBreak: 'break-all',
        color: 'var(--text-dark)',
      }}>
        {value}
      </div>
    </div>
  );
}
