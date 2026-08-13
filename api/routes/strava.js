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

    // Salvar no banco de dados Supabase empacotando o strava_athlete_id no refresh_token
    const structuredRefreshToken = JSON.stringify({
      refresh_token: data.refresh_token,
      strava_athlete_id: String(data.athlete.id)
    });

    const { error: dbError } = await supabase
      .from('integrations')
      .upsert({
        athlete_id: userId,
        platform: 'strava',
        access_token: data.access_token,
        refresh_token: structuredRefreshToken,
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

  // Extrair o refresh token real e o strava_athlete_id se for JSON
  let refreshTokenVal = integration.refresh_token;
  let stravaAthleteId = null;
  if (integration.refresh_token && integration.refresh_token.startsWith('{')) {
    try {
      const parsed = JSON.parse(integration.refresh_token);
      refreshTokenVal = parsed.refresh_token;
      stravaAthleteId = parsed.strava_athlete_id;
    } catch (e) {
      console.error('Erro ao fazer parse do refresh token JSON:', e);
    }
  }

  const now = Math.floor(Date.now() / 1000);
  if (integration.expires_at && integration.expires_at < now) {
    console.log('Token expirado, renovando...');
    const response = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: parseInt(process.env.STRAVA_CLIENT_ID || '190374', 10),
        client_secret: process.env.STRAVA_CLIENT_SECRET || '98e467807fcb0fa87ab8df605542cb9de3f53bee',
        refresh_token: refreshTokenVal,
        grant_type: 'refresh_token'
      })
    });
    const data = await response.json();
    if (data.access_token) {
      const newRefreshToken = stravaAthleteId 
        ? JSON.stringify({ refresh_token: data.refresh_token || refreshTokenVal, strava_athlete_id: stravaAthleteId })
        : (data.refresh_token || refreshTokenVal);

      await supabase.from('integrations').update({
        access_token: data.access_token,
        refresh_token: newRefreshToken,
        expires_at: data.expires_at
      }).eq('athlete_id', userId).eq('platform', 'strava');
      return data.access_token;
    }
  }
  return integration.access_token;
};

// 4. STATUS (Não usado mais, pois o app lê direto do banco)
router.get('/status', (req, res) => res.json({ connected: false }));

// Função auxiliar reutilizável para sincronizar um único atleta
export const syncSingleAthleteStrava = async (userId, days) => {
  if (!userId) throw new Error('userId obrigatório');

  const token = await getValidToken(userId);
  if (!token) throw new Error('Strava não conectado');

  let url = `https://www.strava.com/api/v3/athlete/activities?page=1&per_page=10`;
  if (days) {
    const daysNum = parseInt(days) || 90;
    const afterTimestamp = Math.floor(Date.now() / 1000) - (daysNum * 24 * 60 * 60);
    url = `https://www.strava.com/api/v3/athlete/activities?after=${afterTimestamp}&per_page=200`;
    console.log(`[Strava Sync] Realizando sincronização retroativa dos últimos ${daysNum} dias (after timestamp: ${afterTimestamp})`);
  }

  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const activities = await response.json();

  if (!Array.isArray(activities)) throw new Error('Falha na API do Strava');

  const formattedWorkouts = activities.map(a => {
    let garminId = null;
    if (a.external_id && a.external_id.includes('garmin_push_')) {
      const match = a.external_id.match(/garmin_push_(\d+)/i);
      if (match) garminId = match[1];
    }

    return {
      id: a.id,
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

  // ─── IMPORT / AUTO-COMPLETE WORKOUTS IN SUPABASE ───────────────────────
  try {
    const supabase = getSupabase();
    
    // Buscar todos os treinos do usuário para dedup e matching
    const { data: existingWorkouts, error: existingError } = await supabase
      .from('workouts')
      .select('*')
      .eq('athlete_id', userId);
      
    const existingStravaIds = new Set();
    const pendingWorkouts = [];
    
    if (!existingError && existingWorkouts) {
      existingWorkouts.forEach(w => {
        if (w.strava_id) existingStravaIds.add(String(w.strava_id));
        if (w.status !== 'completed') pendingWorkouts.push(w);
      });
    }

    const newWorkoutsToInsert = [];

    for (const act of formattedWorkouts) {
      // 1. Se a atividade já foi importada, pula para evitar duplicados
      if (existingStravaIds.has(String(act.strava_id))) {
        continue;
      }

      const actDateStr = act.date.substring(0, 10);
      
      // 2. Tenta encontrar um treino pendente cadastrado pelo treinador no mesmo dia
      const matchedWorkout = pendingWorkouts.find(w => w.date === actDateStr);
      
      if (matchedWorkout) {
        console.log(`[Strava Sync] Treino planejado pendente encontrado para a data ${actDateStr}. Atualizando para concluído...`);
        
        // Atualizar o treino planejado no Supabase
        const { error: updateErr } = await supabase
          .from('workouts')
          .update({
            status: 'completed',
            strava_id: act.strava_id,
            garmin_id: act.garmin_id,
            effort: act.effort,
            polyline: act.polyline,
            metrics: act.metrics,
            description: act.description
          })
          .eq('id', matchedWorkout.id);
          
        if (updateErr) {
          console.error(`[Strava Sync] Erro ao atualizar treino planejado ${matchedWorkout.id}:`, updateErr.message);
        } else {
          console.log(`[Strava Sync] Treino ${matchedWorkout.id} marcado como concluído.`);
          // Remover da lista de pendentes locais para evitar duplicados caso haja outra atividade na mesma data
          const idx = pendingWorkouts.findIndex(w => w.id === matchedWorkout.id);
          if (idx > -1) pendingWorkouts.splice(idx, 1);
        }
      } else {
        // 3. Se não houver treino planejado para esse dia, insere a atividade como um novo treino concluído
        newWorkoutsToInsert.push({
          athlete_id: userId,
          strava_id: act.strava_id,
          garmin_id: act.garmin_id,
          date: actDateStr,
          type: act.type,
          title: act.title,
          description: act.description,
          status: 'completed',
          effort: act.effort,
          polyline: act.polyline,
          metrics: act.metrics
        });
      }
    }

    if (newWorkoutsToInsert.length > 0) {
      console.log(`[Strava Sync] Salvando ${newWorkoutsToInsert.length} novas atividades importadas em workouts.`);
      const { error: insertErr } = await supabase
        .from('workouts')
        .insert(newWorkoutsToInsert);
      if (insertErr) {
        console.error('[Strava Sync] Erro ao inserir novos treinos concluídos:', insertErr.message);
      }
    }
  } catch (syncErr) {
    console.error('[Strava Sync] Erro crítico no processo de importação/auto-complete:', syncErr.message);
  }
  // ───────────────────────────────────────────────────────────────────────

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

  return formattedWorkouts;
};

// 5. ACTIVITIES (Busca e formata para a tabela workouts)
router.get('/activities', async (req, res) => {
  const { userId, days } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId obrigatório' });

  try {
    const result = await syncSingleAthleteStrava(userId, days);
    res.json(result);
  } catch (err) {
    console.error(err);
    if (err.message === 'Strava não conectado') {
      return res.status(401).json({ error: 'Strava não conectado' });
    }
    res.status(500).json({ error: err.message || 'Erro ao buscar atividades' });
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
      id: a.id,
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
        sufferScore: a.suffer_score || '--',
        calories: a.calories || '--',
        maxCadence: a.average_cadence ? Math.round(a.average_cadence * 1.1) : '--', // Estimativa de mx
        splits: a.splits_metric || [],
        laps: a.laps || [],
        bestEfforts: a.best_efforts || []
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

// 8. SYNC ALL ATHLETES (Chamado por Cron Job periódico)
router.get('/sync-all', async (req, res) => {
  const authHeader = req.headers.authorization;
  const vercelCronHeader = req.headers['x-vercel-cron'];
  
  const expectedSecret = process.env.CRON_SECRET || 'superacao_sync_secret_2026';
  const isAuthorized = 
    vercelCronHeader === '1' || 
    (authHeader && authHeader === `Bearer ${expectedSecret}`) ||
    (req.query.secret && req.query.secret === expectedSecret);

  if (!isAuthorized) {
    console.warn('[Sync All] Tentativa de acesso não autorizada ao endpoint de sincronização global');
    return res.status(401).json({ error: 'Não autorizado' });
  }

  console.log('[Sync All] Iniciando sincronização em lote para todos os atletas...');
  
  try {
    const supabase = getSupabase();
    if (!supabase) {
      throw new Error('Supabase não configurado');
    }

    // Buscar todas as integrações ativas do Strava
    const { data: activeIntegrations, error: dbError } = await supabase
      .from('integrations')
      .select('athlete_id, username')
      .eq('platform', 'strava')
      .eq('connected', true);

    if (dbError) {
      console.error('[Sync All] Erro ao buscar integrações:', dbError.message);
      return res.status(500).json({ error: 'Erro ao consultar banco de dados', details: dbError.message });
    }

    if (!activeIntegrations || activeIntegrations.length === 0) {
      console.log('[Sync All] Nenhum atleta conectado ao Strava encontrado.');
      return res.json({ message: 'Nenhum atleta conectado encontrado', processed: 0 });
    }

    console.log(`[Sync All] Encontrado(s) ${activeIntegrations.length} atleta(s) ativo(s). Iniciando processamento...`);

    const results = [];
    
    // Executar a sincronização sequencialmente para evitar gargalos/timeouts e limites de concorrência
    for (const integration of activeIntegrations) {
      const { athlete_id, username } = integration;
      console.log(`[Sync All] Sincronizando atleta: ${username || 'Sem Nome'} (ID: ${athlete_id})...`);
      
      try {
        // Sincronizar os últimos 7 dias por padrão para manter atualizado e leve
        const workoutsSynced = await syncSingleAthleteStrava(athlete_id, 7);
        
        results.push({
          athleteId: athlete_id,
          username: username || 'Atleta',
          status: 'success',
          syncedCount: workoutsSynced.length
        });
        console.log(`[Sync All] Sucesso para ${username || 'Sem Nome'} (${workoutsSynced.length} treinos processados).`);
      } catch (err) {
        console.error(`[Sync All] Falha ao sincronizar atleta ${username} (ID: ${athlete_id}):`, err.message);
        results.push({
          athleteId: athlete_id,
          username: username || 'Atleta',
          status: 'failed',
          error: err.message
        });
      }
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const failCount = results.filter(r => r.status === 'failed').length;

    console.log(`[Sync All] Fim do processamento. Sucesso: ${successCount}, Falhas: ${failCount}.`);
    res.json({
      message: 'Sincronização em lote finalizada',
      total: activeIntegrations.length,
      success: successCount,
      failed: failCount,
      report: results
    });

  } catch (err) {
    console.error('[Sync All] Erro crítico na sincronização global:', err);
    res.status(500).json({ error: 'Erro interno no sincronizador global', details: err.message });
  }
});

// 9. WEBHOOK VERIFICATION (GET) - Handshake de assinatura do Strava
router.get('/webhook', (req, res) => {
  const verifyToken = process.env.STRAVA_WEBHOOK_VERIFY_TOKEN || 'superacao_webhook_token_2026';
  
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === verifyToken) {
      console.log('[Webhook GET] Assinatura do webhook validada com sucesso pelo Strava!');
      return res.status(200).json({ 'hub.challenge': challenge });
    } else {
      console.warn('[Webhook GET] Falha na validação do token do webhook');
      return res.status(403).send('Forbidden');
    }
  }
  
  res.status(400).send('Bad Request');
});

// 10. WEBHOOK NOTIFICATION (POST) - Recebimento de treinos em tempo real
router.post('/webhook', async (req, res) => {
  const event = req.body;
  
  console.log('[Webhook POST] Evento recebido do Strava:', JSON.stringify(event));

  // O Strava exige resposta imediata de 200 OK (dentro de 2 segundos) para evitar retentativas e bloqueios.
  // Responderemos imediatamente e faremos o processamento de forma assíncrona.
  res.status(200).json({ status: 'received' });

  // Processamento assíncrono
  try {
    const { object_type, aspect_type, owner_id, object_id } = event;
    
    // Focamos apenas em criação de novas atividades
    if (object_type !== 'activity' || aspect_type !== 'create') {
      console.log(`[Webhook POST] Evento ignorado (object_type: ${object_type}, aspect_type: ${aspect_type})`);
      return;
    }

    const stravaAthleteId = String(owner_id);
    console.log(`[Webhook POST] Novo treino detectado para o atleta do Strava ID: ${stravaAthleteId} (Atividade ID: ${object_id}). Procurando correspondente no banco...`);

    const supabase = getSupabase();
    if (!supabase) {
      console.error('[Webhook POST] Supabase não configurado');
      return;
    }

    // Buscar todas as conexões ativas do Strava
    const { data: activeIntegrations, error: dbError } = await supabase
      .from('integrations')
      .select('athlete_id, refresh_token, username')
      .eq('platform', 'strava')
      .eq('connected', true);

    if (dbError) {
      console.error('[Webhook POST] Erro ao buscar integrações no Supabase:', dbError.message);
      return;
    }

    // Encontrar o atleta cujo refresh_token JSON contenha o stravaAthleteId correspondente
    let matchedAthlete = null;

    if (activeIntegrations && activeIntegrations.length > 0) {
      for (const integration of activeIntegrations) {
        if (integration.refresh_token && integration.refresh_token.startsWith('{')) {
          try {
            const parsed = JSON.parse(integration.refresh_token);
            if (String(parsed.strava_athlete_id) === stravaAthleteId) {
              matchedAthlete = integration;
              break;
            }
          } catch (e) {
            console.error('[Webhook POST] Erro ao analisar refresh_token de', integration.athlete_id, e.message);
          }
        }
      }
    }

    if (!matchedAthlete) {
      console.warn(`[Webhook POST] Nenhum atleta conectado no Supabase corresponde ao Strava Athlete ID: ${stravaAthleteId}`);
      return;
    }

    console.log(`[Webhook POST] Atleta identificado com sucesso! Aluno: ${matchedAthlete.username || 'Sem Nome'} (ID: ${matchedAthlete.athlete_id}). Disparando sincronização instantânea...`);

    // Sincronizar apenas os últimos 2 dias (super rápido e leve, já que o treino acabou de acontecer!)
    try {
      const syncedWorkouts = await syncSingleAthleteStrava(matchedAthlete.athlete_id, 2);
      console.log(`[Webhook POST] Sincronização concluída com sucesso para o aluno ${matchedAthlete.username}! ${syncedWorkouts.length} treino(s) processados.`);
    } catch (syncErr) {
      console.error(`[Webhook POST] Erro na sincronização instantânea do aluno ${matchedAthlete.username}:`, syncErr.message);
    }

  } catch (err) {
    console.error('[Webhook POST] Erro crítico no processamento assíncrono do Webhook:', err.message);
  }
});

function formatPace(secsPerKm) {
  const mins = Math.floor(secsPerKm / 60);
  const secs = Math.round(secsPerKm % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default router;
