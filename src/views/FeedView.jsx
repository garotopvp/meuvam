import React from 'react';
import CommunityFeed from '../components/CommunityFeed';

const FeedView = ({ athlete }) => {
  return (
    <div className="animate-slide-up">
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.5px' }}>Comunidade</h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Acompanhe os treinos dos seus colegas</p>
      </header>

      <CommunityFeed currentUser={athlete} />
    </div>
  );
};

export default FeedView;
