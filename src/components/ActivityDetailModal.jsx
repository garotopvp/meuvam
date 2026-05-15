import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, MessageCircle, Share2, Zap, Clock, MapPin, ChevronLeft, Info, Trophy, Loader2, Gauge, TrendingUp, ChevronRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Line } from 'recharts';
import ActivityMap from './ActivityMap';
import { supabase } from '../lib/supabase';
import { createPortal } from 'react-dom';

// Helper para calcular zonas (copiado de App.jsx para independência do componente)
const calculateAthleteZones = (vamInput, maxHr, hrMethod = 'max', restingHr = 60, lthrVal = 170) => {
  try {
    let vamKmh = 0;
    if (typeof vamInput === 'string' && vamInput.includes(':')) {
      const [m, s] = vamInput.split(':').map(Number);
      vamKmh = 60 / (m + (s / 60));
    } else {
      vamKmh = parseFloat(vamInput) || 0;
    }

    const maxHeartRate = parseInt(maxHr) || 0;
    const restingHeartRate = parseInt(restingHr) || 60;
    const lthr = parseInt(lthrVal) || 170;
    const method = hrMethod || 'max';

    const zoneColors = ['#9ca3af', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444'];
    const zoneNames = ['Z1', 'Z2', 'Z3', 'Z4', 'Z5'];
    
    let hrRanges = [];
    
    if (method === 'max') {
      const pcts = [0.71, 0.78, 0.85, 0.93, 1.0];
      hrRanges = pcts.map((p, i) => {
          const min = i === 0 ? 0 : pcts[i-1];
          return { min: Math.round(maxHeartRate * min), max: Math.round(maxHeartRate * p), color: zoneColors[i], name: zoneNames[i] };
      });
    } else if (method === 'rfc') {
      const reserve = maxHeartRate - restingHeartRate;
      const pcts = [0.71, 0.78, 0.85, 0.93, 1.0];
      hrRanges = pcts.map((p, i) => {
          const min = i === 0 ? 0 : pcts[i-1];
          return { min: Math.round((reserve * min) + restingHeartRate), max: Math.round((reserve * p) + restingHeartRate), color: zoneColors[i], name: zoneNames[i] };
      });
    } else if (method === 'lthr') {
      const pcts = [
          { min: 0.80, max: 0.85 },
          { min: 0.85, max: 0.89 },
          { min: 0.89, max: 0.94 },
          { min: 0.94, max: 0.99 },
          { min: 0.99, max: 1.10 }
      ];
      hrRanges = pcts.map((p, i) => ({ min: Math.round(lthr * p.min), max: Math.round(lthr * p.max), color: zoneColors[i], name: zoneNames[i] }));
    }

    return hrRanges;
  } catch (e) {
    return [];
  }
};

const ActivityDetailModal = ({ activity, onClose, currentUser }) => {
  const [details, setDetails] = useState(null);
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hrZones, setHrZones] = useState([]);
  const [lapFilter, setLapFilter] = useState('all'); // 'all' | 'sprint' | 'recovery'

  useEffect(() => {
    if (activity) {
      fetchFullDetails();
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [activity]);

  const fetchFullDetails = async () => {
    if (!activity) return;
    setLoading(true);
    try {
      const actIdRaw = activity.strava_id || activity.id;
      if (!actIdRaw) throw new Error('ID da atividade ausente');
      
      const actId = String(actIdRaw).replace('strava_', '');
      const athId = activity.athlete_id;
      
      // 1. Buscar perfil do atleta para as zonas
      if (athId && supabase) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', athId)
          .single();
        
        if (profile) {
          const zones = calculateAthleteZones(profile.vam, profile.max_hr, profile.hr_method, profile.resting_hr, profile.lthr);
          setHrZones(zones);
        }
      }

      // 2. Buscar detalhes completos (splits, calorias, etc)
      const detailsRes = await fetch(`/api/strava/activity/${actId}?userId=${athId}`);
      if (detailsRes.ok) {
        const data = await detailsRes.json();
        setDetails(data);
      }

      // 3. Buscar streams para os gráficos
      const streamsRes = await fetch(`/api/strava/activity/${actId}/streams?userId=${athId}`);
      if (streamsRes.ok) {
        const streamData = await streamsRes.json();
        const formatted = [];
        const length = streamData.distance?.data?.length || 0;
        const step = Math.max(1, Math.floor(length / 200)); 

        for (let i = 0; i < length; i += step) {
          formatted.push({
            dist: (streamData.distance.data[i] / 1000).toFixed(2),
            pace: streamData.velocity_smooth ? (16.6667 / streamData.velocity_smooth.data[i]) : null,
            hr: streamData.heartrate ? streamData.heartrate.data[i] : null,
            elev: streamData.altitude ? streamData.altitude.data[i] : null,
            cad: streamData.cadence ? streamData.cadence.data[i] * 2 : null,
          });
        }
        setStreams(formatted.filter(p => p.pace && p.pace < 15)); 
      }
    } catch (err) {
      console.error('Erro ao buscar detalhes:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatPace = (decimalPace) => {
    if (!decimalPace || decimalPace > 20) return '--';
    const mins = Math.floor(decimalPace);
    const secs = Math.round((decimalPace - mins) * 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!activity) return null;
  const m = details?.metrics || activity?.metrics || {};

  return createPortal(
    <motion.div 
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      style={{ 
        position: 'fixed', 
        inset: 0, 
        background: '#f8fafc', 
        zIndex: 99999, 
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        display: 'block'
      }}
    >
      <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ 
          position: 'sticky', 
          top: 0, 
          background: 'rgba(255, 255, 255, 0.95)', 
          backdropFilter: 'blur(20px)', 
          padding: 'calc(15px + var(--safe-area-top)) 16px 12px', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px', 
          borderBottom: '1px solid #e2e8f0', 
          zIndex: 100
        }}>
        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={onClose} 
          style={{ background: '#f1f5f9', border: 'none', padding: '10px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <ChevronLeft size={22} color="#475569" />
        </motion.button>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e293b' }}>{activity.title}</h2>
          <p style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>{activity.athlete_name}</p>
        </div>
        <Share2 size={20} color="#64748b" />
      </div>

      {loading && !details ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
          <Loader2 className="animate-spin" size={32} color="#ff3b30" />
          <p style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Carregando telemetria...</p>
        </div>
      ) : (
        <div style={{ padding: '24px 16px', maxWidth: '600px', margin: '0 auto', width: '100%' }}>
          
          {/* Athlete Info */}
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '32px' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', overflow: 'hidden', border: '3px solid #fff', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
              <img src={activity.athlete_avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a' }}>{activity.athlete_name}</h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                {activity.date ? new Date(activity.date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
              </p>
            </div>
          </div>

          {/* Achievement Trophy Bar */}
          {details?.best_efforts && details.best_efforts.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ background: '#fff', borderRadius: '24px', padding: '20px', display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '32px', border: '1px solid #e2e8f0' }}>
              <div style={{ width: 48, height: 48, borderRadius: '16px', background: 'linear-gradient(135deg, #ff9500 0%, #ffcc00 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Trophy size={26} color="#fff" />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e293b' }}>Novo Recorde Pessoal!</p>
                <p style={{ fontSize: '0.8rem', color: '#64748b' }}>{activity.athlete_name.split(' ')[0]} superou sua marca em {details.best_efforts[0].name}.</p>
              </div>
            </motion.div>
          )}

          {/* Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '32px' }}>
            {[
                { label: 'Distância', value: m.distance || activity.metrics?.distance || activity.distance },
                { label: 'Tempo', value: m.duration || activity.metrics?.duration || activity.duration },
                { label: 'Ritmo', value: m.pace || activity.metrics?.pace || activity.pace, unit: '/km' },
                { label: 'Elevação', value: m.elevation || activity.metrics?.elevation || '--' },
                { label: 'Calorias', value: m.calories || activity.metrics?.calories || '--', unit: 'kcal' },
                { label: 'FC Média', value: m.avgHeartRate || activity.metrics?.avgHeartRate || '--', unit: 'bpm' }
            ].map((stat, i) => (
                <div key={i} style={{ background: '#fff', padding: '16px', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b' }}>{stat.label}</span>
                    <p style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>{stat.value}{stat.unit && <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginLeft: '2px' }}>{stat.unit}</span>}</p>
                </div>
            ))}
          </div>

          {/* Map */}
          <div style={{ borderRadius: '28px', overflow: 'hidden', height: '300px', marginBottom: '40px', border: '1px solid #e2e8f0' }}>
            <ActivityMap routeData={activity.polyline} style={{ height: '100%', width: '100%' }} />
          </div>

          {/* Heart Rate Zones Section */}
          {hrZones.length > 0 && streams.length > 0 && (
            <section style={{ marginBottom: '48px' }}>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 900, marginBottom: '16px' }}>Distribuição de Zonas de FC</h4>
              <div style={{ background: '#fff', borderRadius: '24px', padding: '24px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {hrZones.map((zone, i) => {
                    const zoneTime = streams.filter(s => s.hr >= zone.min && s.hr < zone.max).length * (Math.max(1, Math.floor(streams.length / 200)));
                    const totalTime = streams.length * (Math.max(1, Math.floor(streams.length / 200)));
                    const pct = Math.round((zoneTime / totalTime) * 100);
                    
                    return (
                      <div key={i}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
                          <span style={{ color: zone.color }}>{zone.name} - {zone.min}-{zone.max} bpm</span>
                          <span>{pct}% ({Math.floor(zoneTime / 60)}min)</span>
                        </div>
                        <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '10px', overflow: 'hidden' }}>
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            style={{ height: '100%', background: zone.color, borderRadius: '10px' }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {/* Charts */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
            {/* Heart Rate Chart */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 900 }}>Gráfico de Frequência Cardíaca</h4>
                <div style={{ display: 'flex', gap: '8px' }}>
                   <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>Média: <b>{m.avgHeartRate}</b></span>
                   <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>Máx: <b>{details?.max_heartrate || '--'}</b></span>
                </div>
              </div>
              <div style={{ height: '260px', background: '#fff', borderRadius: '24px', padding: '20px 10px 10px 5px', border: '1px solid #e2e8f0' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={streams}>
                    <defs>
                      <linearGradient id="hrGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3}/>
                        <stop offset="100%" stopColor="#ef4444" stopOpacity={0.05}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="dist" 
                      tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} 
                      axisLine={false} 
                      tickLine={false} 
                      unit=" km"
                    />
                    <YAxis 
                      tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} 
                      axisLine={false} 
                      tickLine={false} 
                      domain={['dataMin - 5', 'dataMax + 5']}
                    />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px rgba(0,0,0,0.1)' }} formatter={(v, name) => name === 'hr' ? [`${v} bpm`, 'FC'] : [v, name]} />
                    <Area type="monotone" dataKey="hr" stroke="none" fill="url(#hrGradient)" legendType="none" tooltipType="none" />
                    <Line type="monotone" dataKey="hr" stroke="#ef4444" strokeWidth={3} dot={false} name="hr" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Cadence Chart */}
            {streams.some(s => s.cad > 0) && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 900 }}>Gráfico de Cadência</h4>
                  <div style={{ display: 'flex', gap: '8px' }}>
                     <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>Média: <b>{Math.round(streams.reduce((acc, s) => acc + (s.cad || 0), 0) / streams.length) || '--'} ppm</b></span>
                  </div>
                </div>
                <div style={{ height: '240px', background: '#fff', borderRadius: '24px', padding: '20px 10px 10px 5px', border: '1px solid #e2e8f0' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={streams}>
                      <defs>
                        <linearGradient id="cadGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#a855f7" stopOpacity={0.3}/>
                          <stop offset="100%" stopColor="#a855f7" stopOpacity={0.05}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="dist" tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} axisLine={false} tickLine={false} unit=" km" />
                      <YAxis tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} axisLine={false} tickLine={false} domain={['dataMin - 10', 'dataMax + 10']} />
                      <Area type="monotone" dataKey="cad" stroke="#a855f7" strokeWidth={3} fill="url(#cadGradient)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Elevation Chart */}
            <div>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 900, marginBottom: '16px' }}>Elevação</h4>
              <div style={{ height: '180px', background: '#fff', borderRadius: '24px', padding: '20px 10px 10px 5px', border: '1px solid #e2e8f0' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={streams}>
                    <defs>
                      <linearGradient id="elevGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#64748b" stopOpacity={0.2}/>
                        <stop offset="100%" stopColor="#64748b" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="dist" tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} axisLine={false} tickLine={false} unit=" km" />
                    <YAxis tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Area type="monotone" dataKey="elev" stroke="#64748b" strokeWidth={2} fill="url(#elevGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Parciais / Voltas com classificação tiro/recuperação */}
          {(() => {
            const realLaps = m.laps && m.laps.length > 1 ? m.laps : null;
            const allRows = realLaps || m.splits || [];
            const isLaps = !!realLaps;

            // ── Classificação inteligente sprint vs recuperação ──
            // Encontra a distância dominante (moda) como threshold para "tiro"
            let sprintThreshold = null;
            if (isLaps && allRows.length > 0) {
              const distGroups = {};
              allRows.forEach(r => {
                const d = Math.round(r.distance / 50) * 50; // agrupa em múltiplos de 50m
                distGroups[d] = (distGroups[d] || 0) + 1;
              });
              const sorted = Object.entries(distGroups).sort((a, b) => b[1] - a[1]);
              // A distância mais frequente = candidato a tiro; se houver empate, pega a maior
              const topCount = sorted[0][1];
              const topDists = sorted.filter(([,c]) => c === topCount).map(([d]) => Number(d));
              // Threshold = mediana entre as duas distâncias mais comuns
              if (sorted.length >= 2) {
                const dists = sorted.slice(0, 2).map(([d]) => Number(d));
                sprintThreshold = (Math.max(...dists) + Math.min(...dists)) / 2;
              } else {
                sprintThreshold = Number(sorted[0][0]) * 0.8; // 80% da única distância
              }
            }

            const classifyLap = (item) => {
              if (!isLaps || sprintThreshold === null) return 'plain';
              return item.distance >= sprintThreshold ? 'sprint' : 'recovery';
            };

            const filteredRows = allRows.filter(item => {
              if (!isLaps) return true;
              const type = classifyLap(item);
              if (lapFilter === 'sprint') return type === 'sprint';
              if (lapFilter === 'recovery') return type === 'recovery';
              return true;
            });

            const sprintCount = allRows.filter(r => classifyLap(r) === 'sprint').length;
            const recoveryCount = allRows.filter(r => classifyLap(r) === 'recovery').length;

            return (
              <section style={{ marginTop: '48px', marginBottom: '80px' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 900 }}>
                    {isLaps ? 'Voltas do Treino' : 'Parciais (KM a KM)'}
                  </h4>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>
                    {isLaps ? `${allRows.length} voltas` : `${allRows.length} km`}
                  </span>
                </div>

                {/* Filtro tabs — só aparece em treinos intervalados */}
                {isLaps && sprintThreshold !== null && (
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                    {[
                      { key: 'all', label: 'Todos', count: allRows.length },
                      { key: 'sprint', label: '🏃 Tiros', count: sprintCount, color: '#0f172a' },
                      { key: 'recovery', label: '🚶 Recuperação', count: recoveryCount, color: '#64748b' },
                    ].map(tab => (
                      <button
                        key={tab.key}
                        onClick={() => setLapFilter(tab.key)}
                        style={{
                          padding: '8px 14px',
                          borderRadius: '20px',
                          border: 'none',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          background: lapFilter === tab.key ? '#0f172a' : '#f1f5f9',
                          color: lapFilter === tab.key ? '#fff' : '#64748b',
                        }}
                      >
                        {tab.label} <span style={{ opacity: 0.7 }}>({tab.count})</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Tabela */}
                <div style={{ background: '#fff', borderRadius: '24px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '50px 1fr 60px 50px', padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>{isLaps ? 'Nº' : 'KM'}</span>
                    <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Ritmo</span>
                    <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', textAlign: 'right' }}>Dist.</span>
                    <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', textAlign: 'right' }}>FC</span>
                  </div>
                  {filteredRows.map((item, i) => {
                    const type = classifyLap(item);
                    const isRecovery = type === 'recovery';
                    const isLast = i === filteredRows.length - 1;
                    return (
                      <div
                        key={i}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '50px 1fr 60px 50px',
                          padding: '14px 16px',
                          borderBottom: isLast ? 'none' : '1px solid #f1f5f9',
                          alignItems: 'center',
                          background: isRecovery ? '#f8fafc' : '#ffffff',
                          opacity: isRecovery ? 0.75 : 1,
                        }}
                      >
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: isRecovery ? '#94a3b8' : '#475569' }}>
                          {item.lap_index ?? item.split ?? (allRows.indexOf(item) + 1)}
                        </span>
                        <span style={{ fontSize: isRecovery ? '0.85rem' : '0.95rem', fontWeight: isRecovery ? 600 : 800, color: isRecovery ? '#94a3b8' : '#0f172a' }}>
                          {formatPace((item.moving_time / 60) / (item.distance / 1000))}
                        </span>
                        <span style={{ fontSize: '0.82rem', textAlign: 'right', fontWeight: 700, color: isRecovery ? '#94a3b8' : '#64748b' }}>
                          {item.distance >= 1000 ? `${(item.distance / 1000).toFixed(2)}k` : `${Math.round(item.distance)}m`}
                        </span>
                        <span style={{ fontSize: '0.82rem', textAlign: 'right', fontWeight: isRecovery ? 500 : 700, color: isRecovery ? '#94a3b8' : '#0f172a' }}>
                          {Math.round(item.average_heartrate || 0) || '--'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })()}

        </div>
      )}
      </div>
    </motion.div>,
    document.body
  );
};

export default ActivityDetailModal;
