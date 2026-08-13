import React, { useState, useMemo, useEffect } from 'react';
import { 
  RotateCw, 
  CheckCircle2, 
  Circle, 
  Activity,
  Calendar,
  X,
  Clock,
  Zap,
  MapPin,
  ChevronRight,
  Flame,
  Play,
  Timer,
  Moon,
  Leaf,
  RefreshCw,
  PersonStanding,
  Watch,
  Send,
  LogIn,
  LogOut,
  CheckCheck,
  AlertCircle,
  Loader2,
  ExternalLink,
  Link2,
  Check,
  Map as MapIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useGarminSync } from '../hooks/useGarminSync.js';
import ActivityMap from '../components/ActivityMap';
import { createPortal } from 'react-dom';

const safeFormatLocalDate = (dateStr, options = { weekday: 'long', day: 'numeric', month: 'long' }) => {
  if (!dateStr) return '';
  try {
    const cleanStr = String(dateStr).split('T')[0];
    const parts = cleanStr.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      const dateObj = new Date(y, m, d);
      return dateObj.toLocaleDateString('pt-BR', options);
    }
    const dateObj = new Date(dateStr);
    if (isNaN(dateObj.getTime())) return dateStr;
    return dateObj.toLocaleDateString('pt-BR', options);
  } catch (e) {
    console.error('safeFormatLocalDate error:', e);
    return dateStr;
  }
};

const StructuredWorkoutView = ({ steps, athlete }) => {
  if (!steps || !Array.isArray(steps)) return null;

  const typeIcons = { 
    warmup: <Flame size={14} />, 
    run: <Play size={14} />, 
    walk: <PersonStanding size={14} />, 
    recovery: <Timer size={14} />, 
    rest: <Moon size={14} />, 
    cooldown: <Leaf size={14} />,
    other: <Activity size={14} />
  };
  const typeColors = { 
    warmup: '#c2272d', // Darker Premium Crimson Red
    run: '#0d55c8', // Darker Premium Sapphire Blue
    walk: '#0d8ca3', // Darker Premium Teal/Walk
    recovery: '#1b7a3a', // Darker Premium Forest Green
    rest: '#52525b', // Darker Premium Slate Gray
    cooldown: '#1b7a3a', // Darker Premium Forest Green
    other: '#6b7280'
  };
  const typeLabels = { 
    warmup: 'Aquecimento', 
    run: 'Corrida', 
    walk: 'Caminhada', 
    recovery: 'Recuperação', 
    rest: 'Descanso', 
    cooldown: 'Desaquecimento',
    other: 'Outros'
  };

  const calculatePace = (pct) => {
    if (!pct || !athlete?.vam) return null;
    const vamSeconds = paceToSeconds(athlete.vam);
    if (!vamSeconds) return null;
    const targetSeconds = vamSeconds / (pct / 100);
    return secondsToPace(targetSeconds);
  };

  const renderStep = (step, isNested = false) => {
    if (!step) return null;
    if (step.type === 'repetition') {
      return (
        <div key={step.id} style={{ 
          marginBottom: '1rem', 
          background: 'var(--surface-accent)', 
          borderRadius: '20px', 
          padding: '1.25rem', 
          border: '1px dashed var(--border-color)',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.01)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.85rem', color: 'var(--text-secondary)' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--primary-color)' }}>Repetir {step.count}x</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '12px', borderLeft: '2px solid var(--border-color)' }}>
            {(step.steps || []).map(s => renderStep(s, true))}
          </div>
        </div>
      );
    }

    const targetPace = calculatePace(step.intensity?.value);
    const duration = step.duration 
      ? (step.duration.type === 'lap_button' ? 'Até Lap' : `${step.duration.value || ''}${step.duration.type === 'time' ? 'min' : 'km'}`)
      : '';

    return (
      <div key={step.id} style={{ 
        display: 'flex', 
        gap: '12px', 
        padding: '14px 16px', 
        background: 'var(--surface-color)', 
        borderRadius: '16px', 
        boxShadow: isNested ? 'none' : '0 2px 8px rgba(0,0,0,0.02)',
        border: '1px solid var(--border-color)',
        borderLeft: `5px solid ${typeColors[step.type] || '#cbd5e1'}`,
        marginBottom: isNested ? '0' : '6px',
        alignItems: 'center'
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>{step.label || typeLabels[step.type]}</span>
            <span style={{ fontWeight: 800, fontSize: '0.92rem', color: typeColors[step.type] }}>{duration}</span>
          </div>
          {targetPace && (
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '4px' }}>
              Pace Alvo: <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{targetPace}/km</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ marginBottom: '2rem' }}>
      <h3 style={{ fontSize: '0.78rem', fontWeight: 800, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>
        Etapas do Treino
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {steps.map(s => renderStep(s))}
      </div>
    </div>
  );
};

// ─── Garmin Push Button (inside modal) ─────────────────────────────────────
const GarminPushButton = ({ workout, onPush, garminStatus }) => {
  const [pushing, setPushing] = useState(false);
  const [result, setResult] = useState(null);

  const handlePush = async () => {
    setPushing(true);
    setResult(null);
    const r = await onPush(workout);
    setResult(r);
    setPushing(false);
  };

  if (!garminStatus?.connected) {
    return (
      <div style={{
        background: 'var(--surface-accent)',
        padding: '1rem 1.25rem',
        borderRadius: '20px',
        border: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
      }}>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500, lineHeight: 1.4 }}>
          Conecte seu Garmin Connect na aba de treinos para enviar este treino diretamente ao seu relógio.
        </p>
      </div>
    );
  }

  return (
    <div style={{
      background: 'var(--surface-accent)',
      padding: '1.25rem',
      borderRadius: '24px',
      border: '1px solid var(--border-color)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handlePush}
          disabled={pushing}
          style={{
            background: 'var(--primary-color)',
            color: '#fff',
            border: 'none',
            borderRadius: '16px',
            padding: '12px 18px',
            fontSize: '0.85rem',
            fontWeight: 800,
            cursor: pushing ? 'not-allowed' : 'pointer',
            opacity: pushing ? 0.7 : 1,
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(255, 59, 48, 0.2)'
          }}
        >
          {pushing ? (
            <>
              <Loader2 className="animate-spin" size={16} />
              Enviando...
            </>
          ) : (
            <>
              <Watch size={16} />
              Enviar para o Garmin
            </>
          )}
        </motion.button>
      </div>
      {result && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            marginTop: '12px',
            padding: '10px 14px',
            borderRadius: '16px',
            background: result.success ? 'rgba(52, 199, 89, 0.08)' : 'rgba(255, 59, 48, 0.08)',
            color: result.success ? 'var(--success)' : 'var(--error)',
            fontSize: '0.8rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            border: `1px solid ${result.success ? 'rgba(52, 199, 89, 0.15)' : 'rgba(255, 59, 48, 0.15)'}`
          }}
        >
          {result.success ? <CheckCheck size={14} /> : <AlertCircle size={14} />}
          {result.message || result.error}
        </motion.div>
      )}
    </div>
  );
};

const translateDescription = (desc) => {
  if (!desc) return '';
  const str = typeof desc === 'string' ? desc : String(desc);
  return str
    .replace(/\brun\b/gi, 'Corrida')
    .replace(/\bwarmup\b/gi, 'Aquecimento')
    .replace(/\bwalk\b/gi, 'Caminhada')
    .replace(/\brecovery\b/gi, 'Recuperação')
    .replace(/\brest\b/gi, 'Descanso')
    .replace(/\bcooldown\b/gi, 'Desaquec.')
    .replace(/\bother\b/gi, 'Outros');
};

const WorkoutModal = ({ workout, athlete, onClose, onPushToGarmin, garminStatus, isProfessor, onShowStrava, onLinkClick }) => {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  if (!workout) return null;

  const athleteName = athlete?.name || 'Atleta';
  const vamPace = athlete?.vam || '--';

  return createPortal(
    <motion.div 
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 260 }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'var(--bg-color)',
        color: 'var(--text-primary)',
        zIndex: 10000,
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        display: 'block'
      }}
    >
      <div 
        style={{
          width: '100%',
          maxWidth: '500px',
          margin: '0 auto',
          padding: '1.5rem',
          paddingTop: 'calc(1rem + var(--safe-area-top))',
          paddingBottom: 'calc(5rem + var(--safe-area-bottom))',
          position: 'relative',
          minHeight: '100%'
        }}
      >
        {/* Top Navigation */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'flex-start', 
          alignItems: 'center', 
          marginBottom: '1.5rem'
        }}>
          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            style={{ 
              background: 'var(--surface-color)', 
              border: '1px solid var(--border-color)', 
              borderRadius: '50%', 
              width: '36px', 
              height: '36px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              cursor: 'pointer', 
              color: 'var(--text-primary)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
            }}
          >
            <X size={16} />
          </motion.button>
        </div>

        {/* Hero Section */}
        <div style={{ marginBottom: '1.5rem', flexShrink: 0 }}>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, letterSpacing: '-0.8px', lineHeight: 1.15, marginBottom: '0.35rem', color: 'var(--text-primary)' }}>
            {workout.title}
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            {safeFormatLocalDate(workout.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Quick Metrics (iOS style) */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '12px', 
          marginBottom: '1.5rem',
          flexShrink: 0
        }}>
          <div style={{ 
            background: 'var(--surface-accent)', 
            padding: '1rem 1.25rem', 
            borderRadius: '20px', 
            border: '1px solid var(--border-color)',
          }}>
            <span style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Distância
            </span>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {workout.metrics?.distance || '--'}
            </div>
          </div>
          <div style={{ 
            background: 'var(--surface-accent)', 
            padding: '1rem 1.25rem', 
            borderRadius: '20px', 
            border: '1px solid var(--border-color)',
          }}>
            <span style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Duração
            </span>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {(!workout.metrics?.duration || workout.metrics.duration === '--')
                ? estimateWorkoutDuration(workout, athlete)
                : workout.metrics.duration}
            </div>
          </div>
        </div>

        {/* Content Flow */}
        <div style={{ width: '100%' }}>
          {/* Structured Steps or Dynamic Chart */}
          {((workout.structured_steps && workout.structured_steps.length > 0) || (workout.metrics?.structured_steps && workout.metrics.structured_steps.length > 0)) ? (
            <StructuredWorkoutView steps={workout.structured_steps || workout.metrics.structured_steps} athlete={athlete} />
          ) : (
            <IntensityChart 
              description={workout.description || ''} 
              vamPace={athlete?.vam || '--'} 
            />
          )}

          {/* Workout Prescription */}
          <div style={{ marginBottom: '1.75rem' }}>
            <h3 style={{ fontSize: '0.78rem', fontWeight: 800, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>
              Prescrição do Treino
            </h3>
            <div style={{ 
              background: 'var(--surface-accent)', 
              padding: '1.25rem 1.5rem', 
              borderRadius: '20px', 
              fontSize: '0.95rem', 
              lineHeight: '1.6', 
              color: 'var(--text-primary)',
              whiteSpace: 'pre-line',
              border: '1px solid var(--border-color)',
            }}>
              {translateDescription(workout.description) || 'Sem descrição detalhada para este treino.'}
            </div>
          </div>

          {/* External Integration — Strava (Professor Only) */}
          {isProfessor && (
            <div style={{ 
              background: 'var(--surface-accent)', 
              padding: '1.25rem', 
              borderRadius: '24px', 
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '1rem'
            }}>
              <div style={{ 
                background: '#FC5200', 
                width: '36px',
                height: '36px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0 
              }}>
                <Activity size={18} color="#fff" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '0.85rem', fontWeight: 800, color: '#FC5200', margin: 0 }}>Integração Strava</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500, margin: '2px 0 0 0', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {athlete?.integrations?.strava?.connected 
                    ? `Conectado como ${athlete.integrations.strava.username || 'Atleta'}`
                    : 'Não conectado.'}
                </p>
              </div>
              {athlete?.integrations?.strava?.connected && (
                <motion.button 
                  whileTap={{ scale: 0.96 }}
                  onClick={onShowStrava}
                  style={{
                    background: '#FC5200',
                    color: '#fff',
                    border: 'none',
                    padding: '8px 12px',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    flexShrink: 0
                  }}
                >
                  <ExternalLink size={12} /> Atividades
                </motion.button>
              )}
            </div>
          )}

          {/* Strava Integration for Athlete */}
          {!isProfessor && athlete?.integrations?.strava?.connected && (
            <div style={{ 
              background: 'var(--surface-accent)', 
              padding: '1.25rem', 
              borderRadius: '24px', 
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '1rem'
            }}>
              <div style={{ 
                background: '#FC5200', 
                width: '36px',
                height: '36px',
                borderRadius: '12px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                flexShrink: 0 
              }}>
                <Activity size={18} color="#fff" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '0.85rem', fontWeight: 800, color: '#FC5200', margin: 0 }}>Vincular Strava</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500, margin: '2px 0 0 0' }}>
                  {workout.status === 'completed' 
                    ? 'Treino concluído!' 
                    : 'Vincule uma corrida sincronizada.'}
                </p>
              </div>
              {workout.status !== 'completed' && (
                <motion.button 
                  whileTap={{ scale: 0.96 }}
                  onClick={onLinkClick}
                  style={{
                    background: '#FC5200',
                    color: '#fff',
                    border: 'none',
                    padding: '8px 14px',
                    borderRadius: '12px',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: '0 4px 10px rgba(252, 82, 0, 0.15)',
                    flexShrink: 0
                  }}
                >
                  <Link2 size={12} /> Vincular
                </motion.button>
              )}
            </div>
          )}

          {/* Garmin Send Button */}
          {onPushToGarmin && athlete?.integrations?.garmin?.connected && (
            <GarminPushButton workout={workout} onPush={onPushToGarmin} garminStatus={garminStatus} />
          )}
        </div>
      </div>
    </motion.div>,
    document.body
  );
};

const paceToSeconds = (paceStr) => {
  if (!paceStr || paceStr === '--') return null;
  const str = String(paceStr);
  if (!str.includes(':')) return null;
  const [min, sec] = str.split(':').map(Number);
  if (isNaN(min) || isNaN(sec)) return null;
  return min * 60 + sec;
};

const secondsToPace = (seconds) => {
  if (!seconds) return '--';
  const min = Math.floor(seconds / 60);
  const sec = Math.round(seconds % 60);
  return `${min}:${sec.toString().padStart(2, '0')}`;
};

const estimateWorkoutDuration = (workout, athlete) => {
  if (workout.status === 'completed' && workout.metrics?.duration && workout.metrics.duration !== '--') {
    return workout.metrics.duration;
  }

  const steps = workout.structured_steps || workout.metrics?.structured_steps;
  if (!steps || !Array.isArray(steps) || steps.length === 0) {
    return '--';
  }

  const athleteVamSeconds = paceToSeconds(athlete?.vam);

  const estimateStepDuration = (step) => {
    if (!step) return 0;

    if (step.type === 'repetition') {
      const nestedSteps = step.steps || [];
      const count = step.count || 1;
      const nestedSum = nestedSteps.reduce((sum, s) => sum + estimateStepDuration(s), 0);
      return nestedSum * count;
    }

    const duration = step.duration;
    if (!duration) return 0;

    if (duration.type === 'time') {
      return parseFloat(duration.value || 0) * 60;
    }

    if (duration.type === 'distance') {
      const distKm = parseFloat(duration.value || 0);
      if (distKm <= 0) return 0;

      const intensityPct = step.intensity?.value;
      if (athleteVamSeconds && intensityPct) {
        const targetPaceSeconds = athleteVamSeconds / (intensityPct / 100);
        return distKm * targetPaceSeconds;
      }

      const baselinePaceSeconds = athleteVamSeconds || 360;
      return distKm * baselinePaceSeconds;
    }

    if (duration.type === 'lap_button') {
      return 300; // default 5 min
    }

    return 0;
  };

  const totalSeconds = steps.reduce((sum, s) => sum + estimateStepDuration(s), 0);
  if (totalSeconds <= 0) return '--';

  const totalMinutes = Math.round(totalSeconds / 60);
  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  } else {
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return mins > 0 ? `${hours}h ${String(mins).padStart(2, '0')}min` : `${hours}h`;
  }
};

const IntensityChart = ({ description, vamPace }) => {
  const vamSeconds = paceToSeconds(vamPace);
  if (!vamSeconds) return null;

  const regex = /(\d+)\s*%\s*(?:da\s+)?VAM/gi;
  const matches = [];
  let match;
  regex.lastIndex = 0;
  try {
    while ((match = regex.exec(description)) !== null) {
      matches.push(match);
    }
  } catch (err) {
    console.error("Erro seguro no regex do gráfico de intensidade:", err);
  }

  if (matches.length === 0) return null;

  const data = matches.map((match, idx) => {
    const percentage = parseInt(match[1]);
    const targetSeconds = vamSeconds / (percentage / 100);
    
    const startIdx = Math.max(0, match.index - 100);
    const context = description.substring(startIdx, match.index).split('\n').pop().trim();
    const label = context.replace(/[:\-]/g, '') || `Trecho ${idx + 1}`;

    return { label, percentage, pace: secondsToPace(targetSeconds) };
  });

  return (
    <div style={{ marginBottom: '1.75rem' }}>
      <h3 style={{ fontSize: '0.78rem', fontWeight: 800, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>
        Intensidades Calculadas (VAM: {vamPace})
      </h3>
      
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '12px',
        background: 'var(--surface-accent)',
        padding: '1.25rem 1.5rem',
        borderRadius: '20px',
        border: '1px solid var(--border-color)'
      }}>
        {data.map((item, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{item.label}</span>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--primary-color)' }}>{item.pace} min/km</span>
                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', marginLeft: '6px' }}>({item.percentage}%)</span>
              </div>
            </div>
            <div style={{ width: '100%', height: '6px', background: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(item.percentage, 100)}%` }}
                transition={{ delay: 0.2 + i * 0.1, duration: 0.8 }}
                style={{ 
                  height: '100%', 
                  background: item.percentage > 90 ? '#c2272d' : item.percentage > 75 ? '#c26a03' : '#1b7a3a',
                  borderRadius: '3px'
                }} 
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Garmin Sync Panel ────────────────────────────────────────────────────────
const GarminSyncPanel = ({ workouts, userId, garminSync, athlete }) => {
  const { garminStatus, isLoading, lastResult, garminLogin, garminLogout, checkStatus, syncPlan } = garminSync;
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (userId) checkStatus(userId);
  }, [userId, athlete?.integrations?.garmin?.connected]);

  const handleLogin = async (e) => {
    e.preventDefault();
    await garminLogin(email, password, userId);
    setShowLogin(false);
    setPassword('');
  };

  const handleSyncWeek = async () => {
    const weekWorkouts = workouts.filter(w => w.date);
    if (weekWorkouts.length === 0) return;
    const result = await syncPlan(userId, weekWorkouts);
    if (result?.errors?.length > 0) {
      console.warn('[GarminSync] Errors:', result.errors);
      alert(`Falha no Garmin:\n\n${result.errors[0].error}`);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: 'var(--surface-color)',
        border: '1px solid var(--border-color)',
        borderRadius: '24px',
        padding: '1.25rem 1.5rem',
        marginBottom: '1.5rem',
        boxShadow: '0 4px 16px rgba(0,0,0,0.02)'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '38px', height: '38px', borderRadius: '12px',
            background: garminStatus.connected ? 'rgba(52, 199, 89, 0.1)' : 'var(--surface-accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0
          }}>
            <Watch size={18} color={garminStatus.connected ? 'var(--success)' : 'var(--text-secondary)'} />
          </div>
          <div>
            <p style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Garmin Connect</p>
            <p style={{ fontSize: '0.72rem', color: garminStatus.connected ? 'var(--success)' : 'var(--text-secondary)', fontWeight: 600, margin: '2px 0 0 0' }}>
              {garminStatus.connected ? `● Conectado — ${garminStatus.user?.displayName}` : '● Desconectado'}
            </p>
          </div>
        </div>

        {garminStatus.connected ? (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={handleSyncWeek}
              disabled={isLoading}
              style={{
                background: 'var(--primary-color)', color: '#fff', border: 'none',
                borderRadius: '12px', padding: '8px 14px', fontSize: '0.75rem', fontWeight: 800,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px',
                opacity: isLoading ? 0.7 : 1,
                boxShadow: '0 4px 10px rgba(255, 59, 48, 0.15)'
              }}
            >
              {isLoading
                ? <Loader2 size={12} className="animate-spin" />
                : <Send size={12} />}
              {isLoading ? 'Enviando...' : 'Sincronizar Semana'}
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => garminLogout(userId)}
              style={{
                background: 'var(--surface-accent)', color: 'var(--text-secondary)',
                border: '1px solid var(--border-color)', borderRadius: '12px',
                padding: '8px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center',
              }}
            >
              <LogOut size={13} />
            </motion.button>
          </div>
        ) : (
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => setShowLogin(v => !v)}
            style={{
              background: 'var(--surface-accent)', color: 'var(--primary-color)',
              border: '1px solid var(--border-color)', borderRadius: '12px',
              padding: '8px 14px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}
          >
            <LogIn size={12} />
            Conectar
          </motion.button>
        )}
      </div>

      {/* Login form */}
      <AnimatePresence>
        {showLogin && !garminStatus.connected && (
          <motion.form
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            onSubmit={handleLogin}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              padding: '1rem',
              background: 'var(--surface-accent)',
              borderRadius: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              marginTop: '10px',
              border: '1px solid var(--border-color)'
            }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500, margin: '0 0 4px 0', lineHeight: 1.4 }}>
                Insira as credenciais do seu app Garmin Connect para vincular sua conta.
              </p>
              <input
                type="email" placeholder="E-mail Garmin" required
                value={email} onChange={e => setEmail(e.target.value)}
                style={{
                  padding: '10px 14px', borderRadius: '12px',
                  border: '1px solid var(--border-color)', background: 'var(--bg-color)',
                  color: 'var(--text-primary)', fontSize: '0.8rem', outline: 'none',
                }}
              />
              <input
                type="password" placeholder="Senha Garmin" required
                value={password} onChange={e => setPassword(e.target.value)}
                style={{
                  padding: '10px 14px', borderRadius: '12px',
                  border: '1px solid var(--border-color)', background: 'var(--bg-color)',
                  color: 'var(--text-primary)', fontSize: '0.8rem', outline: 'none',
                }}
              />
              <motion.button
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isLoading}
                style={{
                  background: 'var(--primary-color)', color: '#fff', border: 'none',
                  borderRadius: '12px', padding: '10px', fontWeight: 800,
                  fontSize: '0.8rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  boxShadow: '0 4px 10px rgba(255, 59, 48, 0.15)'
                }}
              >
                {isLoading ? <Loader2 size={14} className="animate-spin" /> : <LogIn size={14} />}
                {isLoading ? 'Conectando...' : 'Entrar no Garmin Connect'}
              </motion.button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Result feedback */}
      <AnimatePresence>
        {lastResult && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              marginTop: '12px',
              padding: '10px 14px',
              borderRadius: '16px',
              background: lastResult.success ? 'rgba(52, 199, 89, 0.08)' : 'rgba(255, 59, 48, 0.08)',
              color: lastResult.success ? 'var(--success)' : 'var(--error)',
              fontSize: '0.8rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              border: `1px solid ${lastResult.success ? 'rgba(52, 199, 89, 0.15)' : 'rgba(255, 59, 48, 0.15)'}`
            }}
          >
            {lastResult.success ? <CheckCheck size={14} style={{ flexShrink: 0, marginTop: '1px' }} /> : <AlertCircle size={14} style={{ flexShrink: 0, marginTop: '1px' }} />}
            <span style={{ lineHeight: 1.4 }}>
              {lastResult.message || lastResult.error}
              {!lastResult.success && " (Dica: Sessões do Garmin expiram periodicamente. Tente reconectar se o erro persistir.)"}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const StravaActivitiesModal = ({ athlete, onClose, onSelect }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/strava/activities?userId=${athlete.id}`);
      if (!response.ok) throw new Error('Falha ao buscar atividades');
      const data = await response.json();
      setActivities(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  return createPortal(
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.4)', zIndex: 10001,
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
      }}
    >
      <motion.div 
        initial={{ scale: 0.95, y: 15 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 15 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '460px', background: 'var(--surface-color)',
          borderRadius: '30px', padding: '1.5rem', maxHeight: '82vh',
          display: 'flex', flexDirection: 'column', position: 'relative',
          boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
          border: '1px solid var(--border-color)'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ 
              background: '#FC5200', 
              width: '32px', 
              height: '32px', 
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Activity size={18} color="#fff" />
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
              {onSelect ? 'Vincular Atividade Strava' : 'Atividades Strava'}
            </h3>
          </div>
          <motion.button 
            whileTap={{ scale: 0.9 }} 
            onClick={onClose} 
            style={{ background: 'var(--surface-accent)', border: 'none', borderRadius: '50%', width: '28px', height: '28px', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={14} />
          </motion.button>
        </div>

        {/* Scrollable list */}
        <div style={{ overflowY: 'auto', flex: 1, paddingRight: '4px' }} className="no-scrollbar">
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem 0', gap: '12px' }}>
              <Loader2 className="animate-spin" color="#FC5200" size={28} />
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Sincronizando feed Strava...</p>
            </div>
          ) : error ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--error)' }}>
              <AlertCircle size={28} style={{ marginBottom: '8px', margin: '0 auto' }} />
              <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>{error}</p>
            </div>
          ) : activities.length === 0 ? (
            <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <p style={{ fontSize: '0.85rem', fontWeight: 500 }}>Nenhuma atividade recente encontrada no Strava.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {activities.map((act, idx) => (
                <motion.div 
                  whileTap={onSelect ? { scale: 0.98 } : {}}
                  key={idx} 
                  onClick={() => onSelect && onSelect(act)}
                  style={{ 
                    padding: '1rem', 
                    background: 'var(--surface-accent)', 
                    borderRadius: '18px', 
                    border: '1px solid var(--border-color)',
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    cursor: onSelect ? 'pointer' : 'default',
                    transition: 'border-color 0.2s',
                    width: '100%'
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1, paddingRight: '12px' }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '4px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{act.title}</h4>
                    <div style={{ display: 'flex', gap: '10px', fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, alignItems: 'center' }}>
                      <span>{safeFormatLocalDate(act.date, { day: 'numeric', month: 'numeric', year: 'numeric' })}</span>
                      <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--border-color)' }} />
                      <span style={{ color: '#FC5200', fontWeight: 800 }}>{act.metrics.distance}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>{act.metrics.pace}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{act.metrics.duration}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
        
        {/* Footer Hint */}
        <p style={{ marginTop: '1.25rem', fontSize: '0.75rem', color: onSelect ? '#FC5200' : 'var(--text-secondary)', textAlign: 'center', fontWeight: 600, flexShrink: 0, margin: '1rem 0 0 0' }}>
          {onSelect ? 'Toque em um treino acima para consolidá-lo!' : 'Exibindo atividades sincronizadas dos últimos 90 dias.'}
        </p>
      </motion.div>
    </motion.div>,
    document.body
  );
};

const TrainingView = ({ athlete, workouts, onRefresh, isRefreshing, isProfessor }) => {
  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [showStravaModal, setShowStravaModal] = useState(false);
  const [linkingWorkoutId, setLinkingWorkoutId] = useState(null);
  const [isLinking, setIsLinking] = useState(false);

  const handleLinkStravaActivity = async (activity) => {
    if (!linkingWorkoutId) return;
    setIsLinking(true);
    try {
      const { error } = await supabase
        .from('workouts')
        .update({
          status: 'completed',
          effort: activity.effort || 5,
          metrics: activity.metrics
        })
        .eq('id', linkingWorkoutId);

      if (error) throw error;

      setSelectedWorkout(null);
      setLinkingWorkoutId(null);
      setShowStravaModal(false);
      onRefresh();
      alert('Treino vinculado e concluído com sucesso.');
    } catch (err) {
      console.error('Erro ao vincular treino:', err);
      alert('Erro ao vincular treino com atividade do Strava.');
    } finally {
      setIsLinking(false);
    }
  };

  const garminSync = useGarminSync();
  const scrollerRef = React.useRef(null);
  const dayRefs = React.useRef({});

  const getLocalDateStr = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const todayStr = getLocalDateStr(new Date());
  const [selectedDate, setSelectedDate] = useState(todayStr);

  // Generate 28-day calendar strip starting on Monday
  const days = useMemo(() => {
    const result = [];
    const today = new Date();
    
    const dayOfWeek = today.getDay();
    const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    for (let i = -daysSinceMonday; i < (28 - daysSinceMonday); i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dateStr = getLocalDateStr(d);
      
      const currentDayMonday = new Date(d);
      const dDayOfWeek = d.getDay();
      const dDiffToMonday = dDayOfWeek === 0 ? 6 : dDayOfWeek - 1;
      currentDayMonday.setDate(d.getDate() - dDiffToMonday);
      
      const todayMonday = new Date(today);
      todayMonday.setDate(today.getDate() - daysSinceMonday);

      const isCurrentWeek = getLocalDateStr(currentDayMonday) === getLocalDateStr(todayMonday);

      // Check if day has workouts, and if they are all completed
      const dayWorkouts = workouts.filter(w => w.date === dateStr);
      const hasWorkouts = dayWorkouts.length > 0;
      const allCompleted = hasWorkouts && dayWorkouts.every(w => w.status === 'completed');

      result.push({
        date: dateStr,
        dayName: d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').slice(0, 3),
        dayNum: d.getDate(),
        month: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
        isToday: dateStr === todayStr,
        isCurrentWeek: isCurrentWeek,
        hasWorkouts,
        allCompleted
      });
    }
    return result;
  }, [todayStr, workouts]);

  // Auto-scroll to today/selected date
  React.useEffect(() => {
    if (scrollerRef.current && dayRefs.current[selectedDate]) {
      const element = dayRefs.current[selectedDate];
      const scrollPos = element.offsetLeft - (scrollerRef.current.offsetWidth / 2) + (element.offsetWidth / 2);
      scrollerRef.current.scrollTo({ left: scrollPos, behavior: 'smooth' });
    }
  }, [selectedDate]);

  const dailyWorkouts = workouts.filter(w => w.date === selectedDate);
  const userId = athlete?.id || athlete?.user_id || null;

  const handlePushToGarmin = async (workout) => {
    if (!userId) return { success: false, message: 'Usuário não identificado' };
    return garminSync.pushWorkout(userId, workout);
  };

  // HIG formatted current date greeting
  const headerDateStr = useMemo(() => {
    return new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase();
  }, []);

  return (
    <div className="animate-slide-up" style={{ paddingBottom: '3rem' }}>
      {/* iOS Navigation Header Area */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '1.25rem',
        paddingTop: '0.25rem'
      }}>
        <div>
          <p style={{ 
            fontSize: '0.72rem', 
            fontWeight: 800, 
            color: 'var(--text-secondary)', 
            textTransform: 'uppercase', 
            letterSpacing: '0.8px',
            margin: 0
          }}>
            {headerDateStr}
          </p>
        </div>
        
        {/* Circular Action Pills (iOS style) */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {isProfessor && athlete?.integrations?.strava?.connected && (
            <motion.button 
              whileTap={{ scale: 0.92 }}
              onClick={() => setShowStravaModal(true)}
              style={{ 
                background: 'rgba(252, 82, 0, 0.1)', 
                color: '#FC5200', 
                border: 'none', 
                width: '32px',
                height: '32px',
                borderRadius: '50%', 
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
              }}
              title="Sincronizar Strava"
            >
              <Activity size={14} />
            </motion.button>
          )}
          <motion.button 
            whileTap={{ scale: 0.92 }}
            onClick={() => onRefresh(true)}
            disabled={isRefreshing}
            style={{ 
              background: 'var(--surface-color)', 
              color: 'var(--primary-color)', 
              border: '1px solid var(--border-color)', 
              width: '32px',
              height: '32px',
              borderRadius: '50%', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
            }}
            title="Sincronizar Planilha"
          >
            <RotateCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
          </motion.button>
        </div>
      </div>

      {/* iOS-Style Horizontal Calendar Strip */}
      <div 
        ref={scrollerRef}
        style={{ 
          display: 'flex', 
          gap: '10px', 
          overflowX: 'auto', 
          padding: '10px 4px 18px',
          margin: '0 -1.5rem 1rem',
          paddingLeft: '1.5rem',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }} 
        className="no-scrollbar"
      >
        {days.map((day, idx) => {
          const isSelected = selectedDate === day.date;
          const showMonth = idx === 0 || day.dayNum === 1;
          
          return (
            <div 
              key={day.date}
              ref={el => dayRefs.current[day.date] = el}
              onClick={() => setSelectedDate(day.date)}
              style={{
                flexShrink: 0,
                width: '52px',
                height: '74px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '16px',
                background: isSelected ? 'var(--primary-color)' : day.isCurrentWeek ? 'var(--surface-color)' : 'transparent',
                color: isSelected ? '#fff' : day.isCurrentWeek ? 'var(--text-primary)' : 'var(--text-secondary)',
                border: isSelected
                  ? 'none'
                  : day.isCurrentWeek
                    ? '1px solid var(--border-color)'
                    : '1px solid transparent',
                boxShadow: isSelected ? '0 8px 18px rgba(255, 59, 48, 0.25)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative'
              }}
            >
              <span style={{ 
                fontSize: '0.62rem', 
                fontWeight: 700, 
                textTransform: 'uppercase', 
                marginBottom: '2px', 
                opacity: isSelected ? 0.9 : 0.6,
                letterSpacing: '0.2px'
              }}>
                {day.dayName}
              </span>
              <span style={{ 
                fontSize: '1.15rem', 
                fontWeight: 800, 
                lineHeight: 1.1,
                letterSpacing: '-0.3px'
              }}>
                {day.dayNum}
              </span>
              
              {/* Optional Month display for starting indexes */}
              {showMonth ? (
                <span style={{ fontSize: '0.55rem', fontWeight: 700, textTransform: 'uppercase', opacity: isSelected ? 0.9 : 0.5, marginTop: '1px' }}>
                  {day.month}
                </span>
              ) : (
                <div style={{ height: '5px', marginTop: '1px' }} />
              )}

              {/* iOS Dot/Status Indicator */}
              {day.hasWorkouts && (
                <div style={{
                  position: 'absolute',
                  bottom: '6px',
                  width: '4px',
                  height: '4px',
                  borderRadius: '50%',
                  background: isSelected 
                    ? '#fff' 
                    : day.allCompleted 
                      ? 'var(--success)' 
                      : 'var(--primary-color)'
                }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Main List Section */}
      <div>
        {/* Selected date formatted elegantly like iOS Calendar details */}
        <h3 style={{ 
          fontSize: '0.78rem', 
          fontWeight: 800, 
          color: 'var(--text-secondary)', 
          textTransform: 'uppercase', 
          letterSpacing: '0.5px', 
          marginBottom: '0.75rem',
          paddingLeft: '2px'
        }}>
          {safeFormatLocalDate(selectedDate, { weekday: 'long', day: 'numeric', month: 'long' })}
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {dailyWorkouts.length === 0 ? (
            <div style={{ 
              padding: '3rem 1.5rem', 
              textAlign: 'center', 
              background: 'var(--surface-color)', 
              borderRadius: '24px', 
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-color)',
              boxShadow: '0 2px 10px rgba(0,0,0,0.01)'
            }}>
              <Calendar size={32} style={{ opacity: 0.25, marginBottom: '0.75rem', color: 'var(--primary-color)' }} />
              <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>Nenhum treino prescrito para este dia.</p>
            </div>
          ) : (
            dailyWorkouts.map((workout) => {
              const isDone = workout.status === 'completed';
              return (
                <motion.div 
                  whileTap={{ scale: 0.98 }}
                  key={workout.id} 
                  onClick={() => setSelectedWorkout(workout)}
                  style={{ 
                    padding: '1.25rem 1.5rem',
                    cursor: 'pointer',
                    borderRadius: '24px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--surface-color)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1.25rem',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.02)',
                    transition: 'all 0.2s ease'
                  }}
                  className="workout-card-hig"
                >
                  {/* Status Circle indicator */}
                  <div style={{ 
                    width: '38px', 
                    height: '38px', 
                    borderRadius: '50%', 
                    background: isDone ? 'rgba(52, 199, 89, 0.08)' : 'var(--surface-accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {isDone ? (
                      <Check size={18} style={{ strokeWidth: 3 }} color="var(--success)" />
                    ) : (
                      <div style={{ 
                        width: '12px', 
                        height: '12px', 
                        borderRadius: '50%', 
                        border: '2px solid var(--text-secondary)',
                        opacity: 0.4
                      }} />
                    )}
                  </div>
                  
                  {/* Body */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                      <span style={{ 
                        fontSize: '0.78rem', 
                        fontWeight: 700, 
                        color: isDone ? 'var(--success)' : 'var(--primary-color)' 
                      }}>
                        {workout.metrics?.distance || 'Prescrito'}
                      </span>
                      {((workout.metrics?.duration && workout.metrics.duration !== '--') || estimateWorkoutDuration(workout, athlete) !== '--') && (
                        <>
                          <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'var(--text-muted)' }} />
                          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                            {(!workout.metrics?.duration || workout.metrics.duration === '--')
                              ? estimateWorkoutDuration(workout, athlete)
                              : workout.metrics.duration}
                          </span>
                        </>
                      )}
                    </div>
                    <h4 style={{ 
                      fontSize: '1rem', 
                      fontWeight: 800, 
                      color: 'var(--text-primary)',
                      lineHeight: 1.2,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {workout.title}
                    </h4>
                  </div>
                  
                  <ChevronRight size={18} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal and Sheets Overlays */}
      <AnimatePresence>
        {selectedWorkout && (
          <WorkoutModal 
            workout={selectedWorkout} 
            athlete={athlete}
            onClose={() => setSelectedWorkout(null)}
            onPushToGarmin={handlePushToGarmin}
            garminStatus={garminSync.garminStatus}
            isProfessor={isProfessor}
            onShowStrava={() => {
              setLinkingWorkoutId(null);
              setShowStravaModal(true);
            }}
            onLinkClick={() => {
              setLinkingWorkoutId(selectedWorkout.id);
              setShowStravaModal(true);
            }}
          />
        )}
        {showStravaModal && (
          <StravaActivitiesModal 
            athlete={athlete} 
            onClose={() => {
              setShowStravaModal(false);
              setLinkingWorkoutId(null);
            }} 
            onSelect={linkingWorkoutId ? handleLinkStravaActivity : null}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default TrainingView;
