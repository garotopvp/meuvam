import express from 'express';
import GarminConnect from 'garmin-connect';

const router = express.Router();
const { GarminConnect: Garmin } = GarminConnect;

let garminClient = null;
let garminUser = null;

// 1. LOGIN - Authenticate with Garmin credentials
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios' });
  }

  try {
    garminClient = new Garmin({
      username: email,
      password: password
    });

    await garminClient.login();
    garminUser = { email, displayName: email.split('@')[0] };

    res.json({ success: true, user: garminUser });
  } catch (err) {
    console.error('Erro login Garmin:', err.message);
    garminClient = null;
    res.status(401).json({ error: 'Falha no login. Verifique suas credenciais.', details: err.message });
  }
});

// 2. STATUS
router.get('/status', (req, res) => {
  res.json({ connected: !!garminClient, user: garminUser || null });
});

// 3. ACTIVITIES - Recent activities
router.get('/activities', async (req, res) => {
  if (!garminClient) return res.status(401).json({ error: 'Não conectado ao Garmin' });

  try {
    const activities = await garminClient.getActivities(0, parseInt(req.query.limit) || 20);

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

// 4. HEART RATE - Today's HR data
router.get('/heartrate', async (req, res) => {
  if (!garminClient) return res.status(401).json({ error: 'Não conectado' });

  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const hr = await garminClient.getHeartRate(date);
    res.json(hr);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar FC' });
  }
});

// 5. STEPS
router.get('/steps', async (req, res) => {
  if (!garminClient) return res.status(401).json({ error: 'Não conectado' });

  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const steps = await garminClient.getSteps(date);
    res.json(steps);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar passos' });
  }
});

// 6. USER PROFILE
router.get('/profile', async (req, res) => {
  if (!garminClient) return res.status(401).json({ error: 'Não conectado' });

  try {
    const profile = await garminClient.getUserProfile();
    garminUser = {
      email: garminUser?.email,
      displayName: profile.displayName || profile.userName,
      profileImage: profile.profileImageUrlLarge,
    };
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar perfil' });
  }
});

// 7. DISCONNECT
router.post('/disconnect', (req, res) => {
  garminClient = null;
  garminUser = null;
  res.json({ success: true });
});

function formatPace(secsPerKm) {
  const mins = Math.floor(secsPerKm / 60);
  const secs = Math.round(secsPerKm % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default router;
