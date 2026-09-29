import React, { useState, useEffect } from 'react';
import { BookOpen, Hash, User, FileText, Clock, ShieldCheck, ExternalLink } from 'lucide-react';
import { getLedgerEvents, getLedgerStats } from '../api';

export default function Ledger() {
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [e, s] = await Promise.all([getLedgerEvents(), getLedgerStats()]);
      setEvents(e);
      setStats(s);
    } catch (err) {
      console.error('Failed to load ledger data:', err);
    }
    setLoading(false);
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', margin: 0 }}>Decryption Ledger</h1>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
          Immutable log of every document decryption — synced to local Hardhat blockchain.
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="dashboard-metrics-grid" style={{ marginBottom: '2rem' }}>
          <div className="glass-card-primary" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--neo-outset-sm)', color: 'var(--primary-blue)' }}>
              <BookOpen size={24} />
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary-dark)' }}>{stats.dbRecords}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>DB Records</div>
            </div>
          </div>
          <div className="glass-card-primary" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--neo-outset-sm)', color: '#38a169' }}>
              <ShieldCheck size={24} />
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary-dark)' }}>{stats.onChainRecords}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>On-Chain Records</div>
            </div>
          </div>
        </div>
      )}

      {/* Events Table */}
      <div className="glass-card-primary" style={{ padding: '2rem' }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Clock size={20} /> Decryption Events
        </h2>

        {loading ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>Loading...</p>
        ) : events.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <BookOpen size={48} style={{ marginBottom: '1rem', opacity: 0.3 }} />
            <p>No decryption events recorded yet.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 0.5rem' }}>
              <thead>
                <tr style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <th style={{ textAlign: 'left', padding: '0.5rem 1rem', fontWeight: 600 }}>Recipient</th>
                  <th style={{ textAlign: 'left', padding: '0.5rem 1rem', fontWeight: 600 }}>Document</th>
                  <th style={{ textAlign: 'left', padding: '0.5rem 1rem', fontWeight: 600 }}>Watermark ID</th>
                  <th style={{ textAlign: 'left', padding: '0.5rem 1rem', fontWeight: 600 }}>TX Hash</th>
                  <th style={{ textAlign: 'left', padding: '0.5rem 1rem', fontWeight: 600 }}>Timestamp</th>
                  <th style={{ textAlign: 'center', padding: '0.5rem 1rem', fontWeight: 600 }}>Anomalies</th>
                  <th style={{ textAlign: 'center', padding: '0.5rem 1rem', fontWeight: 600 }}>Verified</th>
                </tr>
              </thead>
              <tbody>
                {events.map(ev => (
                  <tr key={ev.id} style={{
                    background: 'var(--neo-bg)',
                    boxShadow: 'var(--neo-outset-sm)',
                    borderRadius: '12px',
                  }}>
                    <td style={{ padding: '0.75rem 1rem', borderRadius: '12px 0 0 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <User size={14} color="var(--primary-blue)" />
                        <span style={{ fontWeight: 600 }}>{ev.recipient_name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FileText size={14} />
                        <span>{ev.filename}</span>
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <code style={{ fontSize: '0.75rem', background: 'var(--neo-bg)', boxShadow: 'var(--neo-inset)', padding: '2px 6px', borderRadius: '4px' }}>
                        {ev.watermark_id?.slice(0, 12)}…
                      </code>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <code style={{ fontSize: '0.75rem' }}>
                        {ev.tx_hash?.slice(0, 10)}…
                      </code>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {new Date(ev.created_at).toLocaleString()}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                      {(!ev.burst_flag && !ev.off_hours_flag) ? (
                         <span style={{ color: 'var(--text-muted)' }}>None</span>
                      ) : (
                         <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'center' }}>
                           {ev.burst_flag && <span style={{ background: '#fed7d7', color: '#822727', padding: '2px 8px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600 }}>Burst</span>}
                           {ev.off_hours_flag && <span style={{ background: '#fef08a', color: '#854d0e', padding: '2px 8px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600 }}>Off-Hours</span>}
                         </div>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center', borderRadius: '0 12px 12px 0' }}>
                      {ev.verified ? (
                        <span style={{
                          background: 'rgba(56, 161, 105, 0.1)', color: '#38a169',
                          padding: '4px 12px', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 700,
                        }}>
                          ✅ Verified
                        </span>
                      ) : (
                        <span style={{
                          background: 'rgba(229, 62, 62, 0.1)', color: '#e53e3e',
                          padding: '4px 12px', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 700,
                        }}>
                          ⚠️ Unverified
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
