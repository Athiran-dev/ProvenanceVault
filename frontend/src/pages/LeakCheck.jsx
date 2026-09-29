import React, { useState } from 'react';
import { Upload, Search, ShieldCheck, ShieldAlert, User, FileText, Hash, Clock, AlertCircle, Loader } from 'lucide-react';
import { leakCheck } from '../api';

export default function LeakCheck() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function handleCheck(e) {
    e.preventDefault();
    if (!selectedFile) return;

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const data = await leakCheck(selectedFile);
      setResult(data);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', margin: 0 }}>Leak Check</h1>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
          Upload a suspected leaked PDF. The system extracts its watermark and traces it back to the responsible recipient.
        </p>
      </div>

      <div className="dashboard-2col-layout">
        {/* Left: Upload */}
        <div>
          <div className="glass-card-primary" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Search size={20} /> Upload Leaked PDF
            </h2>

            <form onSubmit={handleCheck}>
              <div
                style={{
                  border: '2px dashed var(--border-color)',
                  borderRadius: '12px',
                  padding: '3rem 2rem',
                  textAlign: 'center',
                  background: 'var(--neo-bg)',
                  boxShadow: 'var(--neo-inset)',
                  cursor: 'pointer',
                  marginBottom: '1.5rem',
                }}
                onClick={() => document.getElementById('leak-file').click()}
              >
                <Upload size={40} color="var(--text-muted)" style={{ marginBottom: '0.75rem' }} />
                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', fontWeight: 500 }}>
                  {selectedFile ? selectedFile.name : 'Click to select a PDF file'}
                </p>
                {selectedFile && (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                )}
                <input
                  id="leak-file"
                  type="file"
                  accept=".pdf"
                  style={{ display: 'none' }}
                  onChange={e => { setSelectedFile(e.target.files[0]); setResult(null); setError(null); }}
                />
              </div>

              <button type="submit" className="btn-primary" disabled={loading || !selectedFile}
                style={{ width: '100%', padding: '0.8em' }}>
                <span>
                  {loading ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Search size={16} />}
                  {' '}Analyze for Watermark
                </span>
              </button>
            </form>

            <div style={{ marginTop: '1.5rem', padding: '1rem', borderRadius: '12px', background: 'var(--neo-bg)', boxShadow: 'var(--neo-inset)', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <strong style={{ color: 'var(--text-dark)' }}>How it works:</strong>
              <ol style={{ paddingLeft: '1.2rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <li>Extract invisible watermark from PDF text layer</li>
                <li>Look up watermark ID in Postgres database</li>
                <li>Query on-chain DecryptionLedger record</li>
                <li>Verify ML-DSA signature off-chain</li>
                <li>Attribute the leak to the exact recipient</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Right: Result */}
        <div>
          <div className="glass-card-primary" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldCheck size={20} /> Attribution Result
            </h2>

            {error && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '1rem', borderRadius: '12px',
                background: 'var(--neo-bg)', boxShadow: 'var(--neo-inset)',
                borderLeft: '4px solid #e53e3e',
              }}>
                <AlertCircle size={20} color="#e53e3e" />
                <span style={{ color: '#e53e3e', fontWeight: 600 }}>{error}</span>
              </div>
            )}

            {!result && !error && (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                <Search size={48} style={{ marginBottom: '1rem', opacity: 0.3 }} />
                <p>Upload a PDF to check for watermarks.</p>
              </div>
            )}

            {result && !result.found && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '1.5rem', borderRadius: '12px',
                background: 'var(--neo-bg)', boxShadow: 'var(--neo-inset)',
                borderLeft: '4px solid #d69e2e',
              }}>
                <ShieldAlert size={24} color="#d69e2e" />
                <div>
                  <div style={{ fontWeight: 700, color: '#d69e2e' }}>No Watermark Found</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{result.message}</div>
                </div>
              </div>
            )}

            {result && result.found && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Verification badge */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '1.25rem', borderRadius: '12px',
                  background: 'var(--neo-bg)',
                  boxShadow: 'var(--neo-inset)',
                  borderLeft: `4px solid ${result.signatureVerified ? '#38a169' : '#e53e3e'}`,
                }}>
                  {result.signatureVerified ? (
                    <ShieldCheck size={28} color="#38a169" />
                  ) : (
                    <ShieldAlert size={28} color="#e53e3e" />
                  )}
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1.1rem', color: result.signatureVerified ? '#38a169' : '#e53e3e' }}>
                      {result.signatureVerified ? 'Cryptographically Verified ✅' : 'Signature Mismatch ⚠️'}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {result.message}
                    </div>
                  </div>
                </div>

                {/* Attributed Recipient */}
                <DetailCard
                  icon={<User size={18} color="var(--primary-blue)" />}
                  title="Attributed Recipient"
                >
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary-dark)' }}>
                    {result.recipient?.name}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Recipient ID: {result.recipient?.id}
                    <br/>ETH Address: {result.recipient?.eth_address}
                  </div>
                  {result.keyStatus && result.keyStatus !== 'unknown' && (
                     <div style={{
                       marginTop: '0.75rem',
                       display: 'inline-block',
                       padding: '0.25rem 0.75rem',
                       borderRadius: '999px',
                       fontSize: '0.75rem',
                       fontWeight: 600,
                       background: result.keyStatus === 'valid-at-time-of-decryption' ? '#c6f6d5' : '#fed7d7',
                       color: result.keyStatus === 'valid-at-time-of-decryption' ? '#22543d' : '#822727',
                     }}>
                       {result.keyStatus === 'valid-at-time-of-decryption' 
                          ? '✅ Key Valid at Decryption Time'
                          : '⚠️ Key was Revoked before Decryption'}
                     </div>
                  )}
                </DetailCard>

                {/* Document */}
                <DetailCard
                  icon={<FileText size={18} color="var(--primary-blue)" />}
                  title="Source Document"
                >
                  <div style={{ fontWeight: 600 }}>{result.document?.filename}</div>
                  <code style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                    hash: {result.document?.originalHash?.slice(0, 24)}…
                  </code>
                </DetailCard>

                {/* Watermark */}
                <DetailCard
                  icon={<Hash size={18} color="var(--primary-blue)" />}
                  title="Watermark ID"
                >
                  <code style={{ fontSize: '0.8rem', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                    {result.watermarkId}
                  </code>
                </DetailCard>

                {/* TX Hash */}
                {result.decryptionEvent?.txHash && (
                  <DetailCard
                    icon={<Clock size={18} color="var(--primary-blue)" />}
                    title="Blockchain TX"
                  >
                    <code style={{ fontSize: '0.8rem', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                      {result.decryptionEvent.txHash}
                    </code>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      Recorded on local Hardhat ledger
                    </div>
                  </DetailCard>
                )}

                {/* Download Report Button */}
                <button
                  onClick={() => window.location.href = `/leak-check/${result.watermarkId}/report`}
                  className="btn-primary"
                  style={{ marginTop: '1rem', width: '100%', padding: '0.8rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
                >
                  <FileText size={18} />
                  Download Forensic Report (PDF)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailCard({ icon, title, children }) {
  return (
    <div style={{
      padding: '1rem 1.25rem', borderRadius: '12px',
      background: 'var(--neo-bg)', boxShadow: 'var(--neo-outset-sm)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {icon} {title}
      </div>
      {children}
    </div>
  );
}
