import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Zap, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  Flame, 
  LogOut, 
  Smartphone, 
  Share2, 
  Activity,
  Layers,
  TrendingUp,
  Download,
  Eye,
  X
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { MetricCard, ProgressBar, ZoneBadge } from '../components/ui/tremor-metrics';

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const WEEK_DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

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
                      className={`min-h-[105px] p-2 transition-all duration-150 ${
                        !item.isCurrentMonth ? 'bg-slate-50/50 text-slate-300 dark:bg-slate-950/40 dark:text-slate-700' : 'bg-white dark:bg-slate-900'
                      } ${hasWorkouts ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50' : ''} ${
                        isSelected ? 'ring-2 ring-blue-500 ring-inset bg-blue-50/30 dark:bg-blue-950/20' : ''
                      }`}
                    >
                      {/* Número do Dia */}
                      <div className="flex items-center justify-between mb-1">
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

                      {/* Lista de Treinos alocados para o dia */}
                      <div className="space-y-1">
                        {item.workouts.map((w) => {
                          const badge = getWorkoutBadge(w.title || w.type);
                          const isDone = w.status === 'completed';

                          return (
                            <div
                              key={w.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedWorkout(w);
                                setIsDetailModalOpen(true);
                              }}
                              className={`group flex flex-col rounded-lg border p-1.5 text-left text-xs transition-all shadow-xs cursor-pointer ${badge.bg} hover:scale-[1.03] hover:shadow-sm`}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-bold truncate text-[11px] leading-tight">
                                  {w.title || 'Treino de Corrida'}
                                </span>
                                {isDone ? (
                                  <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-500" />
                                ) : (
                                  <Clock className="h-3 w-3 shrink-0 opacity-60" />
                                )}
                              </div>

                              {w.metrics?.distance && (
                                <span className="text-[10px] font-medium opacity-80 mt-0.5">
                                  {w.metrics.distance}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Legenda de Tipos de Treino */}
            <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white p-3 text-xs dark:border-slate-800 dark:bg-slate-900">
              <span className="font-bold text-slate-500 dark:text-slate-400">Legenda:</span>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-cyan-500" />
                <span className="text-slate-600 dark:text-slate-300 font-medium">Tiros / Intervalados VAM</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span className="text-slate-600 dark:text-slate-300 font-medium">Rodagem / Base</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
                <span className="text-slate-600 dark:text-slate-300 font-medium">Ritmo / Progressivo</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                <span className="text-slate-600 dark:text-slate-300 font-medium">Regenerativo</span>
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
                  {/* Bloco de Séries de Tiros / Estrutura */}
                  {(() => {
                    const blocks = activeWorkout.structured_blocks || activeWorkout.metrics?.structured_blocks || activeWorkout.metrics?.structured_steps || [];
                    return blocks.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Estrutura do Treino
                        </p>
                        <div className="space-y-1.5">
                          {blocks.map((b, i) => (
                            <div 
                              key={i} 
                              className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5 text-xs dark:bg-slate-800/60"
                            >
                              <div className="flex items-center gap-2">
                                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-blue-600/10 text-[10px] font-bold text-blue-600 dark:text-blue-400">
                                  {i + 1}
                                </span>
                                <div>
                                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                                    {b.name || b.type || 'Série'}
                                  </p>
                                  {b.pace && (
                                    <p className="text-[10px] text-slate-400 font-medium">
                                      Ritmo: {b.pace}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <span className="font-bold text-slate-900 dark:text-white">
                                {b.distance || b.duration || '--'}
                              </span>
                            </div>
                          ))}
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
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Distância Total</p>
                <p className="text-xl font-black text-slate-900 dark:text-white mt-1">
                  {activeWorkout.metrics?.distance || '--'}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tempo Estimado</p>
                <p className="text-xl font-black text-slate-900 dark:text-white mt-1">
                  {activeWorkout.metrics?.duration || '--'}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50 col-span-2 sm:col-span-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Ritmo Alvo (100% VAM)</p>
                <p className="text-xl font-black text-cyan-600 dark:text-cyan-400 mt-1">
                  3:45 min/km
                </p>
              </div>
            </div>

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
                    {blocks.map((b, i) => (
                      <div 
                        key={i} 
                        className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5 text-xs dark:border-slate-800 dark:bg-slate-800/50"
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-600 text-xs font-black text-white shadow-xs">
                            {i + 1}
                          </span>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white text-sm">
                              {b.name || b.type || 'Série'}
                            </p>
                            {b.pace && (
                              <p className="text-xs text-cyan-600 dark:text-cyan-400 font-semibold mt-0.5">
                                Ritmo sugerido: {b.pace}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                          {b.distance || b.duration || '--'}
                        </span>
                      </div>
                    ))}
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
