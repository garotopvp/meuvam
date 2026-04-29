import React from 'react';
import { 
  RotateCw, 
  CheckCircle2, 
  Circle, 
  ChevronRight 
} from 'lucide-react';

const TrainingView = ({ workouts, onRefresh, isRefreshing }) => {
  return (
    <div className="animate-slide-up">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Planilha</h1>
        <button 
          onClick={onRefresh}
          style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer' }}
        >
          <RotateCw size={20} className={isRefreshing ? 'animate-spin' : ''} />
        </button>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {workouts.length === 0 ? (
          <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <p>Nenhum treino encontrado.</p>
          </div>
        ) : (
          workouts.map((workout) => (
            <div key={workout.id} className="card" style={{ 
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '1.25rem'
            }}>
              <div style={{ 
                width: '40px', 
                height: '40px', 
                borderRadius: '12px', 
                background: workout.status === 'completed' ? 'rgba(52, 199, 89, 0.1)' : 'var(--surface-accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {workout.status === 'completed' ? (
                  <CheckCircle2 size={20} color="var(--success)" />
                ) : (
                  <Circle size={20} color="var(--border-color)" />
                )}
              </div>
              
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{workout.date}</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary-color)' }}>{workout.metrics?.distance || '--'}</span>
                </div>
                <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>{workout.title}</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{workout.type}</p>
              </div>
              
              <ChevronRight size={18} color="var(--border-color)" />
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TrainingView;
