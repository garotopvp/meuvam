import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Calendar, MessageCircle, TrendingUp, User } from 'lucide-react';

const BottomNav = () => {
  const tabs = [
    { path: '/aluno', icon: Home, label: 'Início' },
    { path: '/aluno/treinos', icon: Calendar, label: 'Treino' },
    { path: '/aluno/coach', icon: MessageCircle, label: 'Coach' },
    { path: '/aluno/perfil', icon: User, label: 'Perfil' },
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
        return (
          <NavLink 
            key={tab.path} 
            to={tab.path}
            end={tab.path === '/aluno'}
            style={({ isActive }) => ({
              textDecoration: 'none',
              background: 'none', border: 'none', display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: '6px', color: isActive ? 'var(--primary-color)' : '#B0B0B0',
              transition: 'var(--transition-smooth)', flex: 1, padding: '0.5rem 0', position: 'relative',
            })}
          >
            {({ isActive }) => (
              <>
                <Icon size={22} style={{ strokeWidth: isActive ? 2.5 : 2 }} />
                <span style={{ fontSize: '0.6rem', fontWeight: isActive ? 700 : 500, letterSpacing: '0.2px' }}>{tab.label}</span>
                {isActive && <div style={{ position: 'absolute', top: 0, width: '12px', height: '2px', background: 'var(--primary-color)', borderRadius: '2px' }} />}
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
};

export default BottomNav;
