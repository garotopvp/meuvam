import React from 'react';
import { 
  Zap, 
  MapPin, 
  Clock, 
  TrendingUp, 
  Calendar as CalendarIcon 
} from 'lucide-react';
import { motion } from 'framer-motion';

const HomeView = ({ athlete, workouts }) => {
  // Find closest workout to today (pending)
  const today = new Date().toISOString().split('T')[0];
  const todayWorkout = workouts.find(w => w.date >= today && w.status === 'pending') || workouts[0];

  if (!workouts || workouts.length === 0) {
    return (
      <div className="animate-slide-up">
        <header style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500 }}>Bem-vindo de volta,</p>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>{athlete.name}</h1>
          </div>
          <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'var(--surface-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-color)', fontWeight: '700', border: '1px solid var(--border-color)', fontSize: '0.9rem', overflow: 'hidden' }}>
            {athlete.profileImage ? <img src={athlete.profileImage} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : athlete.avatar}
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
      </header>

      {/* Next Race Card */}
      <div className="card" style={{ 
        marginBottom: '2rem', 
        background: 'var(--surface-color)', 
        position: 'relative',
        overflow: 'hidden',
        borderLeft: '4px solid var(--primary-color)'
      }}>
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
        
        <h4 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '4px' }}>Maratona de SP</h4>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>2026-06-15</p>
        
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ background: 'var(--surface-accent)', padding: '6px 12px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 700 }}>
            <span style={{ color: 'var(--primary-color)' }}>49</span> dias
          </div>
        </div>
      </div>

      {/* Today's Workout */}
      <div className="card" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
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
            {todayWorkout.type}
          </div>
          <div style={{ background: 'rgba(255, 149, 0, 0.1)', padding: '6px', borderRadius: '50%' }}>
            <Zap size={18} color="var(--warning)" fill="var(--warning)" style={{ opacity: 0.8 }} />
          </div>
        </div>
        
        <h4 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>{todayWorkout.title}</h4>
        <p style={{ 
          color: 'var(--text-secondary)', 
          fontSize: '0.9rem', 
          marginBottom: '1.5rem', 
          lineHeight: '1.6',
          whiteSpace: 'pre-line' 
        }}>
          {todayWorkout.description}
        </p>
        
        <div style={{ display: 'flex', gap: '24px', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <MapPin size={16} color="var(--text-secondary)" />
            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{todayWorkout.metrics?.distance || '--'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={16} color="var(--text-secondary)" />
            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{todayWorkout.metrics?.duration || '--'}</span>
          </div>
        </div>
        
        <button className="btn-primary" style={{ 
          width: '100%', 
          background: 'var(--primary-color)',
          boxShadow: '0 8px 20px rgba(0, 122, 255, 0.2)' 
        }}>
          Iniciar Treino
        </button>
      </div>

      {/* Stats Quick View */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="card" style={{ padding: '1.25rem', border: 'none', background: 'var(--surface-accent)' }}>
          <TrendingUp size={18} color="var(--success)" style={{ marginBottom: '0.75rem' }} />
          <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Volume</p>
          <p style={{ fontSize: '1.25rem', fontWeight: 700 }}>{athlete.stats?.weeklyDistance || '0'} <span style={{ fontSize: '0.85rem' }}>km</span></p>
        </div>
        <div className="card" style={{ padding: '1.25rem', border: 'none', background: 'var(--surface-accent)' }}>
          <Zap size={18} color="var(--primary-color)" style={{ marginBottom: '0.75rem' }} />
          <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Ritmo</p>
          <p style={{ fontSize: '1.25rem', fontWeight: 700 }}>{athlete.stats?.averagePace || '--'} <span style={{ fontSize: '0.85rem' }}>/km</span></p>
        </div>
      </div>
    </div>
  );
};

export default HomeView;
