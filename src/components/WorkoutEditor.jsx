import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Maximize2, X, Paperclip, Plus, FileText, 
  BarChart2, Heart, Zap, Clock, RefreshCw, Trash2
} from 'lucide-react';
import { supabase } from '../lib/supabase';

// --- Custom SVG Icons based on user designer ---
const Icons = {
  Corrida: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2"><path d="M19 10c-1.5 0-2.5-.5-3.5-1.5L12 5c-1-1-2-1-3 0L7 7" /><path d="M6 12L3 15" /><path d="M14 15l2 3 4-1" /><path d="M12 18l-3 3-4-1" /><circle cx="15" cy="5" r="1.5" /></svg>,
  Nadar: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2"><path d="M2 12h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M22 12h.01M2 16h.01M6 16h.01M10 16h.01M14 16h.01M18 16h.01M22 16h.01"/></svg>,
  Bicicleta: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c084fc" strokeWidth="2"><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6a1 1 0 100-2 1 1 0 000 2zm-3 11.5V14l-3-3 4-3 2 3h2"/></svg>,
  Caminhar: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2"><path d="M13 4v16M17 4v16M9 4v16M5 4v16"/></svg>,
  BikeMontanha: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a16207" strokeWidth="2"><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6a1 1 0 100-2 1 1 0 000 2zm-3 11.5V14l-3-3 4-3 2 3h2"/></svg>,
  XCSki: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2"><path d="M4 20l16-16M4 4l16 16"/></svg>,
  Remo: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2"><path d="M2 12h20M12 2l-4 10h8L12 2z"/></svg>,
  Tijolo: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#991b1b" strokeWidth="2"><rect x="3" y="8" width="18" height="8" rx="1"/></svg>,
  TreinoCruzado: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#be185d" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,
  Folga: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><rect x="2" y="8" width="20" height="8" rx="2"/></svg>,
  Forca: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2"><path d="M6 5v14M18 5v14M2 9h4M18 9h4M2 15h4M18 15h4"/></svg>,
  Personalizado: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d946ef" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>,
  Outro: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
};

// Custom outside click hook
const useOutsideClick = (ref, callback) => {
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        callback();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [ref, callback]);
};

// Dropdown CustomSelect component
const CustomSelect = ({ options, value, onChange, width = 'w-[230px]', label }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  useOutsideClick(dropdownRef, () => setIsOpen(false));

  return (
    <div className={`relative ${width}`} ref={dropdownRef}>
      <div 
        className={`flex items-center justify-between bg-[#f8f9fa] border rounded-[3px] px-2 py-[3px] text-[13px] text-gray-800 cursor-pointer shadow-sm select-none
          ${isOpen ? 'border-[#3b82f6] ring-[0.5px] ring-[#3b82f6]' : 'border-gray-300 hover:border-gray-400'}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="truncate">{label || value}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="#1a73e8" className="ml-1 shrink-0"><polygon points="0,0 24,0 12,12" /></svg>
      </div>
      
      {isOpen && (
        <div className="absolute top-[100%] left-0 w-full mt-[1px] bg-white border border-gray-400 shadow-lg z-[99999] py-1 rounded-[3px] max-h-[220px] overflow-y-auto">
          {options.map((opt) => (
            <div 
              key={opt}
              className={`px-3 py-[4px] text-[13px] cursor-pointer select-none
                ${value === opt ? 'bg-[#1a73e8] text-white' : 'text-gray-800 hover:bg-[#e8f0fe]'}`}
              onClick={() => { onChange(opt); setIsOpen(false); }}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const TooltipBlock = ({ children, text }) => (
  <div className="relative group w-full h-full">
    {children}
    <div className="absolute top-[110%] left-1/2 -translate-x-1/2 hidden group-hover:block bg-[#333] text-white text-[11px] px-2 py-1 rounded whitespace-nowrap z-50">
      {text}
    </div>
  </div>
);

const ScrollArrow = ({ direction }) => (
  <div className={`w-0 h-0 border-l-[4px] border-r-[4px] border-transparent
    ${direction === 'up' ? 'border-b-[5px] border-b-gray-500 mb-1' : 'border-t-[5px] border-t-gray-500 mt-1'}`} 
  />
);

const uid = () => `s_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;

const makeStep = (overrides = {}) => ({
  id: uid(),
  type: 'Trabalho',
  name: 'Ativo',
  durationType: 'Distância',
  durationValue: '8.00',
  durationUnit: 'km',
  targetType: 'Intervalo',
  intensityLow: '1',
  intensityHigh: '8',
  intensityUnit: 'RPE',
  hasCadence: false,
  notes: '',
  ...overrides
});

const fmtTime = (totalSecs) => {
  if (!totalSecs || isNaN(totalSecs)) return '--:--:--';
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = Math.floor(totalSecs % 60);
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
};

const WorkoutEditor = ({ workout, athleteId, date, athleteVam, onClose, onSaved, onDeleted }) => {
  const isNew = !workout?.id;

  const [title, setTitle] = useState(workout?.title || 'Novo Treino da Biblioteca');
  const [activity, setActivity] = useState(workout?.type || 'Corrida');
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const activityRef = useRef(null);
  useOutsideClick(activityRef, () => setIsActivityOpen(false));

  const [intensityUnit, setIntensityUnit] = useState('Classificação do Esforço Percebido');
  const [distanceUnit, setDistanceUnit] = useState('km');
  const [intervalType, setIntervalType] = useState('Intervalo');

  // Workout steps state
  const [steps, setSteps] = useState(() => {
    const raw = workout?.structured_steps || workout?.metrics?.structured_steps;
    if (raw && Array.isArray(raw) && raw.length > 0) return raw;
    return [
      makeStep({ type: 'Aquecimento', name: 'Aquecimento', durationValue: '10.00', durationType: 'Duração', durationUnit: 'min', intensityLow: '1', intensityHigh: '3' }),
      makeStep({ type: 'Trabalho', name: 'Ativo', durationValue: '8.00', durationType: 'Distância', durationUnit: 'km', intensityLow: '4', intensityHigh: '7' }),
      makeStep({ type: 'Esfriar', name: 'Desaquecimento', durationValue: '10.00', durationType: 'Duração', durationUnit: 'min', intensityLow: '1', intensityHigh: '3' })
    ];
  });
  const [selectedStepId, setSelectedStepId] = useState(steps[1]?.id || steps[0]?.id || null);
  const [showHelpPopover, setShowHelpPopover] = useState(false);
  const [preActivity, setPreActivity] = useState(workout?.pre_activity || '');
  const [tags, setTags] = useState(workout?.tags || []);
  const [autoCalc, setAutoCalc] = useState(true);
  const [plannedData, setPlannedData] = useState({
    duration: workout?.metrics?.duration || '',
    distance: workout?.metrics?.distance || '',
    avgPace: workout?.metrics?.avg_pace || '',
    calories: workout?.metrics?.calories || '',
    elevGain: workout?.metrics?.elev_gain || '',
    tss: workout?.metrics?.tss || '',
    if: workout?.metrics?.if || '',
    elevLoss: workout?.metrics?.elev_loss || '',
    work: workout?.metrics?.work || ''
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const addStep = (type = 'Trabalho') => {
    const newStep = makeStep({
      type: type,
      name: type === 'Trabalho' ? 'Ativo' : type === 'Aquecimento' ? 'Aquecimento' : type === 'Recuperar' ? 'Recuperação' : type === 'Esfriar' ? 'Desaquecimento' : type,
      durationValue: type === 'Aquecimento' || type === 'Esfriar' ? '10.00' : '8.00',
      durationType: type === 'Aquecimento' || type === 'Esfriar' ? 'Duração' : 'Distância',
      durationUnit: type === 'Aquecimento' || type === 'Esfriar' ? 'min' : 'km',
      intensityLow: '1',
      intensityHigh: '8'
    });
    setSteps([...steps, newStep]);
    setSelectedStepId(newStep.id);
  };

  const updateSelectedStep = (key, value) => {
    setSteps(steps.map(step => step.id === selectedStepId ? { ...step, [key]: value } : step));
  };

  const removeSelectedStep = () => {
    const newSteps = steps.filter(s => s.id !== selectedStepId);
    setSteps(newSteps);
    setSelectedStepId(newSteps.length > 0 ? newSteps[newSteps.length - 1].id : null);
  };

  const clearSteps = () => {
    setSteps([]);
    setSelectedStepId(null);
  };

  const handleFieldChange = (field, val) => {
    setPlannedData(prev => ({ ...prev, [field]: val }));
  };

  const selectedStep = steps.find(s => s.id === selectedStepId);

  // Totals calculations
  const totalSecs = steps.reduce((acc, s) => {
    if (s.durationType === 'Duração') {
      const val = parseFloat(s.durationValue) || 0;
      if (s.durationUnit === 'min') return acc + val * 60;
      if (s.durationUnit === 'h') return acc + val * 3600;
      return acc + val;
    }
    // distance defaults estimate (e.g. 5 min per km)
    const val = parseFloat(s.durationValue) || 0;
    const factor = s.durationUnit === 'm' ? 0.3 : 300;
    return acc + val * factor;
  }, 0);

  const totalKm = steps.reduce((acc, s) => {
    if (s.durationType === 'Distância') {
      const val = parseFloat(s.durationValue) || 0;
      if (s.durationUnit === 'm') return acc + val / 1000;
      return acc + val;
    }
    // time defaults estimate (e.g. 12 km/h)
    const val = parseFloat(s.durationValue) || 0;
    if (s.durationUnit === 'min') return acc + (val / 60) * 12;
    return acc;
  }, 0);

  const buildDesc = () => steps.map(s => {
    const valStr = `${s.durationValue} ${s.durationUnit || 'min'}`;
    const intStr = s.intensityLow ? ` @ RPE ${s.intensityLow}-${s.intensityHigh}` : '';
    return `${s.name}: ${valStr}${intStr}`;
  }).join('\n');

  const handleSave = async () => {
    setSaving(true); setError(null);
    try {
      const payload = {
        athlete_id: athleteId,
        title: title.trim() || 'Treino',
        type: activity,
        description: buildDesc(),
        status: workout?.status || 'pending',
        structured_steps: steps,
        pre_activity: preActivity,
        tags,
        metrics: {
          distance: autoCalc && totalKm > 0 ? `${totalKm.toFixed(2)} km` : (plannedData.distance || '--'),
          duration: autoCalc && totalSecs > 0 ? fmtTime(totalSecs) : (plannedData.duration || '--'),
          avg_pace: plannedData.avgPace || '--',
          calories: plannedData.calories || '--',
          elev_gain: plannedData.elevGain || '--',
          elev_loss: plannedData.elevLoss || '--',
          work: plannedData.work || '--',
          tss: plannedData.tss || '--',
          if: plannedData.if || '--',
        },
      };
      if (isNew) {
        payload.date = date;
        const { error: err } = await supabase.from('workouts').insert([payload]);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from('workouts').update(payload).eq('id', workout.id);
        if (err) throw err;
      }
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!workout?.id) { onClose(); return; }
    if (!confirm('Excluir este treino permanentemente?')) return;
    setDeleting(true);
    try {
      const { error: err } = await supabase.from('workouts').delete().eq('id', workout.id);
      if (err) throw err;
      onDeleted?.(); onClose();
    } catch (err) {
      setError(err.message); setDeleting(false);
    }
  };

  const activitiesList = [
    { name: 'Corrida', icon: Icons.Corrida },
    { name: 'Nadar', icon: Icons.Nadar },
    { name: 'Bicicleta', icon: Icons.Bicicleta },
    { name: 'Caminhar', icon: Icons.Caminhar },
    { name: 'Bike de Montanha', icon: Icons.BikeMontanha },
    { name: 'XC-Ski', icon: Icons.XCSki },
    { name: 'Remo', icon: Icons.Remo },
    { name: 'Tijolo', icon: Icons.Tijolo },
    { name: 'Treino cruzado', icon: Icons.TreinoCruzado },
    { name: 'Folga', icon: Icons.Folga },
    { name: 'Força', icon: Icons.Forca },
    { name: 'Personalizado', icon: Icons.Personalizado },
    { name: 'Outro', icon: Icons.Outro }
  ];

  const CurrentActivityIcon = activitiesList.find(a => a.name === activity)?.icon || Icons.Corrida;

  return createPortal(
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-[4px] z-[20000] flex items-center justify-center p-3 overflow-hidden font-sans text-gray-800"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.98, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.98, y: 10 }}
        className="bg-white w-full max-w-[1300px] h-[96vh] max-h-[920px] rounded-[10px] shadow-2xl flex flex-col overflow-hidden border border-gray-300"
        onClick={e => e.stopPropagation()}
      >
        
        {/* CABEÇALHO */}
        <div className="flex items-stretch border-b border-gray-200 shrink-0 min-h-[90px]">
          
          {/* Esquerda: Nome e Seletor de Atividade */}
          <div className="flex flex-col justify-center gap-2 w-[35%] px-5 py-2">
            <div className="border border-gray-300 rounded-[6px] px-2 py-1 shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] w-full max-w-[340px]">
              <input 
                type="text" 
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Título do Treino"
                className="w-full outline-none font-bold text-gray-800 text-[14px] bg-transparent"
              />
            </div>
            
            <div className="flex items-center gap-6 mt-1">
              {/* Custom Activity Dropdown */}
              <div className="relative flex flex-col items-center group" ref={activityRef}>
                <div 
                  className="flex items-center gap-1 cursor-pointer select-none"
                  onClick={() => setIsActivityOpen(!isActivityOpen)}
                >
                  <CurrentActivityIcon />
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="#4b5563" className="mt-1"><polygon points="0,0 24,0 12,12" /></svg>
                </div>
                <span className="text-[12px] font-bold text-gray-700 mt-1">{activity}</span>
                
                {isActivityOpen && (
                  <div className="absolute top-[105%] left-[-20px] w-[280px] bg-white border border-gray-300 shadow-[0_4px_16px_rgba(0,0,0,0.2)] z-[99999] rounded-[8px] py-2">
                    <div className="text-[14px] font-bold text-gray-900 px-4 mb-2">Selecionar Tipo de Atividade</div>
                    
                    <div className="relative mx-3 mb-1">
                       <div className="absolute top-[-8px] left-2 bg-white px-1 text-[#1a73e8] text-[11px] font-medium z-10">Tipo de Atividade</div>
                       <div className="border border-[#1a73e8] rounded-[4px] p-2 flex items-center justify-between cursor-pointer bg-[#f8f9fa]" onClick={() => setIsActivityOpen(false)}>
                         <div className="flex items-center gap-3">
                           <CurrentActivityIcon />
                           <span className="text-[14px] text-gray-800">{activity}</span>
                         </div>
                         <svg width="10" height="10" viewBox="0 0 24 24" fill="#4b5563" className="rotate-180"><polygon points="0,0 24,0 12,12" /></svg>
                       </div>
                    </div>

                    <div className="max-h-[220px] overflow-y-auto mt-1 custom-scrollbar">
                      {activitiesList.map((act) => {
                        const Icon = act.icon;
                        return (
                          <div 
                            key={act.name}
                            className={`flex items-center gap-3 px-5 py-2 text-[14px] cursor-pointer 
                              ${activity === act.name ? 'bg-[#e8f0fe] text-gray-900' : 'text-gray-700 hover:bg-gray-100'}`}
                            onClick={() => { setActivity(act.name); setIsActivityOpen(false); }}
                          >
                            <Icon />
                            <span>{act.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex gap-8 items-baseline">
                <div className="text-[20px] font-bold tracking-tight text-gray-800">
                  {autoCalc && totalSecs > 0 ? fmtTime(totalSecs) : (plannedData.duration || '--:--:--')}
                </div>
                <div className="text-[20px] font-bold tracking-tight text-gray-800">
                  {autoCalc ? totalKm.toFixed(2) : (plannedData.distance || '--')} 
                  <span className="text-[14px] font-bold text-gray-800 ml-0.5">km</span>
                </div>
                <div className="text-[20px] font-bold tracking-tight text-gray-800">
                  {plannedData.tss || '--'} 
                  <span className="text-[14px] font-bold text-gray-800 ml-0.5">TSS</span>
                </div>
              </div>
            </div>
          </div>

          {/* Centro: Blocos Criadores */}
          <div className="flex flex-col justify-center pl-6 pr-4 border-l border-gray-200">
            <div className="flex items-center gap-1 text-[11px] text-gray-600 mb-1.5 relative">
              <span>Clique ou arraste blocos<br/>para criar treino</span>
              <div 
                className="bg-gray-400 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center text-[10px] cursor-pointer ml-1 hover:bg-gray-500"
                onClick={() => setShowHelpPopover(!showHelpPopover)}
              >
                ?
              </div>
              
              {/* Popover de Ajuda Exato */}
              {showHelpPopover && (
                <div className="absolute top-[-10px] left-[100%] ml-3 w-[300px] bg-white border border-gray-200 shadow-[0_4px_16px_rgba(0,0,0,0.15)] p-3 rounded-[4px] z-50 text-[13px] text-gray-700 leading-relaxed font-normal">
                  <button className="absolute top-2 right-2 text-gray-300 hover:text-gray-500 transition-colors" onClick={() => setShowHelpPopover(false)}>
                    <X size={16}/>
                  </button>
                  Use estes blocos para começar, depois ajuste a duração, distância e intensidade com base no seu treino específico e metodologia de treinamento.
                  <div className="absolute top-[14px] left-[-6px] w-3 h-3 bg-white border-l border-b border-gray-200 transform rotate-45"></div>
                </div>
              )}
            </div>
            <div className="grid grid-cols-4 gap-x-1.5 gap-y-1 w-[160px]">
              <TooltipBlock text="Aquecimento"><div className="w-full h-[18px] bg-[#d5e0ee] border-b-[4px] border-[#a5bed9] rounded-[1px] cursor-pointer hover:opacity-80" onClick={() => addStep('Aquecimento')}></div></TooltipBlock>
              <TooltipBlock text="Ativo"><div className="w-full h-[18px] bg-[#0c3886] rounded-[1px] cursor-pointer hover:opacity-80" onClick={() => addStep('Trabalho')}></div></TooltipBlock>
              <TooltipBlock text="Recuperação"><div className="w-full h-[18px] bg-[#d5e0ee] rounded-[1px] cursor-pointer flex hover:opacity-80" onClick={() => addStep('Recuperar')}><div className="w-1/2 bg-[#0c3886] h-full border-b-[4px] border-[#0a2e6e]"></div></div></TooltipBlock>
              <TooltipBlock text="Esfriar"><div className="w-full h-[18px] bg-[#0c3886] border-b-[4px] border-[#0a2e6e] rounded-[1px] cursor-pointer flex flex-col justify-end hover:opacity-80" onClick={() => addStep('Esfriar')}><div className="h-[40%] bg-[#d5e0ee] w-full"></div></div></TooltipBlock>
              <TooltipBlock text="Repetições 1"><div className="w-full h-[18px] bg-[#0c3886] border-b-[4px] border-[#0a2e6e] rounded-[1px] cursor-pointer flex gap-[1px] p-[1px] items-end hover:opacity-80" onClick={() => addStep('Trabalho')}><div className="w-full bg-[#d5e0ee] h-[40%]"></div><div className="w-full bg-[#d5e0ee] h-[70%]"></div><div className="w-full bg-[#d5e0ee] h-full"></div></div></TooltipBlock>
              <TooltipBlock text="Repetições 2"><div className="w-full h-[18px] bg-[#0c3886] border-b-[4px] border-[#0a2e6e] rounded-[1px] cursor-pointer flex gap-[1px] p-[1px] items-end hover:opacity-80" onClick={() => addStep('Trabalho')}><div className="w-full bg-[#d5e0ee] h-full"></div><div className="w-full bg-[#d5e0ee] h-[70%]"></div><div className="w-full bg-[#d5e0ee] h-[40%]"></div></div></TooltipBlock>
              <TooltipBlock text="Crescente"><div className="w-full h-[18px] bg-[#0c3886] border-b-[4px] border-[#0a2e6e] rounded-[1px] cursor-pointer flex gap-[1px] p-[1px] items-end hover:opacity-80" onClick={() => addStep('Trabalho')}><div className="w-full bg-[#d5e0ee] h-[30%]"></div><div className="w-full bg-[#d5e0ee] h-[50%]"></div><div className="w-full bg-[#d5e0ee] h-[70%]"></div><div className="w-full bg-[#d5e0ee] h-full"></div></div></TooltipBlock>
              <TooltipBlock text="Decrescente"><div className="w-full h-[18px] bg-[#0c3886] border-b-[4px] border-[#0a2e6e] rounded-[1px] cursor-pointer flex gap-[1px] p-[1px] items-end hover:opacity-80" onClick={() => addStep('Trabalho')}><div className="w-full bg-[#d5e0ee] h-full"></div><div className="w-full bg-[#d5e0ee] h-[70%]"></div><div className="w-full bg-[#d5e0ee] h-[50%]"></div><div className="w-full bg-[#d5e0ee] h-[30%]"></div></div></TooltipBlock>
            </div>
          </div>

          {/* Direita: Dropdowns de Unidades */}
          <div className="flex flex-col justify-center flex-grow pl-6 pr-4">
            <span className="text-[12px] font-bold text-gray-900 mb-1">Units</span>
            <div className="flex gap-2">
              <CustomSelect 
                label={intensityUnit === 'Classificação do Esforço Percebido' ? 'Classificação do Esforço Pe...' : intensityUnit}
                options={[
                  "% Potência Limiar Funcional", 
                  "% Frequência Cardíaca Máxima", 
                  "% Frequência Cardíaca Limite", 
                  "% Ritmo Limite", 
                  "Classificação do Esforço Percebido"
                ]} 
                value={intensityUnit} 
                onChange={setIntensityUnit} 
                width="w-[230px]"
              />
              <CustomSelect 
                options={["mi", "m", "km", "yds"]} 
                value={distanceUnit} 
                onChange={setDistanceUnit} 
                width="w-[70px]"
              />
            </div>
            <div className="flex gap-4 mt-2 items-center">
              <CustomSelect 
                label={intervalType === 'Intervalo' ? 'Interv' : intervalType}
                options={["Intervalo", "Alvo"]} 
                value={intervalType} 
                onChange={setIntervalType} 
                width="w-[90px]"
              />
              <button className="text-[#1a73e8] text-[13px] hover:underline cursor-pointer bg-transparent border-none outline-none" onClick={clearSteps}>Limpar Blocos</button>
            </div>
          </div>

          {/* Controlos Topo Direita */}
          <div className="flex gap-3 text-gray-600 p-4 shrink-0">
            <Maximize2 size={16} className="cursor-pointer hover:text-gray-900" />
            <X size={20} className="cursor-pointer hover:text-gray-900" onClick={onClose} />
          </div>

        </div>

        {/* SECÇÃO DO GRÁFICO E PREVIEW */}
        <div className="relative h-[220px] w-full bg-[#06071a] flex flex-col shrink-0 overflow-hidden z-0">
          {steps.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20">
              <span className="text-[15px] text-gray-400 font-normal tracking-wide">
                Clique nos blocos acima ou arraste-os aqui para começar a montar seu treino.
              </span>
            </div>
          ) : (
            <div className="text-[11px] text-white/80 px-[40px] py-2 absolute z-10 font-bold bg-black/40 w-full border-b border-white/5">
              {selectedStep ? `${selectedStep.name}: ${selectedStep.durationValue} ${selectedStep.durationUnit} @ RPE ${selectedStep.intensityLow}-${selectedStep.intensityHigh}` : ''}
            </div>
          )}

          <div className="flex-grow relative ml-[50px] mr-[30px] mt-[40px] mb-6">
            {/* Gridlines */}
            <div className="absolute -left-9 top-0 h-full flex flex-col justify-between text-[11px] text-white/30 items-end pr-2 w-8 pb-5">
              <span>10</span><span>8</span><span>5</span><span>3</span>
            </div>
            
            {/* Visual Bars based on real steps */}
            <div className="absolute bottom-0 left-0 right-0 h-[70%] flex items-end gap-1.5 z-10 px-1">
              {steps.map((s, idx) => {
                const isSelected = selectedStepId === s.id;
                const low = parseInt(s.intensityLow) || 1;
                const high = parseInt(s.intensityHigh) || 8;
                const avg = (low + high) / 2;
                const heightPct = (avg / 10) * 100;
                
                let barColor = '#0b5394';
                if (s.type === 'Aquecimento') barColor = '#a5bed9';
                if (s.type === 'Esfriar') barColor = '#8faadc';
                if (s.type === 'Recuperar') barColor = '#c9daf8';

                return (
                  <div 
                    key={s.id} 
                    onClick={() => setSelectedStepId(s.id)}
                    style={{
                      height: `${heightPct}%`,
                      backgroundColor: barColor,
                      flex: parseFloat(s.durationValue) || 1,
                      minWidth: '20px',
                      transition: 'all 0.15s'
                    }}
                    className={`cursor-pointer rounded-t-[2px] hover:brightness-110 relative border-t-4 border-[#073763]
                      ${isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-[#06071a]' : ''}`}
                  >
                    <span className="absolute -top-6 left-1 text-[10px] text-white/60 truncate max-w-full font-semibold">{s.name}</span>
                  </div>
                );
              })}
            </div>

            {/* X-Axis */}
            <div className="absolute -bottom-6 left-0 w-full flex justify-between text-[10px] text-white/30">
              <span>0</span><span>0.25</span><span>0.50</span><span>0.75</span><span>1.00</span>
              <span>1.25</span><span>1.50</span><span>1.75</span><span>2.00</span><span>2.25</span>
              <span>2.50</span><span>2.75</span><span>3.00</span><span>3.25</span><span>3.50</span>
              <span>3.75</span><span>4.00</span><span>4.25</span><span>4.50</span><span>4.75</span>
            </div>
          </div>
        </div>

        {/* SECÇÃO INFERIOR: DETALHES & EDITOR */}
        <div className="flex flex-grow bg-white overflow-hidden">
          
          {/* Coluna 1: Tabela de Estatísticas */}
          <div className="w-[28%] min-w-[280px] p-4 pt-5 overflow-y-auto border-r border-gray-200 relative flex flex-col">
             <div className="grid grid-cols-[1fr_75px_75px_40px] gap-x-2 gap-y-[5px] text-[12px] items-center">
                <div></div>
                <div className="text-center text-gray-700 border-b border-gray-200 pb-1 mb-1 font-semibold">Planejado</div>
                <div className="text-center text-gray-700 border-b border-gray-200 pb-1 mb-1 font-semibold">Concluído</div>
                <div></div>

                <div className="text-right text-gray-700 pr-1">Duração</div>
                <input 
                  type="text" 
                  value={autoCalc && totalSecs > 0 ? fmtTime(totalSecs) : (plannedData.duration || '')}
                  onChange={e => handleFieldChange('duration', e.target.value)}
                  disabled={autoCalc}
                  className="border border-gray-200 rounded-[2px] px-1 py-[3px] text-center bg-white h-[26px] shadow-sm focus:outline-blue-400 disabled:bg-[#f3f4f6]" 
                />
                <div className="bg-[#f3f4f6] rounded-[2px] px-1 py-[3px] h-[26px]"></div>
                <div className="text-gray-700 pl-1 text-[12px]">h:m:s</div>

                <div className="text-right text-gray-700 pr-1">Distância</div>
                <input 
                  type="text" 
                  value={autoCalc ? totalKm.toFixed(2) : (plannedData.distance || '')}
                  onChange={e => handleFieldChange('distance', e.target.value)}
                  disabled={autoCalc}
                  className="border border-gray-200 rounded-[2px] px-1 py-[3px] text-center bg-white h-[26px] shadow-sm focus:outline-blue-400 disabled:bg-[#f3f4f6]" 
                />
                <div className="bg-[#f3f4f6] rounded-[2px] px-1 py-[3px] h-[26px]"></div>
                <div className="text-gray-700 pl-1 text-[12px] flex items-center">km <svg width="8" height="8" viewBox="0 0 24 24" fill="#6b7280" className="ml-1"><polygon points="0,0 24,0 12,12" /></svg></div>

                <div className="text-right text-gray-700 pr-1">Ritmo Médio</div>
                <input 
                  type="text" 
                  value={plannedData.avgPace}
                  onChange={e => handleFieldChange('avgPace', e.target.value)}
                  className="border border-gray-200 rounded-[2px] px-1 py-[3px] text-center bg-white h-[26px] shadow-sm focus:outline-blue-400" 
                />
                <div className="bg-[#f3f4f6] rounded-[2px] px-1 py-[3px] h-[26px]"></div>
                <div className="text-gray-700 pl-1 text-[12px]">min/km</div>

                <div className="text-right text-gray-700 pr-1">Calorias</div>
                <input 
                  type="text" 
                  value={plannedData.calories}
                  onChange={e => handleFieldChange('calories', e.target.value)}
                  className="border border-gray-200 rounded-[2px] px-1 py-[3px] text-center bg-white h-[26px] shadow-sm focus:outline-blue-400" 
                />
                <div className="bg-[#f3f4f6] rounded-[2px] px-1 py-[3px] h-[26px]"></div>
                <div className="text-gray-700 pl-1 text-[12px]">kcal</div>

                <div className="text-right text-gray-700 pr-1 leading-[1.1] mt-1">Ganho de<br/>Elevação</div>
                <input 
                  type="text" 
                  value={plannedData.elevGain}
                  onChange={e => handleFieldChange('elevGain', e.target.value)}
                  className="border border-gray-200 rounded-[2px] px-1 py-[3px] text-center bg-white h-[26px] mt-1 shadow-sm focus:outline-blue-400" 
                />
                <div className="bg-[#f3f4f6] rounded-[2px] px-1 py-[3px] h-[26px] mt-1"></div>
                <div className="text-gray-700 pl-1 text-[12px] mt-1">m</div>

                <div className="text-right text-gray-700 pr-1 mt-1">TSS</div>
                <input 
                  type="text" 
                  value={plannedData.tss}
                  onChange={e => handleFieldChange('tss', e.target.value)}
                  className="border border-gray-200 rounded-[2px] px-1 py-[3px] text-center bg-white h-[26px] mt-1 shadow-sm focus:outline-blue-400" 
                />
                <div className="bg-[#f3f4f6] rounded-[2px] px-1 py-[3px] h-[26px] mt-1"></div>
                <div className="text-gray-700 pl-1 text-[12px] mt-1">TSS</div>

                <div className="text-right text-gray-700 pr-1">IF</div>
                <input 
                  type="text" 
                  value={plannedData.if}
                  onChange={e => handleFieldChange('if', e.target.value)}
                  className="border border-gray-200 rounded-[2px] px-1 py-[3px] text-center bg-white h-[26px] shadow-sm focus:outline-blue-400" 
                />
                <div className="bg-[#f3f4f6] rounded-[2px] px-1 py-[3px] h-[26px]"></div>
                <div className="text-gray-700 pl-1 text-[12px]">IF</div>

                <div className="text-right text-gray-700 pr-1 leading-[1.1] mt-1">Perda de<br/>Elevação</div>
                <input 
                  type="text" 
                  value={plannedData.elevLoss}
                  onChange={e => handleFieldChange('elevLoss', e.target.value)}
                  className="border border-gray-200 rounded-[2px] px-1 py-[3px] text-center bg-white h-[26px] mt-1 shadow-sm focus:outline-blue-400" 
                />
                <div className="bg-[#f3f4f6] rounded-[2px] px-1 py-[3px] h-[26px] mt-1"></div>
                <div className="text-gray-700 pl-1 text-[12px] mt-1">m</div>

                <div className="text-right text-gray-700 pr-1 mt-1">Trabalho</div>
                <input 
                  type="text" 
                  value={plannedData.work}
                  onChange={e => handleFieldChange('work', e.target.value)}
                  className="border border-gray-200 rounded-[2px] px-1 py-[3px] text-center bg-white h-[26px] mt-1 shadow-sm focus:outline-blue-400" 
                />
                <div className="bg-[#f3f4f6] rounded-[2px] px-1 py-[3px] h-[26px] mt-1"></div>
                <div className="text-gray-700 pl-1 text-[12px] mt-1">kJ</div>
             </div>

             <div className="mt-5 pt-4 border-t border-gray-200 grid grid-cols-[1fr_45px_45px_45px_40px] gap-x-2 gap-y-[6px] text-[13px] items-center pr-2">
                <div></div>
                <div className="text-center text-[#0b5394] font-medium">Mín</div>
                <div className="text-center text-[#0b5394] font-medium">Média</div>
                <div className="text-center text-[#0b5394] font-medium">Max</div>
                <div></div>

                <div className="text-right text-gray-400 pr-1">Ritmo</div>
                <div className="bg-[#f0f2f5] border border-gray-200 rounded-[3px] px-1 py-[3px] h-[24px]"></div>
                <div className="bg-[#f0f2f5] border border-gray-200 rounded-[3px] px-1 py-[3px] h-[24px]"></div>
                <div className="bg-[#f0f2f5] border border-gray-200 rounded-[3px] px-1 py-[3px] h-[24px]"></div>
                <div className="text-gray-400 pl-1 text-[12px]">min/km</div>

                <div className="text-right text-gray-400 pr-1 leading-[1.1] mt-1 text-[12px]">Frequência<br/>Cardíaca</div>
                <div className="bg-[#f0f2f5] border border-gray-200 rounded-[3px] px-1 py-[3px] h-[24px] mt-1"></div>
                <div className="bg-[#f0f2f5] border border-gray-200 rounded-[3px] px-1 py-[3px] h-[24px] mt-1"></div>
                <div className="bg-[#f0f2f5] border border-gray-200 rounded-[3px] px-1 py-[3px] h-[24px] mt-1"></div>
                <div className="text-gray-400 pl-1 text-[12px] mt-1">bpm</div>
             </div>
             
             {/* Ícone de seta "▼" no canto inferior esquerdo */}
             <div className="mt-auto pt-6 flex justify-start">
                <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[7px] border-t-gray-500"></div>
             </div>
          </div>

          {/* Coluna 2: Descrições e Tags */}
          <div className="w-[22%] min-w-[200px] p-5 flex flex-col gap-6 bg-white z-0 overflow-y-auto border-r border-gray-200">
             <div>
               <div className="flex justify-between items-center mb-1.5">
                 <label className="text-[13px] text-[#333333]">Descrição do Treino</label>
                 <Paperclip size={16} className="text-gray-500 cursor-pointer" />
               </div>
               <textarea 
                 value={preActivity}
                 onChange={e => setPreActivity(e.target.value)}
                 placeholder="Instruções e metas para a atividade..."
                 className="w-full border border-gray-200 rounded-[6px] bg-[#f3f4f6] p-2 text-[13px] h-[78px] resize-none focus:bg-white focus:outline-none focus:border-blue-400 shadow-inner" 
               />
             </div>
             
             {steps.length > 0 && (
               <div>
                 <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wide border-b border-gray-200 pb-1.5 mb-2 block w-full">Etapas Estruturadas</label>
                 <div className="flex flex-col gap-1 mt-1 max-h-[220px] overflow-y-auto">
                   {steps.map((step) => (
                      <div 
                        key={step.id} 
                        className={`pl-2 pr-2 flex flex-col py-1.5 mt-0.5 cursor-pointer rounded-[3px] border ${selectedStepId === step.id ? 'bg-[#f3f4f6] border-gray-300' : 'border-transparent hover:bg-gray-50'}`}
                        onClick={() => setSelectedStepId(step.id)}
                      >
                         <div className="text-[12px] font-bold text-gray-800">{step.name}</div>
                         <div className="text-[11px] text-gray-600 leading-tight mt-0.5">
                           {step.durationValue} {step.durationUnit} @ RPE {step.intensityLow}-{step.intensityHigh}
                         </div>
                      </div>
                   ))}
                 </div>
               </div>
             )}

             <div className="mt-auto">
               <div className="flex justify-between items-center border-b border-gray-300 pb-1.5 mb-2">
                  <label className="text-[13px] text-[#333333]">Tags</label>
                  <Plus size={16} className="text-gray-600 cursor-pointer" />
               </div>
               <div className="flex flex-wrap gap-1.5">
                 {tags.map((tag, i) => (
                   <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-[11px] font-medium flex items-center gap-1">
                     {tag}
                     <button onClick={() => setTags(tags.filter((_, idx) => idx !== i))} className="hover:text-red-500 font-bold">×</button>
                   </span>
                 ))}
                 <input 
                   type="text" 
                   placeholder="+ tag" 
                   className="border-none outline-none text-[11px] text-gray-600 bg-transparent w-[50px]"
                   onKeyDown={e => {
                     if (e.key === 'Enter' && e.target.value.trim()) {
                       setTags([...tags, e.target.value.trim()]);
                       e.target.value = '';
                     }
                   }}
                 />
               </div>
             </div>
          </div>

          {/* DIVISOR VERTICAL */}
          <div className="w-[14px] bg-[#f8f9fa] border-x border-gray-200 flex flex-col items-center justify-between shrink-0 cursor-col-resize pb-1 pt-1 z-10">
             <ScrollArrow direction="up" />
             <div className="w-[8px] bg-gray-400 flex-1 rounded-[4px] shadow-sm my-1"></div>
             <ScrollArrow direction="down" />
          </div>

          {/* Coluna 3: Editor de Blocos DINÂMICO */}
          <div className="flex-1 bg-[#f4f5f7] p-6 flex flex-col relative overflow-y-auto">
             
             {steps.length === 0 || !selectedStep ? (
               <div className="flex-1 flex items-center justify-center">
                 <span className="text-gray-400 text-[15px] font-medium pb-20 tracking-wide text-center px-10">
                   As etapas do seu treino aparecerão aqui assim que você começar a montar.
                 </span>
               </div>
             ) : (
               <div className="bg-white rounded-[8px] border border-gray-300 shadow-[0_2px_8px_rgba(0,0,0,0.08)] flex flex-col w-full max-w-[660px]">
                  
                  {/* Header do Editor */}
                  <div className="flex justify-between items-center px-4 py-2.5 border-b border-gray-100">
                    <span className="text-[13px] text-gray-700 font-medium">Editor de Detalhes do Treino</span>
                    <X size={16} className="text-gray-400 cursor-pointer hover:text-gray-700 transition-colors" onClick={removeSelectedStep} />
                  </div>

                  <div className="p-5 flex flex-col gap-5">
                     {/* Linha 1: Dropdowns */}
                     <div className="flex justify-between items-center">
                       <div className="relative group flex-1 mr-4">
                         <input 
                            type="text"
                            value={selectedStep.name}
                            onChange={(e) => updateSelectedStep('name', e.target.value)}
                            className="w-full text-[14px] font-bold text-gray-900 border border-transparent hover:border-gray-300 focus:border-[#1a73e8] focus:bg-white focus:outline-none focus:ring-[0.5px] focus:ring-[#1a73e8] rounded-[3px] px-2 py-1.5 transition-colors cursor-text"
                         />
                       </div>
                       <div className="flex gap-2 justify-end shrink-0">
                         <CustomSelect 
                           options={["Aquecimento", "Trabalho", "Recuperar", "Esfriar"]} 
                           value={selectedStep.type} 
                           onChange={(v) => updateSelectedStep('type', v)} 
                           width="w-[120px]"
                         />
                         <CustomSelect 
                           options={["Duração", "Distância"]} 
                           value={selectedStep.durationType} 
                           onChange={(v) => updateSelectedStep('durationType', v)} 
                           width="w-[110px]"
                         />
                         <CustomSelect 
                           label={selectedStep.targetType === 'Intervalo' ? 'Interv' : selectedStep.targetType}
                           options={["Intervalo", "Alvo"]} 
                           value={selectedStep.targetType} 
                           onChange={(v) => updateSelectedStep('targetType', v)} 
                           width="w-[100px]"
                         />
                       </div>
                     </div>

                     {/* Linha 2: Inputs de Target (8.00 km, 1-8 RPE, etc) */}
                     <div className="flex gap-3 items-center flex-wrap mt-1">
                       <input 
                          type="text" 
                          value={selectedStep.durationValue} 
                          onChange={(e) => updateSelectedStep('durationValue', e.target.value)}
                          className="border border-gray-300 rounded-[6px] px-2 py-1.5 text-[14px] w-[80px] text-center shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 text-gray-700 font-bold"
                       />
                       
                       <CustomSelect 
                         options={["km", "mi", "m", "min", "h", "s"]} 
                         value={selectedStep.durationUnit} 
                         onChange={(v) => updateSelectedStep('durationUnit', v)} 
                         width="w-[80px]"
                       />

                       <div className="flex items-center ml-4 gap-2">
                         <input 
                            type="text" 
                            value={selectedStep.intensityLow} 
                            onChange={(e) => updateSelectedStep('intensityLow', e.target.value)}
                            className="border border-gray-300 rounded-[6px] px-2 py-1.5 text-[14px] w-[50px] text-center text-gray-800 shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 font-bold"
                         />
                         <span className="text-gray-500 font-bold">-</span>
                         <input 
                            type="text" 
                            value={selectedStep.intensityHigh} 
                            onChange={(e) => updateSelectedStep('intensityHigh', e.target.value)}
                            className="border border-gray-300 rounded-[6px] px-2 py-1.5 text-[14px] w-[50px] text-center text-gray-800 shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 font-bold"
                         />
                         <span className="text-[12px] font-bold text-gray-800 ml-1 uppercase">{selectedStep.intensityUnit}</span>
                       </div>
                     </div>

                     {/* Linha 3: Ações & Toggle */}
                     <div className="flex justify-between items-center mt-3 border-t border-gray-100 pt-5">
                       <div className="flex gap-4 text-[13px]">
                          <button className="text-[#1a73e8] flex items-center gap-1.5 hover:underline font-medium cursor-pointer bg-transparent border-none outline-none" onClick={() => addStep(selectedStep.type)}>
                            <Plus size={14} /> Adicionar etapa
                          </button>
                          <button className="text-[#1a73e8] flex items-center gap-1.5 hover:underline font-medium cursor-pointer bg-transparent border-none outline-none" onClick={removeSelectedStep}>
                            <X size={14} /> Remover etapa
                          </button>
                       </div>
                       <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateSelectedStep('isLapEnd', !selectedStep.isLapEnd)}
                            className={`w-[34px] h-[18px] rounded-full relative transition-colors duration-200 outline-none
                              ${selectedStep.isLapEnd ? 'bg-blue-600' : 'bg-gray-300'}`}
                          >
                            <div className={`w-[14px] h-[14px] bg-white rounded-full absolute top-[2px] transition-all duration-200 shadow-md
                              ${selectedStep.isLapEnd ? 'left-[18px]' : 'left-[2px]'}`} />
                          </button>
                          <span className="text-[12px] text-gray-700 font-medium">Botão finalizar etapa na volta</span>
                       </div>
                     </div>

                     {/* Linha 4: Notas */}
                     <div className="mt-1">
                       <input 
                          type="text" 
                          placeholder="Inserir notas da etapa" 
                          value={selectedStep.notes || ''}
                          onChange={(e) => updateSelectedStep('notes', e.target.value)}
                          className="w-full border border-gray-300 rounded-[6px] px-3 py-2.5 text-[13px] bg-white focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 text-gray-800 shadow-inner placeholder:text-gray-400"
                       />
                     </div>
                  </div>
               </div>
             )}
          </div>
        </div>

        {/* RODAPÉ */}
        <div className="border-t border-gray-200 px-5 py-4 flex justify-between items-center bg-white shrink-0 h-[64px] z-20">
          <div className="flex items-center gap-2.5">
             <input 
               type="checkbox" 
               checked={autoCalc} 
               onChange={e => setAutoCalc(e.target.checked)}
               className="w-4 h-4 text-[#1a73e8] rounded-[2px] border-gray-300 focus:ring-[#1a73e8] cursor-pointer" 
             />
             <label className="text-[14px] text-[#333333] cursor-pointer" onClick={() => setAutoCalc(!autoCalc)}>
               Calcular automaticamente valores planejados
             </label>
          </div>
          
          <div className="flex items-center gap-6">
            {!isNew && (
              <button 
                onClick={handleDelete} 
                disabled={deleting}
                className="text-red-600 text-[14px] hover:underline cursor-pointer bg-transparent border-none font-bold"
              >
                {deleting ? 'Excluindo...' : 'Excluir Treino'}
              </button>
            )}
            <button onClick={onClose} className="text-[#1a73e8] text-[14px] hover:underline cursor-pointer bg-transparent border-none">
              Cancelar
            </button>
            <button 
              onClick={handleSave}
              disabled={saving}
              className="bg-[#1a73e8] text-white px-6 py-2 rounded-[3px] text-[14px] font-medium hover:bg-blue-700 shadow-sm transition-colors cursor-pointer border-none flex items-center gap-2"
            >
              {saving && <RefreshCw size={14} className="animate-spin" />}
              {saving ? 'Salvando...' : 'Salvar e Fechar'}
            </button>
          </div>
        </div>

      </motion.div>
    </motion.div>,
    document.body
  );
};

export default WorkoutEditor;
