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
      position: 'fixed', 
      bottom: '20px', 
      left: '20px', 
      right: '20px',
      height: '70px',
      display: 'flex', 
      justifyContent: 'space-around', 
      alignItems: 'center',
      zIndex: 1000,
      borderRadius: '24px',
      border: '1px solid rgba(0, 0, 0, 0.05)',
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.08)',
      padding: '0 10px'
    }}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const id = tab.label === 'Perfil' ? 'nav-perfil' : `nav-${tab.label.toLowerCase()}`;
        return (
          <NavLink 
            key={tab.path} 
            to={tab.path}
            id={id}
            end={tab.path === '/aluno'}
            style={({ isActive }) => ({
              textDecoration: 'none',
              background: 'none', 
              border: 'none', 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center', 
              gap: '4px', 
              color: isActive ? 'var(--primary-color)' : 'var(--text-secondary)',
              transition: 'var(--transition-smooth)', 
              flex: 1, 
              padding: '10px 0', 
              position: 'relative',
            })}
          >
            {({ isActive }) => (
              <>
                <div style={{
                  background: isActive ? 'rgba(255, 59, 48, 0.08)' : 'transparent',
                  padding: '8px 16px',
                  borderRadius: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'var(--transition-smooth)'
                }}>
                  <Icon size={22} style={{ strokeWidth: isActive ? 2.5 : 2 }} />
                  <span style={{ fontSize: '0.65rem', fontWeight: isActive ? 800 : 600, letterSpacing: '0.2px' }}>{tab.label}</span>
                </div>
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
};

export default BottomNav;
