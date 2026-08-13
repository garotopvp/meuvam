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
  Clock,
  FileText,
  Layers,
  Map,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  ArrowUpDown
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import WeeklyPlanner from '../components/WeeklyPlanner';
import { workoutTemplates } from '../data/workoutTemplates';

const ProfessorDashboard = ({ session, onLogout }) => {
  const [activeTab, setActiveTab] = useState('planner'); // planner or chat
  const [leftSidebarTab, setLeftSidebarTab] = useState('athletes'); // athletes, workouts, plans, routes
  const [athletes, setAthletes] = useState([]);
  const [selectedAthlete, setSelectedAthlete] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Biblioteca de Treinos states
  const [librarySearchQuery, setLibrarySearchQuery] = useState('');
  const [expandedFolders, setExpandedFolders] = useState({
    recentes: true,
    minha: false,
    bike: true,
    default: false,
    other: false,
    run: true,
    swim: true
  });
  const [localTemplates, setLocalTemplates] = useState(workoutTemplates);

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

  useEffect(() => {
    fetchAthletes();
  }, []);

  const filteredAthletes = athletes.filter(a => 
    a.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleFolder = (folderKey) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderKey]: !prev[folderKey]
    }));
  };

  // Filtragem dos modelos de treino na biblioteca
  const filteredTemplates = localTemplates.filter(t => 
    t.title.toLowerCase().includes(librarySearchQuery.toLowerCase()) ||
    t.description.toLowerCase().includes(librarySearchQuery.toLowerCase())
  );

  const getTemplatesByCategory = (categoryKeyword) => {
    return filteredTemplates.filter(t => t.category.toLowerCase().includes(categoryKeyword.toLowerCase()));
  };

  // Adicionar um novo treino modelo na biblioteca localmente
  const handleAddNewTemplate = () => {
    const title = prompt("Digite o título do novo treino modelo:");
    if (!title) return;
    const type = prompt("Digite o tipo (bike, run, swim, other):", "run");
    const description = prompt("Digite a descrição/instruções do treino:");
    const duration = prompt("Duração aproximada (ex: 1h):", "1h");
    const distance = prompt("Distância aproximada (ex: 10 km):", "10 km");

    const newT = {
      id: `t-custom-${Date.now()}`,
      title,
      type: type || 'run',
      category: type === 'bike' ? 'Bike (TrainingPeaks)' : type === 'swim' ? 'Swim (TrainingPeaks)' : type === 'run' ? 'Run (TrainingPeaks)' : 'Other (TrainingPeaks)',
      description: description || 'Nenhuma descrição fornecida.',
      metrics: { distance: distance || 'N/A', duration: duration || 'N/A' }
    };

    setLocalTemplates(prev => [newT, ...prev]);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-color)', color: 'var(--text-primary)', overflow: 'hidden' }}>
      
      {/* 1. SLIM SIDEBAR (Estilo TrainingPeaks) */}
      <nav style={{
        width: '75px',
        background: 'var(--surface-color)',
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '20px 0',
        gap: '24px',
        zIndex: 10
      }}>
        <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', marginBottom: '10px' }}>
          <Activity size={24} />
        </div>

        {/* Botão Biblioteca de Atletas */}
        <button 
          onClick={() => setLeftSidebarTab('athletes')}
          title="Biblioteca de Atletas"
          style={{
            width: '50px',
            height: '50px',
            borderRadius: '12px',
            border: 'none',
            background: leftSidebarTab === 'athletes' ? 'var(--primary-color)15' : 'transparent',
            color: leftSidebarTab === 'athletes' ? 'var(--primary-color)' : 'var(--text-secondary)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '0.65rem',
            fontWeight: 700,
            gap: '4px',
            transition: 'all 0.2s'
          }}
        >
          <Users size={20} />
          <span style={{ fontSize: '7px', whiteSpace: 'nowrap' }}>Atletas</span>
        </button>

        {/* Botão Biblioteca de Treinos */}
        <button 
          onClick={() => setLeftSidebarTab('workouts')}
          title="Biblioteca de Treinos"
          style={{
            width: '50px',
            height: '50px',
            borderRadius: '12px',
            border: 'none',
            background: leftSidebarTab === 'workouts' ? 'var(--primary-color)15' : 'transparent',
            color: leftSidebarTab === 'workouts' ? 'var(--primary-color)' : 'var(--text-secondary)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '0.65rem',
            fontWeight: 700,
            gap: '4px',
            transition: 'all 0.2s'
          }}
        >
          <FileText size={20} />
          <span style={{ fontSize: '7px', whiteSpace: 'nowrap' }}>Treinos</span>
        </button>

        {/* Botão Planos de Treino */}
        <button 
          onClick={() => setLeftSidebarTab('plans')}
          title="Planos de Treino"
          style={{
            width: '50px',
            height: '50px',
            borderRadius: '12px',
            border: 'none',
            background: leftSidebarTab === 'plans' ? 'var(--primary-color)15' : 'transparent',
            color: leftSidebarTab === 'plans' ? 'var(--primary-color)' : 'var(--text-secondary)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '0.65rem',
            fontWeight: 700,
            gap: '4px',
            transition: 'all 0.2s'
          }}
        >
          <Layers size={20} />
          <span style={{ fontSize: '7px', whiteSpace: 'nowrap' }}>Planos</span>
        </button>

        {/* Botão Biblioteca de Rotas */}
        <button 
          onClick={() => setLeftSidebarTab('routes')}
          title="Biblioteca de Rotas"
          style={{
            width: '50px',
            height: '50px',
            borderRadius: '12px',
            border: 'none',
            background: leftSidebarTab === 'routes' ? 'var(--primary-color)15' : 'transparent',
            color: leftSidebarTab === 'routes' ? 'var(--primary-color)' : 'var(--text-secondary)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '0.65rem',
            fontWeight: 700,
            gap: '4px',
            transition: 'all 0.2s'
          }}
        >
          <Map size={20} />
          <span style={{ fontSize: '7px', whiteSpace: 'nowrap' }}>Rotas</span>
        </button>

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <button 
            onClick={onLogout}
            title="Sair"
            style={{ width: '40px', height: '40px', borderRadius: '50%', border: 'none', background: 'transparent', color: 'var(--danger-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <LogOut size={20} />
          </button>
        </div>
      </nav>

      {/* 2. SECONDARY SIDEBAR / DRAWER PANEL */}
      <aside style={{ 
        width: '320px', 
        borderRight: '1px solid var(--border-color)', 
        display: 'flex', 
        flexDirection: 'column', 
        background: 'var(--surface-color)',
        transition: 'all 0.3s ease'
      }}>
        
        {/* CONTEÚDO DA ABA: ATLETAS */}
        {leftSidebarTab === 'athletes' && (
          <>
            <div style={{ padding: '24px', borderBottom: '1px solid var(--border-color)' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '16px' }}>Biblioteca de Atletas</h2>
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
          </>
        )}

        {/* CONTEÚDO DA ABA: BIBLIOTECA DE TREINOS (Estilo TrainingPeaks) */}
        {leftSidebarTab === 'workouts' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            
            {/* Header da Biblioteca */}
            <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>Biblioteca de Treinos</h2>
                <button 
                  onClick={() => setLeftSidebarTab('athletes')} 
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: 'var(--text-secondary)' }}
                >
                  ✕
                </button>
              </div>

              {/* Botões de Ação */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <button 
                  onClick={handleAddNewTemplate}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'var(--primary-color)',
                    color: 'white',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  <Plus size={16} /> Criar Modelo
                </button>
              </div>

              {/* Busca */}
              <div style={{ position: 'relative', marginBottom: '12px' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input 
                  type="text" 
                  placeholder="Pesquisar..." 
                  value={librarySearchQuery}
                  onChange={(e) => setLibrarySearchQuery(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px 8px 30px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', fontSize: '0.85rem', outline: 'none' }}
                />
              </div>

              {/* Ordenar e Filtrar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <button style={{ background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: 'inherit', fontWeight: 600 }}>
                  <ArrowUpDown size={12} /> Ordenar
                </button>
                <button style={{ background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: 'inherit', fontWeight: 600 }}>
                  <Filter size={12} /> Filtrar
                </button>
              </div>
            </div>

            {/* Lista de Pastas Colapsáveis (Árvore de Treinos) */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px 16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                
                {/* 1. Recentes */}
                <div>
                  <button 
                    onClick={() => toggleFolder('recentes')}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}
                  >
                    <span>▶ Recentes ({getTemplatesByCategory('run').slice(0,2).length})</span>
                  </button>
                  {expandedFolders.recentes && (
                    <div style={{ paddingLeft: '14px', borderLeft: '1px dashed var(--border-color)', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {getTemplatesByCategory('run').slice(0, 2).map(t => <TemplateItem key={t.id} template={t} />)}
                    </div>
                  )}
                </div>

                {/* 2. A Minha Biblioteca */}
                <div>
                  <button 
                    onClick={() => toggleFolder('minha')}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}
                  >
                    <span>▶ A Minha Biblioteca ({localTemplates.filter(t => t.id.includes('custom')).length})</span>
                  </button>
                  {expandedFolders.minha && (
                    <div style={{ paddingLeft: '14px', borderLeft: '1px dashed var(--border-color)', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {localTemplates.filter(t => t.id.includes('custom')).length === 0 ? (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', padding: '6px' }}>Nenhum modelo customizado criado ainda.</div>
                      ) : (
                        localTemplates.filter(t => t.id.includes('custom')).map(t => <TemplateItem key={t.id} template={t} />)
                      )}
                    </div>
                  )}
                </div>

                {/* 3. Bike */}
                <div>
                  <button 
                    onClick={() => toggleFolder('bike')}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}
                  >
                    <span>▶ Bike (TrainingPeaks) ({getTemplatesByCategory('bike').length})</span>
                  </button>
                  {expandedFolders.bike && (
                    <div style={{ paddingLeft: '14px', borderLeft: '1px dashed var(--border-color)', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {getTemplatesByCategory('bike').map(t => <TemplateItem key={t.id} template={t} />)}
                    </div>
                  )}
                </div>

                {/* 4. Run */}
                <div>
                  <button 
                    onClick={() => toggleFolder('run')}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}
                  >
                    <span>▶ Run (TrainingPeaks) ({getTemplatesByCategory('run').length})</span>
                  </button>
                  {expandedFolders.run && (
                    <div style={{ paddingLeft: '14px', borderLeft: '1px dashed var(--border-color)', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {getTemplatesByCategory('run').map(t => <TemplateItem key={t.id} template={t} />)}
                    </div>
                  )}
                </div>

                {/* 5. Swim */}
                <div>
                  <button 
                    onClick={() => toggleFolder('swim')}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}
                  >
                    <span>▶ Swim (TrainingPeaks) ({getTemplatesByCategory('swim').length})</span>
                  </button>
                  {expandedFolders.swim && (
                    <div style={{ paddingLeft: '14px', borderLeft: '1px dashed var(--border-color)', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {getTemplatesByCategory('swim').map(t => <TemplateItem key={t.id} template={t} />)}
                    </div>
                  )}
                </div>

                {/* 6. Other */}
                <div>
                  <button 
                    onClick={() => toggleFolder('other')}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}
                  >
                    <span>▶ Outros ({getTemplatesByCategory('other').length})</span>
                  </button>
                  {expandedFolders.other && (
                    <div style={{ paddingLeft: '14px', borderLeft: '1px dashed var(--border-color)', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {getTemplatesByCategory('other').map(t => <TemplateItem key={t.id} template={t} />)}
                    </div>
                  )}
                </div>

              </div>
            </div>

            <div style={{ padding: '12px', borderTop: '1px solid var(--border-color)', background: 'var(--surface-accent)10', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 500 }}>💡 Arraste o modelo e solte-o no planejador</span>
            </div>
          </div>
        )}

        {/* CONTEÚDO DE OUTRAS ABAS (Placeholders visuais) */}
        {(leftSidebarTab === 'plans' || leftSidebarTab === 'routes') && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '40px 24px', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: '16px' }}>
            <Layers size={48} color="var(--primary-color)" style={{ opacity: 0.3 }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Biblioteca em Breve</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              Esta biblioteca de {leftSidebarTab === 'plans' ? 'Planos de Treino' : 'Rotas'} está sendo otimizada e estará disponível nas próximas versões!
            </p>
            <button 
              onClick={() => setLeftSidebarTab('athletes')} 
              style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: 'var(--primary-color)', color: 'white', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}
            >
              Voltar aos Alunos
            </button>
          </div>
        )}

      </aside>

      {/* 3. MAIN CONTENT (Athlete Dashboard & WeeklyPlanner) */}
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
                <WeeklyPlanner athleteId={selectedAthlete.id} athleteVam={selectedAthlete.vam} />
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

// Componente Interno para Renderizar um item de Modelo da Biblioteca
const TemplateItem = ({ template }) => {
  const handleDragStart = (e) => {
    // Configura os metadados do drag
    e.dataTransfer.setData('workout-template', JSON.stringify({
      title: template.title,
      type: template.type,
      description: template.description,
      metrics: template.metrics
    }));
  };

  const getBorderColorByType = () => {
    switch (template.type) {
      case 'bike': return 'rgba(0,122,255,0.4)';
      case 'run': return 'rgba(255,149,0,0.4)';
      case 'swim': return 'rgba(52,199,89,0.4)';
      default: return 'var(--border-color)';
    }
  };

  const getIconColorByType = () => {
    switch (template.type) {
      case 'bike': return '#007AFF';
      case 'run': return '#FF9500';
      case 'swim': return '#34C759';
      default: return 'var(--text-secondary)';
    }
  };

  return (
    <div 
      draggable
      onDragStart={handleDragStart}
      style={{
        padding: '10px 12px',
        background: 'var(--bg-color)',
        borderRadius: '8px',
        borderLeft: `4px solid ${getBorderColorByType()}`,
        boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
        cursor: 'grab',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        fontSize: '0.8rem',
        userSelect: 'none',
        transition: 'all 0.2s'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 10px rgba(0,0,0,0.08)';
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.03)';
        e.currentTarget.style.transform = 'none';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700 }}>
        <span style={{ color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '170px' }}>{template.title}</span>
        <Dumbbell size={12} style={{ color: getIconColorByType() }} />
      </div>
      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'flex', gap: '8px' }}>
        {template.metrics?.duration && <span>⏱ {template.metrics.duration}</span>}
        {template.metrics?.distance && template.metrics.distance !== 'N/A' && <span>🏃 {template.metrics.distance}</span>}
      </div>
    </div>
  );
};

export default ProfessorDashboard;
