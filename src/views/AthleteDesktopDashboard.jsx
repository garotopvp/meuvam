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

// Ícone vetorial da pessoa correndo ("cara correndo" / Estilo Strava & Tabler Run)
const RunnerIcon = ({ className = "h-4 w-4 text-emerald-600 dark:text-emerald-400" }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2.2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <circle cx="13" cy="4" r="1.6" fill="currentColor" stroke="none" />
    <path d="M4 17l5 1 .75-1.5" />
    <path d="M15 21v-4l-4-3 1-6" />
    <path d="M7 12v-3l5-1 3 3 3 1" />
  </svg>
);

const RunningShoeIcon = RunnerIcon;

const getModalityIcon = (type = '', title = '') => {
  const t = (type + ' ' + title).toLowerCase();
  if (t.includes('bike') || t.includes('ciclism') || t.includes('pedal')) {
    return <Bike className="h-4 w-4 text-amber-500" />;
  }
  if (t.includes('swim') || t.includes('nataç') || t.includes('nado')) {
    return <Waves className="h-4 w-4 text-cyan-500" />;
  }
  return <RunnerIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
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

// Decompõe e expande blocos do treino para escala real de intervalos (TrainingPeaks / Garmin Style)
const expandWorkoutSegments = (workout) => {
  if (!workout) return { segments: [], totalKm: 5.0 };

  const rawBlocks = workout.structured_blocks || workout.metrics?.structured_blocks || workout.metrics?.structured_steps || [];
  const distStr = workout.metrics?.distance || '5.0 km';
  const totalWorkoutDist = parseFloat(String(distStr).replace(',', '.')) || 5.0;

  let baseBlocks = rawBlocks;
  if (!baseBlocks || baseBlocks.length === 0) {
    const title = (workout.title || workout.type || '').toLowerCase();
    if (title.includes('tiro') || title.includes('vam') || title.includes('interval')) {
      baseBlocks = [
        { name: 'Aquecimento Progressivo', pace: '5:15 min/km', distance: '2.0 km', type: 'Aquecimento' },
        { name: '8x 400m @ 100% VAM (rec 1min)', pace: '3:45 min/km', distance: '3.2 km', type: 'Tiro' },
        { name: 'Trote Regenerativo', pace: '5:30 min/km', distance: '2.3 km', type: 'Desaquecimento' }
      ];
    } else if (title.includes('tempo') || title.includes('limiar') || title.includes('ritmo')) {
      baseBlocks = [
        { name: 'Aquecimento', pace: '5:15 min/km', distance: '2.0 km', type: 'Aquecimento' },
        { name: 'Ritmo Limiar Z4', pace: '4:15 min/km', distance: '5.0 km', type: 'Corrida' },
        { name: 'Desaquecimento', pace: '5:30 min/km', distance: '2.0 km', type: 'Desaquecimento' }
      ];
    } else {
      baseBlocks = [
        { name: 'Aquecimento Gradual', pace: '5:30 min/km', distance: `${(totalWorkoutDist * 0.2).toFixed(1)} km`, type: 'Aquecimento' },
        { name: 'Volume Principal Z2', pace: workout.metrics?.pace || '5:10 min/km', distance: `${(totalWorkoutDist * 0.65).toFixed(1)} km`, type: 'Corrida' },
        { name: 'Volta à Calma', pace: '5:45 min/km', distance: `${(totalWorkoutDist * 0.15).toFixed(1)} km`, type: 'Desaquecimento' }
      ];
    }
  }

  const segments = [];
  let cumDist = 0;

  baseBlocks.forEach((b) => {
    const name = b.name || '';
    const repeatMatch = name.match(/(\d+)\s*x\s*(\d+(?:m|km)?)/i);

    if (repeatMatch) {
      const count = Math.min(20, Math.max(2, parseInt(repeatMatch[1])));
      const workVal = repeatMatch[2];
      let workKm = 0.4;
      if (workVal.endsWith('m')) workKm = parseFloat(workVal) / 1000;
      else if (workVal.endsWith('km')) workKm = parseFloat(workVal);

      // Distância do bloco
      let blockDist = parseFloat(String(b.distance || '').replace(',', '.')) || (count * workKm * 1.35);
      const restKm = Math.max(0.08, (blockDist - (count * workKm)) / count);

      for (let i = 1; i <= count; i++) {
        // Intervalo de esforço (Tiro)
        const sWork = {
          name: `Tiro ${i}/${count} (${workVal})`,
          phase: 'Tiro',
          zone: 'Z5',
          zoneLabel: '100% VAM (Z5)',
          height: 95,
          color: '#6366f1', // Indigo / Cobalt
          dist: workKm,
          pace: b.pace || '3:45 min/km',
          startKm: cumDist,
          endKm: cumDist + workKm
        };
        cumDist += workKm;
        segments.push(sWork);

        // Intervalo de recuperação
        if (i <= count) {
          const sRest = {
            name: `Recup. ${i}/${count}`,
            phase: 'Recuperação',
            zone: 'Z1',
            zoneLabel: 'Recuperação Ativa (Z1)',
            height: 26,
            color: '#475569', // Slate
            dist: restKm,
            pace: '6:00 min/km',
            startKm: cumDist,
            endKm: cumDist + restKm
          };
          cumDist += restKm;
          segments.push(sRest);
        }
      }
    } else {
      let dist = parseFloat(String(b.distance || '').replace(',', '.'));
      if (isNaN(dist) || dist <= 0) dist = 1.5;

      const combined = ((b.name || '') + ' ' + (b.type || '')).toLowerCase();
      let zone = 'Z2';
      let zoneLabel = 'Base Aeróbia (Z2)';
      let height = 55;
      let color = '#0284c7'; // Sky-600
      let phase = 'Corrida';

      if (combined.includes('aquec') || combined.includes('warm')) {
        zone = 'Z2';
        zoneLabel = 'Aquecimento (Z2)';
        height = 48;
        color = '#38bdf8'; // Sky-400
        phase = 'Aquecimento';
      } else if (combined.includes('desaquec') || combined.includes('esfriar') || combined.includes('cool') || combined.includes('volta') || combined.includes('regenerativo')) {
        zone = 'Z1';
        zoneLabel = 'Soltura / Desaquecimento (Z1)';
        height = 36;
        color = '#0d9488'; // Teal
        phase = 'Desaquecimento';
      } else if (combined.includes('limiar') || combined.includes('tempo') || combined.includes('z4') || combined.includes('forte')) {
        zone = 'Z4';
        zoneLabel = 'Limiar Anaeróbio (Z4)';
        height = 80;
        color = '#f59e0b'; // Amber
        phase = 'Limiar';
      } else if (combined.includes('tiro') || combined.includes('sprint') || combined.includes('vam')) {
        zone = 'Z5';
        zoneLabel = 'Potência Máxima (Z5)';
        height = 95;
        color = '#6366f1';
        phase = 'Tiro';
      } else if (combined.includes('moderado') || combined.includes('z3')) {
        zone = 'Z3';
        zoneLabel = 'Ritmo Moderado (Z3)';
        height = 68;
        color = '#10b981'; // Emerald
        phase = 'Moderado';
      }

      const s = {
        name: b.name || phase,
        phase,
        zone,
        zoneLabel,
        height,
        color,
        dist,
        pace: b.pace || (zone === 'Z5' ? '3:45 min/km' : '5:15 min/km'),
        startKm: cumDist,
        endKm: cumDist + dist
      };
      cumDist += dist;
      segments.push(s);
    }
  });

  return { segments, totalKm: Math.max(1, cumDist) };
};

// ─── GRÁFICO OFICIAL DE TREINO ESTRUTURADO (TrainingPeaks / Garmin Style) ───
const TrainingPeaksWorkoutChart = ({ workout, compact = false }) => {
  const [hovered, setHovered] = useState(null);

  const { segments, totalKm } = useMemo(() => expandWorkoutSegments(workout), [workout]);

  if (segments.length === 0) return null;

  const chartLeft = 32;
  const chartWidth = 558;
  const baselineY = 104;
  const maxBarH = 88;

  // Ticks na escala de km
  const ticks = [
    0,
    totalKm * 0.25,
    totalKm * 0.5,
    totalKm * 0.75,
    totalKm
  ];

  return (
    <div className={`rounded-xl border border-slate-800 bg-slate-950 text-slate-100 shadow-md ${compact ? 'p-2.5 space-y-1.5' : 'p-4 space-y-2.5'}`}>
      {/* Top Header do Gráfico */}
      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
        <div className="flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5 text-cyan-400" />
          <span>Perfil de Intensidade • Treino Estruturado</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-slate-300 font-bold">
            {workout.metrics?.distance || `${totalKm.toFixed(1)} km`}
          </span>
          <span className="text-slate-600">|</span>
          <span className="font-mono text-slate-400">
            {formatEstimatedTime(workout.metrics?.duration)}
          </span>
        </div>
      </div>

      {/* Canvas SVG com Barras de Treino */}
      <div className="relative w-full">
        <svg 
          viewBox="0 0 600 120" 
          className={`w-full ${compact ? 'h-24' : 'h-32 sm:h-36'} overflow-visible select-none`}
        >
          {/* Linhas de Grade de Intensidade (Zonas VAM Z1 - Z5) */}
          <g className="opacity-25" stroke="#94a3b8" strokeDasharray="3 3" strokeWidth="0.8">
            <line x1={chartLeft} y1="16" x2="590" y2="16" />
            <line x1={chartLeft} y1="38" x2="590" y2="38" />
            <line x1={chartLeft} y1="60" x2="590" y2="60" />
            <line x1={chartLeft} y1="82" x2="590" y2="82" />
            <line x1={chartLeft} y1={baselineY} x2="590" y2={baselineY} />
          </g>

          {/* Rótulos de Zona no Eixo Y */}
          <g className="text-[8px] font-mono fill-slate-500 font-bold" textAnchor="end">
            <text x="26" y="19">Z5</text>
            <text x="26" y="41">Z4</text>
            <text x="26" y="63">Z3</text>
            <text x="26" y="85">Z2</text>
            <text x="26" y={baselineY}>Z1</text>
          </g>

          {/* Barras do Treino Proporcionais à Distância e Intensidade */}
          {segments.map((s, idx) => {
            const x = chartLeft + (s.startKm / totalKm) * chartWidth;
            const w = Math.max(1.5, (s.dist / totalKm) * chartWidth - 1);
            const h = (s.height / 100) * maxBarH;
            const y = baselineY - h;
            const isHovered = hovered === s;

            return (
              <rect
                key={idx}
                x={x}
                y={y}
                width={w}
                height={h}
                rx="1.5"
                fill={s.color}
                opacity={isHovered ? 1 : 0.85}
                filter={isHovered ? 'drop-shadow(0px 0px 4px rgba(255,255,255,0.4))' : undefined}
                className="transition-all duration-150 cursor-pointer"
                onMouseEnter={() => setHovered(s)}
                onMouseLeave={() => setHovered(null)}
              />
            );
          })}

          {/* Eixo X com Régua de Quilometragem */}
          <line x1={chartLeft} y1={baselineY + 2} x2="590" y2={baselineY + 2} stroke="#475569" strokeWidth="1" />
          {ticks.map((t, idx) => {
            const x = chartLeft + (t / totalKm) * chartWidth;
            return (
              <g key={idx}>
                <line x1={x} y1={baselineY + 2} x2={x} y2={baselineY + 6} stroke="#475569" strokeWidth="1" />
                <text 
                  x={x} 
                  y={baselineY + 14} 
                  textAnchor={idx === 0 ? 'start' : idx === ticks.length - 1 ? 'end' : 'middle'}
                  className="text-[8px] font-mono fill-slate-400 font-semibold"
                >
                  {t.toFixed(1)} km
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Barra de Status/Inspecionar Bloco ao passar o mouse */}
      <div className="flex items-center justify-between min-h-[22px] px-2 py-1 rounded bg-slate-900 border border-slate-800/80 text-[11px] font-mono">
        {hovered ? (
          <>
            <span className="text-white font-bold truncate">
              {hovered.name}
            </span>
            <div className="flex items-center gap-2 text-slate-300 shrink-0 font-semibold">
              <span className="text-cyan-400">{hovered.pace}</span>
              <span className="text-slate-500">•</span>
              <span className="text-amber-400">{hovered.zoneLabel}</span>
              <span className="text-slate-500">•</span>
              <span>{hovered.dist.toFixed(2)} km</span>
            </div>
          </>
        ) : (
          <>
            <span className="text-slate-400 text-[10px]">
              Passe o cursor sobre as barras para inspecionar ritmo e zona
            </span>
            <span className="text-slate-400 text-[10px]">
              Total: <strong className="text-slate-200">{totalKm.toFixed(1)} km</strong>
            </span>
          </>
        )}
      </div>
    </div>
  );
};

// ─── LISTA DETALHADA DAS SÉRIES (TrainingPeaks Step Breakdown) ───
const StructuredStepsList = ({ workout }) => {
  const rawBlocks = workout?.structured_blocks || workout?.metrics?.structured_blocks || workout?.metrics?.structured_steps || [];
  if (rawBlocks.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        <span>Prescrição Detalhada das Séries</span>
        <span>{rawBlocks.length} fases</span>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800 text-xs">
        {rawBlocks.map((b, idx) => {
          const step = getStepDetails(b.name, b.type);
          const isRepeat = (b.name || '').includes('x');

          return (
            <div key={idx} className="p-3 sm:px-4 sm:py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                  {idx + 1}
                </span>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-bold uppercase tracking-wider text-[11px] ${step.colorText}`}>
                      {step.typeLabel}
                    </span>
                    {step.customName && (
                      <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                        • {step.customName}
                      </span>
                    )}
                  </div>
                  {b.pace && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Ritmo alvo: <strong className="text-slate-700 dark:text-slate-300">{b.pace}</strong>
                      {isRepeat && <span className="ml-2 text-indigo-500 font-semibold">• 100% VAM</span>}
                    </p>
                  )}
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="font-bold text-slate-900 dark:text-white tabular-nums text-sm">
                  {b.distance || (b.duration ? formatEstimatedTime(b.duration) : '--')}
                </span>
              </div>
            </div>
          );
        })}
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

  // Agrupamento por Semanas com Cálculo da Soma Semanal (TrainingPeaks Style)
  const calendarWeeks = useMemo(() => {
    const weeks = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      const weekDays = calendarDays.slice(i, i + 7);
      
      let totalKm = 0;
      let totalMinutes = 0;
      let count = 0;
      let completedCount = 0;

      weekDays.forEach(day => {
        day.workouts.forEach(w => {
          count++;
          if (w.status === 'completed') completedCount++;

          const dStr = w.metrics?.distance || '';
          if (dStr) {
            const cleanD = String(dStr).toLowerCase().replace(',', '.');
            if (cleanD.includes('m') && !cleanD.includes('km')) {
              const val = parseFloat(cleanD);
              if (!isNaN(val)) totalKm += val / 1000;
            } else {
              const val = parseFloat(cleanD);
              if (!isNaN(val)) totalKm += val;
            }
          }

          const tStr = w.metrics?.duration || '';
          if (tStr) {
            const cleanT = String(tStr).toLowerCase();
            const hMatch = cleanT.match(/(\d+)\s*h(?:oras?)?(?:\s*(\d+)\s*(?:m|min)?)?/i);
            if (hMatch) {
              const h = parseInt(hMatch[1]) || 0;
              const m = parseInt(hMatch[2]) || 0;
              totalMinutes += h * 60 + m;
            } else {
              const mMatch = cleanT.match(/(\d+)/);
              if (mMatch) totalMinutes += parseInt(mMatch[1]) || 0;
            }
          }
        });
      });

      const hours = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;
      const durationFormatted = hours > 0 
        ? (mins > 0 ? `${hours}h ${mins}min` : `${hours}h`) 
        : (mins > 0 ? `${mins} min` : '0 min');

      weeks.push({
        days: weekDays,
        summary: {
          totalKm,
          totalMinutes,
          durationFormatted,
          count,
          completedCount
        }
      });
    }
    return weeks;
  }, [calendarDays]);

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
      {/* ── CONTEÚDO PRINCIPAL (CALENDÁRIO + DETALHES EM LARGURA TOTAL / FLUIDO) ── */}
      <main className="w-full px-3 sm:px-6 lg:px-8 py-6">
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

        {/* Layout Fluido: Calendário Expandido (ocupa toda a largura livre) + Painel Lateral Fixo */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* ── COLUNA DA ESQUERDA: CALENDÁRIO COMPLETO (FLUIDO / BORDA A BORDA) ── */}
          <div className="flex-1 min-w-0 w-full space-y-4">
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="min-w-[720px]">
                {/* Cabeçalho dos 7 Dias da Semana + Coluna de Total */}
                <div className="grid grid-cols-8 border-b border-slate-100 bg-slate-50 text-center dark:border-slate-800/80 dark:bg-slate-900/50">
                  {WEEK_DAYS.map((day, idx) => (
                    <div key={idx} className="py-2.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {day}
                    </div>
                  ))}
                  <div className="py-2.5 text-xs font-black uppercase tracking-wider text-blue-700 dark:text-blue-300 bg-blue-50/70 dark:bg-blue-950/40 border-l border-blue-200/70 dark:border-blue-900/60">
                    Resumo
                  </div>
                </div>

                {/* Grid das Semanas com Resumo Semanal na 8ª Coluna */}
                <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {calendarWeeks.map((week, wIdx) => (
                    <div key={wIdx} className="grid grid-cols-8 divide-x divide-slate-100 dark:divide-slate-800/60 auto-rows-fr">
                      {/* 7 Dias da Semana */}
                      {week.days.map((item, dIdx) => {
                        const isToday = item.dateStr === todayStr;
                        const hasWorkouts = item.workouts.length > 0;
                        const isSelected = activeWorkout && item.workouts.some(w => w.id === activeWorkout.id);

                        return (
                          <div
                            key={dIdx}
                            onClick={() => {
                              if (hasWorkouts) setSelectedWorkout(item.workouts[0]);
                            }}
                            className={`min-h-[125px] p-1.5 sm:p-2 transition-all duration-150 ${
                              !item.isCurrentMonth ? 'bg-slate-50/50 text-slate-300 dark:bg-slate-950/40 dark:text-slate-700' : 'bg-white dark:bg-slate-900'
                            } ${hasWorkouts ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50' : ''} ${
                              isSelected ? 'ring-2 ring-blue-500 ring-inset bg-blue-50/30 dark:bg-blue-950/20' : ''
                            }`}
                          >
                            {/* Número do Dia */}
                            <div className="flex items-center justify-between mb-1">
                              <span
                                className={`flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full text-xs font-semibold ${
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
                                <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Hoje</span>
                              )}
                            </div>

                            {/* Lista de Treinos alocados para o dia (Apenas Nome da Atividade conforme solicitado) */}
                            <div className="space-y-1">
                              {item.workouts.map((w) => {
                                const isDone = w.status === 'completed';
                                const topBarColor = isDone ? 'bg-emerald-500' : 'bg-amber-400';

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

                                    <div className="p-1.5 sm:p-2 space-y-1">
                                      {/* Topo: Símbolo da modalidade (ex: sapatilha verde) + 3 pontos */}
                                      <div className="flex items-center justify-between">
                                        {getModalityIcon(w.type, w.title)}
                                        <span className="text-slate-400 opacity-40 group-hover:opacity-100 transition-opacity">
                                          <MoreVertical className="h-3 w-3" />
                                        </span>
                                      </div>

                                      {/* Apenas o Título / Nome da Atividade (solicitado pelo usuário) */}
                                      <h4 className="text-[11px] font-bold text-slate-800 dark:text-slate-100 line-clamp-3 leading-tight">
                                        {w.title || 'Treino'}
                                      </h4>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}

                      {/* 8ª Coluna: Resumo Semanal com Card Destacado e Cores Vivas (TrainingPeaks Style) */}
                      <div className="min-h-[125px] p-1.5 bg-blue-50/20 dark:bg-slate-950/40 border-l border-slate-200 dark:border-slate-800 flex flex-col justify-center select-none">
                        <div className={`h-full rounded-xl p-2.5 flex flex-col justify-between transition-all ${
                          week.summary.count > 0 
                            ? 'bg-gradient-to-b from-blue-500/10 via-white to-blue-500/5 dark:from-blue-950/40 dark:via-slate-900 dark:to-slate-900 border border-blue-200/80 dark:border-blue-900/50 shadow-xs' 
                            : 'bg-slate-50/60 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-800/40'
                        }`}>
                          {/* Top: Tag da Semana e Contagem */}
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-400">
                              Sem. {wIdx + 1}
                            </span>
                            {week.summary.count > 0 && (
                              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-extrabold bg-blue-600 text-white shadow-2xs">
                                {week.summary.count}x
                              </span>
                            )}
                          </div>

                          {/* Middle: Volume e Duração em Destaque Alto */}
                          {week.summary.count > 0 ? (
                            <div className="my-auto py-1.5 text-center space-y-0.5">
                              <p className="text-base sm:text-lg font-black text-slate-950 dark:text-white tabular-nums tracking-tight">
                                {week.summary.totalKm.toFixed(1)} <span className="text-xs font-bold text-blue-600 dark:text-blue-400">km</span>
                              </p>
                              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 tabular-nums">
                                {week.summary.durationFormatted}
                              </p>
                            </div>
                          ) : (
                            <div className="my-auto py-2 text-center text-slate-300 dark:text-slate-600 font-semibold text-xs">
                              --
                            </div>
                          )}

                          {/* Bottom: Status ou Rótulo */}
                          <div className="text-[9px] font-bold text-center uppercase tracking-wider">
                            {week.summary.count > 0 ? (
                              <span className="text-emerald-600 dark:text-emerald-400">
                                {week.summary.completedCount > 0 ? `${week.summary.completedCount}/${week.summary.count} feito` : 'Planejado'}
                              </span>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-500">Sem treino</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
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

          {/* ── COLUNA DA DIREITA: DETALHES DO TREINO SELECIONADO (LARGURA FIXA OTIMIZADA) ── */}
          <div className="w-full lg:w-[380px] xl:w-[420px] 2xl:w-[450px] shrink-0 space-y-6">
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

                  {/* Gráfico SVG de Intensidade e Intervalos (TrainingPeaks) */}
                  <TrainingPeaksWorkoutChart workout={activeWorkout} compact />

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

      {/* ── MODAL DE DETALHES COMPLETOS DA ATIVIDADE (TrainingPeaks / Athletic Style) ── */}
      {isDetailModalOpen && activeWorkout && (
        <div 
          onClick={() => setIsDetailModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-sm"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-7 space-y-5"
          >
            {/* Top Bar do Modal: Identidade esportiva sóbria */}
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                    {getModalityIcon(activeWorkout.type, activeWorkout.title)}
                    <span>{activeWorkout.type || 'Corrida'}</span>
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    {activeWorkout.date}
                  </span>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  {activeWorkout.status === 'completed' ? (
                    <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Concluído
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-amber-500 flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> Agendado
                    </span>
                  )}
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {activeWorkout.title}
                </h2>

                {activeWorkout.description && (
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 pt-1 leading-relaxed border-l-2 border-slate-200 dark:border-slate-700 pl-3">
                    {activeWorkout.description}
                  </p>
                )}
              </div>

              <button 
                onClick={() => setIsDetailModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition shrink-0"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Telemetria Resumida do Treino (Barra Limpa TrainingPeaks) */}
            {(() => {
              const blocks = activeWorkout.structured_blocks || activeWorkout.metrics?.structured_blocks || activeWorkout.metrics?.structured_steps || [];
              const mainBlock = blocks.find(b => {
                const n = (b.name || '').toLowerCase();
                return !n.includes('aquec') && !n.includes('desaquec');
              }) || blocks[0];

              const isInterval = (activeWorkout.type || '').toLowerCase().includes('tiro') || (mainBlock?.name || '').toLowerCase().includes('tiro') || (activeWorkout.title || '').toLowerCase().includes('tiro');
              const paceToShow = mainBlock?.pace || (isInterval ? '3:45 min/km' : '5:15 min/km');
              const zoneLabel = isInterval ? 'Z5 • 100% VAM' : (activeWorkout.title?.toLowerCase().includes('limiar') ? 'Z4 • Limiar' : 'Z2 • Aeróbio');

              return (
                <div className="grid grid-cols-2 sm:grid-cols-4 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800">
                  <div className="p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Distância Total</p>
                    <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-0.5 tabular-nums">
                      {activeWorkout.metrics?.distance || '--'}
                    </p>
                  </div>
                  <div className="p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tempo Estimado</p>
                    <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-0.5 tabular-nums">
                      {formatEstimatedTime(activeWorkout.metrics?.duration)}
                    </p>
                  </div>
                  <div className="p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {isInterval ? 'Ritmo dos Tiros' : 'Ritmo Alvo'}
                    </p>
                    <p className="text-base sm:text-lg font-bold text-indigo-600 dark:text-indigo-400 mt-0.5 tabular-nums">
                      {paceToShow}
                    </p>
                  </div>
                  <div className="p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Zona Alvo</p>
                    <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-0.5 truncate">
                      {zoneLabel}
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* Gráfico Oficial SVG com Intervalos Reais, Degraus e Escala de KM */}
            <TrainingPeaksWorkoutChart workout={activeWorkout} />

            {/* Prescrição Detalhada das Séries */}
            <StructuredStepsList workout={activeWorkout} />

            {/* Rodapé de Ações do Modal */}
            <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800">
              <div className="text-xs text-slate-400 flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>Sincronização direta com relógios Garmin e Strava</span>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button 
                  variant="outline" 
                  onClick={() => setIsDetailModalOpen(false)}
                  className="w-full sm:w-auto px-4 text-xs font-semibold"
                >
                  Fechar
                </Button>
                <Button variant="vam" className="w-full sm:w-auto gap-2 text-xs font-bold">
                  <Zap className="h-4 w-4" />
                  Enviar Treino para o Garmin
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
