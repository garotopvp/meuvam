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
  Map as MapIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGarminSync } from '../hooks/useGarminSync.js';
import ActivityMap from '../components/ActivityMap';

const StructuredWorkoutView = ({ steps, athlete }) => {
  if (!steps || !Array.isArray(steps)) return null;

  const typeIcons = { 
    warmup: <Flame size={16} />, 
    run: <Play size={16} />, 
    walk: <PersonStanding size={16} />, 
    recovery: <Timer size={16} />, 
    rest: <Moon size={16} />, 
    cooldown: <Leaf size={16} />,
    other: <Activity size={16} />
  };
  const typeColors = { 
    warmup: '#D32F2F', 
    run: '#1265C2', 
    walk: '#03A9F4', 
    recovery: '#388E3C', 
    rest: '#555555', 
    cooldown: '#388E3C',
    other: '#9E9E9E'
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
    if (step.type === 'repetition') {
      return (
        <div key={step.id} style={{ marginBottom: '1.5rem', background: 'rgba(0,0,0,0.02)', borderRadius: '16px', padding: '1rem', border: '1px dashed rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', color: '#64748b' }}>
            <RefreshCw size={14} />
            <span style={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}>Repetir {step.count}x</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingLeft: '12px', borderLeft: '2px solid rgba(0,0,0,0.05)' }}>
            {step.steps.map(s => renderStep(s, true))}
          </div>
        </div>
      );
    }

    const targetPace = calculatePace(step.intensity?.value);
    const duration = step.duration?.type === 'lap_button' ? 'Até Lap' : `${step.duration?.value}${step.duration?.type === 'time' ? 'min' : 'km'}`;

    return (
      <div key={step.id} style={{ 
        display: 'flex', 
        gap: '12px', 
        padding: '12px', 
        background: '#fff', 
        borderRadius: '12px', 
        boxShadow: isNested ? 'none' : '0 2px 8px rgba(0,0,0,0.04)',
        borderLeft: `4px solid ${typeColors[step.type] || '#cbd5e1'}`,
        marginBottom: isNested ? '0' : '8px'
      }}>
        <div style={{ color: typeColors[step.type], marginTop: '2px' }}>
          {typeIcons[step.type] || <ChevronRight size={16} />}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
            <span style={{ fontWeight: 800, fontSize: '13px', color: '#1e293b' }}>{step.label || typeLabels[step.type]}</span>
            <span style={{ fontWeight: 900, fontSize: '13px', color: typeColors[step.type] }}>{duration}</span>
          </div>
          {targetPace && (
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Zap size={10} /> Pace Alvo: <span style={{ color: '#0f172a', fontWeight: 800 }}>{targetPace}/km</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ marginBottom: '2.5rem' }}>
      <h3 style={{ fontSize: '1rem', fontWeight: 900, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
          <Activity size={18} />
        </div>
        ETAPAS DO TREINO
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
        background: 'rgba(0, 122, 255, 0.06)',
        padding: '1.25rem',
        borderRadius: '20px',
        border: '1px solid rgba(0, 122, 255, 0.15)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <Watch size={20} color="var(--primary-color)" />
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
          Conecte seu Garmin na aba de treinos para enviar este treino ao dispositivo.
        </p>
      </div>
    );
  }

  return (
    <div style={{
      background: 'rgba(0, 122, 255, 0.06)',
      padding: '1.25rem',
      borderRadius: '20px',
      border: '1px solid rgba(0, 122, 255, 0.15)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: result ? '12px' : 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Watch size={20} color="var(--primary-color)" />
          <div>
            <p style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>Garmin Connect</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{garminStatus.user?.displayName}</p>
          </div>
        </div>
        <button
          onClick={handlePush}
          disabled={pushing}
          style={{
            background: 'var(--primary-color)',
            color: '#fff',
            border: 'none',
            borderRadius: '12px',
            padding: '8px 16px',
            fontSize: '0.8rem',
            fontWeight: 800,
            cursor: pushing ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            opacity: pushing ? 0.7 : 1,
          }}
        >
          {pushing ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} />}
          {pushing ? 'Enviando...' : 'Enviar para Garmin'}
        </button>
      </div>
      {result && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            marginTop: '12px',
            padding: '10px 14px',
            borderRadius: '12px',
            background: result.success ? 'rgba(52, 199, 89, 0.1)' : 'rgba(255, 59, 48, 0.1)',
            color: result.success ? 'var(--success)' : 'var(--error)',
            fontSize: '0.8rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          {result.success ? <CheckCheck size={14} /> : <AlertCircle size={14} />}
          {result.message || result.error}
        </motion.div>
      )}
    </div>
  );
};

const WorkoutModal = ({ workout, athlete, onClose, onPushToGarmin, garminStatus }) => {
  if (!workout) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'var(--bg-color)',
        zIndex: 9999, // Ensure it's above everything including any new bottom navs
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        display: 'flex',
        justifyContent: 'center'
      }}
    >
      <motion.div 
        initial={{ y: '20%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '20%', opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        style={{
          width: '100%',
          maxWidth: '500px',
          minHeight: '100%',
          background: 'var(--bg-color)',
          padding: '1.5rem',
          paddingBottom: '8rem',
          position: 'relative'
        }}
      >
        {/* Top Navigation */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '2rem',
          position: 'sticky',
          top: 0,
          background: 'var(--bg-color)',
          padding: '1rem 0',
          zIndex: 10,
          borderBottom: '1px solid var(--border-color)'
        }}>
          <button 
            onClick={onClose}
            style={{ 
              background: 'var(--surface-accent)', 
              border: 'none', 
              borderRadius: '12px', 
              width: '40px', 
              height: '40px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              cursor: 'pointer', 
              color: 'var(--text-primary)' 
            }}
          >
            <X size={20} />
          </button>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Treino Detalhado
          </h3>
          <div style={{ width: '40px' }} />
        </div>

        {/* Hero Section */}
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
            {/* Removed workout.type badge per user request */}
            {workout.status === 'completed' && (
              <span style={{ 
                background: 'rgba(52, 199, 89, 0.1)', 
                color: 'var(--success)', 
                padding: '6px 14px', 
                borderRadius: '100px', 
                fontSize: '0.75rem', 
                fontWeight: 800,
                textTransform: 'uppercase'
              }}>
                Concluído
              </span>
            )}
          </div>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 900, letterSpacing: '-1px', lineHeight: 1.1, marginBottom: '0.5rem' }}>
            {workout.title}
          </h1>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
            {new Date(workout.date).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>

        {/* Interactive Map */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
             <h3 style={{ fontSize: '0.9rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MapIcon size={18} color="var(--primary-color)" /> MAPA DA ATIVIDADE
             </h3>
             {workout.status === 'completed' && (
               <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--success)' }}>Intensidade por Heatmap 🔥</span>
             )}
          </div>
          <ActivityMap 
            isHeatmap={workout.status === 'completed'} 
            routeData={workout.status === 'completed' ? [
              [-23.5505, -46.6333], [-23.5515, -46.6343], [-23.5525, -46.6353], [-23.5535, -46.6363], [-23.5545, -46.6353]
            ] : null} 
          />
        </div>

        {/* Quick Metrics */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '16px', 
          marginBottom: '2.5rem' 
        }}>
          <div style={{ background: 'var(--surface-color)', padding: '1.25rem', borderRadius: '24px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
              <MapPin size={18} />
              <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>Distância</span>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary-color)' }}>
              {workout.metrics?.distance || '--'}
            </div>
          </div>
          <div style={{ background: 'var(--surface-color)', padding: '1.25rem', borderRadius: '24px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
              <Clock size={18} />
              <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>Duração</span>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary-color)' }}>
              {workout.metrics?.duration || '--'}
            </div>
          </div>
        </div>

        {/* Structured Steps or Dynamic Chart */}
        {(workout.structured_steps || workout.metrics?.structured_steps) ? (
          <StructuredWorkoutView steps={workout.structured_steps || workout.metrics.structured_steps} athlete={athlete} />
        ) : (
          <IntensityChart 
            description={workout.description || ''} 
            vamPace={athlete?.vam || '--'} 
          />
        )}

        {/* Workout Prescription (Always show text as backup) */}
        <div style={{ marginBottom: '2.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 900, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={18} color="#fff" fill="#fff" />
            </div>
            PRESCRIÇÃO DO TREINO
          </h3>
          <div style={{ 
            background: 'var(--surface-accent)', 
            padding: '2rem', 
            borderRadius: '28px', 
            fontSize: '1.15rem', 
            lineHeight: '1.6', 
            color: 'var(--text-primary)',
            whiteSpace: 'pre-line',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)',
            border: '1px solid var(--border-color)'
          }}>
            {workout.description || 'Sem descrição detalhada para este treino.'}
          </div>
        </div>

        {/* External Integration — Strava (Professor Only) */}
        {isProfessor && (
          <div style={{ 
            background: 'rgba(252, 82, 0, 0.08)', 
            padding: '1.5rem', 
            borderRadius: '24px', 
            border: '1px solid rgba(252, 82, 0, 0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '1rem'
          }}>
            <div style={{ background: '#FC5200', padding: '10px', borderRadius: '12px' }}>
              <Activity size={24} color="#fff" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '1rem', fontWeight: 800, color: '#FC5200' }}>Integração com Strava</p>
              <p style={{ fontSize: '0.85rem', color: 'rgba(252, 82, 0, 0.8)', fontWeight: 500 }}>
                {athlete?.integrations?.strava?.connected 
                  ? `Conectado como ${athlete.integrations.strava.username || 'Atleta'}`
                  : 'O atleta ainda não conectou o Strava.'}
              </p>
            </div>
            {athlete?.integrations?.strava?.connected && (
              <button 
                onClick={() => setShowStravaModal(true)}
                style={{
                  background: '#FC5200',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 14px',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <ExternalLink size={14} /> VER ATIVIDADES
              </button>
            )}
          </div>
        )}


        {/* Garmin Send Button */}
        {onPushToGarmin && (
          <GarminPushButton workout={workout} onPush={onPushToGarmin} garminStatus={garminStatus} />
        )}
      </motion.div>
    </motion.div>
  );
};

const paceToSeconds = (paceStr) => {
  if (!paceStr || paceStr === '--' || !paceStr.includes(':')) return null;
  const [min, sec] = paceStr.split(':').map(Number);
  return min * 60 + sec;
};

const secondsToPace = (seconds) => {
  if (!seconds) return '--';
  const min = Math.floor(seconds / 60);
  const sec = Math.round(seconds % 60);
  return `${min}:${sec.toString().padStart(2, '0')}`;
};

const IntensityChart = ({ description, vamPace }) => {
  const vamSeconds = paceToSeconds(vamPace);
  if (!vamSeconds) return null;

  // Regex para encontrar padrões como "90% VAM" ou "60% da VAM"
  const regex = /(\d+)\s*%\s*(?:da\s+)?VAM/gi;
  const matches = [...description.matchAll(regex)];

  if (matches.length === 0) return null;

  const data = matches.map((match, idx) => {
    const percentage = parseInt(match[1]);
    const targetSeconds = vamSeconds / (percentage / 100);
    
    // Tenta pegar o contexto (o que vem antes da porcentagem)
    const startIdx = Math.max(0, match.index - 100);
    const context = description.substring(startIdx, match.index).split('\n').pop().trim();
    const label = context.replace(/[:\-]/g, '') || `Trecho ${idx + 1}`;

    return { label, percentage, pace: secondsToPace(targetSeconds) };
  });

  return (
    <div style={{ marginBottom: '2.5rem' }}>
      <h3 style={{ fontSize: '1rem', fontWeight: 900, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Activity size={18} color="#fff" />
        </div>
        INTENSIDADES CALCULADAS (VAM: {vamPace})
      </h3>
      
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '12px',
        background: 'var(--surface-accent)',
        padding: '1.5rem',
        borderRadius: '28px',
        border: '1px solid var(--border-color)'
      }}>
        {data.map((item, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>{item.label}</span>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary-color)' }}>{item.pace} min/km</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginLeft: '8px' }}>({item.percentage}%)</span>
              </div>
            </div>
            <div style={{ width: '100%', height: '8px', background: 'rgba(0,0,0,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(item.percentage, 100)}%` }}
                transition={{ delay: 0.2 + i * 0.1, duration: 0.8 }}
                style={{ 
                  height: '100%', 
                  background: item.percentage > 90 ? 'var(--error)' : item.percentage > 75 ? 'var(--warning)' : 'var(--success)',
                  borderRadius: '4px'
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
    // Send all workouts visible in the current week — backend handles fallback for non-structured ones
    const weekWorkouts = workouts.filter(w => w.date); // any workout with a date
    if (weekWorkouts.length === 0) return;
    const result = await syncPlan(userId, weekWorkouts);
    // If there were errors, show an alert with the actual Garmin error details
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
        padding: '1.5rem',
        marginBottom: '1.5rem',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '12px',
            background: garminStatus.connected ? 'rgba(52, 199, 89, 0.15)' : 'var(--surface-accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Watch size={18} color={garminStatus.connected ? 'var(--success)' : 'var(--text-secondary)'} />
          </div>
          <div>
            <p style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>Garmin Connect</p>
            <p style={{ fontSize: '0.72rem', color: garminStatus.connected ? 'var(--success)' : 'var(--text-secondary)', fontWeight: 600 }}>
              {garminStatus.connected ? `● Conectado — ${garminStatus.user?.displayName}` : '● Desconectado'}
            </p>
          </div>
        </div>

        {garminStatus.connected ? (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleSyncWeek}
              disabled={isLoading}
              style={{
                background: 'var(--primary-color)', color: '#fff', border: 'none',
                borderRadius: '12px', padding: '8px 14px', fontSize: '0.78rem', fontWeight: 800,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px',
                opacity: isLoading ? 0.7 : 1,
              }}
            >
              {isLoading
                ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                : <Send size={13} />}
              {isLoading ? 'Sincronizando...' : 'Sincronizar Semana'}
            </button>
            <button
              onClick={() => garminLogout(userId)}
              style={{
                background: 'var(--surface-accent)', color: 'var(--text-secondary)',
                border: '1px solid var(--border-color)', borderRadius: '12px',
                padding: '8px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center',
              }}
            >
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowLogin(v => !v)}
            style={{
              background: 'var(--surface-accent)', color: 'var(--primary-color)',
              border: '1px solid var(--border-color)', borderRadius: '12px',
              padding: '8px 14px', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}
          >
            <LogIn size={13} />
            Conectar
          </button>
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
              marginTop: '4px'
            }}>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '4px' }}>
                Use o mesmo e-mail e senha do app Garmin Connect.
              </p>
              <input
                type="email" placeholder="E-mail Garmin" required
                value={email} onChange={e => setEmail(e.target.value)}
                style={{
                  padding: '10px 14px', borderRadius: '12px',
                  border: '1px solid var(--border-color)', background: 'var(--bg-color)',
                  color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none',
                }}
              />
              <input
                type="password" placeholder="Senha Garmin" required
                value={password} onChange={e => setPassword(e.target.value)}
                style={{
                  padding: '10px 14px', borderRadius: '12px',
                  border: '1px solid var(--border-color)', background: 'var(--bg-color)',
                  color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none',
                }}
              />
              <button
                type="submit"
                disabled={isLoading}
                style={{
                  background: 'var(--primary-color)', color: '#fff', border: 'none',
                  borderRadius: '12px', padding: '10px', fontWeight: 800,
                  fontSize: '0.85rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                }}
              >
                {isLoading ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <LogIn size={15} />}
                {isLoading ? 'Conectando...' : 'Entrar no Garmin'}
              </button>
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
              borderRadius: '14px',
              background: lastResult.success ? 'rgba(52, 199, 89, 0.1)' : 'rgba(255, 59, 48, 0.1)',
              color: lastResult.success ? 'var(--success)' : 'var(--error)',
              fontSize: '0.8rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px'
            }}
          >
            {lastResult.success ? <CheckCheck size={14} style={{ flexShrink: 0, marginTop: '1px' }} /> : <AlertCircle size={14} style={{ flexShrink: 0, marginTop: '1px' }} />}
            <span>{lastResult.message || lastResult.error}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const StravaActivitiesModal = ({ athlete, onClose }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchActivities();
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

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.8)', zIndex: 10000,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
      }}
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        style={{
          width: '100%', maxWidth: '500px', background: 'var(--bg-color)',
          borderRadius: '24px', padding: '1.5rem', maxHeight: '80vh',
          display: 'flex', flexDirection: 'column', position: 'relative'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: '#FC5200', padding: '8px', borderRadius: '10px' }}>
              <Activity size={20} color="#fff" />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Atividades Strava</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, paddingRight: '4px' }} className="no-scrollbar">
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem 0', gap: '12px' }}>
              <Loader2 className="animate-spin" color="#FC5200" size={32} />
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Buscando atividades...</p>
            </div>
          ) : error ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--error)' }}>
              <AlertCircle size={32} style={{ marginBottom: '10px' }} />
              <p>{error}</p>
            </div>
          ) : activities.length === 0 ? (
            <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <p>Nenhuma atividade recente encontrada.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {activities.map((activity, idx) => (
                <div key={idx} style={{ 
                  padding: '1rem', background: 'var(--surface-accent)', 
                  borderRadius: '16px', border: '1px solid var(--border-color)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '4px' }}>{activity.title}</h4>
                    <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      <span>{new Date(activity.date).toLocaleDateString('pt-BR')}</span>
                      <span style={{ color: '#FC5200' }}>{activity.metrics.distance}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>{activity.metrics.pace}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{activity.metrics.duration}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <p style={{ marginTop: '1.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center', fontWeight: 500 }}>
          Mostrando as últimas 10 atividades sincronizadas.
        </p>
      </motion.div>
    </motion.div>
  );
};

const TrainingView = ({ athlete, workouts, onRefresh, isRefreshing, isProfessor }) => {
  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [showStravaModal, setShowStravaModal] = useState(false);


  const garminSync = useGarminSync();
  const scrollerRef = React.useRef(null);
  const dayRefs = React.useRef({});

  // Helper: data local correta
  const getLocalDateStr = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const todayStr = getLocalDateStr(new Date());
  const [selectedDate, setSelectedDate] = useState(todayStr);

  // Gera dias: Começa na Segunda desta semana e mostra 28 dias (4 semanas)
  const days = useMemo(() => {
    const result = [];
    const today = new Date();
    
    // Calcula quantos dias voltar para chegar na Segunda (0=Dom, 1=Seg, ..., 6=Sáb)
    const dayOfWeek = today.getDay();
    const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    // Começamos exatamente na Segunda da semana atual
    for (let i = -daysSinceMonday; i < (28 - daysSinceMonday); i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dateStr = getLocalDateStr(d);
      
      // Determina se é a semana atual (Segunda a Domingo)
      const currentDayMonday = new Date(d);
      const dDayOfWeek = d.getDay();
      const dDiffToMonday = dDayOfWeek === 0 ? 6 : dDayOfWeek - 1;
      currentDayMonday.setDate(d.getDate() - dDiffToMonday);
      
      const todayMonday = new Date(today);
      todayMonday.setDate(today.getDate() - daysSinceMonday);

      const isCurrentWeek = getLocalDateStr(currentDayMonday) === getLocalDateStr(todayMonday);

      result.push({
        date: dateStr,
        dayName: d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''),
        dayNum: d.getDate(),
        month: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
        isToday: dateStr === todayStr,
        isCurrentWeek: isCurrentWeek
      });
    }
    return result;
  }, [todayStr]);

  // Auto-scroll para o dia selecionado (Hoje) ao carregar
  React.useEffect(() => {
    if (scrollerRef.current && dayRefs.current[selectedDate]) {
      const element = dayRefs.current[selectedDate];
      const scrollPos = element.offsetLeft - (scrollerRef.current.offsetWidth / 2) + (element.offsetWidth / 2);
      scrollerRef.current.scrollTo({ left: scrollPos, behavior: 'smooth' });
    }
  }, [selectedDate]);

  // Filter workouts for selected day
  const dailyWorkouts = workouts.filter(w => w.date === selectedDate);

  // Derive userId from athlete
  const userId = athlete?.id || athlete?.user_id || null;

  // Push a single workout to Garmin
  const handlePushToGarmin = async (workout) => {
    if (!userId) return { success: false, message: 'Usuário não identificado' };
    return garminSync.pushWorkout(userId, workout);
  };

  return (
    <div className="animate-slide-up" style={{ paddingBottom: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Minha Planilha</h1>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {isProfessor && athlete?.integrations?.strava?.connected && (
            <button 
              onClick={() => setShowStravaModal(true)}
              style={{ background: 'rgba(252, 82, 0, 0.1)', color: '#FC5200', border: '1px solid rgba(252, 82, 0, 0.2)', padding: '8px 12px', borderRadius: '12px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Activity size={14} />
              Strava
            </button>
          )}
          <button 
            onClick={() => onRefresh(true)}
            disabled={isRefreshing}
            style={{ background: 'var(--surface-accent)', color: 'var(--primary-color)', border: '1px solid var(--border-color)', padding: '8px 12px', borderRadius: '12px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RotateCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            Sincronizar
          </button>
        </div>
      </div>

      {/* Garmin Sync Panel (Only show if connected in profile) */}
      {athlete?.integrations?.garmin?.connected && (
        <GarminSyncPanel workouts={workouts} userId={userId} garminSync={garminSync} athlete={athlete} />
      )}

      {/* Horizontal Day Scroller */}
      <div 
        ref={scrollerRef}
        style={{ 
        display: 'flex', 
        gap: '12px', 
        overflowX: 'auto', 
        padding: '10px 4px 20px',
        margin: '0 -1.5rem 1.5rem',
        paddingLeft: '1.5rem',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none'
      }} className="no-scrollbar">
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
                width: '60px',
                height: '80px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '20px',
                background: isSelected ? 'var(--primary-color)' : day.isCurrentWeek ? 'var(--surface-color)' : 'transparent',
                color: isSelected ? '#fff' : day.isCurrentWeek ? 'var(--text-primary)' : 'var(--text-secondary)',
                border: isSelected
                  ? '1px solid transparent'
                  : day.isCurrentWeek
                    ? '2px solid var(--border-color)'
                    : '1px solid transparent',
                boxShadow: isSelected ? '0 10px 20px rgba(0, 122, 255, 0.2)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            >
              <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px', opacity: day.isCurrentWeek || isSelected ? 1 : 0.5 }}>
                {day.dayName}
              </span>
              <span style={{ fontSize: showMonth ? '1rem' : '1.25rem', fontWeight: 800, lineHeight: 1 }}>
                {day.dayNum}
              </span>
              {showMonth && (
                <span style={{ fontSize: '0.55rem', fontWeight: 600, textTransform: 'uppercase', opacity: 0.6, marginTop: '2px' }}>
                  {day.month}
                </span>
              )}
              {day.isToday && !showMonth && (
                <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: isSelected ? '#fff' : 'var(--primary-color)', marginTop: '4px' }} />
              )}
            </div>
          );
        })}
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1rem' }}>
          {new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {dailyWorkouts.length === 0 ? (
            <div style={{ padding: '3rem 1rem', textAlign: 'center', background: 'var(--surface-accent)', borderRadius: '24px', color: 'var(--text-secondary)' }}>
              <Calendar size={40} style={{ opacity: 0.3, marginBottom: '1rem' }} />
              <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>Nenhum treino para este dia.</p>
            </div>
          ) : (
            dailyWorkouts.map((workout) => (
              <div 
                key={workout.id} 
                className="card" 
                onClick={() => setSelectedWorkout(workout)}
                style={{ 
                  padding: '1.5rem',
                  cursor: 'pointer',
                  border: '1px solid var(--border-color)',
                  background: 'var(--surface-color)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1.25rem'
                }}
              >
                <div style={{ 
                  width: '48px', 
                  height: '48px', 
                  borderRadius: '16px', 
                  background: workout.status === 'completed' ? 'rgba(52, 199, 89, 0.1)' : 'var(--surface-accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {workout.status === 'completed' ? (
                    <CheckCircle2 size={24} color="var(--success)" />
                  ) : (
                    <Circle size={24} color="var(--border-color)" />
                  )}
                </div>
                
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    {/* Removed workout.type per user request */}
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>{workout.metrics?.distance || '--'}</span>
                  </div>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>{workout.title}</h4>
                </div>
                
                <ChevronRight size={20} color="var(--border-color)" />
              </div>
            ))
          )}
        </div>
      </div>

      <AnimatePresence>
        {selectedWorkout && (
          <WorkoutModal 
            workout={selectedWorkout} 
            athlete={athlete}
            onClose={() => setSelectedWorkout(null)}
            onPushToGarmin={handlePushToGarmin}
            garminStatus={garminSync.garminStatus}
          />
        )}
        {showStravaModal && (
          <StravaActivitiesModal 
            athlete={athlete} 
            onClose={() => setShowStravaModal(false)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default TrainingView;
