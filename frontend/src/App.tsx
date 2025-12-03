import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import Dashboard from './components/Dashboard';
import DisputeHistory from './components/DisputeHistory';
import UserProfile from './components/UserProfile';
import './App.css';

interface User {
  address: string;
  reputation: number;
  isConnected: boolean;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'disputes' | 'profile'>('dashboard');

  useEffect(() => {
    connectWallet();
  }, []);

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        alert('Please install MetaMask');
        return;
      }

      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      setUser({
        address,
        reputation: 0,
        isConnected: true,
      });

      // Fetch user reputation
      fetchUserReputation(address);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  const fetchUserReputation = async (address: string) => {
    try {
      const response = await fetch(`http://localhost:3000/api/users/${address}/reputation`);
      const data = await response.json();
      setUser(prev => prev ? { ...prev, reputation: data.reputation_score || 0 } : null);
    } catch (error) {
      console.error('Failed to fetch reputation:', error);
    }
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <h1>🏗️ HumanWork Protocol</h1>
          <div className="wallet-info">
            {user?.isConnected ? (
              <div className="connected">
                <span className="address">{user.address.slice(0, 6)}...{user.address.slice(-4)}</span>
                <span className="reputation">⭐ {user.reputation}</span>
              </div>
            ) : (
              <button onClick={connectWallet} className="connect-btn">
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </header>

      <nav className="nav">
        <button
          className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          📊 Dashboard
        </button>
        <button
          className={`nav-btn ${activeTab === 'disputes' ? 'active' : ''}`}
          onClick={() => setActiveTab('disputes')}
        >
          ⚖️ Disputes
        </button>
        <button
          className={`nav-btn ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          👤 Profile
        </button>
      </nav>

      <main className="main">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'disputes' && <DisputeHistory />}
        {activeTab === 'profile' && user && <UserProfile user={user} />}
      </main>

      <footer className="footer">
        <p>© 2024 HumanWork Protocol - Decentralized Dispute Resolution</p>
      </footer>
    </div>
  );
}
