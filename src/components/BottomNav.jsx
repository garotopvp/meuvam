import React from 'react';
import { Home, Calendar, MessageCircle, Bell, User } from 'lucide-react';

const BottomNav = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'home', icon: Home, label: 'Início' },
    { id: 'training', icon: Calendar, label: 'Treino' },
    { id: 'chat', icon: MessageCircle, label: 'Coach' },
    { id: 'notifications', icon: Bell, label: 'Avisos' },
    { id: 'profile', icon: User, label: 'Perfil' },
  ];

  return (
    <nav className="glass" style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      height: 'calc(4.5rem + var(--safe-area-bottom))',
      display: 'flex', justifyContent: 'space-around', alignItems: 'center',
      paddingBottom: 'var(--safe-area-bottom)', zIndex: 1000,
      borderTop: '1px solid var(--border-color)',
    }}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            background: 'none', border: 'none', display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: '6px', color: isActive ? 'var(--accent-color)' : '#B0B0B0',
            transition: 'var(--transition-smooth)', flex: 1, padding: '0.5rem 0', position: 'relative',
          }}>
            <Icon size={22} style={{ strokeWidth: isActive ? 2.5 : 2 }} />
            <span style={{ fontSize: '0.6rem', fontWeight: isActive ? 700 : 500, letterSpacing: '0.2px' }}>{tab.label}</span>
            {isActive && <div style={{ position: 'absolute', top: 0, width: '12px', height: '2px', background: 'var(--accent-color)', borderRadius: '2px' }} />}
          </button>
        );
      })}
    </nav>
  );
};

export default BottomNav;
