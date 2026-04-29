import React from 'react';
import HistoryCalendar from '../components/HistoryCalendar';
import { trainingHistory } from '../data/mockData';

const StatsView = () => {
  return (
    <div className="animate-slide-up">
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '1.5rem' }}>Evolução</h1>
      
      <div className="card" style={{ marginBottom: '1.5rem', border: 'none', background: 'var(--surface-accent)' }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '1rem' }}>Últimas 12 Semanas</h3>
        <HistoryCalendar trainingHistory={trainingHistory} />
      </div>

      <div className="card" style={{ padding: '1.5rem' }}>
        <h3 style={{ marginBottom: '1.25rem', fontSize: '1.1rem', fontWeight: 700 }}>Resumo Mensal</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <StatRow label="Distância Total" value="168.4 km" />
          <StatRow label="Tempo em Movimento" value="14h 22min" />
          <StatRow label="Ganho de Elevação" value="1.240 m" />
          <StatRow label="Treinos Concluídos" value="18/20" />
        </div>
      </div>
    </div>
  );
};

const StatRow = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
    <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>{label}</span>
    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{value}</span>
  </div>
);

export default StatsView;
