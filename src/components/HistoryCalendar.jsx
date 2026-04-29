import React from 'react';
import { motion } from 'framer-motion';

const HistoryCalendar = ({ trainingHistory }) => {
  // Generate last 12 weeks of data (84 days)
  const today = new Date();
  const days = [];
  for (let i = 83; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const match = trainingHistory.find(t => t.date === dateStr);
    days.push({ date: d, hasTraining: !!match, type: match?.type || null });
  }

  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  const getColor = (day) => {
    if (!day.hasTraining) return 'var(--border-color)';
    switch (day.type) {
      case 'Intervalado': return '#007AFF';
      case 'Longo': return '#FF9500';
      case 'Rodagem': return '#34C759';
      default: return '#007AFF';
    }
  };

  const weekDays = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

  return (
    <div>
      <div style={{ display: 'flex', gap: '2px', marginBottom: '4px', paddingLeft: '0px' }}>
        {weekDays.map((d, i) => (
          <div key={i} style={{ width: '100%', textAlign: 'center', fontSize: '0.6rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: 'flex', gap: '2px' }}>
            {week.map((day, di) => (
              <motion.div
                key={di}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: (wi * 7 + di) * 0.005 }}
                style={{
                  width: '100%',
                  aspectRatio: '1',
                  borderRadius: '4px',
                  background: getColor(day),
                  opacity: day.hasTraining ? 1 : 0.3,
                }}
              />
            ))}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '12px', marginTop: '12px', justifyContent: 'center' }}>
        <Legend color="#34C759" label="Rodagem" />
        <Legend color="#007AFF" label="Intervalado" />
        <Legend color="#FF9500" label="Longo" />
      </div>
    </div>
  );
};

const Legend = ({ color, label }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
    <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: color }} />
    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{label}</span>
  </div>
);

export default HistoryCalendar;
