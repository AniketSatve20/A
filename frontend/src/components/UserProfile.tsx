import React, { useState, useEffect } from 'react';
import '../styles/UserProfile.css';

interface User {
  address: string;
  reputation: number;
  isConnected: boolean;
}

interface ProfileData {
  wallet_address: string;
  username: string | null;
  role: string;
  reputation_score: number;
  created_at: string;
}

interface Props {
  user: User;
}

export default function UserProfile({ user }: Props) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, [user.address]);

  const fetchProfile = async () => {
    try {
      const response = await fetch(`http://localhost:3000/api/users/${user.address}/reputation`);
      const data = await response.json();
      setProfile(data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    }
  };

  if (loading) return <div className="loading">⏳ Loading profile...</div>;

  return (
    <div className="user-profile">
      <h2>My Profile</h2>
      
      {profile && (
        <div className="profile-card">
          <div className="profile-header">
            <div className="avatar">👤</div>
            <div className="profile-info">
              <h3>{profile.username || 'Anonymous User'}</h3>
              <p className="address">{profile.wallet_address}</p>
              <p className="role">Role: {profile.role}</p>
            </div>
          </div>

          <div className="profile-stats">
            <div className="stat">
              <span className="label">Reputation Score</span>
              <span className="value">⭐ {profile.reputation_score}</span>
            </div>
            <div className="stat">
              <span className="label">Member Since</span>
              <span className="value">{new Date(profile.created_at).toLocaleDateString()}</span>
            </div>
          </div>

          <div className="profile-actions">
            <button className="btn btn-primary">Edit Profile</button>
            <button className="btn btn-secondary">View Activity</button>
          </div>
        </div>
      )}
    </div>
  );
}
