import React, { useState, useEffect } from 'react';
import { TrendingUp, Award, Calendar, Plus, Trash2, Zap } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

const EvolutionView = ({ session }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newTest, setNewTest] = useState({
    test_type: 'VAM',
    result: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const testTypes = ['VAM', '5km', '10km', '21km', '42km', 'Outro'];

  useEffect(() => {
    if (session?.user) fetchHistory();
  }, [session]);

  const fetchHistory = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('test_history')
      .select('*')
      .eq('athlete_id', session.user.id)
      .order('date', { ascending: false });

    if (!error) setHistory(data || []);
    setLoading(false);
  };

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
    const tests = history.filter(h => h.test_type === type);
    if (tests.length === 0) return null;
    // Simplificado: assume que o resultado mais recente é o melhor ou apenas mostra o último
    return tests[0];
  };

  return (
    <div className="animate-slide-up">
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Evolução</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Acompanhe suas marcas e testes</p>
        </div>
        <button 
          onClick={() => setShowAdd(true)}
          style={{ 
            background: 'var(--primary-color)', 
            color: 'white', 
            border: 'none', 
            width: '44px', 
            height: '44px', 
            borderRadius: '14px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0, 122, 255, 0.3)'
          }}
        >
          <Plus size={24} />
        </button>
      </header>

      {/* PRs Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2.5rem' }}>
        {['VAM', '5km', '10km', '21km'].map(type => {
          const best = getBestResult(type);
          return (
            <div key={type} className="card" style={{ padding: '1.25rem', position: 'relative', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: 'var(--text-secondary)' }}>
                {type === 'VAM' ? <Zap size={14} color="var(--primary-color)" /> : <Award size={14} color="var(--warning)" />}
                <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>{type}</span>
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {best ? best.result : '--'}
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
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
