import React, { useMemo } from 'react';
import { 
  Zap, 
  MapPin, 
  Clock, 
  TrendingUp, 
  Calendar as CalendarIcon,
  Bell
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Smartphone, Download } from 'lucide-react';

const HomeView = ({ athlete, workouts, deferredPrompt, onInstall }) => {
  // Helper: data local correta
  const getLocalDateStr = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const todayStr = getLocalDateStr(new Date());
  
  // 1. Tentar achar o treino de HOJE
  let displayWorkout = workouts.find(w => w.date === todayStr);
  let isToday = true; // Sempre tratamos como hoje nesta lógica

  // 3. Se ainda não tiver nada, não pegamos o workouts[0] (que pode ser lixo antigo)
  // Deixamos displayWorkout como null e tratamos no render

  // Cálculos da semana atual
  const weeklyStats = useMemo(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    
    const monday = new Date(today);
    monday.setDate(today.getDate() - daysSinceMonday);
    monday.setHours(0,0,0,0);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23,59,59,999);

    const weekWorkouts = workouts.filter(w => {
      const d = new Date(w.date + 'T00:00:00');
      return d >= monday && d <= sunday;
    });

    const totalDistance = weekWorkouts.reduce((acc, curr) => {
      const dist = parseFloat(curr.metrics?.distance?.replace('km', '') || 0);
      return acc + dist;
    }, 0);

    return {
      distance: totalDistance.toFixed(1),
      count: weekWorkouts.length,
      completed: weekWorkouts.filter(w => w.status === 'completed').length
    };
  }, [workouts]);

  if (!workouts || workouts.length === 0) {
    return (
      <div className="animate-slide-up">
        <header style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500 }}>Bem-vindo de volta,</p>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>{athlete.name}</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Link to="/aluno/avisos" style={{ color: 'var(--text-secondary)', position: 'relative' }}>
              <Bell size={24} />
            </Link>
            <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'var(--surface-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-color)', fontWeight: '700', border: '1px solid var(--border-color)', fontSize: '0.9rem', overflow: 'hidden' }}>
              {athlete.profileImage ? <img src={athlete.profileImage} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : athlete.avatar}
            </div>
          </div>
        </header>
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <CalendarIcon size={48} color="var(--border-color)" style={{ marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Nenhum treino ainda</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Aguarde seu coach enviar sua primeira planilha!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-slide-up">
      <header style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500 }}>Bem-vindo de volta,</p>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>{athlete.name}</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link to="/aluno/avisos" style={{ color: 'var(--text-secondary)', position: 'relative' }}>
            <Bell size={24} />
          </Link>
          <div style={{ 
            width: '48px', 
            height: '48px', 
            borderRadius: '16px', 
            background: 'var(--surface-accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--primary-color)',
            fontWeight: '700',
            border: '1px solid var(--border-color)',
            fontSize: '0.9rem',
            overflow: 'hidden'
          }}>
            {athlete.profileImage ? (
              <img src={athlete.profileImage} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              athlete.avatar
            )}
          </div>
        </div>
      </header>
      
      {/* PWA Install Banner (Android/Chrome) */}
      {deferredPrompt && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card"
          style={{ 
            background: 'linear-gradient(135deg, var(--primary-color) 0%, #0056b3 100%)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: '15px',
            marginBottom: '2rem',
            padding: '1.25rem',
            border: 'none',
            boxShadow: '0 10px 20px rgba(0, 122, 255, 0.2)'
          }}
        >
          <div style={{ background: 'rgba(255,255,255,0.2)', padding: '10px', borderRadius: '12px' }}>
            <Smartphone size={24} />
          </div>
          <div style={{ flex: 1 }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '2px' }}>Superação no Celular</h4>
            <p style={{ fontSize: '0.75rem', opacity: 0.9 }}>Instale para acessar rápido seus treinos.</p>
          </div>
          <button 
            onClick={onInstall}
            style={{ 
              background: 'white', 
              color: 'var(--primary-color)', 
              border: 'none', 
              padding: '8px 16px', 
              borderRadius: '10px', 
              fontSize: '0.8rem', 
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <Download size={14} /> INSTALAR
          </button>
        </motion.div>
      )}

      {/* Next Race Card */}
      <div 
        className="card" 
        onClick={() => document.getElementById('nav-perfil')?.click()}
        style={{ 
          marginBottom: '2rem', 
          background: 'var(--surface-color)', 
          position: 'relative',
          overflow: 'hidden',
          borderLeft: '4px solid var(--primary-color)',
          cursor: 'pointer'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ 
            padding: '6px 14px', 
            borderRadius: '10px', 
            background: 'var(--surface-accent)', 
            color: 'var(--text-primary)', 
            fontSize: '0.7rem', 
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Próximo Desafio
          </div>
          <div style={{ background: 'rgba(0, 122, 255, 0.1)', padding: '6px', borderRadius: '50%' }}>
            <CalendarIcon size={16} color="var(--primary-color)" />
          </div>
        </div>
        
        {athlete.nextRaceName ? (
          <>
            <h4 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '4px' }}>{athlete.nextRaceName}</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              {new Date(athlete.nextRaceDate).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ background: 'var(--surface-accent)', padding: '6px 12px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 700 }}>
                <span style={{ color: 'var(--primary-color)' }}>
                  {Math.ceil((new Date(athlete.nextRaceDate) - new Date()) / (1000 * 60 * 60 * 24))}
                </span> dias
              </div>
            </div>
          </>
        ) : (
          <div style={{ padding: '0.5rem 0' }}>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Qual o seu próximo desafio?</p>
            <button 
              className="btn-primary" 
              onClick={() => document.getElementById('nav-perfil')?.click()}
              style={{ padding: '8px 16px', fontSize: '0.8rem' }}
            >
              Definir Prova Alvo
            </button>
          </div>
        )}
      </div>

      {/* Today's or Next Workout */}
      {displayWorkout ? (
        <div className="card" style={{ marginBottom: '2rem', padding: '1.5rem', borderLeft: isToday ? '4px solid var(--warning)' : '4px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div style={{ 
              padding: '6px 14px', 
              borderRadius: '10px', 
              background: 'var(--surface-accent)', 
              color: 'var(--text-primary)', 
              fontSize: '0.7rem', 
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Treino de Hoje: {displayWorkout.type}
            </div>
            <div style={{ background: 'rgba(255, 149, 0, 0.1)', padding: '6px', borderRadius: '50%' }}>
              <Zap size={18} color="var(--warning)" fill={displayWorkout.status === 'completed' ? "var(--warning)" : "none"} style={{ opacity: 0.8 }} />
            </div>
          </div>
          
          <h4 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>{displayWorkout.title}</h4>
          <p style={{ 
            color: 'var(--text-secondary)', 
            fontSize: '0.9rem', 
            marginBottom: '1.5rem', 
            lineHeight: '1.6',
            whiteSpace: 'pre-line' 
          }}>
            {displayWorkout.description}
          </p>
          
          <div style={{ display: 'flex', gap: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MapPin size={16} color="var(--text-secondary)" />
              <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{displayWorkout.metrics?.distance || '--'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={16} color="var(--text-secondary)" />
              <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{displayWorkout.metrics?.duration || '--'}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ marginBottom: '2rem', padding: '2rem', textAlign: 'center', background: 'var(--surface-accent)', border: '2px dashed var(--border-color)' }}>
          <div style={{ width: '48px', height: '48px', background: 'rgba(52, 199, 89, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <CalendarIcon size={24} color="var(--success)" />
          </div>
          <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Dia de Descanso</h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Aproveite para recuperar as energias! 🏃‍♂️⚡</p>
        </div>
      )}

      {/* Stats Quick View */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="card" style={{ padding: '1.25rem', border: 'none', background: 'var(--surface-accent)' }}>
          <TrendingUp size={18} color="var(--success)" style={{ marginBottom: '0.75rem' }} />
          <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Volume Semanal</p>
          <p style={{ fontSize: '1.25rem', fontWeight: 700 }}>{weeklyStats.distance} <span style={{ fontSize: '0.85rem' }}>km</span></p>
        </div>
        <div className="card" style={{ padding: '1.25rem', border: 'none', background: 'var(--surface-accent)' }}>
          <CalendarIcon size={18} color="var(--primary-color)" style={{ marginBottom: '0.75rem' }} />
          <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Treinos na Semana</p>
          <p style={{ fontSize: '1.25rem', fontWeight: 700 }}>{weeklyStats.completed}<span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}>/{weeklyStats.count}</span></p>
        </div>
      </div>
    </div>
  );
};

export default HomeView;
