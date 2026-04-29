export const athleteData = {
  name: "Rafael Rinaldi",
  level: "Intermediário",
  avatar: "RR",
  weight: "74 kg",
  height: "1.78 m",
  vam: "3:47",
  lastVamTest: "15/03/2026",
  birthDate: "1992-05-20",
  gender: "Masculino",
  maxHR: 192,
  objective: "Maratona",
  integrations: {
    strava: { connected: true, username: "@rafael.rinaldi" },
    garmin: { connected: true, username: "RafaelR_92" },
    polar: { connected: false, username: "" },
    coros: { connected: false, username: "" },
  },
  nextRace: {
    name: "Maratona de SP",
    date: "2026-06-15",
    daysLeft: 49
  },
  stats: {
    weeklyDistance: 42.5,
    weeklyGoal: 55,
    averagePace: "5:12",
    consistency: 94
  },
  zones: [
    { name: "Z1 - Recuperação", pace: "> 6:15", hr: "120-135" },
    { name: "Z2 - Aeróbico Leve", pace: "5:45 - 6:10", hr: "136-150" },
    { name: "Z3 - Limiar", pace: "5:10 - 5:40", hr: "151-165" },
    { name: "Z4 - Intervalado", pace: "4:30 - 5:00", hr: "166-180" },
    { name: "Z5 - Esforço Máximo", pace: "< 4:25", hr: "> 181" }
  ],
  shoes: [
    { name: "Nike Vaporfly Next% 3", distance: 120, limit: 400, type: "Performance" },
    { name: "Asics Novablast 4", distance: 340, limit: 800, type: "Rodagem" }
  ]
};

export const trainingPlan = [
  {
    id: 1,
    date: new Date().toISOString().split('T')[0],
    type: "Intervalado",
    title: "10x 400m / 1' rec",
    description: "Aquecimento 2km leve + 10 tiros de 400m em Z4 + Desaquecimento 2km",
    status: "pending",
    effort: null,
    metrics: { distance: "8km", duration: "45min" }
  },
  {
    id: 2,
    date: "2026-04-26",
    type: "Rodagem",
    title: "12km regenerativo",
    description: "Manter Z1/Z2. Foco na recuperação.",
    status: "completed",
    effort: 3,
    metrics: { distance: "12.1km", duration: "1h12min", pace: "5:58" }
  },
  {
    id: 3,
    date: "2026-04-25",
    type: "Longo",
    title: "18km progressivo",
    description: "6km Z2 + 6km Z3 + 6km Z4",
    status: "completed",
    effort: 8,
    metrics: { distance: "18.0km", duration: "1h35min", pace: "5:17" }
  }
];

// Simulated history for calendar (last 12 weeks)
const generateHistory = () => {
  const types = ['Rodagem', 'Intervalado', 'Longo', 'Rodagem', 'Rodagem'];
  const hist = [];
  const today = new Date();
  for (let i = 1; i <= 84; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    // ~5 sessions per week
    if (d.getDay() !== 0 && Math.random() > 0.25) {
      hist.push({ date: d.toISOString().split('T')[0], type: types[Math.floor(Math.random() * types.length)] });
    }
  }
  return hist;
};

export const trainingHistory = generateHistory();
