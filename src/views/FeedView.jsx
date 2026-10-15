import React from 'react';
import CommunityFeed from '../components/CommunityFeed';

const FeedView = ({ athlete }) => {
  return (
    <div className="animate-slide-up w-full">
      <header className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Comunidade</h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">Acompanhe os treinos e conquistas dos seus colegas</p>
      </header>

      <CommunityFeed currentUser={athlete} />
    </div>
  );
};

export default FeedView;
