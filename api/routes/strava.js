import express from 'express';
import { createClient } from '@supabase/supabase-js';
const router = express.Router();


// Função auxiliar para inicializar o Supabase com segurança
const getSupabase = () => {
  const url = process.env.SUPABASE_URL || 'https://zljqlzwzwfzslftnymur.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsanFsend6d2Z6c2xmdG55bXVyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzM5MzQxNywiZXhwIjoyMDkyOTY5NDE3fQ.wJhriqog-ONdyulT2NG_puY_-Xj7OMDMPt7x_hnoRSQ';
  return createClient(url, key);
};

// 1. START AUTH - Redirect user to Strava login
router.get('/auth', (req, res) => {
  try {
    const clientId = process.env.STRAVA_CLIENT_ID || '190374';
    const redirectUri = process.env.STRAVA_REDIRECT_URI || 'https://meuvam.com.br/api/strava/callback';
    const scope = 'read,activity:read_all,profile:read_all';
    let userId = req.query.userId || '';

    if (!clientId || !redirectUri) {
      console.error('Configurações do Strava faltando');
      return res.status(500).json({ error: 'Configuração do Strava incompleta no servidor' });
    }

    if (userId === 'undefined' || !userId) {
      console.warn('Iniciando Auth do Strava sem userId válido');
    }
    
    const authUrl = `https://www.strava.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&state=${userId}`;
    res.redirect(authUrl);
  } catch (err) {
    console.error('Erro crítico no /auth:', err);
    res.status(500).send('Erro interno ao iniciar autenticação');
  }
});

// 2. CALLBACK - Strava redirects here after login
router.get('/callback', async (req, res) => {
  const { code, state: userId } = req.query;
  
  if (!code) return res.status(400).json({ error: 'Código não recebido' });
  if (!userId) return res.status(400).json({ error: 'Sessão do atleta não encontrada' });

  try {
    const response = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: parseInt(process.env.STRAVA_CLIENT_ID || '190374', 10),
        client_secret: process.env.STRAVA_CLIENT_SECRET || '98e467807fcb0fa87ab8df605542cb9de3f53bee',
        redirect_uri: process.env.STRAVA_REDIRECT_URI || 'https://meuvam.com.br/api/strava/callback',
        code, 
        grant_type: 'authorization_code'
      })
    });
    const data = await response.json();
    
    if (data.errors) return res.status(400).json({ error: 'Falha na autenticação', details: data });

    const supabase = getSupabase();
    if (!supabase) {
      console.error('Supabase não configurado');
      return res.status(500).json({ error: 'Erro de configuração do servidor' });
    }

    // Salvar no banco de dados Supabase
    const { error: dbError } = await supabase
      .from('integrations')
      .upsert({
        athlete_id: userId,
        platform: 'strava',
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: data.expires_at,
        username: data.athlete.username || data.athlete.firstname,
        connected: true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'athlete_id, platform' });

    if (dbError) {
      console.error('Erro ao salvar no Supabase:', dbError);
      return res.status(500).json({ error: 'Erro ao salvar integração' });
    }

    // Token salvo no banco Supabase - não usar variável global
    res.redirect('https://meuvam.com.br/?strava=connected');
  } catch (err) {
    console.error('Erro Strava OAuth:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// 3. REFRESH TOKEN (Do Banco de Dados)
const getValidToken = async (userId) => {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data: integration } = await supabase
    .from('integrations')
    .select('*')
    .eq('athlete_id', userId)
    .eq('platform', 'strava')
    .single();

  if (!integration || !integration.access_token) return null;

  const now = Math.floor(Date.now() / 1000);
  if (integration.expires_at && integration.expires_at < now) {
    console.log('Token expirado, renovando...');
    const response = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: parseInt(process.env.STRAVA_CLIENT_ID || '190374', 10),
        client_secret: process.env.STRAVA_CLIENT_SECRET || '98e467807fcb0fa87ab8df605542cb9de3f53bee',
        refresh_token: integration.refresh_token,
        grant_type: 'refresh_token'
      })
    });
    const data = await response.json();
    if (data.access_token) {
      await supabase.from('integrations').update({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: data.expires_at
      }).eq('athlete_id', userId).eq('platform', 'strava');
      return data.access_token;
    }
  }
  return integration.access_token;
};

// 4. STATUS (Não usado mais, pois o app lê direto do banco)
router.get('/status', (req, res) => res.json({ connected: false }));

// 5. ACTIVITIES (Busca e formata para a tabela workouts)
router.get('/activities', async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId obrigatório' });

  const token = await getValidToken(userId);
  if (!token) return res.status(401).json({ error: 'Strava não conectado' });

  try {
    const response = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?page=1&per_page=10`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const activities = await response.json();

    if (!Array.isArray(activities)) throw new Error('Falha na API do Strava');

    const formattedWorkouts = activities.map(a => {
      let garminId = null;
      if (a.external_id && a.external_id.includes('garmin_push_')) {
        const match = a.external_id.match(/garmin_push_(\d+)/i);
        if (match) garminId = match[1];
      }

      return {
        athlete_id: userId,
        strava_id: a.id,
        garmin_id: garminId,
        date: a.start_date_local,
        type: a.type === 'Run' ? 'Rodagem' : a.type,
        title: a.name,
        description: `Importado do Strava. Esforço percebido: ${a.suffer_score || '--'}`,
        status: 'completed',
        effort: Math.round(a.suffer_score / 10) || 5, // Aprox.
        polyline: a.map ? a.map.summary_polyline : null,
        metrics: {
          distance: `${(a.distance / 1000).toFixed(2)} km`,
          duration: `${Math.round(a.moving_time / 60)} min`,
          pace: a.distance > 0 ? formatPace(a.moving_time / (a.distance / 1000)) : null,
          elevation: a.total_elevation_gain ? `${Math.round(a.total_elevation_gain)}m` : '--',
          avgHeartRate: a.average_heartrate ? Math.round(a.average_heartrate) : '--',
          maxHeartRate: a.max_heartrate ? Math.round(a.max_heartrate) : '--',
          sufferScore: a.suffer_score || '--'
        }
      };
    });

    // ─── CACHE FOR COMMUNITY FEED ──────────────────────────────────────────
    try {
      const supabase = getSupabase();
      const { data: profile } = await supabase.from('profiles').select('name, avatar_url').eq('id', userId).single();
      
      const communityActs = formattedWorkouts.map(act => {
        const metrics = act.metrics || {};
        return {
          id: `strava_${act.strava_id}`,
          athlete_id: userId,
          athlete_name: profile?.name || 'Atleta',
          athlete_avatar: profile?.avatar_url || '',
          platform: 'strava',
          title: act.title,
          description: act.description || '',
          type: act.type,
          distance: metrics.distance || '--',
          duration: metrics.duration || '--',
          pace: metrics.pace || '--',
          polyline: act.polyline,
          activity_date: act.date
        };
      });

      if (communityActs.length > 0) {
        const { error: upsertErr } = await supabase.from('community_activities').upsert(communityActs, { onConflict: 'id' });
        if (upsertErr) console.error('[Strava Cache] Upsert error:', upsertErr.message);
      }
    } catch (cacheErr) {
      console.error('[Strava Cache] Erro ao salvar atividades na comunidade:', cacheErr.message);
    }
    // ───────────────────────────────────────────────────────────────────────

    res.json(formattedWorkouts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar atividades' });
  }
});

// 5.5. STREAMS (For charts)
router.get('/activity/:id/streams', async (req, res) => {
  const { id } = req.params;
  const { userId } = req.query;
  if (!userId || !id) return res.status(400).json({ error: 'userId e id obrigatórios' });

  const token = await getValidToken(userId);
  if (!token) return res.status(401).json({ error: 'Strava não conectado' });

  try {
    const keys = 'time,distance,altitude,velocity_smooth,heartrate,cadence';
    const response = await fetch(
      `https://www.strava.com/api/v3/activities/${id}/streams?keys=${keys}&key_by_type=true`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    if (!response.ok) throw new Error('Falha ao buscar streams');
    
    const streams = await response.json();
    res.json(streams);
  } catch (err) {
    console.error('Erro Strava streams:', err.message);
    res.status(500).json({ error: 'Erro ao buscar dados do gráfico' });
  }
});

// 5.6. SINGLE ACTIVITY DETAILS
router.get('/activity/:id', async (req, res) => {
  const { id } = req.params;
  const { userId } = req.query;
  if (!userId || !id) return res.status(400).json({ error: 'userId e id obrigatórios' });

  const token = await getValidToken(userId);
  if (!token) return res.status(401).json({ error: 'Strava não conectado' });

  try {
    const response = await fetch(
      `https://www.strava.com/api/v3/activities/${id}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    if (!response.ok) throw new Error('Falha ao buscar detalhes da atividade');
    
    const a = await response.json();
    
    const formatted = {
      strava_id: a.id,
      athlete_id: userId,
      date: a.start_date_local,
      type: a.type,
      title: a.name,
      description: a.description,
      polyline: a.map ? a.map.summary_polyline : null,
      metrics: {
        distance: `${(a.distance / 1000).toFixed(2)} km`,
        duration: `${Math.round(a.moving_time / 60)} min`,
        pace: a.distance > 0 ? formatPace(a.moving_time / (a.distance / 1000)) : null,
        elevation: a.total_elevation_gain ? `${Math.round(a.total_elevation_gain)}m` : '--',
        avgHeartRate: a.average_heartrate ? Math.round(a.average_heartrate) : '--',
        maxHeartRate: a.max_heartrate ? Math.round(a.max_heartrate) : '--',
        sufferScore: a.suffer_score || '--'
      }
    };
    
    res.json(formatted);
  } catch (err) {
    console.error('Erro Strava activity details:', err.message);
    res.status(500).json({ error: 'Erro ao buscar detalhes da atividade' });
  }
});

// 6. STATS
router.get('/stats', async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId obrigatório' });

  const token = await getValidToken(userId);
  if (!token) return res.status(401).json({ error: 'Strava não conectado' });

  const supabase = getSupabase();
  const { data: integration } = await supabase
    .from('integrations')
    .select('username')
    .eq('athlete_id', userId)
    .eq('platform', 'strava')
    .single();

  try {
    const response = await fetch(
      `https://www.strava.com/api/v3/athlete/stats`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    res.json(await response.json());
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
});

// 7. DISCONNECT
router.post('/disconnect', async (req, res) => {
  const { userId } = req.body;
  if (userId) {
    const supabase = getSupabase();
    if (supabase) {
      await supabase
        .from('integrations')
        .update({ connected: false, access_token: null, refresh_token: null })
        .match({ athlete_id: userId, platform: 'strava' });
    }
  }
  res.json({ success: true });
});

function formatPace(secsPerKm) {
  const mins = Math.floor(secsPerKm / 60);
  const secs = Math.round(secsPerKm % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default router;
