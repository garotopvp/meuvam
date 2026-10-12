import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Zap, 
  Clock, 
  CheckCircle2, 
  Eye, 
  X,
  MoreVertical,
  Bike,
  Waves,
  Activity
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { MetricCard, ProgressBar, ZoneBadge } from '../components/ui/tremor-metrics';

// Ícone vetorial da sapatilha de corrida (estilo TrainingPeaks verde)
const RunningShoeIcon = ({ className = "h-4 w-4 text-emerald-600 dark:text-emerald-400" }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="1.8" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M2.5 17.5h18c.6 0 1-.4.9-1l-2.4-7c-.2-.6-.8-1-1.4-1.1l-5.6-1a2 2 0 0 0-1.8.6L7.5 11l-3.3 1c-.8.2-1.3.9-1.4 1.7l-.3 2.8c0 .6.4 1 1 1z" />
    <path d="M4 14.5c2.5.5 5 0 7.5-1" />
    <path d="M10 9.5l1.5 2.5" />
    <path d="M13 9l1 3" />
    <path d="M2 17.5c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2" />
  </svg>
);

const getModalityIcon = (type = '', title = '') => {
  const t = (type + ' ' + title).toLowerCase();
  if (t.includes('bike') || t.includes('ciclism') || t.includes('pedal')) {
    return <Bike className="h-4 w-4 text-amber-500" />;
  }
  if (t.includes('swim') || t.includes('nataç') || t.includes('nado')) {
    return <Waves className="h-4 w-4 text-cyan-500" />;
  }
  return <RunningShoeIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
};

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const WEEK_DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

// Helper para formatar tempo estimado (se passar de 60 min, converte para horas e minutos: ex 82 min -> 1h 22min)
export const formatEstimatedTime = (timeStr) => {
  if (!timeStr || timeStr === '--') return '--';
  const str = String(timeStr).trim();

  // Se já tiver formato com hora (ex: "1h 22min", "1h20m")
  if (/^\d+\s*h/i.test(str)) {
    return str;
  }

  // Se for número seguido de 'min' ou apenas número (ex: "82 min", "82", "82m")
  const matchMin = str.match(/^(\d+)\s*(?:min|minutos|m)?$/i);
  if (matchMin) {
    const totalMinutes = parseInt(matchMin[1], 10);
    if (isNaN(totalMinutes)) return str;
    if (totalMinutes < 60) return `${totalMinutes} min`;
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}min`;
  }

  // Formato "hh:mm:ss" ou "mm:ss"
  if (str.includes(':')) {
    const parts = str.split(':').map(n => parseInt(n, 10));
    if (parts.length === 3 && !parts.some(isNaN)) {
      const [h, m] = parts;
      const totalMinutes = h * 60 + m;
      if (totalMinutes < 60) return `${totalMinutes} min`;
      const hours = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;
      if (mins === 0) return `${hours}h`;
      return `${hours}h ${mins}min`;
    }
    if (parts.length === 2 && !parts.some(isNaN)) {
      const [m] = parts;
      if (m < 60) return `${m} min`;
      const hours = Math.floor(m / 60);
      const mins = m % 60;
      if (mins === 0) return `${hours}h`;
      return `${hours}h ${mins}min`;
    }
  }

  return str;
};

const getStepDetails = (name = '', type = '') => {
  const rawType = (type || '').trim();
  const rawName = (name || '').trim();
  const combined = (rawType + ' ' + rawName).toLowerCase();

  let typeLabel = 'Corrida';
  let colorText = 'text-cyan-600 dark:text-cyan-400';
  let accentBorder = 'border-l-cyan-500';

  if (combined.includes('aquec') || combined.includes('warm')) {
    typeLabel = 'Aquecimento';
    colorText = 'text-amber-600 dark:text-amber-400';
    accentBorder = 'border-l-amber-500';
  } else if (combined.includes('desaquec') || combined.includes('esfriar') || combined.includes('cool') || combined.includes('volta')) {
    typeLabel = 'Desaquecimento';
    colorText = 'text-sky-600 dark:text-sky-400';
    accentBorder = 'border-l-sky-400';
  } else if (combined.includes('recupera') || combined.includes('rest') || combined.includes('pausa')) {
    typeLabel = 'Recuperação';
    colorText = 'text-slate-500 dark:text-slate-400';
    accentBorder = 'border-l-slate-400';
  } else if (combined.includes('tiro') || combined.includes('interval') || combined.includes('sprint') || combined.includes('vam')) {
    typeLabel = 'Tiro';
    colorText = 'text-violet-600 dark:text-violet-400';
    accentBorder = 'border-l-violet-500';
  } else if (combined.includes('caminha') || combined.includes('walk')) {
    typeLabel = 'Caminhada';
    colorText = 'text-emerald-600 dark:text-emerald-400';
    accentBorder = 'border-l-emerald-500';
  } else if (rawType) {
    typeLabel = rawType.toLowerCase() === 'trabalho' ? 'Corrida' : rawType;
    colorText = 'text-cyan-600 dark:text-cyan-400';
    accentBorder = 'border-l-cyan-500';
  }

  let customName = rawName;
  if (customName.toLowerCase() === typeLabel.toLowerCase()) {
    customName = '';
  }

  return {
    typeLabel,
    customName,
    colorText,
    accentBorder
  };
};

const getBlockIntensity = (b) => {
  const n = ((b.name || '') + ' ' + (b.type || '')).toLowerCase();
  if (n.includes('tiro') || n.includes('sprint') || n.includes('vam') || n.includes('velocidade')) {
    return { height: 95, color: 'bg-cyan-500 border-t-2 border-cyan-300 text-white', label: 'Tiro' };
  }
  if (n.includes('limiar') || n.includes('tempo') || n.includes('z4') || n.includes('forte')) {
    return { height: 80, color: 'bg-blue-600 border-t-2 border-blue-400 text-white', label: 'Z4' };
  }
  if (n.includes('moderado') || n.includes('z3') || n.includes('ritmo')) {
    return { height: 65, color: 'bg-emerald-600 border-t-2 border-emerald-400 text-white', label: 'Z3' };
  }
  if (n.includes('aquec') || n.includes('warm')) {
    return { height: 48, color: 'bg-amber-400 border-t-2 border-amber-300 text-slate-900', label: 'Aquec.' };
  }
  if (n.includes('desaquec') || n.includes('esfriar') || n.includes('cool') || n.includes('volta')) {
    return { height: 42, color: 'bg-sky-400 border-t-2 border-sky-300 text-slate-900', label: 'Desaq.' };
  }
  if (n.includes('recupera') || n.includes('rest') || n.includes('pausa')) {
    return { height: 28, color: 'bg-slate-300 dark:bg-slate-600 border-t-2 border-slate-400 text-slate-700', label: 'Recup.' };
  }
  return { height: 55, color: 'bg-emerald-500 border-t-2 border-emerald-300 text-white', label: 'Z2' };
};

// ─── COMPONENTE DA FAIXA DO TREINO COM ESCALA (TrainingPeaks / Garmin Style) ───
const WorkoutProfileScale = ({ workout, compact = false }) => {
  if (!workout) return null;

  const rawBlocks = workout.structured_blocks || workout.metrics?.structured_blocks || workout.metrics?.structured_steps || [];

  const blocks = useMemo(() => {
    if (rawBlocks.length > 0) return rawBlocks;

    const distStr = workout.metrics?.distance || '5.0 km';
    const totalDist = parseFloat(String(distStr).replace(',', '.')) || 5.0;
    const title = (workout.title || workout.type || '').toLowerCase();

    if (title.includes('tiro') || title.includes('vam') || title.includes('interval')) {
      const workDist = Math.max(1, totalDist - 2.5);
      return [
        { name: 'Aquecimento', type: 'Aquecimento', distance: '1.5 km', pace: '5:45 min/km' },
        { name: 'Tiros 100% VAM', type: 'Tiro', distance: `${workDist.toFixed(1)} km`, pace: '3:45 min/km' },
        { name: 'Desaquecimento', type: 'Desaquecimento', distance: '1.0 km', pace: '6:00 min/km' }
      ];
    }

    if (title.includes('tempo') || title.includes('ritmo') || title.includes('limiar')) {
      const workDist = Math.max(1, totalDist - 2.5);
      return [
        { name: 'Aquecimento', type: 'Aquecimento', distance: '1.5 km', pace: '5:30 min/km' },
        { name: 'Ritmo Limiar Z4', type: 'Corrida', distance: `${workDist.toFixed(1)} km`, pace: '4:15 min/km' },
        { name: 'Desaquecimento', type: 'Desaquecimento', distance: '1.0 km', pace: '5:45 min/km' }
      ];
    }

    // Treino contínuo / Rodagem Z1/Z2
    return [
      { name: workout.title || 'Rodagem Contínua', type: 'Corrida', distance: `${totalDist} km`, pace: workout.metrics?.pace || '5:30 min/km' }
    ];
  }, [rawBlocks, workout]);

  let cumulativeDist = 0;
  const blocksWithScale = blocks.map((b) => {
    let dist = parseFloat(String(b.distance || '').replace(',', '.'));
    if (isNaN(dist) || dist <= 0) dist = 1;
    const startKm = cumulativeDist;
    cumulativeDist += dist;
    return {
      ...b,
      distNum: dist,
      startKm,
      endKm: cumulativeDist,
      ...getBlockIntensity(b)
    };
  });

  const totalKm = cumulativeDist;

  return (
    <div className={`rounded-2xl border border-slate-200/90 bg-slate-100/90 dark:bg-slate-800/60 dark:border-slate-800 ${compact ? 'p-3 space-y-2' : 'p-4 space-y-3'}`}>
      {/* Cabeçalho da Faixa */}
      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
          <span>Estrutura do Treino • Perfil de Intensidade</span>
        </div>
        <span className="text-slate-700 dark:text-slate-300 font-black tabular-nums">
          {workout.metrics?.distance || `${totalKm.toFixed(1)} km`}
        </span>
      </div>

      {/* Faixa Cinza com os Degraus/Barras de Intensidade */}
      <div className={`relative flex items-end ${compact ? 'h-16' : 'h-24'} w-full bg-white dark:bg-slate-900/90 rounded-xl border border-slate-200/80 dark:border-slate-800 p-1.5 overflow-hidden shadow-2xs`}>
        {/* Linhas de grade tracejadas horizontais */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none p-1.5 opacity-15">
          <div className="border-b border-dashed border-slate-400 w-full" />
          <div className="border-b border-dashed border-slate-400 w-full" />
          <div className="border-b border-dashed border-slate-400 w-full" />
        </div>

        {/* Blocos do Treino proporcionais ao volume */}
        <div className="relative flex items-end h-full w-full gap-1 z-10">
          {blocksWithScale.map((b, idx) => (
            <div
              key={idx}
              style={{
                height: `${b.height}%`,
                flex: b.distNum
              }}
              title={`${b.name} - ${b.distance || ''} (${b.pace || ''})`}
              className={`group relative flex flex-col justify-between rounded-t-md p-1 transition-all hover:brightness-110 shadow-xs cursor-default ${b.color}`}
            >
              <span className="text-[9px] font-extrabold text-white truncate drop-shadow-xs">
                {b.name}
              </span>
              {b.pace && !compact && (
                <span className="text-[8px] font-bold text-white/90 truncate drop-shadow-xs">
                  {b.pace}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Escala Horizontal (Eixo X com escala de km) */}
      <div className="relative w-full pt-0.5">
        <div className="h-0.5 w-full bg-slate-300 dark:bg-slate-700 rounded-full" />
        <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
          <span>0.0 km</span>
          {blocksWithScale.length > 1 && (
            <span>{(totalKm / 2).toFixed(1)} km</span>
          )}
          <span>{totalKm.toFixed(1)} km</span>
        </div>
      </div>
    </div>
  );
};

export default function AthleteDesktopDashboard({ 
  athlete, 
  workouts = [], 
  onLogout, 
  deferredPrompt, 
  onInstall,
  navigate
}) {
  // Estado do mês exibido
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Helper de data local (YYYY-MM-DD)
  const formatLocalDate = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const todayStr = useMemo(() => formatLocalDate(new Date()), []);

  // Mapeamento de treinos por data
  const workoutsByDate = useMemo(() => {
    const map = {};
    workouts.forEach(w => {
      if (w.date) {
        if (!map[w.date]) map[w.date] = [];
        map[w.date].push(w);
      }
    });
    return map;
  }, [workouts]);

  // Seletor padrão de treino selecionado
  const activeWorkout = useMemo(() => {
    if (selectedWorkout) return selectedWorkout;
    // Se não selecionou nenhum, busca o de hoje ou o primeiro do mês
    if (workoutsByDate[todayStr]?.[0]) return workoutsByDate[todayStr][0];
    return workouts[0] || null;
  }, [selectedWorkout, workoutsByDate, todayStr, workouts]);

  // Construção dos dias do mês (grade com preenchimento)
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    // Ajuste para Segunda-feira ser o dia 0
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const days = [];

    // Dias do mês anterior para completar a primeira semana
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDay - i);
      const dateStr = formatLocalDate(d);
      days.push({
        date: d,
        dateStr,
        dayNum: d.getDate(),
        isCurrentMonth: false,
        workouts: workoutsByDate[dateStr] || [],
      });
    }

    // Dias do mês atual
    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
      const d = new Date(year, month, i);
      const dateStr = formatLocalDate(d);
      days.push({
        date: d,
        dateStr,
        dayNum: i,
        isCurrentMonth: true,
        workouts: workoutsByDate[dateStr] || [],
      });
    }

    // Dias do próximo mês para fechar as semanas (múltiplo de 7)
    const remainingDays = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remainingDays; i++) {
      const d = new Date(year, month + 1, i);
      const dateStr = formatLocalDate(d);
      days.push({
        date: d,
        dateStr,
        dayNum: i,
        isCurrentMonth: false,
        workouts: workoutsByDate[dateStr] || [],
      });
    }

    return days;
  }, [year, month, workoutsByDate]);

  // Estatísticas do Mês
  const monthStats = useMemo(() => {
    const monthWorkouts = workouts.filter(w => {
      if (!w.date) return false;
      const [wYear, wMonth] = w.date.split('-').map(Number);
      return wYear === year && (wMonth - 1) === month;
    });

    const totalDistance = monthWorkouts.reduce((acc, curr) => {
      const dist = parseFloat(curr.metrics?.distance?.replace('km', '') || 0);
      return acc + dist;
    }, 0);

    const completed = monthWorkouts.filter(w => w.status === 'completed').length;

    return {
      total: monthWorkouts.length,
      completed,
      distance: totalDistance.toFixed(1)
    };
  }, [workouts, year, month]);

  // Navegação de meses
  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleGoToday = () => {
    setCurrentDate(new Date());
    if (workoutsByDate[todayStr]?.[0]) {
      setSelectedWorkout(workoutsByDate[todayStr][0]);
    }
  };

  // Cores por tipo de treino
  const getWorkoutBadge = (type = '') => {
    const t = type.toLowerCase();
    if (t.includes('tiro') || t.includes('intervalado') || t.includes('vam')) {
      return { bg: 'bg-cyan-500/15 text-cyan-600 border-cyan-500/30 dark:text-cyan-400', label: 'Tiros VAM' };
    }
    if (t.includes('long') || t.includes('rodagem')) {
      return { bg: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30 dark:text-emerald-400', label: 'Rodagem' };
    }
    if (t.includes('progressivo') || t.includes('ritmo')) {
      return { bg: 'bg-orange-500/15 text-orange-600 border-orange-500/30 dark:text-orange-400', label: 'Ritmo' };
    }
    return { bg: 'bg-blue-500/15 text-blue-600 border-blue-500/30 dark:text-blue-400', label: type || 'Treino' };
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* ── CONTEÚDO PRINCIPAL (CALENDÁRIO + DETALHES) ── */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Barra superior de controle do Calendário */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <button 
                onClick={handlePrevMonth}
                className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-[160px] text-center text-sm font-bold text-slate-800 dark:text-slate-100">
                {MONTH_NAMES[month]} de {year}
              </span>
              <button 
                onClick={handleNextMonth}
                className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleGoToday}
              className="text-xs font-bold"
            >
              Ir para Hoje
            </Button>
          </div>

          {/* Cards de Métricas Resumidas do Mês */}
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <span className="text-[10px] uppercase font-semibold text-slate-400">Treinos no Mês: </span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{monthStats.completed} / {monthStats.total}</span>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <span className="text-[10px] uppercase font-semibold text-slate-400">Distância Prevista: </span>
              <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400">{monthStats.distance} km</span>
            </div>
          </div>
        </div>

        {/* Grade Principal com 2 Colunas: Calendário (70%) e Painel do Treino (30%) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ── COLUNA DA ESQUERDA: CALENDÁRIO COMPLETO ── */}
          <div className="lg:col-span-8 space-y-4">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              {/* Cabeçalho dos 7 Dias da Semana */}
              <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50 text-center dark:border-slate-800/80 dark:bg-slate-900/50">
                {WEEK_DAYS.map((day, idx) => (
                  <div key={idx} className="py-2.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {day}
                  </div>
                ))}
              </div>

              {/* Grid dos Dias do Mês */}
              <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100 dark:divide-slate-800/60">
                {calendarDays.map((item, index) => {
                  const isToday = item.dateStr === todayStr;
                  const hasWorkouts = item.workouts.length > 0;
                  const isSelected = activeWorkout && item.workouts.some(w => w.id === activeWorkout.id);

                  return (
                    <div
                      key={index}
                      onClick={() => {
                        if (hasWorkouts) setSelectedWorkout(item.workouts[0]);
                      }}
                      className={`min-h-[140px] p-2 transition-all duration-150 ${
                        !item.isCurrentMonth ? 'bg-slate-50/50 text-slate-300 dark:bg-slate-950/40 dark:text-slate-700' : 'bg-white dark:bg-slate-900'
                      } ${hasWorkouts ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50' : ''} ${
                        isSelected ? 'ring-2 ring-blue-500 ring-inset bg-blue-50/30 dark:bg-blue-950/20' : ''
                      }`}
                    >
                      {/* Número do Dia */}
                      <div className="flex items-center justify-between mb-1.5">
                        <span
                          className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                            isToday
                              ? 'bg-blue-600 text-white font-bold shadow-sm'
                              : item.isCurrentMonth
                              ? 'text-slate-700 dark:text-slate-300'
                              : 'text-slate-300 dark:text-slate-700'
                          }`}
                        >
                          {item.dayNum}
                        </span>

                        {isToday && (
                          <span className="text-[9px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Hoje</span>
                        )}
                      </div>

                      {/* Lista de Treinos alocados para o dia (Estilo TrainingPeaks) */}
                      <div className="space-y-1.5">
                        {item.workouts.map((w) => {
                          const isDone = w.status === 'completed';
                          // Faixa de status clássica do TrainingPeaks: Verde = Realizado, Amarelo = Agendado/Planejado
                          const topBarColor = isDone ? 'bg-emerald-500' : 'bg-amber-400';
                          const durationFormatted = formatEstimatedTime(w.metrics?.duration);

                          // Bloco principal de ritmo
                          const blocks = w.structured_blocks || w.metrics?.structured_blocks || [];
                          const mainBlock = blocks.find(b => {
                            const n = (b.name || '').toLowerCase();
                            return !n.includes('aquec') && !n.includes('desaquec');
                          }) || blocks[0];
                          const pace = mainBlock?.pace || w.metrics?.pace;

                          return (
                            <div
                              key={w.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedWorkout(w);
                                setIsDetailModalOpen(true);
                              }}
                              className="group relative flex flex-col overflow-hidden rounded-md border border-slate-200/90 bg-[#fafafa] text-left shadow-2xs transition-all hover:scale-[1.02] hover:shadow-md hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 cursor-pointer"
                            >
                              {/* Barra superior de status clássica do TrainingPeaks */}
                              <div className={`h-1.5 w-full ${topBarColor}`} />

                              <div className="p-2 space-y-1">
                                {/* Topo: Símbolo da modalidade (ex: sapatilha verde) + 3 pontos */}
                                <div className="flex items-center justify-between">
                                  {getModalityIcon(w.type, w.title)}
                                  <span className="text-slate-400 opacity-50 group-hover:opacity-100 transition-opacity">
                                    <MoreVertical className="h-3 w-3" />
                                  </span>
                                </div>

                                {/* Título do Treino */}
                                <h4 className="text-[11px] font-bold text-slate-800 dark:text-slate-100 line-clamp-2 leading-tight">
                                  {w.title || 'Treino'}
                                </h4>

                                {/* Métricas em baixo: Tempo e Volume/Distância */}
                                <div className="pt-0.5 space-y-0.5 text-slate-900 dark:text-white">
                                  {durationFormatted && durationFormatted !== '--' && (
                                    <p className="text-[11px] font-black tabular-nums leading-none">
                                      {durationFormatted}
                                    </p>
                                  )}
                                  {w.metrics?.distance && w.metrics?.distance !== '--' && (
                                    <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 tabular-nums leading-tight">
                                      {w.metrics.distance}
                                    </p>
                                  )}
                                  {pace && (
                                    <p className="text-[10px] font-semibold text-cyan-600 dark:text-cyan-400 tabular-nums leading-tight">
                                      {pace}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Legenda de Tipos de Treino (TrainingPeaks) */}
            <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white p-3 text-xs dark:border-slate-800 dark:bg-slate-900">
              <span className="font-bold text-slate-500 dark:text-slate-400">Status:</span>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span className="text-slate-600 dark:text-slate-300 font-medium">Realizado / Concluído</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <span className="text-slate-600 dark:text-slate-300 font-medium">Planejado / Agendado</span>
              </div>

              <div className="hidden sm:flex items-center gap-3 ml-auto">
                <span className="font-bold text-slate-500 dark:text-slate-400">Modalidades:</span>
                <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300 font-medium">
                  <RunningShoeIcon className="h-3.5 w-3.5 text-emerald-600" /> Corrida
                </div>
                <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300 font-medium">
                  <Bike className="h-3.5 w-3.5 text-amber-500" /> Ciclismo
                </div>
                <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300 font-medium">
                  <Waves className="h-3.5 w-3.5 text-cyan-500" /> Natação
                </div>
              </div>
            </div>
          </div>

          {/* ── COLUNA DA DIREITA: DETALHES DO TREINO SELECIONADO ── */}
          <div className="lg:col-span-4 space-y-6">
            {activeWorkout ? (
              <Card className="border-slate-200 dark:border-slate-800 shadow-md">
                <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center justify-between">
                    <Badge variant="vam">
                      {activeWorkout.type || 'Corrida Prescrita'}
                    </Badge>
                    <span className="text-xs font-semibold text-slate-400">
                      {activeWorkout.date}
                    </span>
                  </div>
                  <CardTitle className="text-xl font-extrabold text-slate-900 dark:text-white mt-2">
                    {activeWorkout.title || 'Treino'}
                  </CardTitle>
                  {activeWorkout.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      {activeWorkout.description}
                    </p>
                  )}
                </CardHeader>

                <CardContent className="pt-4 space-y-4">
                  {/* Métricas Rápidas do Treino Selecionado */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-800/40 text-center">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Distância</p>
                      <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                        {activeWorkout.metrics?.distance || '--'}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-800/40 text-center">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Tempo</p>
                      <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5 tabular-nums">
                        {formatEstimatedTime(activeWorkout.metrics?.duration)}
                      </p>
                    </div>
                    {(() => {
                      const blocks = activeWorkout.structured_blocks || activeWorkout.metrics?.structured_blocks || activeWorkout.metrics?.structured_steps || [];
                      const mainBlock = blocks.find(b => {
                        const n = (b.name || '').toLowerCase();
                        return !n.includes('aquec') && !n.includes('desaquec');
                      }) || blocks[0];
                      const isInterval = (activeWorkout.type || '').toLowerCase().includes('tiro') || (mainBlock?.name || '').toLowerCase().includes('tiro') || (activeWorkout.title || '').toLowerCase().includes('tiro');
                      const paceToShow = mainBlock?.pace || (isInterval ? '3:45 min/km' : '5:30 min/km');
                      return (
                        <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-800/40 text-center">
                          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Ritmo Alvo</p>
                          <p className="text-xs font-black text-cyan-600 dark:text-cyan-400 mt-1 truncate">
                            {paceToShow}
                          </p>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Faixa Cinza com a Escala do Treino */}
                  <WorkoutProfileScale workout={activeWorkout} compact />

                  {/* Bloco de Séries de Tiros / Estrutura */}
                  {(() => {
                    const blocks = activeWorkout.structured_blocks || activeWorkout.metrics?.structured_blocks || activeWorkout.metrics?.structured_steps || [];
                    return blocks.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Estrutura do Treino
                        </p>
                        <div className="space-y-1.5">
                          {blocks.map((b, i) => {
                            const step = getStepDetails(b.name, b.type);
                            return (
                              <div 
                                key={i} 
                                className={`flex items-center justify-between rounded-xl border border-slate-200/80 bg-white p-2.5 text-xs shadow-2xs dark:border-slate-800 dark:bg-slate-900 border-l-[3px] ${step.accentBorder}`}
                              >
                                <div className="flex items-center gap-2.5">
                                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                    {i + 1}
                                  </span>
                                  <div>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className={`text-[11px] font-bold uppercase tracking-wider ${step.colorText}`}>
                                        {step.typeLabel}
                                      </span>
                                      {step.customName && (
                                        <p className="font-semibold text-slate-800 dark:text-slate-200">
                                          • {step.customName}
                                        </p>
                                      )}
                                    </div>
                                    {b.pace && (
                                      <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                                        Ritmo: <span className="font-bold text-slate-700 dark:text-slate-300">{b.pace}</span>
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <span className="font-bold text-slate-800 dark:text-slate-200 text-xs tabular-nums">
                                  {b.distance || (b.duration ? formatEstimatedTime(b.duration) : '--')}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                        <p className="font-semibold">Treino Contínuo / Rodagem</p>
                        <p className="text-slate-400 mt-1">Mantenha a frequência na zona alvo indicada pelo seu professor.</p>
                      </div>
                    );
                  })()}

                  {/* Status do Treino */}
                  <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-800/30">
                    <span className="text-xs font-semibold text-slate-500">Status</span>
                    {activeWorkout.status === 'completed' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-600">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Concluído
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-600">
                        <Clock className="h-3.5 w-3.5" /> Agendado
                      </span>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="pt-2 space-y-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setIsDetailModalOpen(true)}
                      className="w-full gap-2 border-slate-200 text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 font-semibold"
                    >
                      <Eye className="h-4 w-4 text-blue-600" />
                      Abrir Atividade Completa
                    </Button>
                    <Button variant="vam" className="w-full gap-2">
                      <Zap className="h-4 w-4" />
                      Enviar Treino para o Garmin
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="p-8 text-center border-dashed">
                <CalendarIcon className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-700 mb-3" />
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">Nenhum treino selecionado</h4>
                <p className="text-xs text-slate-400 mt-1">Clique em qualquer dia com treino no calendário para ver os detalhes da série.</p>
              </Card>
            )}

            {/* Card com as Zonas de VAM do Aluno para consulta */}
            <Card className="border-slate-200 dark:border-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold">Suas Zonas de Ritmo (VAM)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="font-semibold text-slate-600 dark:text-slate-400">Z1 • Recuperação</span>
                  <span className="font-bold text-slate-900 dark:text-white">&gt; 5:45 min/km</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="font-semibold text-slate-600 dark:text-slate-400">Z2 • Rodagem Base</span>
                  <span className="font-bold text-slate-900 dark:text-white">5:15 - 5:45 min/km</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="font-semibold text-slate-600 dark:text-slate-400">Z3 • Ritmo Moderado</span>
                  <span className="font-bold text-slate-900 dark:text-white">4:40 - 5:15 min/km</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="font-semibold text-slate-600 dark:text-slate-400">Z4 • Limiar / VAM</span>
                  <span className="font-bold text-slate-900 dark:text-white">4:05 - 4:40 min/km</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="font-semibold text-slate-600 dark:text-slate-400">Z5 • Tiros Máximos</span>
                  <span className="font-bold text-cyan-600 dark:text-cyan-400">&lt; 4:05 min/km</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* ── MODAL DE DETALHES COMPLETOS DA ATIVIDADE ── */}
      {isDetailModalOpen && activeWorkout && (
        <div 
          onClick={() => setIsDetailModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 md:p-8 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-6"
          >
            {/* Top Bar do Modal */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                <CalendarIcon className="h-4 w-4 text-blue-600" />
                <span>{activeWorkout.date}</span>
              </div>
              <button 
                onClick={() => setIsDetailModalOpen(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Cabeçalho do Treino */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="vam">
                  {activeWorkout.type || 'Corrida'}
                </Badge>
                {activeWorkout.status === 'completed' ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" /> Concluído
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600">
                    <Clock className="h-4 w-4" /> Agendado
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                {activeWorkout.title}
              </h2>
              {activeWorkout.description && (
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {activeWorkout.description}
                </p>
              )}
            </div>

            {/* Grade de Métricas da Sessão */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Distância Total</p>
                <p className="text-xl font-black text-slate-900 dark:text-white mt-1 tabular-nums">
                  {activeWorkout.metrics?.distance || '--'}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tempo Estimado</p>
                <p className="text-xl font-black text-slate-900 dark:text-white mt-1 tabular-nums">
                  {formatEstimatedTime(activeWorkout.metrics?.duration)}
                </p>
              </div>
              {(() => {
                const blocks = activeWorkout.structured_blocks || activeWorkout.metrics?.structured_blocks || activeWorkout.metrics?.structured_steps || [];
                const mainBlock = blocks.find(b => {
                  const n = (b.name || '').toLowerCase();
                  return !n.includes('aquec') && !n.includes('desaquec');
                }) || blocks[0];

                const isInterval = (activeWorkout.type || '').toLowerCase().includes('tiro') || (mainBlock?.name || '').toLowerCase().includes('tiro') || (activeWorkout.title || '').toLowerCase().includes('tiro');
                const paceToShow = mainBlock?.pace || (isInterval ? '3:45 min/km' : '5:30 min/km');

                return (
                  <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40 col-span-2 sm:col-span-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {isInterval ? 'Ritmo dos Tiros (100% VAM)' : 'Ritmo Principal'}
                    </p>
                    <p className="text-xl font-black text-cyan-600 dark:text-cyan-400 mt-1 tabular-nums">
                      {paceToShow}
                    </p>
                  </div>
                );
              })()}
            </div>

            {/* Faixa Cinza do Perfil do Treino com Escala (TrainingPeaks Style) */}
            <WorkoutProfileScale workout={activeWorkout} />

            {/* Estrutura Passo a Passo dos Tiros */}
            {(() => {
              const blocks = activeWorkout.structured_blocks || activeWorkout.metrics?.structured_blocks || activeWorkout.metrics?.structured_steps || [];
              if (blocks.length === 0) return null;

              return (
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Passo a Passo das Séries (Tiros & Recuperação)
                  </h4>
                  <div className="space-y-2">
                    {blocks.map((b, i) => {
                      const step = getStepDetails(b.name, b.type);

                      return (
                        <div 
                          key={i} 
                          className={`flex items-center justify-between rounded-xl border border-slate-200/80 bg-white p-3.5 text-xs transition-colors hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 shadow-2xs border-l-[4px] ${step.accentBorder}`}
                        >
                          <div className="flex items-center gap-3.5">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                              {i + 1}
                            </span>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-xs font-bold uppercase tracking-wider ${step.colorText}`}>
                                  {step.typeLabel}
                                </span>
                                {step.customName && (
                                  <p className="font-bold text-slate-900 dark:text-white text-sm">
                                    • {step.customName}
                                  </p>
                                )}
                              </div>
                              {b.pace && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                                  Ritmo alvo: <span className="font-semibold text-slate-800 dark:text-slate-200">{b.pace}</span>
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-sm text-slate-900 dark:text-white tabular-nums">
                              {b.distance || (b.duration ? formatEstimatedTime(b.duration) : '--')}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Ações do Modal */}
            <div className="pt-4 flex flex-col sm:flex-row items-center gap-3 border-t border-slate-100 dark:border-slate-800">
              <Button variant="vam" className="w-full sm:flex-1 gap-2">
                <Zap className="h-4 w-4" />
                Enviar Treino para o Garmin
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setIsDetailModalOpen(false)}
                className="w-full sm:w-auto px-6 font-semibold"
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
