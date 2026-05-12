import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, Share2, Zap, Clock, MapPin, User } from 'lucide-react';
import { supabase } from '../lib/supabase';

const CommunityFeed = ({ currentUser }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [likes, setLikes] = useState({});
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchCommunityActivities();
  }, []);

  const formatRelativeDate = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffInMs = now - date;
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) {
      const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
      if (diffInHours === 0) {
        const diffInMins = Math.floor(diffInMs / (1000 * 60));
        return `Há ${diffInMins} min`;
      }
      return `Hoje, ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    }
    if (diffInDays === 1) return `Ontem, ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    if (diffInDays < 7) return `${diffInDays} dias atrás`;
    
    return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
  };

  const fetchCommunityActivities = async () => {
    setLoading(true);
    try {
      // 1. Buscar lista de atletas conectados (Igual ao Painel do Professor)
      const athletesRes = await fetch('/api/community/athletes');
      if (!athletesRes.ok) throw new Error('Falha ao buscar atletas');
      const athletesList = await athletesRes.json();

      if (athletesList.length === 0) {
        setActivities([]);
        setLoading(false);
        return;
      }

      // 2. Iterar por cada atleta e buscar suas atividades (Igual ao Painel do Professor)
      const activityPromises = athletesList.map(async (athlete) => {
        try {
          const response = await fetch(`/api/strava/activities?userId=${athlete.supabaseId}&_t=${Date.now()}`);
          if (!response.ok) return [];
          const data = await response.json();
          if (!Array.isArray(data)) return [];
          
          return data.map(act => ({ 
            ...act, 
            athleteName: athlete.name, 
            athlete_id: athlete.id,
            profiles: {
              name: athlete.name,
              avatar_url: athlete.avatar_url
            },
            isStrava: true
          }));
        } catch (err) {
          return [];
        }
      });

      const results = await Promise.all(activityPromises);
      const allActivities = results.flat()
        .filter(act => {
          // Filtrar apenas atividades dos últimos 30 dias para manter o feed "fresco"
          const actDate = new Date(act.date);
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          return actDate >= thirtyDaysAgo;
        })
        .sort((a, b) => new Date(b.date) - new Date(a.date));
      
      // 3. Filtrar para não mostrar a própria atividade
      const filteredData = allActivities.filter(act => act.athlete_id !== currentUser.id);
      
      setActivities(filteredData);
    } catch (err) {
      console.error('Erro ao buscar feed da comunidade:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = (id) => {
    setLikes(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
    // Aqui poderíamos salvar o like no Supabase em uma tabela 'likes'
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Carregando atividades dos colegas...
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="card" style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-secondary)', background: 'var(--surface-accent)', border: '2px dashed var(--border-color)' }}>
        <Zap size={48} style={{ marginBottom: '1rem', opacity: 0.3 }} />
        <p>Ainda não há atividades recentes da comunidade.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {activities.map((act) => (
        <motion.div 
          key={act.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card"
          style={{ padding: '1.5rem' }}
        >
          {/* Header do Post */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'var(--surface-accent)', border: '1px solid var(--border-color)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {act.profiles?.avatar_url ? (
                  <img src={act.profiles.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <User size={20} color="var(--primary-color)" />
                )}
              </div>
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>{act.profiles?.name || 'Atleta'}</h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{formatRelativeDate(act.date)}</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
               <div style={{ background: 'rgba(52, 199, 89, 0.1)', color: 'var(--success)', fontSize: '0.65rem', fontWeight: 800, padding: '4px 10px', borderRadius: '20px', textTransform: 'uppercase' }}>
                 {act.type || 'Corrida'}
               </div>
               {act.isStrava && (
                 <div style={{ background: '#fc4c0215', color: '#fc4c02', fontSize: '0.65rem', fontWeight: 800, padding: '4px 10px', borderRadius: '20px', textTransform: 'uppercase' }}>
                   Strava
                 </div>
               )}
            </div>
          </div>

          {/* Conteúdo */}
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.5rem' }}>{act.title}</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: '1.5' }}>
            {act.description}
          </p>

          {/* Métricas Rápidas */}
          <div style={{ display: 'flex', gap: '20px', background: 'var(--surface-accent)', padding: '12px 15px', borderRadius: '14px', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MapPin size={14} color="var(--text-secondary)" />
              <span style={{ fontSize: '0.9rem', fontWeight: 800 }}>{act.metrics?.distance || '--'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={14} color="var(--text-secondary)" />
              <span style={{ fontSize: '0.9rem', fontWeight: 800 }}>{act.metrics?.duration || '--'}</span>
            </div>
          </div>

          {/* Interações */}
          <div style={{ display: 'flex', gap: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
            <button 
              onClick={() => handleLike(act.id)}
              style={{ background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', gap: '6px', color: likes[act.id] ? 'var(--primary-color)' : 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
            >
              <Heart size={20} fill={likes[act.id] ? 'currentColor' : 'none'} />
              {likes[act.id] ? '1' : 'Apoiar'}
            </button>
            <button 
              style={{ background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
            >
              <MessageCircle size={20} />
              Comentar
            </button>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default CommunityFeed;
