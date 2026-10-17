import express from 'express';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

const getSupabase = () => {
  const url = process.env.SUPABASE_URL || 'https://zljqlzwzwfzslftnymur.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsanFsend6d2Z6c2xmdG55bXVyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzM5MzQxNywiZXhwIjoyMDkyOTY5NDE3fQ.wJhriqog-ONdyulT2NG_puY_-Xj7OMDMPt7x_hnoRSQ';
  return createClient(url, key);
};
const supabase = getSupabase();

// Memory caches per athlete
const corosSessions = new Map();
const intervalsSessions = new Map();

const COROS_BASE_URLS = {
  us: 'https://teamapi.coros.com',
  eu: 'https://teameuapi.coros.com',
  asia: 'https://teamcnapi.coros.com',
};

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

// ─── SHARED WORKOUT PARSER ────────────────────────────────────────────────────

function parsePaceToSeconds(paceInput) {
  if (!paceInput) return null;
  const str = String(paceInput).trim();
  const colonMatch = str.match(/(\d+):(\d+)/);
  if (colonMatch) {
    const mins = parseInt(colonMatch[1], 10);
    const secs = parseInt(colonMatch[2], 10);
    if (!isNaN(mins) && !isNaN(secs)) {
      return mins * 60 + secs;
    }
  }
  const clean = str.replace(',', '.').replace(/[^0-9.]/g, '');
  const num = parseFloat(clean);
  if (!isNaN(num) && num > 0) {
    return Math.round(num * 60);
  }
  return null;
}

function formatSecondsToPace(totalSec) {
  if (!totalSec || totalSec <= 0) return null;
  const mins = Math.floor(totalSec / 60);
  const secs = Math.round(totalSec % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export function blocksToStructuredSteps(blocks) {
  if (!Array.isArray(blocks) || blocks.length === 0) return [];
  const steps = [];

  blocks.forEach((b, idx) => {
    const name = b.name || '';
    const combined = `${name} ${b.type || ''} ${b.pauseNote || ''}`.toLowerCase();
    const repeatMatch = name.match(/(\d+)\s*[x×]\s*(.*)/i);

    if (repeatMatch) {
      const count = Math.min(30, Math.max(1, parseInt(repeatMatch[1], 10)));
      const restText = repeatMatch[2].trim();
      const distMatch = restText.match(/(\d+(?:[.,]\d+)?)\s*(km|m)\b/i);

      let workKm = 0.2;
      if (distMatch) {
        const val = parseFloat(distMatch[1].replace(',', '.'));
        const unit = distMatch[2].toLowerCase();
        workKm = unit === 'm' ? val / 1000 : val;
      }

      let recMinutes = 1;
      const recMatch = combined.match(/(?:rec(?:up(?:era[cç][aã]o)?)?|pausa)\s*(\d+)\s*(min|m|seg|s|')/i);
      if (recMatch) {
        const rVal = parseInt(recMatch[1], 10);
        const rUnit = recMatch[2].toLowerCase();
        recMinutes = rUnit === 's' || rUnit === 'seg' ? rVal / 60 : rVal;
      }

      steps.push({
        type: 'repetition',
        count,
        steps: [
          {
            type: 'run',
            label: name.replace(/\s*\(.*\)/, '').trim(),
            duration: { type: 'distance', value: workKm },
            intensity: b.pace ? { type: 'pace', value: b.pace } : undefined,
          },
          {
            type: 'recovery',
            label: 'Recuperação',
            duration: { type: 'time', value: recMinutes },
          },
        ],
      });
    } else {
      let stepType = 'run';
      if (
        combined.includes('aquec') ||
        combined.includes('warm') ||
        (idx === 0 && blocks.length > 1 && combined.includes('trote'))
      ) {
        stepType = 'warmup';
      } else if (
        combined.includes('desaquec') ||
        combined.includes('volta') ||
        combined.includes('trote final') ||
        combined.includes('soltura') ||
        combined.includes('cool') ||
        (idx === blocks.length - 1 && blocks.length > 2 && combined.includes('regenerativo'))
      ) {
        stepType = 'cooldown';
      }

      let distKm = 0;
      if (b.distance) {
        const dStr = String(b.distance).toLowerCase().replace(',', '.').trim();
        if (dStr.includes('m') && !dStr.includes('km')) {
          distKm = (parseFloat(dStr) || 0) / 1000;
        } else {
          distKm = parseFloat(dStr) || 0;
        }
      }

      steps.push({
        type: stepType,
        label: name || b.type || 'Corrida',
        duration: distKm > 0 ? { type: 'distance', value: distKm } : { type: 'lap_button' },
        intensity: b.pace ? { type: 'pace', value: b.pace } : undefined,
      });
    }
  });

  return steps;
}

function extractStepsFromWorkout(workout) {
  let rawSteps = workout.structured_steps || workout.metrics?.structured_steps || [];
  if (!Array.isArray(rawSteps) || rawSteps.length === 0) {
    const rawBlocks = workout.structured_blocks || workout.metrics?.structured_blocks || [];
    if (Array.isArray(rawBlocks) && rawBlocks.length > 0) {
      rawSteps = blocksToStructuredSteps(rawBlocks);
    }
  }
  if (!Array.isArray(rawSteps) || rawSteps.length === 0) {
    const distKm = parseFloat(String(workout.metrics?.distance || '5').replace(',', '.')) || 5;
    rawSteps = [
      {
        type: 'run',
        label: workout.title || 'Corrida',
        duration: { type: 'distance', value: distKm },
      },
    ];
  }
  return rawSteps;
}

// ═════════════════════════════════════════════════════════════════════════════
// 1. COROS TRAINING HUB INTEGRATION (/api/coros/*)
// ═════════════════════════════════════════════════════════════════════════════

function md5(str) {
  return crypto.createHash('md5').update(String(str)).digest('hex');
}

function corosAuthHeaders(session) {
  return {
    'Content-Type': 'application/json',
    'User-Agent': USER_AGENT,
    accessToken: session.accessToken,
    yfheader: JSON.stringify({ userId: session.corosUserId }),
  };
}

async function authenticateCorosWithShardDiscovery(email, pwdHash, preferredRegion = 'us') {
  const regionsToTry = Array.from(new Set([preferredRegion, 'us', 'eu', 'asia']));
  let lastError = null;

  for (const region of regionsToTry) {
    const baseUrl = COROS_BASE_URLS[region] || COROS_BASE_URLS.us;
    try {
      const loginResp = await fetch(`${baseUrl}/account/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': USER_AGENT },
        body: JSON.stringify({
          account: email,
          accountType: 2,
          pwd: pwdHash,
        }),
      });
      const loginBody = await loginResp.json();
      if (loginBody.result !== '0000' || !loginBody.data?.accessToken) {
        lastError = new Error(loginBody.message || `Falha no login COROS (${loginBody.result})`);
        // Se for senha incorreta ou conta inexistente, não precisa tentar todas se já deu erro de credencial
        continue;
      }

      const session = {
        accessToken: loginBody.data.accessToken,
        corosUserId: loginBody.data.userId,
        region,
        email,
        pwdHash,
        displayName: loginBody.data.nickname || email.split('@')[0],
        timestamp: Date.now(),
      };

      // Verifica se o token pertence a esta região (evita erro 1019)
      const verifyResp = await fetch(`${baseUrl}/dashboard/query`, {
        method: 'GET',
        headers: corosAuthHeaders(session),
      });
      const verifyBody = await verifyResp.json();
      if (verifyBody.result === '0000') {
        return session;
      }
      if (String(verifyBody.result) === '1019') {
        lastError = new Error('Região da conta COROS diferente, tentando próximo servidor...');
        continue;
      }
      return session;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('Não foi possível autenticar no COROS Training Hub.');
}

async function getCorosSession(userId) {
  if (!userId) return null;
  if (corosSessions.has(userId)) {
    const cached = corosSessions.get(userId);
    if (Date.now() - (cached.timestamp || 0) < 20 * 60 * 60 * 1000) {
      return cached;
    }
  }

  try {
    const { data } = await supabase
      .from('integrations')
      .select('access_token, username')
      .match({ athlete_id: userId, platform: 'coros' })
      .single();

    if (data?.access_token) {
      const stored = JSON.parse(data.access_token);
      if (stored.accessToken && Date.now() - (stored.timestamp || 0) < 20 * 60 * 60 * 1000) {
        corosSessions.set(userId, stored);
        return stored;
      }
      if (stored.email && stored.pwdHash) {
        const refreshed = await authenticateCorosWithShardDiscovery(
          stored.email,
          stored.pwdHash,
          stored.region || 'us'
        );
        corosSessions.set(userId, refreshed);
        await supabase
          .from('integrations')
          .upsert(
            {
              athlete_id: userId,
              platform: 'coros',
              username: refreshed.displayName,
              connected: true,
              access_token: JSON.stringify(refreshed),
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'athlete_id, platform' }
          );
        return refreshed;
      }
    }
  } catch (err) {
    console.warn(`[COROS Session] Falha ao restaurar sessão para ${userId}:`, err.message);
  }
  return null;
}

function buildCorosProgramPayload(workout) {
  const rawSteps = extractStepsFromWorkout(workout);
  const exercises = [];
  let topIndex = 0;
  let totalSeconds = 0;
  let exId = 0;
  const wireSportType = 1; // Running
  const intensityType = 3; // Pace

  const buildStepFields = (s) => {
    const totalSecPerKm = s.intensity?.type === 'pace' ? parsePaceToSeconds(s.intensity.value) : null;
    const fastSec = totalSecPerKm ? Math.max(60, totalSecPerKm - 8) : 0;
    const slowSec = totalSecPerKm ? totalSecPerKm + 8 : 0;

    if (s.duration?.type === 'distance' && s.duration?.value > 0) {
      const meters = Math.round(parseFloat(s.duration.value) * 1000);
      const estSecs = Math.round((meters / 1000) * (totalSecPerKm || 300));
      return {
        targetType: 5,
        targetValue: meters * 100,
        intensityType: totalSecPerKm ? intensityType : 0,
        intensityValue: totalSecPerKm ? fastSec * 1000 : 0,
        intensityValueExtend: totalSecPerKm ? slowSec * 1000 : 0,
        intensityMultiplier: totalSecPerKm ? 1000 : 0,
        seconds: estSecs,
      };
    }

    if (s.duration?.type === 'time' && s.duration?.value > 0) {
      const durationSecs = Math.round(parseFloat(s.duration.value) * 60);
      return {
        targetType: 2,
        targetValue: durationSecs,
        intensityType: totalSecPerKm ? intensityType : 0,
        intensityValue: totalSecPerKm ? fastSec : 0,
        intensityValueExtend: totalSecPerKm ? slowSec : 0,
        intensityMultiplier: 0,
        seconds: durationSecs,
      };
    }

    return {
      targetType: 1,
      targetValue: 0,
      intensityType: totalSecPerKm ? intensityType : 0,
      intensityValue: totalSecPerKm ? fastSec : 0,
      intensityValueExtend: totalSecPerKm ? slowSec : 0,
      intensityMultiplier: 0,
      seconds: 300,
    };
  };

  for (const step of rawSteps) {
    if (step.type === 'repetition' && Array.isArray(step.steps)) {
      topIndex += 1;
      exId += 1;
      const groupSort = 16777216 * topIndex;
      const groupId = exId;
      const repeatCount = step.count || 1;

      const subFields = step.steps.map((sub) => buildStepFields(sub));
      const iterationSeconds = subFields.reduce((acc, f) => acc + f.seconds, 0);
      totalSeconds += iterationSeconds * repeatCount;

      exercises.push({
        id: groupId,
        name: 'Group',
        exerciseType: 0,
        sportType: wireSportType,
        intensityType: 0,
        intensityValue: 0,
        targetType: 2,
        targetValue: iterationSeconds,
        sets: repeatCount,
        sortNo: groupSort,
        restType: 3,
        restValue: 0,
        groupId: '0',
        isGroup: true,
        originId: '0',
      });

      step.steps.forEach((sub, j) => {
        exId += 1;
        const fields = subFields[j];
        exercises.push({
          id: exId,
          name: sub.label || (sub.type === 'recovery' ? 'Recuperação' : 'Tiro'),
          exerciseType: 2,
          sportType: wireSportType,
          intensityType: fields.intensityType,
          intensityValue: fields.intensityValue,
          intensityValueExtend: fields.intensityValueExtend,
          intensityMultiplier: fields.intensityMultiplier,
          targetType: fields.targetType,
          targetValue: fields.targetValue,
          sets: 1,
          sortNo: groupSort + 65536 * (j + 1),
          restType: 3,
          restValue: 0,
          groupId: String(groupId),
          isGroup: false,
          originId: '0',
        });
      });
    } else {
      topIndex += 1;
      exId += 1;
      const fields = buildStepFields(step);
      totalSeconds += fields.seconds;

      let exType = 2; // main
      if (step.type === 'warmup') exType = 1;
      else if (step.type === 'cooldown') exType = 3;

      exercises.push({
        id: exId,
        name: step.label || 'Corrida',
        exerciseType: exType,
        sportType: wireSportType,
        intensityType: fields.intensityType,
        intensityValue: fields.intensityValue,
        intensityValueExtend: fields.intensityValueExtend,
        intensityMultiplier: fields.intensityMultiplier,
        targetType: fields.targetType,
        targetValue: fields.targetValue,
        sets: 1,
        sortNo: 16777216 * topIndex,
        restType: 3,
        restValue: 0,
        groupId: '0',
        isGroup: false,
        originId: '0',
      });
    }
  }

  const realStepCount = exercises.filter((e) => !e.isGroup).length;

  return {
    name: workout.title || 'Treino MeuVAM',
    sportType: wireSportType,
    estimatedTime: totalSeconds,
    access: 1,
    exercises,
    duration: totalSeconds,
    exerciseNum: realStepCount,
    gradeSystemVersion: 0,
    hybridTotalSets: 0,
    overview: workout.description || '',
    poolLength: 0,
    poolLengthId: 0,
    poolLengthUnit: 0,
    referExercise: {
      gradeSystem: 0,
      hrType: 0,
      intensityType: 0,
      valueType: 1,
    },
    sourceUrl: '',
    subType: 65535,
    totalSets: realStepCount,
    trainingLoad: 0,
    type: 0,
    videoCoverUrl: '',
    videoUrl: '',
  };
}

// POST /api/coros/login
router.post('/coros/login', async (req, res) => {
  const { email, password, userId, region } = req.body;
  if (!email || !password || !userId) {
    return res.status(400).json({ error: 'E-mail, senha e userId são obrigatórios.' });
  }

  try {
    const pwdHash = md5(password);
    const session = await authenticateCorosWithShardDiscovery(email.trim(), pwdHash, region || 'us');
    corosSessions.set(userId, session);

    await supabase.from('integrations').upsert(
      {
        athlete_id: userId,
        platform: 'coros',
        username: session.displayName,
        connected: true,
        access_token: JSON.stringify(session),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'athlete_id, platform' }
    );

    res.json({
      success: true,
      user: { displayName: session.displayName, region: session.region },
    });
  } catch (err) {
    console.error('[COROS Login] Erro:', err.message);
    res.status(401).json({
      error: err.message || 'Falha ao conectar no COROS Training Hub. Verifique seu e-mail e senha.',
    });
  }
});

// GET /api/coros/status
router.get('/coros/status', async (req, res) => {
  const { userId } = req.query;
  const session = await getCorosSession(userId);
  res.json({
    connected: !!session,
    user: session ? { displayName: session.displayName, region: session.region } : null,
  });
});

// POST /api/coros/workout/push
router.post('/coros/workout/push', async (req, res) => {
  const { userId, workout, date } = req.body;
  const session = await getCorosSession(userId);
  if (!session) {
    return res.status(401).json({ error: 'Não conectado à conta COROS.' });
  }
  if (!workout) {
    return res.status(400).json({ error: 'Dados do treino ausentes.' });
  }

  try {
    const baseUrl = COROS_BASE_URLS[session.region] || COROS_BASE_URLS.us;
    const headers = corosAuthHeaders(session);
    const programPayload = buildCorosProgramPayload(workout);

    // 1. Salva na biblioteca de treinos do COROS Training Hub
    const addResp = await fetch(`${baseUrl}/training/program/add`, {
      method: 'POST',
      headers,
      body: JSON.stringify(programPayload),
    });
    const addBody = await addResp.json();
    if (addBody.result !== '0000') {
      throw new Error(addBody.message || `Erro COROS (${addBody.result}) ao criar treino`);
    }
    const workoutId = String(addBody.data || '');

    // 2. Agenda na data do calendário COROS (formato YYYYMMDD)
    const targetDateStr = (date || workout.date || new Date().toISOString().split('T')[0]).replace(/-/g, '');
    let scheduled = false;

    try {
      const schedQueryResp = await fetch(
        `${baseUrl}/training/schedule/query?startDate=${targetDateStr}&endDate=${targetDateStr}&supportRestExercise=1`,
        { method: 'GET', headers }
      );
      const schedQueryBody = await schedQueryResp.json();
      const maxIdInPlan = parseInt(schedQueryBody?.data?.maxIdInPlan || 0, 10) || 0;
      const idInPlan = maxIdInPlan + 1;

      const schedulePayload = {
        entities: [
          {
            happenDay: targetDateStr,
            idInPlan,
            sortNoInSchedule: 1,
          },
        ],
        programs: [{ ...programPayload, idInPlan }],
        versionObjects: [{ id: idInPlan, status: 1 }],
        pbVersion: 2,
      };

      const schedUpdateResp = await fetch(`${baseUrl}/training/schedule/update`, {
        method: 'POST',
        headers,
        body: JSON.stringify(schedulePayload),
      });
      const schedUpdateBody = await schedUpdateResp.json();
      if (schedUpdateBody.result === '0000') {
        scheduled = true;
      }
    } catch (schedErr) {
      console.warn('[COROS Push] Treino criado na biblioteca, aviso ao agendar:', schedErr.message);
    }

    res.json({
      success: true,
      workoutId,
      scheduled,
      message: scheduled
        ? `Treino "${workout.title}" enviado e agendado no calendário COROS!`
        : `Treino "${workout.title}" enviado para sua Biblioteca de Treinos COROS!`,
    });
  } catch (err) {
    console.error('[COROS Push] Erro:', err.message);
    res.status(500).json({
      error: 'Falha ao enviar treino para o COROS',
      details: err.message,
    });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// 2. INTERVALS.ICU INTEGRATION (/api/intervals/*)
//    Ponte oficial para Polar Flow, Suunto, COROS, Wahoo e Apple Watch
// ═════════════════════════════════════════════════════════════════════════════

function intervalsBasicAuth(apiKey) {
  return 'Basic ' + Buffer.from(`API_KEY:${String(apiKey).trim()}`).toString('base64');
}

async function getIntervalsSession(userId) {
  if (!userId) return null;
  if (intervalsSessions.has(userId)) return intervalsSessions.get(userId);

  try {
    const { data } = await supabase
      .from('integrations')
      .select('access_token, username')
      .match({ athlete_id: userId, platform: 'intervals' })
      .single();

    if (data?.access_token) {
      const stored = JSON.parse(data.access_token);
      if (stored.apiKey) {
        intervalsSessions.set(userId, stored);
        return stored;
      }
    }
  } catch (err) {
    console.warn(`[Intervals.icu] Erro ao carregar sessão para ${userId}:`, err.message);
  }
  return null;
}

function workoutToIntervalsSyntax(workout) {
  const rawSteps = extractStepsFromWorkout(workout);
  const lines = [];

  if (workout.description) {
    lines.push(workout.description.trim());
    lines.push('');
  }

  const formatStepLine = (s) => {
    let durText = '1km';
    if (s.duration?.type === 'distance' && s.duration?.value > 0) {
      const km = parseFloat(s.duration.value);
      durText = km >= 1 ? `${km}km` : `${Math.round(km * 1000)}m`;
    } else if (s.duration?.type === 'time' && s.duration?.value > 0) {
      const mins = parseFloat(s.duration.value);
      durText = mins >= 1 ? `${Math.round(mins)}m` : `${Math.round(mins * 60)}s`;
    }

    const totalSec = s.intensity?.type === 'pace' ? parsePaceToSeconds(s.intensity.value) : null;
    if (totalSec && totalSec > 0) {
      const fastPace = formatSecondsToPace(Math.max(60, totalSec - 6));
      const slowPace = formatSecondsToPace(totalSec + 6);
      return `- ${ s.label ? s.label + ' ' : '' }${durText} ${fastPace}-${slowPace}/km Pace`;
    }

    if (s.type === 'recovery') {
      return `- Recuperação ${durText} 50% Pace`;
    }
    return `- ${ s.label ? s.label + ' ' : '' }${durText} 75% Pace`;
  };

  for (const step of rawSteps) {
    if (step.type === 'repetition' && Array.isArray(step.steps)) {
      lines.push(`Main Set ${step.count || 1}x`);
      for (const sub of step.steps) {
        lines.push(formatStepLine(sub));
      }
      lines.push('');
    } else {
      const header =
        step.type === 'warmup' ? 'Warmup' : step.type === 'cooldown' ? 'Cooldown' : 'Main Set';
      lines.push(header);
      lines.push(formatStepLine(step));
      lines.push('');
    }
  }

  return lines.join('\n').trim();
}

// POST /api/intervals/login
router.post('/intervals/login', async (req, res) => {
  const { athleteId, apiKey, userId } = req.body;
  if (!apiKey || !userId) {
    return res.status(400).json({ error: 'A chave de API (API Key) do Intervals.icu é obrigatória.' });
  }

  const targetId = (athleteId || '0').trim() || '0';

  try {
    const resp = await fetch(`https://intervals.icu/api/v1/athlete/${encodeURIComponent(targetId)}`, {
      method: 'GET',
      headers: {
        Authorization: intervalsBasicAuth(apiKey),
        Accept: 'application/json',
      },
    });

    if (!resp.ok) {
      return res.status(401).json({
        error: 'Chave de API ou ID do Atleta inválidos no Intervals.icu.',
      });
    }

    const profile = await resp.json();
    const resolvedId = profile.id || targetId;
    const displayName = profile.name || profile.firstname || resolvedId;

    const session = {
      athleteId: resolvedId,
      apiKey: apiKey.trim(),
      displayName,
    };

    intervalsSessions.set(userId, session);

    await supabase.from('integrations').upsert(
      {
        athlete_id: userId,
        platform: 'intervals',
        username: displayName,
        connected: true,
        access_token: JSON.stringify(session),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'athlete_id, platform' }
    );

    res.json({
      success: true,
      user: { displayName, athleteId: resolvedId },
    });
  } catch (err) {
    console.error('[Intervals Login] Erro:', err.message);
    res.status(500).json({ error: 'Erro ao validar conexão com o Intervals.icu.' });
  }
});

// GET /api/intervals/status
router.get('/intervals/status', async (req, res) => {
  const { userId } = req.query;
  const session = await getIntervalsSession(userId);
  res.json({
    connected: !!session,
    user: session ? { displayName: session.displayName, athleteId: session.athleteId } : null,
  });
});

// POST /api/intervals/workout/push
router.post('/intervals/workout/push', async (req, res) => {
  const { userId, workout, date } = req.body;
  const session = await getIntervalsSession(userId);
  if (!session) {
    return res.status(401).json({ error: 'Não conectado ao Intervals.icu.' });
  }
  if (!workout) {
    return res.status(400).json({ error: 'Dados do treino ausentes.' });
  }

  try {
    const targetDate = date || workout.date || new Date().toISOString().split('T')[0];
    const description = workoutToIntervalsSyntax(workout);

    const payload = {
      category: 'WORKOUT',
      type: 'Run',
      name: workout.title || 'Treino MeuVAM',
      start_date_local: `${targetDate}T00:00:00`,
      description,
    };

    const resp = await fetch(
      `https://intervals.icu/api/v1/athlete/${encodeURIComponent(session.athleteId)}/events`,
      {
        method: 'POST',
        headers: {
          Authorization: intervalsBasicAuth(session.apiKey),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`Intervals.icu respondeu ${resp.status}: ${errText}`);
    }

    const created = await resp.json();
    res.json({
      success: true,
      eventId: created.id,
      message: `Treino "${workout.title}" sincronizado no Intervals.icu para ${targetDate} (Polar / Suunto / COROS / Apple Watch)!`,
    });
  } catch (err) {
    console.error('[Intervals Push] Erro:', err.message);
    res.status(500).json({
      error: 'Falha ao enviar treino para o Intervals.icu',
      details: err.message,
    });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// 3. GERADOR DE ARQUIVO BINÁRIO .FIT DE TREINO ESTRUTURADO (/api/workout/fit)
//    Compatível com COROS, Garmin, Suunto, Wahoo e WorkOutDoors (Apple Watch)
// ═════════════════════════════════════════════════════════════════════════════

const FIT_CRC_TABLE = [
  0x0000, 0xcc01, 0xd801, 0x1400, 0xf001, 0x3c00, 0x2800, 0xe401,
  0xa001, 0x6c00, 0x7800, 0xb401, 0x5000, 0x9c01, 0x8801, 0x4400,
];

function computeFitCrc(buffer, start = 0, end = buffer.length) {
  let crc = 0;
  for (let i = start; i < end; i++) {
    const byte = buffer[i];
    let tmp = FIT_CRC_TABLE[crc & 0xf];
    crc = (crc >> 4) & 0x0fff;
    crc = crc ^ tmp ^ FIT_CRC_TABLE[byte & 0xf];
    tmp = FIT_CRC_TABLE[crc & 0xf];
    crc = (crc >> 4) & 0x0fff;
    crc = crc ^ tmp ^ FIT_CRC_TABLE[(byte >> 4) & 0xf];
  }
  return crc & 0xffff;
}

function fixedStringBytes(str, length) {
  const buf = Buffer.alloc(length, 0);
  const clean = String(str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  buf.write(clean.slice(0, length - 1), 0, 'utf8');
  return buf;
}

function buildWorkoutFitBuffer(workout) {
  const rawSteps = extractStepsFromWorkout(workout);
  const fitSteps = [];

  const pushExecutableStep = (s) => {
    const idx = fitSteps.length;
    const totalSec = s.intensity?.type === 'pace' ? parsePaceToSeconds(s.intensity.value) : null;

    // Duration: 0 = time (ms), 1 = distance (cm), 2 = open
    let durationType = 2; // open
    let durationValue = 0;
    if (s.duration?.type === 'distance' && s.duration?.value > 0) {
      durationType = 1; // distance in cm (1 km = 100,000 cm)
      durationValue = Math.round(parseFloat(s.duration.value) * 100000);
    } else if (s.duration?.type === 'time' && s.duration?.value > 0) {
      durationType = 0; // time in ms (1 min = 60,000 ms)
      durationValue = Math.round(parseFloat(s.duration.value) * 60000);
    }

    // Target: 0 = speed, 2 = open
    let targetType = 2;
    let customLow = 0;
    let customHigh = 0;
    if (totalSec && totalSec > 0) {
      targetType = 0; // speed (mm/s)
      const slowSec = totalSec + 8;
      const fastSec = Math.max(60, totalSec - 8);
      customLow = Math.round((1000 / slowSec) * 1000); // mm/s
      customHigh = Math.round((1000 / fastSec) * 1000); // mm/s
    }

    // Intensity: 0 = active, 1 = rest, 2 = warmup, 3 = cooldown, 4 = recovery
    let intensity = 0;
    if (s.type === 'warmup') intensity = 2;
    else if (s.type === 'cooldown') intensity = 3;
    else if (s.type === 'recovery') intensity = 4;
    else if (s.type === 'rest') intensity = 1;

    fitSteps.push({
      messageIndex: idx,
      name: s.label || 'Corrida',
      durationType,
      durationValue,
      targetType,
      targetValue: 0,
      customLow,
      customHigh,
      intensity,
    });
  };

  for (const step of rawSteps) {
    if (step.type === 'repetition' && Array.isArray(step.steps)) {
      const startIdx = fitSteps.length;
      for (const sub of step.steps) {
        pushExecutableStep(sub);
      }
      // Repeat step: duration_type = 6 (repeat_until_steps_cmplt), duration_value = startIdx, target_value = count
      fitSteps.push({
        messageIndex: fitSteps.length,
        name: `${step.count || 1}x Series`,
        durationType: 6,
        durationValue: startIdx,
        targetType: 2,
        targetValue: step.count || 1,
        customLow: 0,
        customHigh: 0,
        intensity: 0,
      });
    } else {
      pushExecutableStep(step);
    }
  }

  const chunks = [];

  // 1. Definition & Data for file_id (local 0, global 0)
  // Fields: serial_number(3, uint32z), time_created(4, uint32), manufacturer(1, uint16), product(2, uint16), type(0, enum)
  const defFileId = Buffer.from([
    0x40, 0x00, 0x00, 0x00, 0x00, 0x05,
    0x03, 0x04, 0x8c, // serial_number
    0x04, 0x04, 0x86, // time_created
    0x01, 0x02, 0x84, // manufacturer
    0x02, 0x02, 0x84, // product
    0x00, 0x01, 0x00, // type
  ]);
  chunks.push(defFileId);

  const fitEpochOffset = Math.floor(Date.now() / 1000) - 631065600;
  const dataFileId = Buffer.alloc(1 + 4 + 4 + 2 + 2 + 1);
  dataFileId.writeUInt8(0x00, 0); // local mesg 0
  dataFileId.writeUInt32LE(12345678, 1); // serial_number
  dataFileId.writeUInt32LE(fitEpochOffset >>> 0, 5); // time_created
  dataFileId.writeUInt16LE(1, 9); // manufacturer = 1 (Garmin)
  dataFileId.writeUInt16LE(65534, 11); // product
  dataFileId.writeUInt8(5, 13); // type = 5 (Workout)
  chunks.push(dataFileId);

  // 2. Definition & Data for workout (local 1, global 26)
  // Fields: capabilities(5, uint32z), wkt_name(8, string 24), num_valid_steps(6, uint16), sport(4, enum), sub_sport(11, enum)
  const defWorkout = Buffer.from([
    0x41, 0x00, 0x00, 0x1a, 0x00, 0x05,
    0x05, 0x04, 0x8c, // capabilities
    0x08, 0x18, 0x07, // wkt_name (24 bytes)
    0x06, 0x02, 0x84, // num_valid_steps
    0x04, 0x01, 0x00, // sport
    0x0b, 0x01, 0x00, // sub_sport
  ]);
  chunks.push(defWorkout);

  const dataWorkout = Buffer.alloc(1 + 4 + 24 + 2 + 1 + 1);
  dataWorkout.writeUInt8(0x01, 0); // local mesg 1
  dataWorkout.writeUInt32LE(0x00000020, 1); // capabilities
  fixedStringBytes(workout.title || 'Treino MeuVAM', 24).copy(dataWorkout, 5);
  dataWorkout.writeUInt16LE(fitSteps.length, 29);
  dataWorkout.writeUInt8(1, 31); // sport = 1 (running)
  dataWorkout.writeUInt8(0, 32); // sub_sport = 0 (generic)
  chunks.push(dataWorkout);

  // 3. Definition & Data for workout_step (local 2, global 27)
  // Fields: duration_value(2, uint32), target_value(4, uint32), custom_target_value_low(5, uint32), custom_target_value_high(6, uint32),
  //         wkt_step_name(0, string 16), message_index(254, uint16), duration_type(1, enum), target_type(3, enum), intensity(7, enum)
  const defStep = Buffer.from([
    0x42, 0x00, 0x00, 0x1b, 0x00, 0x09,
    0x02, 0x04, 0x86, // duration_value
    0x04, 0x04, 0x86, // target_value
    0x05, 0x04, 0x86, // custom_target_value_low
    0x06, 0x04, 0x86, // custom_target_value_high
    0x00, 0x10, 0x07, // wkt_step_name (16 bytes)
    0xfe, 0x02, 0x84, // message_index
    0x01, 0x01, 0x00, // duration_type
    0x03, 0x01, 0x00, // target_type
    0x07, 0x01, 0x00, // intensity
  ]);
  chunks.push(defStep);

  for (const s of fitSteps) {
    const rec = Buffer.alloc(1 + 4 + 4 + 4 + 4 + 16 + 2 + 1 + 1 + 1);
    rec.writeUInt8(0x02, 0); // local mesg 2
    rec.writeUInt32LE(s.durationValue >>> 0, 1);
    rec.writeUInt32LE(s.targetValue >>> 0, 5);
    rec.writeUInt32LE(s.customLow >>> 0, 9);
    rec.writeUInt32LE(s.customHigh >>> 0, 13);
    fixedStringBytes(s.name, 16).copy(rec, 17);
    rec.writeUInt16LE(s.messageIndex, 33);
    rec.writeUInt8(s.durationType, 35);
    rec.writeUInt8(s.targetType, 36);
    rec.writeUInt8(s.intensity, 37);
    chunks.push(rec);
  }

  const dataBody = Buffer.concat(chunks);

  // 14-byte FIT file header
  const header = Buffer.alloc(14);
  header.writeUInt8(14, 0); // header size
  header.writeUInt8(0x10, 1); // protocol version 1.0
  header.writeUInt16LE(2113, 2); // profile version 21.13
  header.writeUInt32LE(dataBody.length, 4); // data size
  header.write('.FIT', 8, 'ascii');
  const headerCrc = computeFitCrc(header, 0, 12);
  header.writeUInt16LE(headerCrc, 12);

  const fileWithoutCrc = Buffer.concat([header, dataBody]);
  const fileCrc = computeFitCrc(fileWithoutCrc, 0, fileWithoutCrc.length);
  const crcBuf = Buffer.alloc(2);
  crcBuf.writeUInt16LE(fileCrc, 0);

  return Buffer.concat([fileWithoutCrc, crcBuf]);
}

// POST /api/workout/fit
router.post('/workout/fit', (req, res) => {
  const { workout } = req.body;
  if (!workout) {
    return res.status(400).json({ error: 'Dados do treino são obrigatórios.' });
  }

  try {
    const fitBuffer = buildWorkoutFitBuffer(workout);
    const safeName = String(workout.title || 'treino-meuvam')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'treino-meuvam';

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}.fit"`);
    res.send(fitBuffer);
  } catch (err) {
    console.error('[FIT Export] Erro:', err.message);
    res.status(500).json({ error: 'Erro ao gerar arquivo .FIT do treino.', details: err.message });
  }
});

export default router;
