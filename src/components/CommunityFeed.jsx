import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, X, Send, Trash2, Zap, Clock, MapPin, User, ChevronDown, ChevronUp, Loader2, Share2, MoreHorizontal, Trophy, TrendingUp } from 'lucide-react';
import ActivityMap from './ActivityMap';
import ActivityDetailModal from './ActivityDetailModal';

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

  const [selectedActivity, setSelectedActivity] = useState(null);
  const navigate = useNavigate();
  const { activityId } = useParams();

  useEffect(() => {
    fetchCommunityFeed();
  }, [currentUser]);

  useEffect(() => {
    if (activityId && activities.length > 0) {
      const act = activities.find(a => String(a.id || a.strava_id) === activityId);
      if (act) setSelectedActivity(act);
    } else if (!activityId) {
      setSelectedActivity(null);
    }
  }, [activityId, activities]);

  const fetchCommunityFeed = async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/community/feed?userId=${currentUser.id}&limit=50&_t=${Date.now()}`);
      if (!res.ok) throw new Error('Falha ao buscar feed');
      const data = await res.json();
      // Filtramos para remover atividades do Garmin, conforme solicitado
      const filteredData = data.filter(act => act.platform !== 'garmin');
      setActivities(filteredData);

      const likesData = {};
      const commentsData = {};
      data.forEach(act => {
        const id = String(act.id || act.strava_id);
        likesData[id] = { count: act.likesCount, userLiked: act.userLiked };
        commentsData[id] = act.comments || [];
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

  const handleLike = async (e, activityId) => {
    e.stopPropagation();
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

  const toggleComments = async (e, activityId) => {
    e.stopPropagation();
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ background: 'var(--surface-color)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '1rem', alignItems: 'center' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--surface-accent)', animation: 'pulse 1.5s infinite' }} />
              <div style={{ flex: 1 }}>
                <div style={{ height: 14, width: '40%', background: 'var(--surface-accent)', borderRadius: 6, marginBottom: 8 }} />
                <div style={{ height: 10, width: '25%', background: 'var(--surface-accent)', borderRadius: 6 }} />
              </div>
            </div>
            <div style={{ height: 120, background: 'var(--surface-accent)', borderRadius: 12 }} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '2rem' }}>
      {/* Community Header with Refresh */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', padding: '0 4px' }}>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Feed Global</p>
        <button
          onClick={handleManualSync}
          disabled={isSyncing}
          style={{
            background: 'none', border: 'none', color: 'var(--primary-color)', fontSize: '0.85rem', fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer'
          }}
        >
          {isSyncing ? <Loader2 className="animate-spin" size={14} /> : <Zap size={14} />}
          {isSyncing ? `Sincronizando ${syncProgress}%` : 'Atualizar Feed'}
        </button>
      </div>

      <AnimatePresence>
        {activities.map((act, index) => {
          const actId = String(act.id || act.strava_id);
          const likes = likesMap[actId] || { count: 0, userLiked: false };
          const comments = commentsMap[actId] || [];
          const isCommentsOpen = openComments.has(actId);

          return (
            <motion.div
              key={actId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              onClick={() => navigate(`/aluno/feed/${actId}`)}
              style={{ 
                background: '#fff', 
                borderRadius: '28px',
                border: '1px solid #e2e8f0',
                padding: '1.5rem',
                boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
                cursor: 'pointer',
                marginBottom: '12px'
              }}
            >
              {/* Profile Header */}
              <div style={{ display: 'flex', gap: '14px', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#f1f5f9', overflow: 'hidden', border: '2px solid #fff', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                  {act.athlete_avatar ? (
                    <img src={act.athlete_avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: 'var(--primary-color)', fontSize: '1.2rem' }}>
                      {act.athlete_name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px' }}>{act.athlete_name}</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                    <span>{formatRelativeDate(act.date)}</span>
                    <span>•</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: act.platform === 'strava' ? '#fc4c02' : '#007aff' }}>
                      {act.platform === 'strava' ? <Zap size={10} fill="currentColor" /> : <Clock size={10} />}
                      {act.platform === 'strava' ? 'Strava' : 'Garmin'}
                    </span>
                  </div>
                </div>
                <motion.button whileTap={{ scale: 0.8 }} style={{ background: 'none', border: 'none', padding: '8px' }}>
                    <MoreHorizontal size={20} color="#cbd5e1" />
                </motion.button>
              </div>

              {/* Title */}
              <h3 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: '1.25rem', letterSpacing: '-0.7px', lineHeight: 1.2, color: '#1e293b' }}>
                {act.title}
              </h3>

              {/* Metrics Grid Strava Style */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(4, 1fr)', 
                marginBottom: '1.5rem',
                padding: '16px 0',
                borderTop: '1px solid #f1f5f9',
                borderBottom: '1px solid #f1f5f9'
              }}>
                <div>
                  <p style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '4px' }}>Distância</p>
                  <p style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>{act.metrics?.distance || act.distance || '--'}</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '4px' }}>Ritmo</p>
                  <p style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>{act.metrics?.pace || act.pace || '--'}<span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>/km</span></p>
                </div>
                <div>
                  <p style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '4px' }}>Tempo</p>
                  <p style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>{act.metrics?.duration || act.duration || '--'}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '4px' }}>Conquistas</p>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px', alignItems: 'center' }}>
                     <Trophy size={16} color="#ff9500" fill="#ff9500" />
                     <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#ff9500' }}>3</span>
                  </div>
                </div>
              </div>

              {/* Map Image with Glassy Overlay */}
              <div style={{ borderRadius: '24px', overflow: 'hidden', background: '#f8fafc', marginBottom: '1.5rem', height: '240px', position: 'relative', border: '1px solid #e2e8f0' }}>
                <ActivityMap 
                  routeData={act.polyline} 
                  isStatic={true}
                  style={{ height: '100%', width: '100%' }}
                />
                <div style={{ 
                    position: 'absolute', bottom: 12, right: 12, 
                    background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(8px)',
                    padding: '6px 12px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 800, color: '#475569',
                    border: '1px solid rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: '6px'
                }}>
                    <TrendingUp size={12} /> Analisar Atividade
                </div>
              </div>

              {/* Engagement Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
                  {likes.count > 0 ? (
                    <span style={{ color: '#1e293b', fontWeight: 800 }}>{likes.count} kudos</span>
                  ) : 'Seja o primeiro a dar kudos!'}
                  {comments.length > 0 && <span style={{ marginLeft: '10px' }}>• {comments.length} comentários</span>}
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => handleLike(e, actId)}
                    style={{ 
                      background: likes.userLiked ? 'rgba(255, 45, 85, 0.1)' : '#f1f5f9', border: 'none', width: '44px', height: '44px', borderRadius: '16px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: likes.userLiked ? '#ef4444' : '#64748b',
                      cursor: 'pointer', transition: 'all 0.2s ease'
                    }}
                  >
                    <Heart size={22} fill={likes.userLiked ? 'currentColor' : 'none'} />
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => toggleComments(e, actId)}
                    style={{ 
                      background: isCommentsOpen ? 'rgba(0, 122, 255, 0.1)' : '#f1f5f9', border: 'none', width: '44px', height: '44px', borderRadius: '16px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: isCommentsOpen ? '#007aff' : '#64748b',
                      cursor: 'pointer', transition: 'all 0.2s ease'
                    }}
                  >
                    <MessageCircle size={22} />
                  </motion.button>
                </div>
              </div>

              {/* Comments Section */}
              <AnimatePresence>
                {isCommentsOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    style={{ overflow: 'hidden', marginTop: '1.25rem', borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem' }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {comments.map(c => (
                        <div key={c.id} style={{ display: 'flex', gap: '12px' }}>
                          <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#f1f5f9', overflow: 'hidden', flexShrink: 0 }}>
                            {c.user_avatar ? <img src={c.user_avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User size={18} color="#94a3b8" />}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b' }}>{c.user_name}</span>
                              <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>{formatRelativeDate(c.created_at)}</span>
                            </div>
                            <p style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.4 }}>{c.content}</p>
                          </div>
                        </div>
                      ))}
                      <div style={{ display: 'flex', gap: '10px', marginTop: '0.75rem' }}>
                        <input 
                          type="text" 
                          placeholder="Escreva um comentário..." 
                          value={newComment[actId] || ''}
                          onChange={e => setNewComment(prev => ({ ...prev, [actId]: e.target.value }))}
                          style={{ flex: 1, padding: '12px 16px', borderRadius: '16px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '0.9rem', outline: 'none' }}
                        />
                        <motion.button 
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleSendComment(actId)}
                          disabled={!newComment[actId]?.trim() || sendingComment[actId]}
                          style={{ background: 'var(--primary-color)', color: '#fff', border: 'none', padding: '0 16px', borderRadius: '16px', fontWeight: 800, cursor: 'pointer' }}
                        >
                          <Send size={18} />
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Detail Modal Component */}
      {selectedActivity && (
        <ActivityDetailModal 
          activity={selectedActivity} 
          onClose={() => navigate('/aluno/feed')} 
          currentUser={currentUser}
        />
      )}
    </div>
  );
};

export default CommunityFeed;
