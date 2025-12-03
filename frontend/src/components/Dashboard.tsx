import React, { useState, useEffect } from 'react';
import '../styles/Dashboard.css';

interface Stats {
  total_projects: number;
  total_value: number;
  completed: number;
  disputed: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/stats');
      const data = await response.json();
      setStats(data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  if (loading) return <div className="loading">⏳ Loading...</div>;

  return (
    <div className="dashboard">
      <h2>System Statistics</h2>
      
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <h3>Total Projects</h3>
            <p className="stat-value">{stats?.total_projects || 0}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <h3>Total Value</h3>
            <p className="stat-value">{stats?.total_value ? `$${(stats.total_value / 1e6).toFixed(2)}M` : '$0'}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <h3>Completed</h3>
            <p className="stat-value">{stats?.completed || 0}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⚖️</div>
          <div className="stat-content">
            <h3>Disputed</h3>
            <p className="stat-value">{stats?.disputed || 0}</p>
          </div>
        </div>
      </div>

      <div className="info-box">
        <h3>🤖 AI-Powered Dispute Resolution</h3>
        <p>Our platform uses advanced AI algorithms to analyze disputes and provide fair verdicts.</p>
        <ul>
          <li>✓ Automatic dispute detection</li>
          <li>✓ AI-powered analysis</li>
          <li>✓ Fair jury voting</li>
          <li>✓ Reputation-based scoring</li>
        </ul>
      </div>
    </div>
  );
}
