import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Search, 
  ChevronRight, 
  Calendar, 
  TrendingUp, 
  Clock, 
  Zap, 
  MessageSquare, 
  Smartphone,
  ArrowLeft,
  Filter,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import TrainingView from './TrainingView';

const ProfessorView = ({ session }) => {
  const [athletes, setAthletes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedAthlete, setSelectedAthlete] = useState(null);
  const [athleteWorkouts, setAthleteWorkouts] = useState([]);
  const [loadingWorkouts, setLoadingWorkouts] = useState(false);

  useEffect(() => {
    fetchAthletes();
  }, []);

  const fetchAthletes = async () => {
    try {
      setLoading(true);
      // Fetch profiles that are athletes
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'athlete')
        .order('name', { ascending: true });

      if (error) throw error;
      setAthletes(data || []);
    } catch (err) {
      console.error('Erro ao buscar alunos:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAthleteWorkouts = async (athleteId) => {
    try {
      setLoadingWorkouts(true);
      const { data, error } = await supabase
        .from('workouts')
        .select('*')
        .eq('athlete_id', athleteId)
        .order('date', { ascending: false });

      if (error) throw error;
      setAthleteWorkouts(data || []);
    } catch (err) {
      console.error('Erro ao buscar treinos do aluno:', err);
    } finally {
      setLoadingWorkouts(false);
    }
  };

  const handleSelectAthlete = (athlete) => {
    setSelectedAthlete(athlete);
    fetchAthleteWorkouts(athlete.id);
  };

  const filteredAthletes = useMemo(() => {
    return athletes.filter(a => 
      (a.name || '').toLowerCase().includes(search.toLowerCase()) || 
      (a.email || '').toLowerCase().includes(search.toLowerCase())
    );
  }, [athletes, search]);

  if (selectedAthlete) {
    return (
      <div className="animate-slide-up" style={{ minHeight: '100vh', background: 'var(--bg-color)' }}>
        {/* Header Detalhe */}
        <header style={{ 
          padding: '1.5rem', 
          background: 'var(--surface-color)', 
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}>
          <button 
            onClick={() => setSelectedAthlete(null)}
            style={{ 
              background: 'var(--surface-accent)', 
              border: 'none', 
              borderRadius: '12px', 
              width: '40px', 
              height: '40px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: 'var(--text-primary)',
              cursor: 'pointer'
            }}
          >
            <ArrowLeft size={20} />
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: '1.1rem', fontWeight: 800 }}>{selectedAthlete.name}</h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Visualizando como Professor</p>
          </div>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
            {selectedAthlete.avatar_url ? (
              <img src={selectedAthlete.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', background: 'var(--surface-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-color)', fontWeight: 800 }}>
                {selectedAthlete.name?.charAt(0)}
              </div>
            )}
          </div>
        </header>

        <div style={{ padding: '1.5rem' }}>
            {loadingWorkouts ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 0', gap: '16px' }}>
                <Loader2 className="animate-spin" color="var(--primary-color)" size={32} />
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Carregando planilha...</p>
              </div>
            ) : (
              <TrainingView 
                athlete={selectedAthlete} 
                workouts={athleteWorkouts} 
                onRefresh={() => fetchAthleteWorkouts(selectedAthlete.id)}
                isRefreshing={loadingWorkouts}
              />
            )}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-slide-up" style={{ padding: '1.5rem', paddingBottom: '5rem' }}>
      <header style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '14px', background: 'linear-gradient(135deg, var(--primary-color), #0056b3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            <Users size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-0.5px' }}>Painel do Professor</h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Gerencie seus atletas e treinos</p>
          </div>
        </div>
      </header>

      {/* Stats Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '2rem' }}>
        <div className="card" style={{ padding: '1.25rem', border: 'none', background: 'var(--surface-accent)' }}>
          <Activity size={18} color="var(--primary-color)" style={{ marginBottom: '0.75rem' }} />
          <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Total Alunos</p>
          <p style={{ fontSize: '1.5rem', fontWeight: 900 }}>{athletes.length}</p>
        </div>
        <div className="card" style={{ padding: '1.25rem', border: 'none', background: 'var(--surface-accent)' }}>
          <CheckCircle2 size={18} color="var(--success)" style={{ marginBottom: '0.75rem' }} />
          <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Treinos Hoje</p>
          <p style={{ fontSize: '1.5rem', fontWeight: 900 }}>--</p>
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ position: 'relative', marginBottom: '2rem' }}>
        <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
        <input 
          type="text" 
          placeholder="Buscar aluno por nome ou e-mail..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '16px 16px 16px 48px',
            borderRadius: '16px',
            border: '1px solid var(--border-color)',
            background: 'var(--surface-color)',
            fontSize: '0.95rem',
            fontWeight: 500,
            color: 'var(--text-primary)',
            outline: 'none',
            transition: 'all 0.2s',
            boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
          }}
        />
      </div>

      {/* Athlete List */}
      <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '1rem', letterSpacing: '0.5px' }}>
        Meus Alunos ({filteredAthletes.length})
      </h3>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 0', gap: '16px' }}>
          <Loader2 className="animate-spin" color="var(--primary-color)" size={32} />
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Carregando base de alunos...</p>
        </div>
      ) : filteredAthletes.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredAthletes.map(athlete => (
            <motion.div 
              key={athlete.id}
              whileHover={{ scale: 0.98 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => handleSelectAthlete(athlete)}
              className="card"
              style={{
                padding: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                cursor: 'pointer',
                border: '1px solid var(--border-color)',
                background: 'var(--surface-color)'
              }}
            >
              <div style={{ width: '52px', height: '52px', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border-color)', flexShrink: 0 }}>
                {athlete.avatar_url ? (
                  <img src={athlete.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', background: 'var(--surface-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-color)', fontWeight: 800, fontSize: '1.1rem' }}>
                    {athlete.name?.charAt(0)}
                  </div>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '2px' }}>{athlete.name}</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                    <Zap size={12} color="var(--primary-color)" />
                    <span style={{ fontWeight: 600 }}>VAM: {athlete.vam || '--'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                    <Calendar size={12} color="var(--primary-color)" />
                    <span style={{ fontWeight: 600 }}>{athlete.next_race_name ? 'Tem Prova' : 'Sem Prova'}</span>
                  </div>
                </div>
              </div>
              <ChevronRight size={20} color="var(--border-color)" />
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ padding: '3rem 2rem', textAlign: 'center', background: 'var(--surface-accent)', border: '2px dashed var(--border-color)' }}>
          <Search size={32} color="var(--border-color)" style={{ marginBottom: '1rem' }} />
          <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Nenhum aluno encontrado.</p>
        </div>
      )}
    </div>
  );
};

export default ProfessorView;
