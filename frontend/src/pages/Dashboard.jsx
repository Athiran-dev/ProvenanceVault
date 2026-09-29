import React, { useState, useEffect } from 'react';
import { Upload, Users, FileText, Send, Plus, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { getRecipients, createRecipient, getDocuments, distributeDocument } from '../api';

export default function Dashboard() {
  const [recipients, setRecipients] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [newName, setNewName] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
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
    setTimeout(() => setToast(null), 5000);
  }

  async function handleAddRecipient(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setLoading(true);
    try {
      await createRecipient(newName.trim());
      setNewName('');
      await loadData();
      showToast('success', `Recipient "${newName.trim()}" onboarded successfully.`);
    } catch (err) {
      showToast('error', err.message);
    }
    setLoading(false);
  }

  function toggleRecipient(id) {
    setSelectedRecipients(prev =>
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  }

  async function handleDistribute(e) {
    e.preventDefault();
    if (!selectedFile || selectedRecipients.length === 0) {
      showToast('error', 'Select a PDF and at least one recipient.');
      return;
    }
    setLoading(true);
    try {
      const result = await distributeDocument(selectedFile, selectedRecipients);
      showToast('success', result.message);
      setSelectedFile(null);
      setSelectedRecipients([]);
      // Reset file input
      const fileInput = document.getElementById('file-upload');
      if (fileInput) fileInput.value = '';
      await loadData();
    } catch (err) {
      showToast('error', err.message);
    }
    setLoading(false);
  }

  return (
    <div>
      {/* Page Header */}
      <div className="dashboard-header-flex" style={{ padding: 0, marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', margin: 0 }}>Admin Dashboard</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            Upload documents, manage recipients, and distribute encrypted copies.
          </p>
        </div>
      </div>

      {/* Metrics */}
      <div className="dashboard-metrics-grid" style={{ marginBottom: '2rem' }}>
        <MetricCard icon={<Users size={24} />} label="Recipients" value={recipients.length} />
        <MetricCard icon={<FileText size={24} />} label="Documents" value={documents.length} />
      </div>

      <div className="dashboard-2col-layout">
        {/* Left: Distribute */}
        <div>
          <div className="glass-card-primary" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.3rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Send size={20} /> Distribute Document
            </h2>

            <form onSubmit={handleDistribute}>
              {/* File upload */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontWeight: 600, fontSize: '0.9rem', display: 'block', marginBottom: '0.5rem' }}>
                  Upload PDF
                </label>
                <div
                  style={{
                    border: '2px dashed var(--border-color)',
                    borderRadius: '12px',
                    padding: '2rem',
                    textAlign: 'center',
                    background: 'var(--neo-bg)',
                    boxShadow: 'var(--neo-inset)',
                    cursor: 'pointer',
                  }}
                  onClick={() => document.getElementById('file-upload').click()}
                >
                  <Upload size={32} color="var(--text-muted)" style={{ marginBottom: '0.5rem' }} />
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    {selectedFile ? selectedFile.name : 'Click to select a PDF file'}
                  </p>
                  <input
                    id="file-upload"
                    type="file"
                    accept=".pdf"
                    style={{ display: 'none' }}
                    onChange={e => setSelectedFile(e.target.files[0])}
                  />
                </div>
              </div>

              {/* Recipient selection */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontWeight: 600, fontSize: '0.9rem', display: 'block', marginBottom: '0.5rem' }}>
                  Select Recipients
                </label>
                {recipients.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    No recipients yet. Add one on the right →
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {recipients.map(r => (
                      <button
                        type="button"
                        key={r.id}
                        onClick={() => toggleRecipient(r.id)}
                        style={{
                          padding: '0.5rem 1rem',
                          borderRadius: '999px',
                          border: 'none',
                          fontWeight: 600,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          background: 'var(--neo-bg)',
                          color: selectedRecipients.includes(r.id)
                            ? 'var(--success-green)'
                            : 'var(--text-muted)',
                          boxShadow: selectedRecipients.includes(r.id)
                            ? 'var(--neo-inset)'
                            : 'var(--neo-outset-sm)',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        {selectedRecipients.includes(r.id) ? <CheckCircle size={14} style={{ marginRight: '0.25rem', verticalAlign: 'middle' }} /> : null}
                        {r.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button type="submit" className="btn-primary" disabled={loading}
                style={{ width: '100%', padding: '0.8em' }}>
                <span>
                  {loading ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} />}
                  {' '}Distribute Encrypted Document
                </span>
              </button>
            </form>
          </div>

          {/* Recent Documents */}
          <div className="glass-card-primary" style={{ padding: '2rem', marginTop: '1.5rem' }}>
            <h2 style={{ fontSize: '1.3rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={20} /> Recent Documents
            </h2>
            {documents.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No documents distributed yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {documents.map(doc => (
                  <div key={doc.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0.75rem 1rem', borderRadius: '12px',
                    background: 'var(--neo-bg)', boxShadow: 'var(--neo-outset-sm)',
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{doc.filename}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--mono, monospace)' }}>
                        {doc.original_hash.slice(0, 16)}…
                      </div>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {new Date(doc.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Onboard Recipient */}
        <div>
          <div className="glass-card-primary" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.3rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Plus size={20} /> Onboard Recipient
            </h2>
            <form onSubmit={handleAddRecipient}>
              <input
                type="text"
                placeholder="Recipient name (e.g. Lt. Cdr. Patel)"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '12px',
                  border: 'none',
                  fontSize: '0.95rem',
                  background: 'var(--neo-bg)',
                  boxShadow: 'var(--neo-inset)',
                  color: 'var(--text-dark)',
                  marginBottom: '1rem',
                  boxSizing: 'border-box',
                }}
              />
              <button type="submit" className="btn-primary" disabled={loading}
                style={{ width: '100%', padding: '0.8em' }}>
                <span><Plus size={16} /> Generate PQC Keys & Onboard</span>
              </button>
            </form>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '1rem' }}>
              Generates ML-KEM-768 + ML-DSA-65 key pairs. Public keys stored in DB, secret keys saved to local keystore.
            </p>
          </div>

          {/* Recipients list */}
          <div className="glass-card-primary" style={{ padding: '2rem', marginTop: '1.5rem' }}>
            <h2 style={{ fontSize: '1.3rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={20} /> Recipients ({recipients.length})
            </h2>
            {recipients.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No recipients onboarded yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {recipients.map(r => (
                  <div key={r.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0.6rem 1rem', borderRadius: '10px',
                    background: 'var(--neo-bg)', boxShadow: 'var(--neo-outset-sm)',
                  }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{r.name}</span>
                    <span style={{
                      background: 'var(--neo-bg)', boxShadow: 'var(--neo-inset)',
                      padding: '2px 10px', borderRadius: '999px', fontSize: '0.75rem',
                      fontWeight: 700, color: 'var(--success-green)'
                    }}>
                      ID: {r.id}
                    </span>
                  </div>
                ))}
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

function MetricCard({ icon, label, value }) {
  return (
    <div className="glass-card-primary" style={{
      padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem',
    }}>
      <div style={{
        width: '48px', height: '48px', borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: 'var(--neo-outset-sm)', color: 'var(--primary-blue)',
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary-dark)' }}>{value}</div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{label}</div>
      </div>
    </div>
  );
}
