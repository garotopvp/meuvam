import express from 'express';
import { createClient } from '@supabase/supabase-js';
const router = express.Router();

let tokens = {};

// Função auxiliar para inicializar o Supabase com segurança
const getSupabase = () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
};

// 1. START AUTH - Redirect user to Strava login
router.get('/auth', (req, res) => {
  try {
    const clientId = process.env.STRAVA_CLIENT_ID;
    const redirectUri = process.env.STRAVA_REDIRECT_URI;
    const scope = 'read,activity:read_all,profile:read_all';
    let userId = req.query.userId || '';

    if (!clientId || !redirectUri) {
      console.error('Configurações do Strava faltando (CLIENT_ID ou REDIRECT_URI)');
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
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        redirect_uri: process.env.STRAVA_REDIRECT_URI,
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

    // Atualiza tokens em memória (efêmero)
    tokens = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at,
      athlete: data.athlete
    };

    res.redirect('https://meuvam.com.br/?strava=connected');
  } catch (err) {
    console.error('Erro Strava OAuth:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// 3. REFRESH TOKEN
const getValidToken = async () => {
  if (!tokens.access_token) return null;
  const now = Math.floor(Date.now() / 1000);
  if (tokens.expires_at && tokens.expires_at < now) {
    const response = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        refresh_token: tokens.refresh_token,
        grant_type: 'refresh_token'
      })
    });
    const data = await response.json();
    tokens.access_token = data.access_token;
    tokens.refresh_token = data.refresh_token;
    tokens.expires_at = data.expires_at;
  }
  return tokens.access_token;
};

// 4. STATUS
router.get('/status', (req, res) => {
  res.json({ connected: !!tokens.access_token, athlete: tokens.athlete || null });
});

// 5. ACTIVITIES
router.get('/activities', async (req, res) => {
  const token = await getValidToken();
  if (!token) return res.status(401).json({ error: 'Não conectado' });

  try {
    const response = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?page=${req.query.page || 1}&per_page=${req.query.per_page || 20}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const activities = await response.json();

    const formatted = activities.map(a => ({
      id: a.id, name: a.name, type: a.type,
      date: a.start_date_local,
      distance: (a.distance / 1000).toFixed(2),
      duration: Math.round(a.moving_time / 60),
      pace: a.distance > 0 ? formatPace(a.moving_time / (a.distance / 1000)) : null,
      elevation: a.total_elevation_gain,
      avgHR: a.average_heartrate || null,
      maxHR: a.max_heartrate || null,
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar atividades' });
  }
});

// 6. STATS
router.get('/stats', async (req, res) => {
  const token = await getValidToken();
  if (!token || !tokens.athlete?.id) return res.status(401).json({ error: 'Não conectado' });

  try {
    const response = await fetch(
      `https://www.strava.com/api/v3/athletes/${tokens.athlete.id}/stats`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    res.json(await response.json());
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
});

// 7. DISCONNECT
router.post('/disconnect', (req, res) => {
  tokens = {};
  res.json({ success: true });
});

function formatPace(secsPerKm) {
  const mins = Math.floor(secsPerKm / 60);
  const secs = Math.round(secsPerKm % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default router;
