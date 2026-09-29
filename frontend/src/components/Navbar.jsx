import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from './ThemeContext';
import { Shield, Moon, Sun } from 'lucide-react';
import logowithname from '../assets/logowithname.png';
import sihheaderlogo from '../assets/sihheaderlogo.png';

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  const links = [
    { to: '/', label: 'Admin Dashboard' },
    { to: '/recipient', label: 'Recipient' },
    { to: '/ledger', label: 'Ledger' },
    { to: '/leak-check', label: 'Leak Check' },
  ];

  return (
    <div className="header-fixed-wrapper">
      <div className="header-container">
        <div className="header-left">
          <Link to="/" className="header-logo-link" style={{ marginRight: '2rem' }}>
            <img src={logowithname} alt="ProvenanceVault" className="header-logo-img" style={{ height: '40px', objectFit: 'contain', transform: 'scale(1.6)', transformOrigin: 'left center' }} />
          </Link>
          <nav className="header-nav">
            {links.map(link => (
              <Link
                key={link.to}
                to={link.to}
                style={{
                  padding: '0.4rem 1rem',
                  borderRadius: '999px',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                  color: location.pathname === link.to ? 'var(--primary-dark)' : 'var(--text-muted)',
                  background: location.pathname === link.to
                    ? 'var(--neo-bg)'
                    : 'transparent',
                  boxShadow: location.pathname === link.to
                    ? 'var(--neo-inset)'
                    : 'none',
                  transition: 'all 0.3s ease',
                }}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="header-right">
          <button
            onClick={toggleTheme}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-dark)',
              cursor: 'pointer',
              padding: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Toggle Theme"
          >
            {theme === 'light' ? <Moon size={22} /> : <Sun size={22} />}
          </button>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <img src={sihheaderlogo} alt="SIH Sponsors" style={{ height: '44px', objectFit: 'contain' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
