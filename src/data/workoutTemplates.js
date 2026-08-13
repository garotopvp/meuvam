export const workoutTemplates = [
  {
    id: 't-bike-1',
    title: 'Giro Regenerativo Ativo',
    type: 'bike',
    category: 'Bike (TrainingPeaks)',
    description: '45 min giro leve na zona 1/2 para recuperação ativa. Cadência livre (> 90 rpm). Foco em relaxamento e soltura das pernas.',
    metrics: { distance: '20 km', duration: '45 min' }
  },
  {
    id: 't-bike-2',
    title: 'Intervalado de VAM (5x3 min)',
    type: 'bike',
    category: 'Bike (TrainingPeaks)',
    description: 'Aquecimento: 15 min Z2.\nParte Principal: 5 séries de [3 min em 100% da VAM com recuperação de 3 min em Z1].\nDesaquecimento: 10 min Z1.',
    metrics: { distance: '32 km', duration: '1h 15m' }
  },
  {
    id: 't-bike-3',
    title: 'Tempo Ride - Endurance Z3',
    type: 'bike',
    category: 'Bike (TrainingPeaks)',
    description: 'Aquecimento: 10 min Z2.\nParte Principal: 2 blocos de 20 min na Zona 3 (Sub-limiar) com 5 min de descanso ativo Z1 entre os blocos.\nDesaquecimento: 5 min Z1.',
    metrics: { distance: '45 km', duration: '1h 30m' }
  },
  {
    id: 't-run-1',
    title: 'Rodagem Leve Z2',
    type: 'run',
    category: 'Run (TrainingPeaks)',
    description: 'Corrida contínua na Zona 2 (Aeróbica Leve). Foco na consistência de ritmo, respiração controlada e postura relaxada.',
    metrics: { distance: '8 km', duration: '50 min' }
  },
  {
    id: 't-run-2',
    title: 'Intervalado Z5 - Tiros de 400m',
    type: 'run',
    category: 'Run (TrainingPeaks)',
    description: 'Aquecimento: 2 km trote leve Z1/Z2 + alongamento dinâmico.\nParte Principal: 10 tiros de 400 metros na Zona 5 (VAM) com 1:30 de descanso em caminhada/trote bem leve.\nDesaquecimento: 1.5 km Z1.',
    metrics: { distance: '10 km', duration: '1h 05m' }
  },
  {
    id: 't-run-3',
    title: 'Longão de Domingo Z2/Z3',
    type: 'run',
    category: 'Run (TrainingPeaks)',
    description: 'Longão focado em resistência aeróbica. Ritmo confortável Z2, acelerando nos últimos 2 km para Z3 se as pernas permitirem. Hidratar a cada 20 min.',
    metrics: { distance: '16 km', duration: '1h 40m' }
  },
  {
    id: 't-swim-1',
    title: 'Técnica e Sensibilidade na Água',
    type: 'swim',
    category: 'Swim (TrainingPeaks)',
    description: '200m Aquecimento livre.\n4x50m Educativos (Foco em pegada e cotovelo alto).\n6x100m Ritmo Z2 confortável com 20s de descanso.\n100m Soltura.',
    metrics: { distance: '1000 m', duration: '40 min' }
  },
  {
    id: 't-swim-2',
    title: 'Séries de Resistência Aeróbica',
    type: 'swim',
    category: 'Swim (TrainingPeaks)',
    description: '400m Aquecimento alternado.\n3x400m Z3 com 45s de descanso entre as séries.\n4x100m perna com prancha.\n200m Soltura leve.',
    metrics: { distance: '2000 m', duration: '1h 10m' }
  },
  {
    id: 't-other-1',
    title: 'Fortalecimento Core & Estabilidade',
    type: 'other',
    category: 'Other (TrainingPeaks)',
    description: 'Treino funcional focado no fortalecimento do CORE. Prancha frontal (3x1 min), Prancha lateral (3x45s cada lado), Elevação pélvica (3x15) e Superman (3x12).',
    metrics: { distance: 'N/A', duration: '30 min' }
  },
  {
    id: 't-other-2',
    title: 'Treino de Flexibilidade & Mobilidade',
    type: 'other',
    category: 'Other (TrainingPeaks)',
    description: 'Sessão completa de alongamento e mobilidade articular para ciclistas/corredores. Quadríceps, isquiotibiais, panturrilha e quadril.',
    metrics: { distance: 'N/A', duration: '25 min' }
  }
];
