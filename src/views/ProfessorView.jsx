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
  const [viewTab, setViewTab] = useState('planilha'); // 'planilha' ou 'atividades'


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

        <div style={{ padding: '0 1.5rem', marginBottom: '1rem' }}>
          <div style={{ 
            display: 'flex', 
            background: 'var(--surface-accent)', 
            padding: '4px', 
            borderRadius: '14px',
            gap: '4px'
          }}>
            <button 
              onClick={() => setViewTab('planilha')}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '10px',
                border: 'none',
                background: viewTab === 'planilha' ? 'var(--surface-color)' : 'transparent',
                color: viewTab === 'planilha' ? 'var(--primary-color)' : 'var(--text-secondary)',
                fontWeight: 800,
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: viewTab === 'planilha' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none'
              }}
            >
              Planilha
            </button>
            <button 
              onClick={() => setViewTab('atividades')}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '10px',
                border: 'none',
                background: viewTab === 'atividades' ? 'var(--surface-color)' : 'transparent',
                color: viewTab === 'atividades' ? 'var(--primary-color)' : 'var(--text-secondary)',
                fontWeight: 800,
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: viewTab === 'atividades' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none'
              }}
            >
              Atividades Strava
            </button>
          </div>
        </div>

        <div style={{ padding: '0 1.5rem 1.5rem' }}>
            {viewTab === 'planilha' ? (
              loadingWorkouts ? (
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
                  isProfessor={true}
                />
              )
            ) : (
              <StravaFeed athlete={selectedAthlete} />
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

const StravaFeed = ({ athlete }) => {
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

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4rem 0', gap: '16px' }}>
        <Loader2 className="animate-spin" color="#FC5200" size={32} />
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Buscando feed de atividades...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--error)', background: 'var(--surface-color)', borderRadius: '24px', border: '1px solid var(--border-color)' }}>
        <AlertCircle size={40} style={{ marginBottom: '1rem', opacity: 0.5 }} />
        <p style={{ fontWeight: 600 }}>{error}</p>
        <button onClick={fetchActivities} style={{ marginTop: '1rem', background: 'none', border: 'none', color: 'var(--primary-color)', fontWeight: 800, cursor: 'pointer' }}>Tentar novamente</button>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div style={{ padding: '4rem 2rem', textAlign: 'center', background: 'var(--surface-color)', borderRadius: '24px', border: '2px dashed var(--border-color)' }}>
        <Activity size={48} color="var(--border-color)" style={{ marginBottom: '1rem' }} />
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>Sem Atividades Recentes</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '280px', margin: '0 auto' }}>
          O aluno ainda não possui atividades sincronizadas ou o Strava não está conectado.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
        <div style={{ background: '#FC5200', padding: '8px', borderRadius: '10px' }}>
          <Activity size={20} color="#fff" />
        </div>
        <h3 style={{ fontSize: '1rem', fontWeight: 900 }}>Feed Strava: {athlete.name}</h3>
      </div>
      
      {activities.map((activity, idx) => (
        <motion.div 
          key={idx}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.05 }}
          style={{ 
            padding: '1.5rem', 
            background: 'var(--surface-color)', 
            borderRadius: '24px', 
            border: '1px solid var(--border-color)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '4px' }}>{activity.title}</h4>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                {new Date(activity.date).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </div>
            </div>
            <div style={{ background: 'rgba(252, 82, 0, 0.1)', color: '#FC5200', padding: '6px 12px', borderRadius: '100px', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}>
              {activity.type}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', padding: '1rem', background: 'var(--surface-accent)', borderRadius: '16px' }}>
            <div>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Distância</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#FC5200' }}>{activity.metrics.distance}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Pace</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-primary)' }}>{activity.metrics.pace}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Tempo</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-primary)' }}>{activity.metrics.duration}</div>
            </div>
          </div>
          
          <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#FC5200' }} />
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>{activity.description}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default ProfessorView;
