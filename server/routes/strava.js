import express from 'express';
const router = express.Router();

// In-memory token storage (in production, use a database)
let tokens = {};

// 1. START AUTH - Redirect user to Strava login
router.get('/auth', (req, res) => {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const redirectUri = process.env.STRAVA_REDIRECT_URI;
  const scope = 'read,activity:read_all,profile:read_all';
  const authUrl = `https://www.strava.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
  res.redirect(authUrl);
});

// 2. CALLBACK - Strava redirects here after login
router.get('/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).json({ error: 'Código não recebido' });

  try {
    const response = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        code, grant_type: 'authorization_code'
      })
    });
    const data = await response.json();
    if (data.errors) return res.status(400).json({ error: 'Falha na autenticação', details: data });

    tokens = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at,
      athlete: {
        id: data.athlete.id,
        firstname: data.athlete.firstname,
        lastname: data.athlete.lastname,
        profile: data.athlete.profile,
        username: data.athlete.username,
      }
    };
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/?strava=connected`);
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
