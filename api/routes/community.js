import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

const getSupabase = () => {
  const url = process.env.SUPABASE_URL || 'https://zljqlzwzwfzslftnymur.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsanFsend6d2Z6c2xmdG55bXVyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzM5MzQxNywiZXhwIjoyMDkyOTY5NDE3fQ.wJhriqog-ONdyulT2NG_puY_-Xj7OMDMPt7x_hnoRSQ';
  return createClient(url, key);
};

// ─── GET /api/community/athletes ─────────────────────────────────────────────
router.get('/athletes', async (req, res) => {
  const supabase = getSupabase();
  try {
    const { data: profiles } = await supabase.from('profiles').select('id, name, avatar_url, role');
    const { data: integrations } = await supabase
      .from('integrations')
      .select('athlete_id')
      .eq('platform', 'strava')
      .eq('connected', true);

    const connectedIds = new Set((integrations || []).map(i => i.athlete_id));
    const athletes = (profiles || [])
      .filter(p => connectedIds.has(p.id))
      .map(p => ({
        id: p.id,
        name: p.name,
        avatar_url: p.avatar_url,
        supabaseId: p.id
      }));

    res.json(athletes);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch athletes' });
  }
});

// ─── GET /api/community/feed ────────────────────────────────────────────────
// NEW: Optimized bulk feed endpoint
router.get('/feed', async (req, res) => {
  const { userId, limit = 40 } = req.query;
  const supabase = getSupabase();
  
  try {
    // 1. Fetch activities from cache table
    const { data: activities, error: actErr } = await supabase
      .from('community_activities')
      .select('*')
      .order('activity_date', { ascending: false })
      .limit(parseInt(limit));

    if (actErr) throw actErr;

    if (!activities || activities.length === 0) return res.json([]);

    // 2. Fetch all likes and comments for these activities in bulk
    const activityIds = activities.map(a => a.id);
    
    const [likesRes, commentsRes] = await Promise.all([
      supabase.from('activity_likes').select('activity_id, user_id').in('activity_id', activityIds),
      supabase.from('activity_comments').select('*').in('activity_id', activityIds).order('created_at', { ascending: true })
    ]);

    // 3. Merge data
    const feed = activities.map(act => {
      const actLikes = likesRes.data?.filter(l => l.activity_id === act.id) || [];
      const actComments = commentsRes.data?.filter(c => c.activity_id === act.id) || [];
      
      return {
        ...act,
        // Map to frontend expected format
        strava_id: act.id,
        date: act.activity_date,
        metrics: {
          distance: act.distance || '--',
          duration: act.duration || '--',
          pace: act.pace || '--'
        },
        profiles: {
          name: act.athlete_name,
          avatar_url: act.athlete_avatar
        },
        likesCount: actLikes.length,
        userLiked: userId ? actLikes.some(l => l.user_id === userId) : false,
        comments: actComments
      };
    });

    res.json(feed);
  } catch (err) {
    console.error('[Community Feed API] Error:', err.message);
    res.status(500).json({ error: 'Erro ao carregar feed' });
  }
});

// ─── GET /api/community/likes?activityId=X&userId=Y ──────────────────────────
router.get('/likes', async (req, res) => {
  const { activityId, userId } = req.query;
  if (!activityId) return res.status(400).json({ error: 'activityId obrigatório' });

  const supabase = getSupabase();
  try {
    const { data, error } = await supabase
      .from('activity_likes')
      .select('id, user_id')
      .eq('activity_id', activityId);

    if (error) throw error;

    const count = data?.length || 0;
    const userLiked = userId ? data?.some(l => l.user_id === userId) : false;
    const likers = data?.map(l => l.user_id) || [];

    res.json({ count, userLiked, likers });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar likes' });
  }
});

// ─── POST /api/community/likes ────────────────────────────────────────────────
router.post('/likes', async (req, res) => {
  const { activityId, userId, userName } = req.body;
  console.log(`[Community API] Like toggle request: activityId=${activityId}, userId=${userId}, userName=${userName}`);
  if (!activityId || !userId) return res.status(400).json({ error: 'activityId e userId obrigatórios' });

  const supabase = getSupabase();
  try {
    const { data: existing } = await supabase
      .from('activity_likes')
      .select('id')
      .eq('activity_id', activityId)
      .eq('user_id', userId)
      .single();

    if (existing) {
      await supabase.from('activity_likes').delete().eq('id', existing.id);
      res.json({ liked: false, message: 'Like removido' });
    } else {
      await supabase.from('activity_likes').insert({
        activity_id: activityId,
        user_id: userId,
        user_name: userName || 'Atleta'
      });
      res.json({ liked: true, message: 'Like adicionado' });
    }
  } catch (err) {
    console.error('Erro ao toggle like:', err.message);
    res.status(500).json({ error: 'Erro ao processar like' });
  }
});

// ─── GET /api/community/comments?activityId=X ────────────────────────────────
router.get('/comments', async (req, res) => {
  const { activityId } = req.query;
  if (!activityId) return res.status(400).json({ error: 'activityId obrigatório' });

  const supabase = getSupabase();
  try {
    const { data, error } = await supabase
      .from('activity_comments')
      .select('id, user_id, user_name, user_avatar, content, created_at')
      .eq('activity_id', activityId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar comentários' });
  }
});

// ─── POST /api/community/comments ─────────────────────────────────────────────
router.post('/comments', async (req, res) => {
  const { activityId, userId, userName, userAvatar, content } = req.body;
  if (!activityId || !userId || !content?.trim()) {
    return res.status(400).json({ error: 'activityId, userId e content obrigatórios' });
  }

  const supabase = getSupabase();
  try {
    const { data, error } = await supabase
      .from('activity_comments')
      .insert({
        activity_id: activityId,
        user_id: userId,
        user_name: userName || 'Atleta',
        user_avatar: userAvatar || '',
        content: content.trim()
      })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Erro ao adicionar comentário:', err.message);
    res.status(500).json({ error: 'Erro ao salvar comentário' });
  }
});

// ─── DELETE /api/community/comments/:id ──────────────────────────────────────
router.delete('/comments/:id', async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;

  const supabase = getSupabase();
  try {
    const { error } = await supabase
      .from('activity_comments')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao deletar comentário' });
  }
});

export default router;
