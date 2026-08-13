import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, Award, Calendar, Plus, Trash2, Zap } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell
} from 'recharts';

const EvolutionView = ({ session }) => {
  const [history, setHistory] = useState([]);
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedChartType, setSelectedChartType] = useState('VAM');
  const [newTest, setNewTest] = useState({
    test_type: 'VAM',
    result: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const testTypes = ['VAM', '5km', '10km', '21km', '42km', 'Outro'];

  const fetchHistory = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('test_history')
      .select('*')
      .eq('athlete_id', session.user.id)
      .order('date', { ascending: true }); // Ordenado para o gráfico

    if (!error) setHistory(data || []);
    setLoading(false);
  };

  const fetchWorkouts = async () => {
    const { data, error } = await supabase
      .from('workouts')
      .select('*')
      .eq('athlete_id', session.user.id)
      .eq('status', 'completed')
      .order('date', { ascending: true });
    if (!error) setWorkouts(data || []);
  };

  useEffect(() => {
    if (session?.user) {
      fetchHistory();
      fetchWorkouts();
    }
  }, [session]);

  const handleAdd = async () => {
    if (!newTest.result) return;
    
    const { error } = await supabase
      .from('test_history')
      .insert([{
        ...newTest,
        athlete_id: session.user.id
      }]);

    if (!error) {
      setShowAdd(false);
      setNewTest({ test_type: 'VAM', result: '', date: new Date().toISOString().split('T')[0], notes: '' });
      fetchHistory();
    }
  };

  const deleteTest = async (id) => {
    if (!confirm('Excluir este registro?')) return;
    const { error } = await supabase.from('test_history').delete().eq('id', id);
    if (!error) fetchHistory();
  };

  const getBestResult = (type) => {
    const tests = history.filter(h => h.test_type === type).sort((a, b) => new Date(b.date) - new Date(a.date));
    if (tests.length === 0) return null;
    return tests[0];
  };

  // Prepara dados para o gráfico
  const chartData = useMemo(() => {
    return history
      .filter(h => h.test_type === selectedChartType)
      .map(h => {
        // Tenta converter resultado para número para o gráfico
        let numericValue = 0;
        if (h.result.includes(':')) {
          const [m, s] = h.result.split(':').map(Number);
          numericValue = m + (s / 60);
        } else {
          numericValue = parseFloat(h.result) || 0;
        }
        
        return {
          date: new Date(h.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          valor: numericValue,
          original: h.result
        };
      });
  }, [history, selectedChartType]);

  const monthlyVolumeData = useMemo(() => {
    // Agrupa por mês nos últimos 6 meses
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const now = new Date();
    const last6 = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      last6.push({
        month: months[d.getMonth()],
        year: d.getFullYear(),
        monthIdx: d.getMonth(),
        distancia: 0
      });
    }

    // Soma distâncias dos treinos reais completados do Supabase
    workouts.forEach(wk => {
      if (!wk.date) return;
      const d = new Date(wk.date + 'T12:00:00');
      const wkMonth = d.getMonth();
      const wkYear = d.getFullYear();
      
      const bucket = last6.find(m => m.monthIdx === wkMonth && m.year === wkYear);
      if (bucket) {
        let dist = 0;
        if (wk.metrics?.distance) {
          dist = parseFloat(wk.metrics.distance.replace(/[^\d.]/g, '')) || 0;
        } else if (wk.distance) {
          dist = parseFloat(wk.distance) || 0;
        }
        bucket.distancia += dist;
      }
    });

    return last6.map(m => ({
      ...m,
      distancia: Math.round(m.distancia)
    }));
  }, [workouts]);

  return (
    <div className="animate-slide-up">
      <header style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.5px' }}>Evolução</h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Suas marcas e conquistas</p>
        </div>
        <button 
          onClick={() => setShowAdd(true)}
          style={{ 
            background: 'var(--primary-gradient)', 
            color: 'white', 
            border: 'none', 
            width: '48px', 
            height: '48px', 
            borderRadius: '16px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-active)'
          }}
        >
          <Plus size={26} />
        </button>
      </header>

      {/* Chart Section */}
      <div className="card" style={{ marginBottom: '2.5rem', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>Progresso</h3>
          <select 
            value={selectedChartType} 
            onChange={(e) => setSelectedChartType(e.target.value)}
            style={{ 
              padding: '6px 12px', 
              borderRadius: '10px', 
              border: '1px solid var(--border-color)', 
              background: 'var(--surface-accent)',
              fontSize: '0.8rem',
              fontWeight: 700,
              outline: 'none'
            }}
          >
            {testTypes.filter(t => t !== 'Outro').map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div style={{ width: '100%', height: 200 }}>
          {chartData.length > 1 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary-color)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--primary-color)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} 
                  dy={10}
                />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: 'var(--shadow-premium)',
                    fontSize: '0.8rem',
                    fontWeight: 700
                  }}
                  formatter={(value, name, props) => [props.payload.original, 'Resultado']}
                />
                <Area 
                  type="monotone" 
                  dataKey="valor" 
                  stroke="var(--primary-color)" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorValue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500 }}>
              Adicione pelo menos 2 registros de {selectedChartType} para ver o gráfico.
            </div>
          )}
        </div>
      </div>

      {/* Monthly Volume Chart */}
      <div className="card" style={{ marginBottom: '2.5rem', padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1.5rem' }}>Volume Mensal (km)</h3>
        <div style={{ width: '100%', height: 180 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyVolumeData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
              <XAxis 
                dataKey="month" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 11, fontWeight: 600, fill: 'var(--text-secondary)' }} 
                dy={10}
              />
              <YAxis hide />
              <Tooltip 
                cursor={{ fill: 'var(--surface-accent)' }}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-premium)' }}
              />
              <Bar dataKey="distancia" radius={[6, 6, 0, 0]}>
                {monthlyVolumeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={index === 5 ? 'var(--primary-color)' : 'var(--text-muted)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* PRs Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2.5rem' }}>
        {['VAM', '5km', '10km', '21km'].map(type => {
          const best = getBestResult(type);
          return (
            <div key={type} className="card" style={{ padding: '1.5rem', border: 'none', background: 'var(--surface-accent)', boxShadow: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                  {type === 'VAM' ? <Zap size={14} color="var(--primary-color)" /> : <Award size={14} color="var(--warning)" />}
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.5px' }}>{type}</span>
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
                {best ? best.result : '--'}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '6px', fontWeight: 600 }}>
                {best ? new Date(best.date).toLocaleDateString('pt-BR') : 'Sem registro'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Full History List */}
      <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1.25rem' }}>Histórico Completo</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {loading ? (
          <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Carregando...</p>
        ) : history.length === 0 ? (
          <div className="card" style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <TrendingUp size={48} color="var(--border-color)" style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <p>Nenhum teste registrado ainda.</p>
          </div>
        ) : (
          history.map(item => (
            <div key={item.id} className="card" style={{ padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--surface-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-color)' }}>
                  {item.test_type === 'VAM' ? <Zap size={18} /> : <Award size={18} />}
                </div>
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700 }}>{item.test_type}</h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{new Date(item.date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}</p>
                </div>
              </div>
              <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary-color)' }}>{item.result}</div>
                <button 
                  onClick={() => deleteTest(item.id)}
                  style={{ background: 'transparent', border: 'none', color: '#ff3b30', opacity: 0.5, cursor: 'pointer' }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {showAdd && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1100, display: 'flex', alignItems: 'flex-end' }}
            onClick={() => setShowAdd(false)}
          >
            <motion.div 
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              style={{ width: '100%', background: 'var(--bg-color)', borderRadius: '30px 30px 0 0', padding: '2rem', paddingBottom: '3rem' }}
              onClick={e => e.stopPropagation()}
            >
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.5rem' }}>Novo Registro</h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Tipo de Teste</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {testTypes.map(t => (
                      <button 
                        key={t}
                        onClick={() => setNewTest({...newTest, test_type: t})}
                        style={{
                          padding: '8px 16px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 600,
                          border: newTest.test_type === t ? '1px solid var(--primary-color)' : '1px solid var(--border-color)',
                          background: newTest.test_type === t ? 'rgba(0,122,255,0.05)' : 'transparent',
                          color: newTest.test_type === t ? 'var(--primary-color)' : 'var(--text-secondary)'
                        }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Resultado (Tempo ou Ritmo)</label>
                  <input 
                    style={{ padding: '14px', borderRadius: '14px', border: '1px solid var(--border-color)', background: 'var(--surface-accent)', fontSize: '1rem', outline: 'none' }}
                    placeholder="Ex: 4:20 min/km ou 19:45"
                    value={newTest.result}
                    onChange={e => setNewTest({...newTest, result: e.target.value})}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Data</label>
                  <input 
                    type="date"
                    style={{ padding: '14px', borderRadius: '14px', border: '1px solid var(--border-color)', background: 'var(--surface-accent)', fontSize: '1rem', outline: 'none' }}
                    value={newTest.date}
                    onChange={e => setNewTest({...newTest, date: e.target.value})}
                  />
                </div>

                <button 
                  className="btn-primary" 
                  style={{ marginTop: '1rem', padding: '16px' }}
                  onClick={handleAdd}
                >
                  Salvar Registro
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EvolutionView;
