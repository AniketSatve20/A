import React, { useState, useEffect } from 'react';
import '../styles/DisputeHistory.css';

interface Dispute {
  dispute_id: number;
  project_id: number;
  milestone_id: number;
  status: string;
  ai_verdict: string;
  confidence_score: number;
  created_at: string;
}

export default function DisputeHistory() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDisputes();
    const interval = setInterval(fetchDisputes, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchDisputes = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/disputes?limit=20');
      const data = await response.json();
      setDisputes(data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch disputes:', error);
    }
  };

  if (loading) return <div className="loading">⏳ Loading disputes...</div>;

  return (
    <div className="dispute-history">
      <h2>Dispute History</h2>
      
      {disputes.length === 0 ? (
        <div className="empty-state">
          <p>No disputes yet</p>
        </div>
      ) : (
        <div className="disputes-table">
          <table>
            <thead>
              <tr>
                <th>Dispute ID</th>
                <th>Project ID</th>
                <th>Status</th>
                <th>AI Verdict</th>
                <th>Confidence</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {disputes.map(dispute => (
                <tr key={dispute.dispute_id}>
                  <td>#{dispute.dispute_id}</td>
                  <td>#{dispute.project_id}</td>
                  <td>
                    <span className={`status ${dispute.status.toLowerCase()}`}>
                      {dispute.status}
                    </span>
                  </td>
                  <td>{dispute.ai_verdict || 'Pending'}</td>
                  <td>{dispute.confidence_score ? `${(dispute.confidence_score * 100).toFixed(1)}%` : '-'}</td>
                  <td>{new Date(dispute.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
