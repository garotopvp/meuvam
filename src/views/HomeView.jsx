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
          borderLeft: '5px solid var(--primary-color)',
          cursor: 'pointer',
          padding: '1.5rem'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ 
            padding: '6px 14px', 
            borderRadius: '10px', 
            background: 'rgba(255, 59, 48, 0.08)', 
            color: 'var(--primary-color)', 
            fontSize: '0.75rem', 
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Próximo Desafio
          </div>
          <div style={{ background: 'var(--surface-accent)', padding: '8px', borderRadius: '50%' }}>
            <CalendarIcon size={18} color="var(--primary-color)" />
          </div>
        </div>
        
        {athlete.nextRaceName ? (
          <>
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '4px', letterSpacing: '-0.5px' }}>{athlete.nextRaceName}</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>
                {new Date(athlete.nextRaceDate).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
            
            {(() => {
              const totalDays = 90; // Exemplo de ciclo de 90 dias
              const daysLeft = Math.ceil((new Date(athlete.nextRaceDate) - new Date()) / (1000 * 60 * 60 * 24));
              const progress = Math.max(0, Math.min(100, ((totalDays - daysLeft) / totalDays) * 100));
              
              return (
                <div style={{ marginTop: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Faltam {daysLeft} dias</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--primary-color)' }}>{Math.round(progress)}%</span>
                  </div>
                  <div style={{ height: '8px', background: 'var(--surface-accent)', borderRadius: '10px', overflow: 'hidden' }}>
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                      style={{ height: '100%', background: 'var(--primary-gradient)', borderRadius: '10px' }}
                    />
                  </div>
                </div>
              );
            })()}
          </>
        ) : (
          <div style={{ padding: '0.5rem 0', textAlign: 'center' }}>
            <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', fontWeight: 500 }}>Qual o seu próximo grande desafio?</p>
            <button 
              className="btn-primary" 
              onClick={(e) => {
                e.stopPropagation();
                document.getElementById('nav-perfil')?.click();
              }}
              style={{ padding: '12px 24px', fontSize: '0.9rem', width: '100%' }}
            >
              Definir Prova Alvo
            </button>
          </div>
        )}
      </div>

      {/* Today's or Next Workout */}
      {displayWorkout ? (
        <div className="card" style={{ marginBottom: '2rem', padding: '1.75rem', borderLeft: isToday ? '5px solid var(--warning)' : '5px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div style={{ 
              padding: '6px 14px', 
              borderRadius: '10px', 
              background: 'rgba(255, 149, 0, 0.1)', 
              color: 'var(--warning)', 
              fontSize: '0.75rem', 
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              {isToday ? 'Treino de Hoje' : 'Próximo Treino'}
            </div>
            <div style={{ background: 'rgba(255, 149, 0, 0.1)', padding: '10px', borderRadius: '50%' }}>
              <Zap size={20} color="var(--warning)" fill={displayWorkout.status === 'completed' ? "var(--warning)" : "none"} style={{ opacity: 0.9 }} />
            </div>
          </div>
          
          <h4 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.75rem', letterSpacing: '-0.3px' }}>{displayWorkout.title}</h4>
          <p style={{ 
            color: 'var(--text-secondary)', 
            fontSize: '0.95rem', 
            marginBottom: '1.75rem', 
            lineHeight: '1.6',
            fontWeight: 500,
            whiteSpace: 'pre-line' 
          }}>
            {displayWorkout.description}
          </p>
          
          <div style={{ display: 'flex', gap: '30px', background: 'var(--surface-accent)', padding: '15px 20px', borderRadius: '18px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                <MapPin size={14} />
                <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' }}>Distância</span>
              </div>
              <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>{displayWorkout.metrics?.distance || '--'}</span>
            </div>
            <div style={{ width: '1px', background: 'var(--border-color)' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                <Clock size={14} />
                <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' }}>Duração</span>
              </div>
              <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>{displayWorkout.metrics?.duration || '--'}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ marginBottom: '2rem', padding: '2.5rem', textAlign: 'center', background: 'var(--surface-accent)', border: '2px dashed var(--border-color)', boxShadow: 'none' }}>
          <div style={{ width: '56px', height: '56px', background: 'rgba(52, 199, 89, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
            <CalendarIcon size={28} color="var(--success)" />
          </div>
          <h4 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.5rem' }}>Dia de Descanso</h4>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Aproveite para recuperar as energias! 🏃‍♂️⚡</p>
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
