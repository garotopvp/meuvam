import express from 'express';
import GarminConnect from 'garmin-connect';

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// Per-user session map (keyed by userId to avoid data leakage between athletes)
// ─────────────────────────────────────────────────────────────────────────────
const garminClients = new Map();
const garminUsers = new Map();

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function getClient(userId) {
  return userId ? garminClients.get(userId) : null;
}

function formatPace(secsPerKm) {
  const mins = Math.floor(secsPerKm / 60);
  const secs = Math.round(secsPerKm % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Build a single Garmin step from a Superação step object.
 * Format reverse-engineered from garmin-connect lib's Running.toJson().
 */
function buildGarminStep(step, stepOrder) {
  // ── Step type mapping ────────────────────────────────────────────────────
  const stepTypeMap = {
    warmup:   { stepTypeId: 1, stepTypeKey: 'warmup' },
    cooldown: { stepTypeId: 2, stepTypeKey: 'cooldown' },
    run:      { stepTypeId: 3, stepTypeKey: 'interval' },
    walk:     { stepTypeId: 3, stepTypeKey: 'interval' },
    recovery: { stepTypeId: 4, stepTypeKey: 'recovery' },
    rest:     { stepTypeId: 5, stepTypeKey: 'rest' },
    other:    { stepTypeId: 3, stepTypeKey: 'interval' },
  };

  const stepType = stepTypeMap[step.type] || stepTypeMap.other;

  // ── End condition ────────────────────────────────────────────────────────
  let endCondition = { conditionTypeKey: 'lap.button', conditionTypeId: 1 };
  let endConditionValue = null;
  let preferredEndConditionUnit = null;

  if (step.duration?.type === 'time' && step.duration?.value) {
    endCondition = { conditionTypeKey: 'time', conditionTypeId: 2 };
    endConditionValue = step.duration.value * 60; // minutes → seconds
    preferredEndConditionUnit = { unitKey: 'minute' };
  } else if (step.duration?.type === 'distance' && step.duration?.value) {
    endCondition = { conditionTypeKey: 'distance', conditionTypeId: 3 };
    endConditionValue = step.duration.value * 1000; // km → metres
    preferredEndConditionUnit = { unitKey: 'kilometer' };
  }

  // ── Target pace ──────────────────────────────────────────────────────────
  let targetType = { workoutTargetTypeId: 1, workoutTargetTypeKey: 'no.target' };
  let targetValueOne = null;
  let targetValueTwo = null;

  if (step.intensity?.type === 'pace' && step.intensity?.value) {
    const [min, sec] = step.intensity.value.split(':').map(Number);
    if (!isNaN(min) && !isNaN(sec)) {
      const totalSec = min * 60 + sec;
      const mPerSec = 1000 / totalSec;
      const bandMs = 1000 / Math.max(1, totalSec - 15) - mPerSec; // ±15s/km band
      targetType = { workoutTargetTypeId: 6, workoutTargetTypeKey: 'pace.zone' };
      targetValueOne = Math.max(0, mPerSec - bandMs);
      targetValueTwo = mPerSec + bandMs;
    }
  }

  return {
    type: 'ExecutableStepDTO',
    stepId: null,
    stepOrder,
    childStepId: null,
    description: step.label || null,
    stepType,
    endCondition,
    ...(preferredEndConditionUnit ? { preferredEndConditionUnit } : {}),
    endConditionValue,
    endConditionCompare: null,
    endConditionZone: null,
    targetType,
    targetValueOne,
    targetValueTwo,
    zoneNumber: null,
  };
}

/**
 * Build a Garmin repeat group step.
 * In Garmin's model, a repeat block is a WorkoutRepeatStepDTO that contains nested steps.
 */
function buildRepeatGroup(step, startOrder) {
  let order = startOrder + 1;
  const nested = step.steps.map(s => buildGarminStep(s, order++));

  return {
    garminStep: {
      type: 'WorkoutRepeatGroupDTO',
      stepId: null,
      stepOrder: startOrder,
      childStepId: null,
      stepType: { stepTypeId: 6, stepTypeKey: 'repeat' },
      endCondition: { conditionTypeKey: 'iterations', conditionTypeId: 7 },
      endConditionValue: step.count,
      workoutSteps: nested,
    },
    nextOrder: order,
  };
}

/**
 * Expand a Superação steps array → Garmin workoutSteps array.
 */
function expandSteps(steps) {
  const garminSteps = [];
  let order = 1;

  for (const step of steps) {
    if (step.type === 'repetition' && Array.isArray(step.steps)) {
      const { garminStep, nextOrder } = buildRepeatGroup(step, order);
      garminSteps.push(garminStep);
      order = nextOrder;
    } else {
      garminSteps.push(buildGarminStep(step, order++));
    }
  }

  return garminSteps;
}

/**
 * Convert a Superação workout object → Garmin Connect workout payload.
 */
function workoutToGarminPayload(workout) {
  const rawSteps = workout.structured_steps || workout.metrics?.structured_steps || [];
  const workoutSteps = Array.isArray(rawSteps) && rawSteps.length > 0
    ? expandSteps(rawSteps)
    : [
        // Fallback: single body step of the prescribed distance/duration
        buildGarminStep({
          type: 'run',
          label: workout.title,
          duration: workout.metrics?.distance
            ? { type: 'distance', value: parseFloat(workout.metrics.distance) }
            : { type: 'lap_button' },
        }, 1),
      ];

  return {
    workoutName: workout.title || 'Treino Superação',
    description: workout.description || '',
    sportType: { sportTypeId: 1, sportTypeKey: 'running' },
    workoutSegments: [
      {
        segmentOrder: 1,
        sportType: { sportTypeId: 1, sportTypeKey: 'running' },
        workoutSteps,
      },
    ],
  };
}

// ─── 1. LOGIN ─────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password, userId } = req.body;

  if (!email || !password || !userId) {
    return res.status(400).json({ error: 'Email, senha e userId são obrigatórios' });
  }

  try {
    console.log('Iniciando login no Garmin para:', email);
    const GarminConstructor = GarminConnect.GarminConnect || GarminConnect;
    const client = new GarminConstructor({ username: email, password });
    await client.login();
    console.log('Login Garmin OK');

    const user = { email, displayName: email.split('@')[0] };
    garminClients.set(userId, client);
    garminUsers.set(userId, user);

    res.json({ success: true, user });
  } catch (err) {
    console.error('Erro login Garmin:', err.message);
    garminClients.delete(userId);
    res.status(401).json({ error: 'Falha no login. Verifique suas credenciais.', details: err.message });
  }
});

// ─── 2. STATUS ────────────────────────────────────────────────────────────────
router.get('/status', (req, res) => {
  const { userId } = req.query;
  const connected = userId ? garminClients.has(userId) : false;
  res.json({ connected, user: garminUsers.get(userId) || null });
});

// ─── 3. ACTIVITIES ────────────────────────────────────────────────────────────
router.get('/activities', async (req, res) => {
  const client = getClient(req.query.userId);
  if (!client) return res.status(401).json({ error: 'Não conectado ao Garmin' });

  try {
    const activities = await client.getActivities(0, parseInt(req.query.limit) || 20);
    const formatted = activities.map(a => ({
      id: a.activityId,
      name: a.activityName,
      type: a.activityType?.typeKey || 'running',
      date: a.startTimeLocal,
      distance: (a.distance / 1000).toFixed(2),
      duration: Math.round(a.duration / 60),
      pace: a.distance > 0 ? formatPace(a.duration / (a.distance / 1000)) : null,
      avgHR: a.averageHR || null,
      maxHR: a.maxHR || null,
      calories: a.calories || null,
      elevation: a.elevationGain || null,
      avgCadence: a.averageRunningCadenceInStepsPerMinute || null,
      vo2Max: a.vO2MaxValue || null,
    }));
    res.json(formatted);
  } catch (err) {
    console.error('Erro atividades Garmin:', err.message);
    res.status(500).json({ error: 'Erro ao buscar atividades' });
  }
});

// ─── 4. HEART RATE ────────────────────────────────────────────────────────────
router.get('/heartrate', async (req, res) => {
  const client = getClient(req.query.userId);
  if (!client) return res.status(401).json({ error: 'Não conectado' });
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    res.json(await client.getHeartRate(date));
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar FC' });
  }
});

// ─── 5. STEPS ─────────────────────────────────────────────────────────────────
router.get('/steps', async (req, res) => {
  const client = getClient(req.query.userId);
  if (!client) return res.status(401).json({ error: 'Não conectado' });
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    res.json(await client.getSteps(date));
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar passos' });
  }
});

// ─── 6. USER PROFILE ──────────────────────────────────────────────────────────
router.get('/profile', async (req, res) => {
  const client = getClient(req.query.userId);
  if (!client) return res.status(401).json({ error: 'Não conectado' });
  try {
    const profile = await client.getUserProfile();
    const existing = garminUsers.get(req.query.userId) || {};
    garminUsers.set(req.query.userId, {
      ...existing,
      displayName: profile.displayName || profile.userName,
      profileImage: profile.profileImageUrlLarge,
    });
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar perfil' });
  }
});

// ─── 7. DISCONNECT ────────────────────────────────────────────────────────────
router.post('/disconnect', (req, res) => {
  const { userId } = req.body;
  if (userId) {
    garminClients.delete(userId);
    garminUsers.delete(userId);
  }
  res.json({ success: true });
});

// ══════════════════════════════════════════════════════════════════════════════
// WORKOUT SYNC ENDPOINTS
// ══════════════════════════════════════════════════════════════════════════════

// ─── 8. LIST WORKOUTS in Garmin Connect ───────────────────────────────────────
router.get('/workouts', async (req, res) => {
  const client = getClient(req.query.userId);
  if (!client) return res.status(401).json({ error: 'Não conectado ao Garmin' });

  try {
    const workouts = await client.getWorkouts();
    const formatted = workouts.map(w => ({
      workoutId: w.workoutId,
      workoutName: w.workoutName,
      description: w.description,
      sport: w.sportType?.sportTypeKey,
      updatedDate: w.updatedDate,
    }));
    res.json(formatted);
  } catch (err) {
    console.error('Erro ao listar workouts Garmin:', err.message);
    res.status(500).json({ error: 'Erro ao listar treinos do Garmin Connect', details: err.message });
  }
});

// ─── 9. CREATE a single workout in Garmin Connect ─────────────────────────────
// Body: { userId, workout: <Superação workout object> }
router.post('/workout/create', async (req, res) => {
  const { userId, workout } = req.body;
  const client = getClient(userId);
  if (!client) return res.status(401).json({ error: 'Não conectado ao Garmin' });
  if (!workout) return res.status(400).json({ error: 'workout é obrigatório' });

  try {
    const payload = workoutToGarminPayload(workout);
    console.log('Criando workout no Garmin:', payload.workoutName);
    const created = await client.addWorkout(payload);
    res.json({
      success: true,
      workoutId: created?.workoutId,
      workoutName: created?.workoutName,
      message: `Treino "${payload.workoutName}" criado no Garmin Connect!`,
    });
  } catch (err) {
    console.error('Erro ao criar workout Garmin:', err.message);
    res.status(500).json({ error: 'Erro ao criar treino no Garmin Connect', details: err.message });
  }
});

// ─── 10. SCHEDULE a workout to a calendar date ────────────────────────────────
// Body: { userId, workoutId, date: "YYYY-MM-DD" }
router.post('/workout/schedule', async (req, res) => {
  const { userId, workoutId, date } = req.body;
  const client = getClient(userId);
  if (!client) return res.status(401).json({ error: 'Não conectado ao Garmin' });
  if (!workoutId || !date) return res.status(400).json({ error: 'workoutId e date são obrigatórios' });

  try {
    // Garmin Connect schedule endpoint (reverse-engineered, stable since 2022)
    const result = await client.post(
      `https://connect.garmin.com/workout-service/schedule/${workoutId}`,
      { date }
    );
    res.json({ success: true, scheduled: true, date, workoutId, result });
  } catch (err) {
    console.error('Erro ao agendar workout Garmin:', err.message);
    res.status(500).json({ error: 'Erro ao agendar treino no Garmin Connect', details: err.message });
  }
});

// ─── 11. CREATE + SCHEDULE in one shot ────────────────────────────────────────
// Body: { userId, workout: <Superação workout>, date: "YYYY-MM-DD" }
router.post('/workout/push', async (req, res) => {
  const { userId, workout, date } = req.body;
  const client = getClient(userId);
  if (!client) return res.status(401).json({ error: 'Não conectado ao Garmin' });
  if (!workout) return res.status(400).json({ error: 'workout é obrigatório' });

  try {
    // Step 1 — create
    const payload = workoutToGarminPayload(workout);
    console.log(`[Garmin Push] Criando: ${payload.workoutName}`);
    const created = await client.addWorkout(payload);
    const workoutId = created?.workoutId;

    // Step 2 — schedule (if date provided)
    let scheduledDate = null;
    if (workoutId && (date || workout.date)) {
      scheduledDate = date || workout.date;
      await client.post(
        `https://connect.garmin.com/workout-service/schedule/${workoutId}`,
        { date: scheduledDate }
      );
      console.log(`[Garmin Push] Agendado para ${scheduledDate}`);
    }

    res.json({
      success: true,
      workoutId,
      workoutName: payload.workoutName,
      scheduledDate,
      message: scheduledDate
        ? `✅ "${payload.workoutName}" criado e agendado para ${scheduledDate} no Garmin!`
        : `✅ "${payload.workoutName}" criado no Garmin Connect!`,
    });
  } catch (err) {
    console.error('[Garmin Push] Erro:', err.message);
    res.status(500).json({ error: 'Erro ao enviar treino para o Garmin', details: err.message });
  }
});

// ─── 12. SYNC FULL PLAN ───────────────────────────────────────────────────────
// Push a full week (or entire plan) of workouts to Garmin Connect at once.
// Body: { userId, workouts: [ <Superação workout>, ... ] }
router.post('/workout/sync-plan', async (req, res) => {
  const { userId, workouts } = req.body;
  const client = getClient(userId);
  if (!client) return res.status(401).json({ error: 'Não conectado ao Garmin' });
  if (!Array.isArray(workouts) || workouts.length === 0) {
    return res.status(400).json({ error: 'Lista de treinos é obrigatória' });
  }

  const results = [];
  const errors = [];

  for (const workout of workouts) {
    try {
      const payload = workoutToGarminPayload(workout);
      const created = await client.addWorkout(payload);
      const workoutId = created?.workoutId;

      let scheduledDate = null;
      if (workoutId && workout.date) {
        scheduledDate = workout.date;
        await client.post(
          `https://connect.garmin.com/workout-service/schedule/${workoutId}`,
          { date: scheduledDate }
        );
      }

      results.push({
        workoutName: payload.workoutName,
        workoutId,
        scheduledDate,
        success: true,
      });

      // Small delay to avoid rate-limiting
      await new Promise(r => setTimeout(r, 300));
    } catch (err) {
      console.error(`[Sync Plan] Erro em "${workout.title}":`, err.message);
      errors.push({ workoutName: workout.title, error: err.message });
    }
  }

  res.json({
    success: errors.length === 0,
    synced: results.length,
    failed: errors.length,
    results,
    errors,
    message: `${results.length} treino(s) enviado(s) para o Garmin Connect. ${errors.length > 0 ? `${errors.length} falha(s).` : ''}`,
  });
});

export default router;
