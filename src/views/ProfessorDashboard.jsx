import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Calendar, 
  MessageSquare, 
  Settings, 
  LogOut, 
  ChevronRight, 
  Plus, 
  Search,
  Filter,
  MoreVertical,
  Activity,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import WeeklyPlanner from '../components/WeeklyPlanner';

const ProfessorDashboard = ({ session, onLogout }) => {
  const [activeTab, setActiveTab] = useState('planner');
  const [athletes, setAthletes] = useState([]);
  const [selectedAthlete, setSelectedAthlete] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchAthletes();
  }, []);

  const fetchAthletes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'athlete')
        .order('name');

      if (error) throw error;
      setAthletes(data || []);
      if (data?.length > 0) setSelectedAthlete(data[0]);
    } catch (err) {
      console.error('Erro ao buscar atletas:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredAthletes = athletes.filter(a => 
    a.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-color)', color: 'var(--text-primary)', overflow: 'hidden' }}>
      {/* Sidebar */}
      <aside style={{ width: '280px', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', background: 'var(--surface-color)' }}>
        <div style={{ padding: '24px', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <Activity size={24} />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>MeuVAM <span style={{ fontSize: '0.7rem', color: 'var(--primary-color)', display: 'block', fontWeight: 600 }}>PAINEL PRO</span></h2>
          </div>

          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input 
              type="text" 
              placeholder="Buscar atleta..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', fontSize: '0.9rem', outline: 'none' }}
            />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
          <div style={{ marginBottom: '12px', padding: '0 12px' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Seus Atletas ({filteredAthletes.length})</span>
          </div>
          {loading ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>Carregando...</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {filteredAthletes.map(athlete => (
                <button
                  key={athlete.id}
                  onClick={() => setSelectedAthlete(athlete)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: 'none',
                    background: selectedAthlete?.id === athlete.id ? 'var(--primary-color)15' : 'transparent',
                    color: selectedAthlete?.id === athlete.id ? 'var(--primary-color)' : 'var(--text-primary)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--surface-accent)', overflow: 'hidden' }}>
                    {athlete.avatar_url ? <img src={athlete.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Users size={18} /></div>}
                  </div>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{athlete.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>VAM: {athlete.vam || '--'}</div>
                  </div>
                  {selectedAthlete?.id === athlete.id && <ChevronRight size={16} />}
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ padding: '16px', borderTop: '1px solid var(--border-color)' }}>
          <button 
            onClick={onLogout}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', borderRadius: '10px', border: 'none', background: 'transparent', color: 'var(--danger-color)', cursor: 'pointer', fontWeight: 600 }}
          >
            <LogOut size={18} /> Sair da Conta
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {selectedAthlete ? (
          <>
            <header style={{ padding: '24px 40px', background: 'var(--surface-color)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '4px' }}>
                  <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>{selectedAthlete.name}</h1>
                  <div style={{ padding: '4px 12px', borderRadius: '20px', background: 'var(--surface-accent)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    OBJETIVO: {selectedAthlete.objective || 'NÃO DEFINIDO'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '24px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Activity size={14} /> VAM: <strong>{selectedAthlete.vam || '--'} km/h</strong></span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Clock size={14} /> Peso: <strong>{selectedAthlete.weight || '--'} kg</strong></span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  onClick={() => setActiveTab('planner')}
                  style={{ padding: '10px 20px', borderRadius: '10px', border: '1px solid var(--border-color)', background: activeTab === 'planner' ? 'var(--primary-color)' : 'var(--surface-color)', color: activeTab === 'planner' ? 'white' : 'var(--text-primary)', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <Calendar size={18} /> Planejador
                </button>
                <button 
                  onClick={() => setActiveTab('chat')}
                  style={{ padding: '10px 20px', borderRadius: '10px', border: '1px solid var(--border-color)', background: activeTab === 'chat' ? 'var(--primary-color)' : 'var(--surface-color)', color: activeTab === 'chat' ? 'white' : 'var(--text-primary)', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <MessageSquare size={18} /> Chat
                </button>
              </div>
            </header>

            <div style={{ flex: 1, overflowY: 'auto', padding: '40px' }}>
              {activeTab === 'planner' ? (
                <WeeklyPlanner athleteId={selectedAthlete.id} />
              ) : (
                <div style={{ height: '100%', background: 'var(--surface-color)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                  Interface de Chat em breve...
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
            <Users size={64} style={{ marginBottom: '20px', opacity: 0.2 }} />
            <h3>Selecione um atleta para começar</h3>
            <p>Clique em um atleta na barra lateral para gerenciar sua planilha.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default ProfessorDashboard;
