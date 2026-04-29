import React from 'react';
import { AlertTriangle, Calendar, ShieldCheck } from 'lucide-react';

const notifications = [
  {
    id: 1, icon: AlertTriangle, color: '#FF3B30',
    title: 'Tênis desgastado',
    text: 'Asics Novablast 4 está com 340/800 km. Considere trocar em breve.',
    time: 'Agora'
  },
  {
    id: 2, icon: Calendar, color: '#007AFF',
    title: 'Treino disponível',
    text: 'Seu treino de hoje já está na planilha: 10x 400m intervalado.',
    time: '2h atrás'
  },
  {
    id: 3, icon: ShieldCheck, color: '#FF9500',
    title: 'Certificado Médico',
    text: 'Seu atestado vence em 15 dias. Agende sua consulta.',
    time: 'Ontem'
  },
];

const NotificationsView = () => (
  <div className="animate-slide-up">
    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Notificações</h1>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {notifications.map((n) => {
        const Icon = n.icon;
        return (
          <div key={n.id} className="card" style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', padding: '1.25rem' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '12px',
              background: `${n.color}15`, display: 'flex', alignItems: 'center',
              justifyContent: 'center', flexShrink: 0
            }}>
              <Icon size={18} color={n.color} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700 }}>{n.title}</h4>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{n.time}</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{n.text}</p>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

export default NotificationsView;
