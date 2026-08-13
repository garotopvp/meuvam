import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  GripVertical, 
  Trash2, 
  Edit3, 
  ChevronLeft, 
  ChevronRight,
  CheckCircle2,
  Clock,
  Zap,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import WorkoutEditor from './WorkoutEditor';

const daysOfWeek = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

// Helper para obter string de data YYYY-MM-DD local correta, livre de timezone shift
const getLocalDateStr = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const SPORT_COLORS = { run: '#FF9500', bike: '#007AFF', swim: '#34C759', other: '#8E8E93' };
const SPORT_ICONS  = { run: '🏃', bike: '🚴', swim: '🏊', other: '💪' };

const WeeklyPlanner = ({ athleteId, athleteVam }) => {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [hoveredDayIdx, setHoveredDayIdx] = useState(null);

  // Editor state
  const [editorState, setEditorState] = useState(null); // { workout|null, date, dayIndex }

  useEffect(() => {
    if (athleteId) fetchWeekWorkouts();
  }, [athleteId, currentDate]);

  const fetchWeekWorkouts = async () => {
    setLoading(true);
    try {
      const startOfWeek = new Date(currentDate);
      const day = startOfWeek.getDay();
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
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

  const getDayDateStr = (dayIndex) => {
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff + dayIndex);
    return getLocalDateStr(startOfWeek);
  };

  const getDayDate = (dayIndex) => {
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff + dayIndex);
    return startOfWeek;
  };

  const getWorkoutsForDay = (dayIndex) => {
    const dayStr = getDayDateStr(dayIndex);
    return workouts.filter(w => w.date.split('T')[0] === dayStr);
  };

  const moveWorkout = async (workoutId, newDateStr) => {
    const originalWorkout = workouts.find(w => w.id === workoutId);
    if (originalWorkout && originalWorkout.date.split('T')[0] === newDateStr) return;

    const prevWorkouts = [...workouts];
    setWorkouts(current => current.map(w => w.id === workoutId ? { ...w, date: newDateStr } : w));

    try {
      const { error } = await supabase.from('workouts').update({ date: newDateStr }).eq('id', workoutId);
      if (error) throw error;
      fetchWeekWorkouts();
    } catch (err) {
      console.error('Erro ao mover treino:', err);
      setWorkouts(prevWorkouts);
    }
  };

  const createWorkoutFromTemplate = async (template, dateStr) => {
    try {
      const newWorkout = {
        athlete_id: athleteId,
        date: dateStr,
        title: template.title,
        type: template.type,
        description: template.description,
        status: 'pending',
        metrics: template.metrics || { distance: '--', duration: '--' },
        structured_steps: template.structured_steps || [],
      };

      const { data, error } = await supabase.from('workouts').insert([newWorkout]).select();
      if (error) throw error;

      // Open editor for the newly created workout so coach can edit it
      if (data && data.length > 0) {
        setEditorState({ workout: data[0], date: dateStr });
      }
      fetchWeekWorkouts();
    } catch (err) {
      console.error('Erro ao criar treino do modelo:', err);
    }
  };

  const handleDragOver = (e, idx) => {
    e.preventDefault();
    if (hoveredDayIdx !== idx) setHoveredDayIdx(idx);
  };

  const handleDragLeave = () => setHoveredDayIdx(null);

  const handleDrop = (e, dayIndex) => {
    setHoveredDayIdx(null);
    e.preventDefault();
    const newDateStr = getDayDateStr(dayIndex);

    const templateDataStr = e.dataTransfer.getData('workout-template');
    if (templateDataStr) {
      try {
        const template = JSON.parse(templateDataStr);
        createWorkoutFromTemplate(template, newDateStr);
      } catch (err) {
        console.error('Erro ao processar template drag data:', err);
      }
      return;
    }

    const workoutId = e.dataTransfer.getData('workoutId');
    if (workoutId) moveWorkout(workoutId, newDateStr);
  };

  const changeWeek = (offset) => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + (offset * 7));
    setCurrentDate(newDate);
  };

  const deleteWorkout = async (workoutId) => {
    if (!confirm('Deseja excluir este treino da planilha?')) return;
    try {
      const { error } = await supabase.from('workouts').delete().eq('id', workoutId);
      if (error) throw error;
      fetchWeekWorkouts();
    } catch (err) {
      console.error('Erro ao excluir treino:', err);
    }
  };

  const openNewWorkoutEditor = (dayIndex) => {
    const dateStr = getDayDateStr(dayIndex);
    setEditorState({ workout: null, date: dateStr });
  };

  const openEditWorkoutEditor = (workout) => {
    setEditorState({ workout, date: workout.date?.split('T')[0] });
  };

  const todayStr = getLocalDateStr(new Date());

  // Get week range label
  const getWeekLabel = () => {
    const start = getDayDate(0);
    const end = getDayDate(6);
    const fmt = (d) => d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
    return `${fmt(start)} – ${fmt(end)}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Planejamento Semanal</h2>
          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--surface-color)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '4px' }}>
            <button onClick={() => changeWeek(-1)} style={{ padding: '6px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-primary)' }}>
              <ChevronLeft size={18} />
            </button>
            <span style={{ padding: '0 12px', fontSize: '0.85rem', fontWeight: 700, minWidth: '130px', textAlign: 'center' }}>
              {getWeekLabel()}
            </span>
            <button onClick={() => changeWeek(1)} style={{ padding: '6px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-primary)' }}>
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <button
          onClick={() => changeWeek(0) || setCurrentDate(new Date())}
          style={{ padding: '8px 14px', border: '1px solid var(--border-color)', borderRadius: '10px', background: 'var(--surface-color)', color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
        >
          Hoje
        </button>
      </div>

      {/* Planner Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '12px', minHeight: '580px' }}>
        {daysOfWeek.map((dayName, idx) => {
          const dayWorkouts = getWorkoutsForDay(idx);
          const isHovered = hoveredDayIdx === idx;
          const dayStr = getDayDateStr(idx);
          const isToday = dayStr === todayStr;
          const dayDate = getDayDate(idx);

          return (
            <div
              key={dayName}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, idx)}
              style={{
                background: isHovered ? 'rgba(var(--primary-rgb,255,59,48),0.05)' : 'var(--surface-accent)20',
                borderRadius: '16px',
                border: isHovered
                  ? '2px dashed var(--primary-color)'
                  : isToday
                    ? '2px solid var(--primary-color)40'
                    : '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.2s ease',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Day header */}
              <div style={{
                padding: '10px 12px 8px',
                textAlign: 'center',
                background: isToday ? 'var(--primary-color)08' : 'var(--surface-color)',
                borderBottom: '1px solid var(--border-color)',
                borderRadius: '14px 14px 0 0',
              }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 800, color: isToday ? 'var(--primary-color)' : 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {dayName}
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: isToday ? 'var(--primary-color)' : 'var(--text-primary)', lineHeight: 1.2, marginTop: '2px' }}>
                  {dayDate.getDate()}
                </div>
              </div>

              {/* Workouts */}
              <div style={{ flex: 1, padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
                {dayWorkouts.map(workout => (
                  <WorkoutCard
                    key={workout.id}
                    workout={workout}
                    onEdit={() => openEditWorkoutEditor(workout)}
                    onDelete={() => deleteWorkout(workout.id)}
                  />
                ))}

                {/* Add button */}
                <button
                  onClick={() => openNewWorkoutEditor(idx)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '2px dashed var(--border-color)',
                    background: 'transparent',
                    borderRadius: '10px',
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    marginTop: 'auto',
                    fontSize: '0.75rem',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary-color)'; e.currentTarget.style.color = 'var(--primary-color)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Workout Editor Modal */}
      <AnimatePresence>
        {editorState && (
          <WorkoutEditor
            key="editor"
            workout={editorState.workout}
            athleteId={athleteId}
            date={editorState.date}
            athleteVam={athleteVam}
            onClose={() => setEditorState(null)}
            onSaved={fetchWeekWorkouts}
            onDeleted={fetchWeekWorkouts}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Workout Card ─────────────────────────────────────────────────────────────

const WorkoutCard = ({ workout, onEdit, onDelete }) => {
  const [hovered, setHovered] = useState(false);
  const color = SPORT_COLORS[workout.type] || '#8E8E93';
  const icon  = SPORT_ICONS[workout.type] || '💪';
  const isDone = workout.status === 'completed';

  return (
    <div
      draggable
      onDragStart={(e) => e.dataTransfer.setData('workoutId', workout.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '10px 10px 8px',
        background: 'var(--surface-color)',
        borderRadius: '10px',
        border: '1px solid var(--border-color)',
        borderLeft: `4px solid ${color}`,
        boxShadow: hovered ? '0 4px 12px rgba(0,0,0,0.08)' : '0 1px 4px rgba(0,0,0,0.03)',
        cursor: 'grab',
        position: 'relative',
        transition: 'box-shadow 0.15s',
        userSelect: 'none',
      }}
    >
      {/* Title row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '4px', marginBottom: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0, flex: 1 }}>
          <span style={{ fontSize: '0.75rem' }}>{icon}</span>
          <span style={{
            fontWeight: 700,
            fontSize: '0.78rem',
            color: 'var(--text-primary)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {workout.title}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '2px', flexShrink: 0, opacity: hovered ? 1 : 0, transition: 'opacity 0.15s' }}>
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            title="Editar"
            style={{ border: 'none', background: 'transparent', color: 'var(--primary-color)', cursor: 'pointer', padding: '2px' }}
          >
            <Edit3 size={11} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            title="Excluir"
            style={{ border: 'none', background: 'transparent', color: '#e85c3e', cursor: 'pointer', padding: '2px' }}
          >
            <Trash2 size={11} />
          </button>
          <GripVertical size={12} color="var(--text-secondary)" style={{ cursor: 'grab' }} />
        </div>
      </div>

      {/* Metrics */}
      <div style={{ display: 'flex', gap: '8px', fontSize: '0.68rem', color: 'var(--text-secondary)', fontWeight: 600, flexWrap: 'wrap' }}>
        {workout.metrics?.duration && workout.metrics.duration !== '--' && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            <Clock size={9} /> {workout.metrics.duration}
          </span>
        )}
        {workout.metrics?.distance && workout.metrics.distance !== '--' && (
          <span>📏 {workout.metrics.distance}</span>
        )}
      </div>

      {/* Status badge */}
      {isDone && (
        <div style={{
          marginTop: '6px',
          padding: '3px 6px',
          background: 'rgba(52,199,89,0.1)',
          color: 'var(--success)',
          borderRadius: '6px',
          fontSize: '0.6rem',
          fontWeight: 800,
          textAlign: 'center',
          letterSpacing: '0.5px',
        }}>
          ✓ CONCLUÍDO
        </div>
      )}
    </div>
  );
};

export default WeeklyPlanner;
