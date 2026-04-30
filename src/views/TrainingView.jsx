import React, { useState } from 'react';
import { 
  RotateCw, 
  CheckCircle2, 
  Circle, 
  ChevronDown,
  ChevronUp,
  Activity,
  Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const TrainingView = ({ workouts, onRefresh, isRefreshing }) => {
  const [expandedId, setExpandedId] = useState(null);

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // Deduplicar treinos (mesmo dia e título) para limpar sujeira do banco
  const deduplicate = (list) => {
    const seen = new Set();
    return list.filter(w => {
      const key = `${w.date}-${w.title}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  // Agrupar treinos por semana
  const groupWorkoutsByWeek = (workoutsList) => {
    const groups = {};
    const uniqueWorkouts = deduplicate(workoutsList);
    
    // Ordenar por data decrescente
    const sorted = uniqueWorkouts.sort((a, b) => new Date(b.date) - new Date(a.date));

    sorted.forEach(w => {
      const date = new Date(w.date);
      // Calcular o início da semana (Segunda)
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(date.setDate(diff));
      monday.setHours(0, 0, 0, 0);
      
      const weekKey = monday.toISOString().split('T')[0];
      if (!groups[weekKey]) groups[weekKey] = [];
      groups[weekKey].push(w);
    });

    return Object.entries(groups).sort((a, b) => new Date(b[0]) - new Date(a[0]));
  };

  const groupedWorkouts = groupWorkoutsByWeek(workouts);

  return (
    <div className="animate-slide-up">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Minha Planilha</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Visualize seus treinos por semana</p>
        </div>
        <button 
          onClick={() => onRefresh(true)}
          disabled={isRefreshing}
          style={{ background: 'var(--surface-accent)', color: 'var(--primary-color)', border: '1px solid var(--border-color)', padding: '8px 12px', borderRadius: '12px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <RotateCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
          Sincronizar
        </button>
      </div>

      {workouts.length === 0 ? (
        <div className="card" style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <Calendar size={48} color="var(--border-color)" style={{ marginBottom: '1rem', opacity: 0.5 }} />
          <p>Nenhum treino encontrado.</p>
        </div>
      ) : (
        groupedWorkouts.map(([weekKey, weekWorkouts]) => {
          const monday = new Date(weekKey);
          const sunday = new Date(monday);
          sunday.setDate(monday.getDate() + 6);
          
          const isCurrentWeek = new Date() >= monday && new Date() <= sunday;

          return (
            <div key={weekKey} style={{ marginBottom: '2.5rem' }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '1rem',
                padding: '0 4px'
              }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: isCurrentWeek ? 'var(--primary-color)' : 'var(--text-primary)' }}>
                  {isCurrentWeek ? 'ESTA SEMANA' : `SEMANA DE ${monday.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}`}
                </h3>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', background: 'var(--surface-accent)', padding: '4px 10px', borderRadius: '20px' }}>
                  {weekWorkouts.length} treinos
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {weekWorkouts.map((workout) => (
                  <div 
                    key={workout.id} 
                    className="card" 
                    onClick={() => toggleExpand(workout.id)}
                    style={{ 
                      padding: '1.25rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      border: expandedId === workout.id ? '1px solid var(--primary-color)' : '1px solid var(--border-color)',
                      background: expandedId === workout.id ? 'var(--surface-color)' : 'var(--surface-color)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ 
                        width: '44px', 
                        height: '44px', 
                        borderRadius: '14px', 
                        background: workout.status === 'completed' ? 'rgba(52, 199, 89, 0.1)' : 'var(--surface-accent)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        {workout.status === 'completed' ? (
                          <CheckCircle2 size={22} color="var(--success)" />
                        ) : (
                          <Circle size={22} color="var(--border-color)" />
                        )}
                      </div>
                      
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                            {new Date(workout.date).toLocaleDateString('pt-BR', { weekday: 'long' })}
                            <span style={{ fontWeight: 400, marginLeft: '5px' }}>
                              ({new Date(workout.date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })})
                            </span>
                          </span>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary-color)' }}>{workout.metrics?.distance || '--'}</span>
                        </div>
                        <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{workout.title}</h4>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{workout.type}</p>
                      </div>
                      
                      {expandedId === workout.id ? <ChevronUp size={20} color="var(--text-secondary)" /> : <ChevronDown size={20} color="var(--text-secondary)" />}
                    </div>

                    <AnimatePresence>
                      {expandedId === workout.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          style={{ overflow: 'hidden' }}
                        >
                          <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)' }}>
                            <div style={{ 
                              background: 'var(--surface-accent)', 
                              padding: '1rem', 
                              borderRadius: '12px', 
                              fontSize: '0.9rem', 
                              color: 'var(--text-primary)', 
                              whiteSpace: 'pre-line', 
                              lineHeight: '1.6', 
                              marginBottom: '1.25rem',
                              borderLeft: '3px solid var(--primary-color)'
                            }}>
                              {workout.description}
                            </div>
                            
                            <div style={{ display: 'flex', gap: '12px' }}>
                              <button 
                                className="btn-primary"
                                style={{ flex: 1, padding: '12px', fontSize: '0.85rem' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  alert('Treino iniciado!');
                                }}
                              >
                                Iniciar Treino
                              </button>
                              <button 
                                style={{
                                  background: 'var(--surface-accent)', 
                                  color: 'var(--text-primary)', 
                                  border: '1px solid var(--border-color)', 
                                  padding: '12px 16px', 
                                  borderRadius: '12px', 
                                  fontSize: '0.85rem', 
                                  fontWeight: 700, 
                                  cursor: 'pointer'
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  alert('Funcionalidade Garmin em breve!');
                                }}
                              >
                                <Activity size={18} />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default TrainingView;
