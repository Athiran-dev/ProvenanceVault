import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Recipient from './pages/Recipient';
import Ledger from './pages/Ledger';
import LeakCheck from './pages/LeakCheck';

function App() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', transition: 'background 0.3s ease' }}>
      <Navbar />
      <main className="container" style={{ flex: 1, paddingTop: '2rem', paddingBottom: '3rem' }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/recipient" element={<Recipient />} />
          <Route path="/ledger" element={<Ledger />} />
          <Route path="/leak-check" element={<LeakCheck />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
