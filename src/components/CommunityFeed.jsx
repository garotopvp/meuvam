import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, X, Send, Trash2, Zap, Clock, MapPin, User, ChevronDown, ChevronUp, Loader2, Share2, MoreHorizontal } from 'lucide-react';
import ActivityMap from './ActivityMap';

const CommunityFeed = ({ currentUser }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [likesMap, setLikesMap] = useState({});
  const [commentsMap, setCommentsMap] = useState({});
  const [openComments, setOpenComments] = useState(new Set());
  const [newComment, setNewComment] = useState({});
  const [loadingLike, setLoadingLike] = useState({});
  const [sendingComment, setSendingComment] = useState({});
  const [loadingComments, setLoadingComments] = useState({});
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);

  useEffect(() => {
    fetchCommunityFeed();
  }, [currentUser]);

  const fetchCommunityFeed = async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/community/feed?userId=${currentUser.id}&limit=50&_t=${Date.now()}`);
      if (!res.ok) throw new Error('Falha ao buscar feed');
      const data = await res.json();
      setActivities(data);

      const likesData = {};
      const commentsData = {};
      data.forEach(act => {
        likesData[act.strava_id] = { count: act.likesCount, userLiked: act.userLiked };
        commentsData[act.strava_id] = act.comments || [];
      });
      setLikesMap(likesData);
      setCommentsMap(commentsData);
    } catch (err) {
      console.error('Erro ao buscar feed da comunidade:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncProgress(0);
    try {
      const athletesRes = await fetch('/api/community/athletes');
      const athletesList = await athletesRes.json();
      if (athletesList.length === 0) { setIsSyncing(false); return; }

      let completed = 0;
      for (const athlete of athletesList) {
        try {
          await fetch(`/api/strava/activities?userId=${athlete.supabaseId}&limit=10&_t=${Date.now()}`);
        } catch (e) { console.warn('Sync failed for athlete', athlete.name); }
        completed++;
        setSyncProgress(Math.round((completed / athletesList.length) * 100));
      }
      await fetchCommunityFeed();
    } catch (err) {
      console.error('Erro no sync manual:', err);
    } finally {
      setIsSyncing(false);
      setSyncProgress(0);
    }
  };

  const formatRelativeDate = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffInMs = now - date;
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    if (diffInDays === 0) {
      const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
      if (diffInHours === 0) return 'Agora mesmo';
      return `Hoje às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    }
    if (diffInDays === 1) return `Ontem às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const handleLike = async (activityId) => {
    const actIdStr = String(activityId);
    if (!currentUser?.id || loadingLike[actIdStr]) return;
    setLoadingLike(prev => ({ ...prev, [actIdStr]: true }));
    const prev = likesMap[actIdStr] || { count: 0, userLiked: false };
    const optimistic = { count: prev.userLiked ? Math.max(0, prev.count - 1) : prev.count + 1, userLiked: !prev.userLiked };
    setLikesMap(m => ({ ...m, [actIdStr]: optimistic }));
    try {
      const res = await fetch('/api/community/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activityId: actIdStr, userId: currentUser.id, userName: currentUser.name || 'Atleta' })
      });
      if (!res.ok) setLikesMap(m => ({ ...m, [actIdStr]: prev }));
    } catch { setLikesMap(m => ({ ...m, [actIdStr]: prev })); } finally {
      setLoadingLike(prev => ({ ...prev, [actIdStr]: false }));
    }
  };

  const toggleComments = async (activityId) => {
    const isOpen = openComments.has(activityId);
    setOpenComments(prev => {
      const next = new Set(prev);
      isOpen ? next.delete(activityId) : next.add(activityId);
      return next;
    });
    if (!isOpen && !commentsMap[activityId]) {
      setLoadingComments(prev => ({ ...prev, [activityId]: true }));
      try {
        const res = await fetch(`/api/community/comments?activityId=${activityId}`);
        if (res.ok) {
          const data = await res.json();
          setCommentsMap(m => ({ ...m, [activityId]: data }));
        }
      } catch { } finally {
        setLoadingComments(prev => ({ ...prev, [activityId]: false }));
      }
    }
  };

  const handleSendComment = async (activityId) => {
    const actIdStr = String(activityId);
    const content = newComment[actIdStr]?.trim();
    if (!content || !currentUser?.id || sendingComment[actIdStr]) return;
    const tempId = 'temp-' + Date.now();
    const optimisticComment = { id: tempId, user_id: currentUser.id, user_name: currentUser.name || 'Você', user_avatar: currentUser.profileImage || '', content: content, created_at: new Date().toISOString() };
    setCommentsMap(m => ({ ...m, [actIdStr]: [...(m[actIdStr] || []), optimisticComment] }));
    setNewComment(prev => ({ ...prev, [actIdStr]: '' }));
    setSendingComment(prev => ({ ...prev, [actIdStr]: true }));
    try {
      const res = await fetch('/api/community/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activityId: actIdStr, userId: currentUser.id, userName: currentUser.name || 'Atleta', userAvatar: currentUser.profileImage || '', content })
      });
      if (res.ok) {
        const actualComment = await res.json();
        setCommentsMap(m => ({ ...m, [actIdStr]: (m[actIdStr] || []).map(c => c.id === tempId ? actualComment : c) }));
      } else {
        setCommentsMap(m => ({ ...m, [actIdStr]: (m[actIdStr] || []).filter(c => c.id !== tempId) }));
      }
    } catch {
      setCommentsMap(m => ({ ...m, [actIdStr]: (m[actIdStr] || []).filter(c => c.id !== tempId) }));
    } finally {
      setSendingComment(prev => ({ ...prev, [actIdStr]: false }));
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {[1, 2, 3].map(i => (
          <div key={i} className="card" style={{ padding: '1.5rem', opacity: 0.6 }}>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '1rem', alignItems: 'center' }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--surface-accent)', animation: 'pulse 1.5s infinite' }} />
              <div style={{ flex: 1 }}>
                <div style={{ height: 14, width: '40%', background: 'var(--surface-accent)', borderRadius: 6, marginBottom: 8 }} />
                <div style={{ height: 10, width: '25%', background: 'var(--surface-accent)', borderRadius: 6 }} />
              </div>
            </div>
            <div style={{ height: 16, width: '70%', background: 'var(--surface-accent)', borderRadius: 6, marginBottom: 12 }} />
            <div style={{ height: 120, background: 'var(--surface-accent)', borderRadius: 12 }} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', background: 'var(--border-color)' }}>
      {/* Sync Header */}
      <div style={{ padding: '1rem 1.5rem', background: 'var(--bg-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 900 }}>Comunidade</h2>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleManualSync}
          disabled={isSyncing}
          style={{
            background: 'var(--surface-accent)', color: 'var(--primary-color)', border: 'none', padding: '6px 12px', borderRadius: '10px',
            fontSize: '0.75rem', fontWeight: 800, cursor: isSyncing ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', gap: '6px'
          }}
        >
          {isSyncing ? <Loader2 className="animate-spin" size={14} /> : <Zap size={14} />}
          {isSyncing ? `Sincronizando ${syncProgress}%` : 'Atualizar'}
        </motion.button>
      </div>

      {activities.length === 0 ? (
        <div style={{ padding: '4rem 2rem', textAlign: 'center', background: 'var(--bg-color)' }}>
          <Zap size={48} style={{ marginBottom: '1rem', opacity: 0.2 }} />
          <p style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>O feed está vazio</p>
          <button onClick={handleManualSync} style={{ marginTop: '1rem', background: 'var(--primary-color)', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '12px', fontWeight: 700 }}>Sincronizar Agora</button>
        </div>
      ) : (
        activities.map((act) => {
          const actId = String(act.strava_id);
          const likes = likesMap[actId] || { count: 0, userLiked: false };
          const comments = commentsMap[actId] || [];
          const isCommentsOpen = openComments.has(actId);

          return (
            <motion.div
              key={actId}
              style={{ 
                background: 'var(--bg-color)', 
                padding: '1.25rem 1rem',
                borderBottom: '1px solid var(--border-color)'
              }}
            >
              {/* Profile Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'var(--surface-accent)', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                    {act.profiles?.avatar_url ? (
                      <img src={act.profiles.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'var(--primary-color)' }}>
                        {act.profiles?.name?.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 800 }}>{act.profiles?.name}</h4>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                      {formatRelativeDate(act.date)} • {act.platform === 'strava' ? 'Strava' : 'Garmin Connect'}
                    </p>
                  </div>
                </div>
                <MoreHorizontal size={20} color="var(--text-secondary)" />
              </div>

              {/* Title & Description */}
              <div style={{ marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: '4px', letterSpacing: '-0.5px', color: 'var(--text-primary)' }}>
                  {act.title}
                </h3>
                {act.description && (
                  <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>{act.description}</p>
                )}
              </div>

              {/* Metrics Grid (Strava Style) */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(3, 1fr)', 
                gap: '1px', 
                background: 'var(--border-color)',
                marginBottom: '1.5rem',
                borderTop: '1px solid var(--border-color)',
                borderBottom: '1px solid var(--border-color)',
                padding: '12px 0'
              }}>
                <div style={{ background: 'var(--bg-color)', padding: '4px 0' }}>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Distância</p>
                  <p style={{ fontSize: '1.15rem', fontWeight: 800 }}>{act.metrics?.distance || '--'}</p>
                </div>
                <div style={{ background: 'var(--bg-color)', padding: '4px 0', borderLeft: '1px solid var(--border-color)', paddingLeft: '15px' }}>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Ritmo</p>
                  <p style={{ fontSize: '1.15rem', fontWeight: 800 }}>{act.metrics?.pace || '--'}<span style={{ fontSize: '0.75rem' }}>/km</span></p>
                </div>
                <div style={{ background: 'var(--bg-color)', padding: '4px 0', borderLeft: '1px solid var(--border-color)', paddingLeft: '15px' }}>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Tempo</p>
                  <p style={{ fontSize: '1.15rem', fontWeight: 800 }}>{act.metrics?.duration || '--'}</p>
                </div>
              </div>

              {/* Map / Visualization */}
              <div style={{ borderRadius: '16px', overflow: 'hidden', background: 'var(--surface-accent)', marginBottom: '1.25rem', height: '220px', position: 'relative' }}>
                <ActivityMap 
                  routeData={act.polyline} 
                  isStatic={true}
                  style={{ height: '100%', width: '100%' }}
                />
              </div>

              {/* Engagement Stats */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  {likes.count > 0 && <span>{likes.count} kudos</span>}
                  {likes.count > 0 && comments.length > 0 && <span> • </span>}
                  {comments.length > 0 && <span>{comments.length} comentários</span>}
                  {likes.count === 0 && comments.length === 0 && <span>Seja o primeiro a apoiar</span>}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={() => handleLike(actId)}
                    style={{ 
                      background: 'var(--surface-accent)', border: 'none', width: '40px', height: '40px', borderRadius: '12px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: likes.userLiked ? '#ef4444' : 'var(--text-secondary)',
                      cursor: 'pointer'
                    }}
                  >
                    <Heart size={20} fill={likes.userLiked ? 'currentColor' : 'none'} />
                  </button>
                  <button 
                    onClick={() => toggleComments(actId)}
                    style={{ 
                      background: 'var(--surface-accent)', border: 'none', width: '40px', height: '40px', borderRadius: '12px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: isCommentsOpen ? 'var(--primary-color)' : 'var(--text-secondary)',
                      cursor: 'pointer'
                    }}
                  >
                    <MessageCircle size={20} />
                  </button>
                </div>
              </div>

              {/* Top Comments (Preview) */}
              {!isCommentsOpen && comments.length > 0 && (
                <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {comments.slice(-2).map(c => (
                    <div key={c.id} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, flexShrink: 0 }}>{c.user_name}</span>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', flex: 1 }}>{c.content}</p>
                    </div>
                  ))}
                  {comments.length > 2 && (
                    <button onClick={() => toggleComments(actId)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 700, textAlign: 'left', padding: 0 }}>
                      Ver todos os {comments.length} comentários
                    </button>
                  )}
                </div>
              )}

              {/* Full Comments Section */}
              <AnimatePresence>
                {isCommentsOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{ overflow: 'hidden', marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {comments.map(c => (
                        <div key={c.id} style={{ display: 'flex', gap: '10px' }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--surface-accent)', overflow: 'hidden' }}>
                            {c.user_avatar ? <img src={c.user_avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User size={16} />}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>{c.user_name}</span>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{formatRelativeDate(c.created_at)}</span>
                            </div>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{c.content}</p>
                          </div>
                        </div>
                      ))}
                      
                      <div style={{ display: 'flex', gap: '8px', marginTop: '1rem' }}>
                        <input 
                          type="text" 
                          placeholder="Adicionar comentário..." 
                          value={newComment[actId] || ''}
                          onChange={e => setNewComment(prev => ({ ...prev, [actId]: e.target.value }))}
                          onKeyDown={e => e.key === 'Enter' && handleSendComment(actId)}
                          style={{ flex: 1, padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--surface-accent)', fontSize: '0.9rem' }}
                        />
                        <button 
                          onClick={() => handleSendComment(actId)}
                          disabled={!newComment[actId]?.trim() || sendingComment[actId]}
                          style={{ background: 'var(--primary-color)', color: '#fff', border: 'none', padding: '0 15px', borderRadius: '12px', fontWeight: 700 }}
                        >
                          <Send size={18} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })
      )}
    </div>
  );
};

export default CommunityFeed;
