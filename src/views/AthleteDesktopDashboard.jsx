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
  Activity,
  Loader2,
  RefreshCw
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

// Formata data para o cabeçalho moderno do modal (ex: "SÁB, 17 OUT 2026")
export const formatModalHeaderDate = (dateStr) => {
  if (!dateStr) return 'HOJE';
  try {
    const parts = String(dateStr).split('-');
    let d;
    if (parts.length === 3) {
      d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    } else {
      d = new Date(dateStr);
    }
    if (!isNaN(d.getTime())) {
      const days = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
      const months = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
      const dayOfWeek = days[d.getDay()];
      const dayNum = d.getDate();
      const monthName = months[d.getMonth()];
      const year = d.getFullYear();
      return `${dayOfWeek}, ${dayNum} ${monthName} ${year}`;
    }
  } catch (e) {}
  return String(dateStr).toUpperCase();
};

export const getModalWorkoutType = (workout) => {
  const combined = ((workout?.type || '') + ' ' + (workout?.title || '')).toUpperCase();
  if (combined.includes('TIRO') || combined.includes('VAM') || combined.includes('INTERVAL')) return 'INTERVALADO';
  if (combined.includes('LONGO')) return 'LONGO';
  if (combined.includes('LIMIAR') || combined.includes('TEMPO')) return 'LIMIAR';
  if (combined.includes('REGENERATIVO') || combined.includes('RECUPERA')) return 'REGENERATIVO';
  if (combined.includes('RODAGEM')) return 'RODAGEM';
  return (workout?.type || 'CORRIDA').toUpperCase();
};

const getStepDetails = (name = '', type = '') => {
  const rawType = (type || '').trim();
  const rawName = (name || '').trim();
  const combined = (rawType + ' ' + rawName).toLowerCase();

  let typeLabel = 'Corrida';
  let colorText = 'text-[#007AFF]';
  let accentBorder = 'border-l-[#007AFF]';

  if (combined.includes('aquec') || combined.includes('warm') || combined.includes('rodagem') || combined.includes('base') || combined.includes('z2')) {
    typeLabel = 'Aquecimento';
    colorText = 'text-[#007AFF]';
    accentBorder = 'border-l-[#007AFF]';
  } else if (combined.includes('desaquec') || combined.includes('esfriar') || combined.includes('cool') || combined.includes('volta') || combined.includes('recupera') || combined.includes('rest') || combined.includes('pausa') || combined.includes('regenerativo') || combined.includes('z1')) {
    typeLabel = combined.includes('recupera') ? 'Recuperação' : 'Desaquecimento';
    colorText = 'text-[#8E8E93]';
    accentBorder = 'border-l-[#8E8E93]';
  } else if (combined.includes('moderado') || combined.includes('aerobico') || combined.includes('aeróbico') || combined.includes('z3')) {
    typeLabel = 'Moderado';
    colorText = 'text-[#34C759]';
    accentBorder = 'border-l-[#34C759]';
  } else if (combined.includes('limiar') || combined.includes('tempo') || combined.includes('forte') || combined.includes('z4')) {
    typeLabel = 'Limiar';
    colorText = 'text-[#FF9500]';
    accentBorder = 'border-l-[#FF9500]';
  } else if (combined.includes('tiro') || combined.includes('interval') || combined.includes('sprint') || combined.includes('vam') || combined.includes('z5')) {
    typeLabel = 'Tiro';
    colorText = 'text-[#FF3B30]';
    accentBorder = 'border-l-[#FF3B30]';
  } else if (combined.includes('caminha') || combined.includes('walk')) {
    typeLabel = 'Caminhada';
    colorText = 'text-[#34C759]';
    accentBorder = 'border-l-[#34C759]';
  } else if (rawType) {
    typeLabel = rawType.toLowerCase() === 'trabalho' ? 'Corrida' : rawType;
    colorText = 'text-[#007AFF]';
    accentBorder = 'border-l-[#007AFF]';
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

// Converte string de ritmo (ex: "3:30 min/km", "5:35", "4:45 /km") em segundos por km
export const parsePaceToSeconds = (paceStr) => {
  if (!paceStr) return null;
  const match = String(paceStr).match(/(\d+):(\d+)/);
  if (match) {
    return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
  }
  return null;
};

// Determina Zona (Z1-Z5), cor oficial e altura proporcional no gráfico (20px a 68px) com base no pace e nome do bloco
export const getPaceZoneInfo = (paceStr, name = '', type = '') => {
  const combined = (String(name) + ' ' + String(type)).toLowerCase();
  const sec = parsePaceToSeconds(paceStr);

  // Se tiver indicação explícita de Z1 no nome (ex: "Trote Solto Z1") ou ritmo bem leve
  if (combined.includes('z1') || combined.includes('soltura') || combined.includes('regenerativo') || combined.includes('recupera')) {
    return {
      zone: 'Z1',
      zoneLabel: 'Recuperação (Z1)',
      color: '#8E8E93', // Cinza Z1
      height: 22,
      paceFormatted: sec ? `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')} /km` : (paceStr || '5:50 /km')
    };
  }

  // 1. Mapeamento direto pelo ritmo (segundos por km)
  if (sec !== null) {
    if (sec < 245) { // < 4:05 min/km -> Z5 (Tiros, Retas, Sprints)
      return {
        zone: 'Z5',
        zoneLabel: 'Tiros Máximos (Z5)',
        color: '#FF3B30', // Vermelho Z5
        height: 68,
        paceFormatted: `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')} /km`
      };
    }
    if (sec <= 280) { // 4:05 - 4:40 min/km -> Z4 (Limiar / VAM)
      return {
        zone: 'Z4',
        zoneLabel: 'Limiar / VAM (Z4)',
        color: '#FF9500', // Laranja Z4
        height: 52,
        paceFormatted: `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')} /km`
      };
    }
    if (sec <= 315) { // 4:40 - 5:15 min/km -> Z3 (Ritmo Moderado)
      return {
        zone: 'Z3',
        zoneLabel: 'Ritmo Moderado (Z3)',
        color: '#34C759', // Verde Z3
        height: 40,
        paceFormatted: `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')} /km`
      };
    }
    if (sec <= 345) { // 5:15 - 5:45 min/km -> Z2 (Rodagem Base)
      return {
        zone: 'Z2',
        zoneLabel: 'Rodagem Base (Z2)',
        color: '#007AFF', // Azul Z2
        height: 30,
        paceFormatted: `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')} /km`
      };
    }
    // > 5:45 min/km -> Z1
    return {
      zone: 'Z1',
      zoneLabel: 'Recuperação (Z1)',
      color: '#8E8E93', // Cinza Z1
      height: 22,
      paceFormatted: `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')} /km`
    };
  }

  // 2. Fallbacks baseados no nome caso pace não tenha sido especificado
  if (combined.includes('z5') || combined.includes('tiro') || combined.includes('sprint') || combined.includes('reta') || combined.includes('100%')) {
    return { zone: 'Z5', zoneLabel: 'Tiros Máximos (Z5)', color: '#FF3B30', height: 68, paceFormatted: '3:30 /km' };
  }
  if (combined.includes('z4') || combined.includes('limiar') || combined.includes('tempo') || combined.includes('forte')) {
    return { zone: 'Z4', zoneLabel: 'Limiar / VAM (Z4)', color: '#FF9500', height: 52, paceFormatted: '4:15 /km' };
  }
  if (combined.includes('z3') || combined.includes('moderado') || combined.includes('aerobico') || combined.includes('aeróbico')) {
    return { zone: 'Z3', zoneLabel: 'Ritmo Moderado (Z3)', color: '#34C759', height: 40, paceFormatted: '4:45 /km' };
  }
  return { zone: 'Z2', zoneLabel: 'Rodagem Base (Z2)', color: '#007AFF', height: 30, paceFormatted: '5:15 /km' };
};

// Decompõe e expande blocos do treino para escala real de intervalos (TrainingPeaks / Garmin Style)
const expandWorkoutSegments = (workout) => {
  if (!workout) return { segments: [], totalKm: 5.0, baseBlocks: [] };

  const rawBlocks = workout.structured_blocks || workout.metrics?.structured_blocks || workout.metrics?.structured_steps || [];
  const distStr = workout.metrics?.distance || '6.5 km';
  const totalWorkoutDist = parseFloat(String(distStr).replace(',', '.')) || 6.5;

  let baseBlocks = rawBlocks;
  if (!baseBlocks || baseBlocks.length === 0) {
    const title = (workout.title || workout.type || '').toLowerCase();
    const desc = (workout.description || '').toLowerCase();
    const combinedText = title + ' ' + desc;
    const repeatMatch = combinedText.match(/(\d+)\s*[x×]\s*(.*)/i);

    if (repeatMatch || title.includes('tiro') || title.includes('vam') || title.includes('interval') || title.includes('reta')) {
      const repCount = repeatMatch ? Math.min(25, Math.max(2, parseInt(repeatMatch[1], 10))) : 10;
      const restText = repeatMatch ? repeatMatch[2].trim() : '200m';
      const distMatch = restText.match(/(\d+(?:[.,]\d+)?\s*(?:m|km))/i);
      const repWork = distMatch ? distMatch[1].replace(' ', '') : '200m';

      let workKm = 0.2;
      if (repWork.endsWith('m')) workKm = parseFloat(repWork) / 1000;
      else if (repWork.endsWith('km')) workKm = parseFloat(repWork);

      const totalSeriesKm = (repCount * workKm).toFixed(1);
      const warmupKm = '2.5 km';
      const coolKm = '2.0 km';

      baseBlocks = [
        { 
          name: 'Aquecimento', 
          subtitle: 'Z2 Leve', 
          pace: '5:05 min/km', 
          distance: warmupKm, 
          type: 'Aquecimento' 
        },
        { 
          name: `${repCount}× ${repWork} Forte`, 
          pauseNote: "(pausa 1' trote)", 
          pace: workout.target_pace || '3:30 min/km', 
          distance: `${totalSeriesKm} km`, 
          type: 'Tiro' 
        },
        { 
          name: 'Desaquecimento', 
          subtitle: 'Soltura', 
          pace: '5:40 min/km', 
          distance: coolKm, 
          type: 'Desaquecimento' 
        }
      ];
    } else if (title.includes('tempo') || title.includes('limiar') || title.includes('ritmo')) {
      baseBlocks = [
        { name: 'Aquecimento', subtitle: 'Z2 Leve', pace: '5:15 min/km', distance: '2.0 km', type: 'Aquecimento' },
        { name: 'Ritmo Limiar Z4', subtitle: 'Limiar VAM', pace: '4:15 min/km', distance: '5.0 km', type: 'Corrida' },
        { name: 'Desaquecimento', subtitle: 'Soltura', pace: '5:30 min/km', distance: '2.0 km', type: 'Desaquecimento' }
      ];
    } else {
      const wDist = Math.max(1.0, parseFloat((totalWorkoutDist * 0.2).toFixed(1)));
      const mDist = Math.max(2.0, parseFloat((totalWorkoutDist * 0.65).toFixed(1)));
      const cDist = Math.max(1.0, parseFloat((totalWorkoutDist * 0.15).toFixed(1)));
      baseBlocks = [
        { name: 'Aquecimento Gradual', subtitle: 'Z2 Leve', pace: '5:30 min/km', distance: `${wDist} km`, type: 'Aquecimento' },
        { name: 'Volume Principal Z2', subtitle: 'Base Aeróbia', pace: workout.metrics?.pace || '5:10 min/km', distance: `${mDist} km`, type: 'Corrida' },
        { name: 'Volta à Calma', subtitle: 'Soltura', pace: '5:45 min/km', distance: `${cDist} km`, type: 'Desaquecimento' }
      ];
    }
  }

  const segments = [];
  let cumDist = 0;

  baseBlocks.forEach((b) => {
    const name = b.name || '';
    const repeatMatch = name.match(/(\d+)\s*[x×]\s*(.*)/i);

    if (repeatMatch) {
      const count = Math.min(25, Math.max(2, parseInt(repeatMatch[1], 10)));
      const restText = repeatMatch[2].trim();
      const distMatch = restText.match(/(\d+(?:[.,]\d+)?\s*(?:m|km))/i);
      const workVal = distMatch ? distMatch[1].replace(' ', '') : '200m';

      let workKm = 0.2;
      if (workVal.endsWith('m')) workKm = parseFloat(workVal) / 1000;
      else if (workVal.endsWith('km')) workKm = parseFloat(workVal);

      let blockDist = parseFloat(String(b.distance || '').replace(',', '.')) || (count * workKm * 1.35);
      const restKm = Math.max(0.05, (blockDist - (count * workKm)) / count);
      const paceInfo = getPaceZoneInfo(b.pace, b.name, b.type || 'Tiro');

      for (let i = 1; i <= count; i++) {
        // Intervalo de esforço (Tiro / Reta)
        const sWork = {
          name: `${name.replace(/\s*\(.*\)/, '').trim()} (${i}/${count})`,
          repIndex: i,
          repCount: count,
          phase: 'Tiro',
          zone: paceInfo.zone,
          zoneLabel: paceInfo.zoneLabel,
          height: paceInfo.height, // 68px para Z5!
          color: paceInfo.color,   // #FF3B30
          dist: workKm,
          pace: b.pace || paceInfo.paceFormatted,
          startKm: cumDist,
          endKm: cumDist + workKm
        };
        cumDist += workKm;
        segments.push(sWork);

        // Intervalo de recuperação
        if (i < count || (b.pauseNote || '').includes('pausa')) {
          const sRest = {
            name: `Recuperação (${i}/${count})`,
            repIndex: i,
            repCount: count,
            phase: 'Recuperação',
            isRest: true,
            zone: 'Z1',
            zoneLabel: 'Recuperação (Z1)',
            height: 20,
            color: '#94A3B8', // Cinza slate bem nítido
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

      const paceInfo = getPaceZoneInfo(b.pace, b.name, b.type);

      const s = {
        name: b.name || paceInfo.zoneLabel,
        phase: b.type || 'Corrida',
        zone: paceInfo.zone,
        zoneLabel: paceInfo.zoneLabel,
        height: paceInfo.height, // Altura calculada estritamente pelo ritmo (18px a 60px)!
        color: paceInfo.color,   // Cor oficial da zona correspondente!
        dist,
        pace: b.pace || paceInfo.paceFormatted,
        startKm: cumDist,
        endKm: cumDist + dist
      };
      cumDist += dist;
      segments.push(s);
    }
  });

  return { segments, totalKm: Math.max(1, cumDist), baseBlocks };
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
              <span style={{ color: hovered.color || '#007AFF' }}>{hovered.zoneLabel}</span>
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

// ─── VISUALIZADOR DE PERFIL DA SESSÃO (Design Limpo e Moderno conforme Mockup) ───
const WorkoutSessionProfile = ({ workout }) => {
  const { segments } = useMemo(() => expandWorkoutSegments(workout), [workout]);

  // Default para o segmento mais intenso / chave da sessão
  const defaultSegment = useMemo(() => {
    return segments.find(s => s.zone === 'Z5' || s.phase === 'Tiro') || segments.find(s => s.zone === 'Z4') || segments[0] || null;
  }, [segments]);

  const [hoveredSegment, setHoveredSegment] = useState(null);
  const active = hoveredSegment || defaultSegment;

  if (segments.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Top Header: PERFIL DA SESSÃO & Inspetor de Ritmo */}
      <div className="flex items-center justify-between text-[11px] font-bold tracking-wider">
        <span className="text-slate-400 uppercase tracking-widest">PERFIL DA SESSÃO</span>
        {active && (
          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200 font-semibold truncate text-xs">
            <span className="font-bold">
              {active.repIndex 
                ? (active.isRest ? `Recup. ${active.repIndex}/${active.repCount}` : `Tiro ${active.repIndex}/${active.repCount}`) 
                : active.name.split('(')[0].trim()}
            </span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span>{active.dist >= 1 ? `${active.dist.toFixed(1)} km` : `${Math.round(active.dist * 1000)}m`}</span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span 
              className="font-bold"
              style={{ color: active.color || '#FF3B30' }}
            >
              {active.pace.replace(' min/km', ' /km')} ({active.zone})
            </span>
          </div>
        )}
      </div>

      {/* Régua de Barras Visuais Proporcionais ao Ritmo - MAIS LARGA, ALTA E COM DETALHES */}
      <div className="h-20 sm:h-24 w-full flex items-end gap-1.5 sm:gap-2 pt-2 pb-1 select-none">
        {segments.map((seg, idx) => {
          const isBlock = seg.phase === 'Aquecimento' || seg.phase === 'Desaquecimento' || seg.phase === 'Corrida' || (!seg.isRest && seg.phase !== 'Tiro');
          const isRest = seg.isRest || seg.phase === 'Recuperação';

          if (isBlock) {
            return (
              <div
                key={idx}
                onMouseEnter={() => setHoveredSegment(seg)}
                onMouseLeave={() => setHoveredSegment(null)}
                className="relative rounded-xl cursor-pointer transition-all duration-200 hover:brightness-110 flex-1 min-w-[50px] flex items-center justify-center overflow-hidden"
                style={{
                  flexGrow: Math.max(3, Math.min(8, Math.round(seg.dist * 2.5))),
                  height: `${seg.height}px`,
                  backgroundColor: seg.color,
                  opacity: hoveredSegment && hoveredSegment !== seg ? 0.75 : 1,
                  transform: hoveredSegment === seg ? 'scaleY(1.06)' : 'none',
                  transformOrigin: 'bottom'
                }}
                title={`${seg.name} • ${seg.pace}`}
              >
                <span className="text-[10px] font-bold text-white/90 drop-shadow truncate px-1 select-none pointer-events-none">
                  {seg.dist >= 1 ? `${seg.dist.toFixed(1)}km` : `${Math.round(seg.dist * 1000)}m`}
                </span>
              </div>
            );
          }

          if (isRest) {
            return (
              <div
                key={idx}
                onMouseEnter={() => setHoveredSegment(seg)}
                onMouseLeave={() => setHoveredSegment(null)}
                className="cursor-pointer rounded-full transition-all duration-200 hover:brightness-90 shrink-0 flex items-center justify-center"
                style={{
                  width: '9px',
                  height: `${seg.height || 20}px`,
                  backgroundColor: '#94A3B8',
                  opacity: hoveredSegment === seg ? 1 : hoveredSegment ? 0.45 : 0.75,
                  transform: hoveredSegment === seg ? 'scaleY(1.15)' : 'none',
                  transformOrigin: 'bottom'
                }}
                title={`${seg.name} • Recuperação`}
              />
            );
          }

          // Barra de Tiro / Reta: Bem mais larga e alta, com número da repetição gravado na barra
          return (
            <div
              key={idx}
              onMouseEnter={() => setHoveredSegment(seg)}
              onMouseLeave={() => setHoveredSegment(null)}
              className="cursor-pointer rounded-lg sm:rounded-xl transition-all duration-200 hover:brightness-110 flex-1 min-w-[24px] sm:min-w-[28px] max-w-[42px] flex items-end justify-center pb-1.5"
              style={{
                height: `${seg.height}px`,
                backgroundColor: seg.color,
                opacity: hoveredSegment && hoveredSegment !== seg ? 0.75 : 1,
                transform: hoveredSegment === seg ? 'scaleY(1.06)' : 'none',
                transformOrigin: 'bottom'
              }}
              title={`${seg.name} • ${seg.pace}`}
            >
              {seg.repIndex && (
                <span className="text-[10px] sm:text-[11px] font-black text-white select-none pointer-events-none drop-shadow-sm">
                  {seg.repIndex}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── LISTA DE PRESCRIÇÃO DAS SÉRIES (Conforme Mockup) ───
const WorkoutPrescription = ({ workout }) => {
  const { baseBlocks } = useMemo(() => expandWorkoutSegments(workout), [workout]);

  if (!baseBlocks || baseBlocks.length === 0) return null;

  return (
    <div className="space-y-2 pt-1">
      <div className="text-[11px] font-bold tracking-widest text-slate-400 uppercase">
        PRESCRIÇÃO
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
        {baseBlocks.map((b, idx) => {
          let title = b.name || b.type || 'Fase';
          let subtitle = b.subtitle;
          let pauseNote = b.pauseNote;

          if (title.includes(' • ')) {
            const parts = title.split(' • ');
            title = parts[0].trim();
            if (!subtitle && parts[1]) subtitle = parts[1].trim();
          } else if (title.includes(' - ')) {
            const parts = title.split(' - ');
            title = parts[0].trim();
            if (!subtitle && parts[1]) subtitle = parts[1].trim();
          }

          // Capitaliza se for tudo maiúsculo
          if (title === title.toUpperCase() && title.length > 3) {
            title = title.charAt(0) + title.slice(1).toLowerCase();
          }

          const isInterval = b.type === 'Tiro' || title.includes('x') || title.includes('×') || title.toLowerCase().includes('forte') || (b.zone === 'Z5');
          const paceFormatted = b.pace ? b.pace.replace(' min/km', ' /km') : '--';

          return (
            <div key={idx} className="py-2.5 sm:py-3 flex items-center justify-between text-sm gap-2">
              <div className="flex items-center gap-1.5 flex-wrap min-w-0 pr-2">
                <span className="font-bold text-slate-900 dark:text-white">
                  {title}
                </span>
                {subtitle && (
                  <span className="text-slate-400 font-normal text-xs sm:text-sm">
                    • {subtitle}
                  </span>
                )}
                {pauseNote && (
                  <span className="text-[#FF3B30] dark:text-[#FF453A] font-normal text-xs sm:text-sm">
                    {pauseNote}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4 sm:gap-6 shrink-0 font-mono">
                <span className={`text-xs sm:text-sm ${isInterval ? 'text-[#FF3B30] dark:text-[#FF453A] font-bold' : 'text-slate-400 dark:text-slate-500 font-medium'}`}>
                  {paceFormatted}
                </span>
                <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm tabular-nums min-w-[50px] text-right">
                  {b.distance}
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
  isRefreshing = false,
  onLogout, 
  deferredPrompt, 
  onInstall,
  navigate
}) {
  // Estado do mês exibido
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isGarminPushing, setIsGarminPushing] = useState(false);
  const [garminPushSuccess, setGarminPushSuccess] = useState(false);

  const handleSendGarmin = async () => {
    setIsGarminPushing(true);
    setTimeout(() => {
      setIsGarminPushing(false);
      setGarminPushSuccess(true);
      setTimeout(() => {
        setGarminPushSuccess(false);
      }, 3500);
    }, 1200);
  };

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
            <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-semibold text-slate-400">Treinos no Mês: </span>
              {isRefreshing && workouts.length === 0 ? (
                <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin text-blue-600" /> Carregando...
                </span>
              ) : (
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{monthStats.completed} / {monthStats.total}</span>
              )}
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-semibold text-slate-400">Distância Prevista: </span>
              {isRefreshing && workouts.length === 0 ? (
                <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin text-cyan-600" /> Carregando...
                </span>
              ) : (
                <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400">{monthStats.distance} km</span>
              )}
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
                <div className="divide-y divide-slate-100 dark:divide-slate-800/60 relative">
                  {isRefreshing && workouts.length === 0 && (
                    <div className="absolute inset-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-[1px] flex flex-col items-center justify-center gap-2">
                      <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Carregando seus treinos...</span>
                    </div>
                  )}
                  {calendarWeeks.map((week, wIdx) => (
                    <div key={wIdx} className="grid grid-cols-8 divide-x divide-slate-100 dark:divide-slate-800/60 h-[140px] max-h-[140px]">
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
                            className={`h-[140px] max-h-[140px] flex flex-col p-1.5 sm:p-2 overflow-hidden transition-all duration-150 ${
                              !item.isCurrentMonth ? 'bg-slate-50/50 text-slate-300 dark:bg-slate-950/40 dark:text-slate-700' : 'bg-white dark:bg-slate-900'
                            } ${hasWorkouts ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50' : ''} ${
                              isSelected ? 'ring-2 ring-blue-500 ring-inset bg-blue-50/30 dark:bg-blue-950/20' : ''
                            }`}
                          >
                            {/* Número do Dia */}
                            <div className="flex items-center justify-between mb-1 shrink-0">
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
                            <div className="flex-1 min-h-0 overflow-y-auto space-y-1 pr-0.5">
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
                                    className="group relative flex flex-col overflow-hidden rounded-md border border-slate-200/90 bg-[#fafafa] text-left shadow-2xs transition-all hover:scale-[1.01] hover:shadow-md hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 cursor-pointer"
                                  >
                                    {/* Barra superior de status clássica do TrainingPeaks */}
                                    <div className={`h-1.5 w-full ${topBarColor}`} />

                                    <div className="p-1.5 space-y-0.5">
                                      {/* Topo: Símbolo da modalidade (ex: sapatilha verde) + 3 pontos */}
                                      <div className="flex items-center justify-between">
                                        {getModalityIcon(w.type, w.title)}
                                        <span className="text-slate-400 opacity-40 group-hover:opacity-100 transition-opacity">
                                          <MoreVertical className="h-3 w-3" />
                                        </span>
                                      </div>

                                      {/* Apenas o Título / Nome da Atividade */}
                                      <h4 className="text-[11px] font-bold text-slate-800 dark:text-slate-100 line-clamp-2 leading-tight">
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
                      <div className="h-[140px] max-h-[140px] p-1.5 bg-blue-50/20 dark:bg-slate-950/40 border-l border-slate-200 dark:border-slate-800 flex flex-col justify-center select-none overflow-hidden">
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
              <div className="rounded-[28px] sm:rounded-[32px] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-[0_10px_35px_-5px_rgba(0,0,0,0.06)] p-6 sm:p-7 space-y-5 transition-all">
                {/* Top Bar: Data + Tipo + Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-800 dark:bg-slate-200 inline-block" />
                    <span>{formatModalHeaderDate(activeWorkout.date)}</span>
                    <span>•</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {getModalWorkoutType(activeWorkout)}
                    </span>
                  </div>

                  {activeWorkout.status === 'completed' ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600">
                      <CheckCircle2 className="h-3 w-3" /> Concluído
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-bold text-amber-600">
                      <Clock className="h-3 w-3" /> Agendado
                    </span>
                  )}
                </div>

                {/* Título & Descrição */}
                <div className="space-y-1.5">
                  <h3 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
                    {activeWorkout.title || 'Treino'}
                  </h3>
                  {activeWorkout.description && (
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-normal">
                      {activeWorkout.description}
                    </p>
                  )}
                </div>

                {/* Pílulas de Métricas */}
                {(() => {
                  const { totalKm, baseBlocks } = expandWorkoutSegments(activeWorkout);
                  const targetBlock = baseBlocks.reduce((best, b) => {
                    const infoCurr = getPaceZoneInfo(b.pace, b.name, b.type);
                    const infoBest = getPaceZoneInfo(best?.pace, best?.name, best?.type);
                    const order = { Z5: 5, Z4: 4, Z3: 3, Z2: 2, Z1: 1 };
                    if ((order[infoCurr.zone] || 1) > (order[infoBest?.zone] || 1)) return b;
                    return best;
                  }, baseBlocks[0]);

                  const targetInfo = getPaceZoneInfo(targetBlock?.pace, targetBlock?.name, targetBlock?.type);
                  const targetPace = targetInfo.paceFormatted.replace(' /km', '');
                  const targetZone = targetInfo.zone;
                  const targetColor = targetInfo.color;

                  const distanceVal = activeWorkout.metrics?.distance 
                    ? (activeWorkout.metrics.distance.includes('km') ? activeWorkout.metrics.distance : `${activeWorkout.metrics.distance} km`)
                    : `${totalKm.toFixed(1)} km`;

                  let durationVal = activeWorkout.metrics?.duration;
                  if (!durationVal || durationVal === '--') {
                    durationVal = `~${Math.round(totalKm * 5.5)} min`;
                  } else {
                    durationVal = formatEstimatedTime(durationVal);
                  }

                  return (
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold px-3.5 py-1.5 rounded-full">
                        Total: <span className="font-bold">{distanceVal}</span>
                      </div>

                      <div className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold px-3.5 py-1.5 rounded-full">
                        Tempo: <span className="font-bold">{durationVal}</span>
                      </div>

                      <div 
                        className="text-xs font-bold px-3.5 py-1.5 rounded-full border transition-all"
                        style={{
                          backgroundColor: `${targetColor}12`,
                          color: targetColor,
                          borderColor: `${targetColor}28`
                        }}
                      >
                        Alvo: {targetPace} /km ({targetZone})
                      </div>
                    </div>
                  );
                })()}

                {/* Perfil da Sessão (Visualizador de Barras Interativo) */}
                <WorkoutSessionProfile workout={activeWorkout} />

                {/* Prescrição Detalhada das Séries */}
                <WorkoutPrescription workout={activeWorkout} />

                {/* Botões de Ação do Painel */}
                <div className="pt-2 flex flex-col gap-2.5">
                  <button 
                    onClick={handleSendGarmin}
                    disabled={isGarminPushing}
                    className="w-full h-11 sm:h-12 rounded-full bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white font-semibold text-sm flex items-center justify-center gap-2.5 shadow-sm transition-all active:scale-[0.99] disabled:opacity-75"
                  >
                    <RefreshCw className={`h-4 w-4 ${isGarminPushing ? 'animate-spin' : ''}`} />
                    <span>
                      {garminPushSuccess ? '✓ Enviado para o Garmin' : isGarminPushing ? 'Enviando...' : 'Enviar Treino para o Garmin'}
                    </span>
                  </button>

                  <button 
                    onClick={() => setIsDetailModalOpen(true)}
                    className="w-full h-11 sm:h-12 rounded-full border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-sm transition-all flex items-center justify-center gap-2"
                  >
                    <Eye className="h-4 w-4 text-slate-500" />
                    <span>Abrir Atividade Completa</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-[28px] sm:rounded-[32px] p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <CalendarIcon className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-700 mb-3" />
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">Nenhum treino selecionado</h4>
                <p className="text-xs text-slate-400 mt-1">Clique em qualquer dia com treino no calendário para ver os detalhes da série.</p>
              </div>
            )}

            {/* Card com as Zonas de Ritmo (VAM) do Aluno com as cores oficiais e dados de pace */}
            <Card className="border-slate-200 dark:border-slate-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                  Suas Zonas de Ritmo (VAM)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  { 
                    zone: 'Z1', 
                    name: 'Recuperação', 
                    pace: '> 5:45 min/km', 
                    hr: '< 154 bpm',
                    color: '#8E8E93' 
                  },
                  { 
                    zone: 'Z2', 
                    name: 'Rodagem Base', 
                    pace: '5:15 - 5:45 min/km', 
                    hr: '154 - 164 bpm',
                    color: '#007AFF' 
                  },
                  { 
                    zone: 'Z3', 
                    name: 'Ritmo Moderado', 
                    pace: '4:40 - 5:15 min/km', 
                    hr: '164 - 174 bpm',
                    color: '#34C759' 
                  },
                  { 
                    zone: 'Z4', 
                    name: 'Limiar / VAM', 
                    pace: '4:05 - 4:40 min/km', 
                    hr: '174 - 185 bpm',
                    color: '#FF9500' 
                  },
                  { 
                    zone: 'Z5', 
                    name: 'Tiros Máximos', 
                    pace: '< 4:05 min/km', 
                    hr: '185 - 195 bpm',
                    color: '#FF3B30' 
                  }
                ].map((item, i) => {
                  const hrText = athlete?.zones?.[i]?.hrRange 
                    ? (athlete.zones[i].hrRange.includes('bpm') ? athlete.zones[i].hrRange : `${athlete.zones[i].hrRange} bpm`)
                    : item.hr;

                  return (
                    <div 
                      key={i} 
                      className="flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all shadow-2xs hover:scale-[1.01]"
                      style={{ 
                        background: `${item.color}25`,
                        borderLeft: `5px solid ${item.color}` 
                      }}
                    >
                      <div className="flex-1 min-w-0 pr-2">
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                          {item.zone} • {item.name}
                        </p>
                        {hrText && (
                          <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                            {hrText}
                          </p>
                        )}
                      </div>
                      <span 
                        className="text-xs sm:text-sm font-black tabular-nums shrink-0"
                        style={{ color: item.color }}
                      >
                        {item.pace}
                      </span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* ── MODAL DE DETALHES COMPLETOS DA ATIVIDADE (Conforme Mockup Atualizado) ── */}
      {isDetailModalOpen && activeWorkout && (
        <div 
          onClick={() => setIsDetailModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-sm"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[760px] max-h-[92vh] overflow-y-auto rounded-[32px] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-[0_25px_70px_rgba(0,0,0,0.3)] p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Top Bar: Data + Tipo + Botão Fechar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-800 dark:bg-slate-200 inline-block" />
                <span>{formatModalHeaderDate(activeWorkout.date)}</span>
                <span>•</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {getModalWorkoutType(activeWorkout)}
                </span>
              </div>

              <button 
                onClick={() => setIsDetailModalOpen(false)}
                className="rounded-full p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Título & Descrição */}
            <div className="space-y-2">
              <h2 className="text-2xl sm:text-[32px] font-black tracking-tight text-slate-900 dark:text-white leading-tight">
                {activeWorkout.title}
              </h2>
              {activeWorkout.description && (
                <p className="text-sm sm:text-[15px] text-slate-500 dark:text-slate-400 leading-relaxed font-normal">
                  {activeWorkout.description}
                </p>
              )}
            </div>

            {/* Pílulas de Métricas */}
            {(() => {
              const { totalKm, baseBlocks } = expandWorkoutSegments(activeWorkout);
              const targetBlock = baseBlocks.reduce((best, b) => {
                const infoCurr = getPaceZoneInfo(b.pace, b.name, b.type);
                const infoBest = getPaceZoneInfo(best?.pace, best?.name, best?.type);
                const order = { Z5: 5, Z4: 4, Z3: 3, Z2: 2, Z1: 1 };
                if ((order[infoCurr.zone] || 1) > (order[infoBest?.zone] || 1)) return b;
                return best;
              }, baseBlocks[0]);

              const targetInfo = getPaceZoneInfo(targetBlock?.pace, targetBlock?.name, targetBlock?.type);
              const targetPace = targetInfo.paceFormatted.replace(' /km', '');
              const targetZone = targetInfo.zone;
              const targetColor = targetInfo.color;

              const distanceVal = activeWorkout.metrics?.distance 
                ? (activeWorkout.metrics.distance.includes('km') ? activeWorkout.metrics.distance : `${activeWorkout.metrics.distance} km`)
                : `${totalKm.toFixed(1)} km`;

              let durationVal = activeWorkout.metrics?.duration;
              if (!durationVal || durationVal === '--') {
                durationVal = `~${Math.round(totalKm * 5.5)} min`;
              } else {
                const cleaned = durationVal.replace('min', '').replace('m', '').trim();
                durationVal = `~${cleaned} min`;
              }

              return (
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold px-4 py-2 rounded-full">
                    Total: <span className="font-bold">{distanceVal}</span>
                  </div>

                  <div className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold px-4 py-2 rounded-full">
                    Tempo: <span className="font-bold">{durationVal}</span>
                  </div>

                  <div 
                    className="text-xs font-bold px-4 py-2 rounded-full border transition-all"
                    style={{
                      backgroundColor: `${targetColor}12`,
                      color: targetColor,
                      borderColor: `${targetColor}28`
                    }}
                  >
                    Alvo: {targetPace} /km ({targetZone})
                  </div>
                </div>
              );
            })()}

            {/* Perfil da Sessão (Visualizador de Barras Interativo) */}
            <WorkoutSessionProfile workout={activeWorkout} />

            {/* Prescrição Detalhada das Séries */}
            <WorkoutPrescription workout={activeWorkout} />

            {/* Botões de Ação do Rodapé */}
            <div className="pt-2 flex items-center gap-3">
              <button 
                onClick={handleSendGarmin}
                disabled={isGarminPushing}
                className="flex-1 h-12 rounded-full bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white font-semibold text-sm flex items-center justify-center gap-2.5 shadow-sm transition-all active:scale-[0.99] disabled:opacity-75"
              >
                <RefreshCw className={`h-4 w-4 ${isGarminPushing ? 'animate-spin' : ''}`} />
                <span>
                  {garminPushSuccess ? '✓ Enviado para o Garmin' : isGarminPushing ? 'Enviando...' : 'Enviar Treino para o Garmin'}
                </span>
              </button>

              <button 
                onClick={() => setIsDetailModalOpen(false)}
                className="h-12 px-6 rounded-full border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-sm transition-all"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
