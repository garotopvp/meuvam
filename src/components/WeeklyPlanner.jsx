import React, { useState, useEffect } from 'react';
import { motion, Reorder } from 'framer-motion';
import { 
  Plus, 
  GripVertical, 
  Trash2, 
  Edit3, 
  ChevronLeft, 
  ChevronRight,
  MoreHorizontal
} from 'lucide-react';
import { supabase } from '../lib/supabase';

const daysOfWeek = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

// Helper para obter string de data YYYY-MM-DD local correta, livre de timezone shift
const getLocalDateStr = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const WeeklyPlanner = ({ athleteId }) => {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    if (athleteId) fetchWeekWorkouts();
  }, [athleteId, currentDate]);

  const fetchWeekWorkouts = async () => {
    setLoading(true);
    try {
      // Obter segunda e domingo locais da semana atual
      const startOfWeek = new Date(currentDate);
      const day = startOfWeek.getDay();
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Segunda como início da semana
      startOfWeek.setDate(diff);
      const startOfWeekStr = getLocalDateStr(startOfWeek);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      const endOfWeekStr = getLocalDateStr(endOfWeek);

      const { data, error } = await supabase
        .from('workouts')
        .select('*')
        .eq('athlete_id', athleteId)
        .gte('date', startOfWeekStr)
        .lte('date', endOfWeekStr);

      if (error) throw error;
      setWorkouts(data || []);
    } catch (err) {
      console.error('Erro ao buscar treinos da semana:', err);
    } finally {
      setLoading(false);
    }
  };

  const getWorkoutsForDay = (dayIndex) => {
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff + dayIndex);
    const dayStr = getLocalDateStr(startOfWeek);
    
    return workouts.filter(w => w.date.split('T')[0] === dayStr);
  };

  const moveWorkout = async (workoutId, newDateStr) => {
    const originalWorkout = workouts.find(w => w.id === workoutId);
    if (originalWorkout && originalWorkout.date.split('T')[0] === newDateStr) {
      return; // Já está no dia correto, evita requisição desnecessária
    }

    const prevWorkouts = [...workouts];

    // Atualização otimista e imutável do estado do React
    setWorkouts(currentWorkouts => 
      currentWorkouts.map(w => 
        w.id === workoutId ? { ...w, date: newDateStr } : w
      )
    );

    try {
      const { error } = await supabase
        .from('workouts')
        .update({ date: newDateStr })
        .eq('id', workoutId);
      
      if (error) throw error;
      fetchWeekWorkouts(); // Recarrega os treinos para garantir integridade
    } catch (err) {
      console.error('Erro ao mover treino:', err);
      // Reverte para o estado anterior em caso de erro de conexão
      setWorkouts(prevWorkouts);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, dayIndex) => {
    const workoutId = e.dataTransfer.getData('workoutId');
    if (!workoutId) return;

    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff + dayIndex);
    const newDateStr = getLocalDateStr(startOfWeek);
    
    moveWorkout(workoutId, newDateStr);
  };

  const changeWeek = (offset) => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + (offset * 7));
    setCurrentDate(newDate);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Planejamento Semanal</h2>
          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--surface-color)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '4px' }}>
            <button onClick={() => changeWeek(-1)} style={{ padding: '6px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-primary)' }}><ChevronLeft size={20} /></button>
            <span style={{ padding: '0 12px', fontSize: '0.9rem', fontWeight: 700 }}>Semana {currentDate.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}</span>
            <button onClick={() => changeWeek(1)} style={{ padding: '6px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-primary)' }}><ChevronRight size={20} /></button>
          </div>
        </div>
        <button style={{ padding: '10px 20px', borderRadius: '12px', border: 'none', background: 'var(--primary-color)', color: 'white', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <Plus size={18} /> Novo Treino
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '16px', height: '600px' }}>
        {daysOfWeek.map((dayName, idx) => {
          const dayWorkouts = getWorkoutsForDay(idx);
          return (
            <div 
              key={dayName}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, idx)}
              style={{ 
                background: 'var(--surface-accent)30', 
                borderRadius: '16px', 
                border: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                minWidth: '140px'
              }}
            >
              <div style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid var(--border-color)', background: 'var(--surface-color)', borderRadius: '16px 16px 0 0' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{dayName}</span>
              </div>
              
              <div style={{ flex: 1, padding: '10px', display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>
                {dayWorkouts.map(workout => (
                  <div 
                    key={workout.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('workoutId', workout.id)}
                    style={{ 
                      padding: '12px', 
                      background: 'var(--surface-color)', 
                      borderRadius: '12px', 
                      border: '1px solid var(--border-color)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                      cursor: 'grab',
                      position: 'relative'
                    }}
                  >
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                      {workout.title}
                      <GripVertical size={14} color="var(--text-secondary)" />
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'flex', gap: '8px' }}>
                      <span>{workout.metrics?.distance || '--'}</span>
                    </div>
                    
                    {workout.status === 'completed' && (
                      <div style={{ marginTop: '8px', padding: '4px 8px', background: 'var(--success)15', color: 'var(--success)', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 800, textAlign: 'center' }}>
                        CONCLUÍDO
                      </div>
                    )}
                  </div>
                ))}
                
                <button style={{ 
                  width: '100%', 
                  padding: '12px', 
                  border: '2px dashed var(--border-color)', 
                  background: 'transparent', 
                  borderRadius: '12px',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  marginTop: 'auto'
                }}>
                  <Plus size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WeeklyPlanner;
