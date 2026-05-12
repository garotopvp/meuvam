import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';

// Lib
import { supabase } from './lib/supabase';

// Components
import BottomNav from './components/BottomNav';
import PhotoEditorModal from './modals/PhotoEditorModal';

// Views
import HomeView from './views/HomeView';
import TrainingView from './views/TrainingView';

import ProfileView from './views/ProfileView';
import EditProfileView from './views/EditProfileView';
import AuthView from './views/AuthView';
import PortalSelection from './views/PortalSelection';

import ChatView from './components/ChatView';
import NotificationsView from './components/NotificationsView';

// Data
import { athleteData } from './data/mockData';

// ── Helpers ──────────────────────────────────────────────────────────────────

const calculateZones = (vamInput, maxHr, hrMethod = 'max', restingHr = 60, lthrVal = 170) => {
  let vamKmh = 0;
  if (typeof vamInput === 'string' && vamInput.includes(':')) {
    const [m, s] = vamInput.split(':').map(Number);
    vamKmh = 60 / (m + (s / 60));
  } else {
    vamKmh = parseFloat(vamInput) || 0;
  }

  const maxHeartRate = parseInt(maxHr) || 0;
  const restingHeartRate = parseInt(restingHr) || 60;
  const lthr = parseInt(lthrVal) || 170;
  const method = hrMethod || 'max';

  const zoneNames = ['Recuperação', 'Aeróbico Leve', 'Aeróbico', 'Limiar', 'VAM (Máximo)'];
  const vamPcts = [0.60, 0.70, 0.80, 0.90, 1.0];
  
  let hrRanges = [];
  
  if (method === 'max') {
    // Percentuais ajustados para bater com o perfil do aluno (71, 78, 85, 93)
    const pcts = [0.71, 0.78, 0.85, 0.93, 1.0];
    hrRanges = pcts.map((p, i) => {
        const min = i === 0 ? 0 : pcts[i-1];
        return { min: Math.round(maxHeartRate * min), max: Math.round(maxHeartRate * p) };
    });
  } else if (method === 'rfc') {
    const reserve = maxHeartRate - restingHeartRate;
    const pcts = [0.71, 0.78, 0.85, 0.93, 1.0];
    hrRanges = pcts.map((p, i) => {
        const min = i === 0 ? 0 : pcts[i-1];
        return { min: Math.round((reserve * min) + restingHeartRate), max: Math.round((reserve * p) + restingHeartRate) };
    });
  } else if (method === 'lthr') {
    // Protocolo Joe Friel
    const pcts = [
        { min: 0.80, max: 0.85 },
        { min: 0.85, max: 0.89 },
        { min: 0.89, max: 0.94 },
        { min: 0.94, max: 0.99 },
        { min: 0.99, max: 1.10 }
    ];
    hrRanges = pcts.map(p => ({ min: Math.round(lthr * p.min), max: Math.round(lthr * p.max) }));
  }

  return zoneNames.map((name, i) => {
    const speed = vamKmh * vamPcts[i];
    const paceDecimal = speed > 0 ? 60 / speed : 0;
    const m = Math.floor(paceDecimal);
    const s = Math.round((paceDecimal - m) * 60);
    const pace = paceDecimal > 0 ? `${m}:${s.toString().padStart(2, '0')}` : '--';
    
    let hrRange = '--';
    if (hrRanges[i]) {
      hrRange = i === 0 ? `< ${hrRanges[i].max}` : `${hrRanges[i].min} - ${hrRanges[i].max}`;
    }

    return { name, pace, hrRange };
  });
};

const mapSupabaseToAthlete = (data, integrations = []) => {
  const strava = integrations.find(i => i.platform === 'strava');
  const garmin = integrations.find(i => i.platform === 'garmin');

  const athleteBase = {
    ...athleteData,
    id: data.id,
    name: data.name || 'Atleta',
    vam: data.vam || '--',
    maxHr: data.max_hr || '--',
    hrMethod: data.hr_method || 'max',
    restingHr: data.resting_hr || null,
    lthr: data.lthr || null,
    objective: data.objective || 'Definir Objetivo',
    profileImage: data.avatar_url || null,
    gender: data.gender || '--',
    email: data.email || '',
    birthDate: data.birth_date || '',
    lastVamTest: data.last_vam_test || '--',
    weight: data.weight || '--',
    nextRaceName: data.next_race_name || '',
    nextRaceDate: data.next_race_date || '',
    integrations: {
      strava: { connected: !!strava?.connected, username: strava?.username || '' },
      garmin: { 
        connected: garmin ? (garmin.connected === true || garmin.connected === 'true') : false, 
        username: garmin?.username || '' 
      },
      polar: { connected: false, username: '' },
      coros: { connected: false, username: '' },
      amazfit: { connected: false, username: '' }
    }
  };

  return {
    ...athleteBase,
    zones: calculateZones(athleteBase.vam, athleteBase.maxHr, athleteBase.hrMethod, athleteBase.restingHr, athleteBase.lthr)
  };
};

const UrlCleanup = ({ onConnected }) => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('strava') === 'connected') {
      if (onConnected) onConnected();
      navigate(location.pathname, { replace: true });
    }
  }, [location, navigate, onConnected]);

  return null;
};

const MainLayout = ({ athlete, workouts, fetchWorkouts, isRefreshing, setAthleteRaw, handlePhotoUpload, session, updateProfile, navigate, deferredPrompt, handleInstallApp, theme, setTheme }) => {
  const location = useLocation();
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-color)', transition: 'background-color 0.3s ease' }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="page-container"
          style={{ flex: 1, paddingBottom: '90px' }}
        >
          <Routes>
            <Route path="/" element={<HomeView athlete={athlete} workouts={workouts} deferredPrompt={deferredPrompt} onInstall={handleInstallApp} />} />
            <Route path="/treinos" element={<TrainingView athlete={athlete} workouts={workouts} onRefresh={fetchWorkouts} isRefreshing={isRefreshing} />} />
            <Route path="/coach" element={<ChatView session={session} />} />
            <Route path="/avisos" element={<NotificationsView />} />
            <Route path="/perfil" element={
              <ProfileView 
                athlete={athlete} 
                setAthlete={setAthleteRaw} 
                onEdit={() => navigate('/aluno/perfil/edit')} 
                onPhotoUpload={handlePhotoUpload}
                onLogout={() => supabase.auth.signOut()}
                theme={theme}
                setTheme={setTheme}
              />
            } />
            <Route path="/perfil/edit" element={
              <EditProfileView 
                athlete={athlete} 
                onSave={(updates) => {
                  updateProfile(updates);
                  navigate('/aluno/perfil');
                }} 
                onCancel={() => navigate('/aluno/perfil')} 
              />
            } />
            <Route path="*" element={<Navigate to="/aluno" replace />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
      {!location.pathname.includes('/edit') && <BottomNav />}
    </div>
  );
};

const AppContent = () => {
  // Safeguard: Se o React for carregado acidentalmente em uma rota que deveria ser estática (paineldoprofessor),
  // tentamos forçar o navegador a buscar o arquivo real.
  if (window.location.pathname.includes('/paineldoprofessor')) {
    window.location.replace('/paineldoprofessor/index.html?v=' + Date.now());
    return null;
  }

  const [athlete, setAthleteRaw] = useState(null);
  const [workouts, setWorkouts] = useState([]);
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [photoToEdit, setPhotoToEdit] = useState(null);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    }).catch(err => {
      console.error('Erro de sessão:', err);
    }).finally(() => {
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchWorkouts = useCallback(async () => {
    if (!session?.user?.id) return;
    setIsRefreshing(true);
    try {
      const { data, error } = await supabase
        .from('workouts')
        .select('*')
        .eq('athlete_id', session.user.id)
        .order('date', { ascending: false });

      if (!error && data) {
        setWorkouts(data);
      }
    } catch (err) {
      console.error('Erro ao buscar treinos:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [session]);

  const fetchProfile = useCallback(async () => {
    if (!session?.user?.id) return;
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profileError) {
        console.error('Erro ao carregar perfil:', profileError);
        // Se não encontrar perfil, define um objeto básico para não travar o app
        setAthleteRaw(mapSupabaseToAthlete({ id: session.user.id, email: session.user.email }, []));
        return;
      }

      if (profileData) {
        if (profileData.role === 'professor') {
          if (!window.location.pathname.includes('/paineldoprofessor')) {
            window.location.href = '/paineldoprofessor/index.html?v=' + Date.now();
          }
          return;
        }
        
        const { data: integrations } = await supabase
          .from('integrations')
          .select('*')
          .eq('athlete_id', session.user.id);
          
        const athleteObj = mapSupabaseToAthlete(profileData, integrations || []);
        setAthleteRaw(athleteObj);

        // Check for first login / incomplete profile
        if ((!profileData.vam || profileData.vam === '--' || !profileData.birth_date) && window.location.pathname === '/aluno') {
          navigate('/aluno/perfil/edit');
        }
      } else {
        // Se não encontrar perfil (profileData é null), define um objeto básico
        console.log('[App] Perfil não encontrado, usando fallback.');
        setAthleteRaw(mapSupabaseToAthlete({ id: session.user.id, email: session.user.email }, []));
      }
    } catch (err) {
      console.error('Erro crítico em fetchProfile:', err);
      // Fallback para evitar tela branca infinita
      setAthleteRaw(mapSupabaseToAthlete({ id: session.user.id, email: session.user.email }, []));
    }
  }, [session, navigate]);

  useEffect(() => {
    if (session) {
        fetchProfile();
        fetchWorkouts();

        // Inscreve no canal Realtime para atualizações automáticas de treinos
        const workoutSubscription = supabase.channel(`workouts-${session.user.id}`)
          .on(
            'postgres_changes',
            { 
              event: '*', 
              schema: 'public', 
              table: 'workouts', 
              filter: `athlete_id=eq.${session.user.id}` 
            },
            (payload) => {
              console.log('Treino atualizado via Real-time:', payload);
              fetchWorkouts(); 
            }
          )
          .subscribe();

        return () => {
          supabase.removeChannel(workoutSubscription);
        };
    }
  }, [session, fetchProfile, fetchWorkouts]);



  const updateProfile = useCallback(async (updates) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: updates.name,
          objective: updates.objective,
          gender: updates.gender,
          avatar_url: updates.profileImage,
          birth_date: updates.birthDate,
          vam: updates.vam,
          max_hr: updates.maxHr,
          hr_method: updates.hrMethod,
          resting_hr: updates.restingHr,
          lthr: updates.lthr,
          weight: updates.weight,
          next_race_name: updates.nextRaceName,
          next_race_date: updates.nextRaceDate
        })
        .eq('id', session.user.id);

      if (error) throw error;
      await fetchProfile();
    } catch (err) {
      alert('Erro: ' + err.message);
    }
  }, [session, fetchProfile]);

  if (isLoading) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-color)', gap: '20px' }}>
        <Loader2 className="animate-spin" color="var(--primary-color)" size={32} />
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Iniciando Superação...</p>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={
        session ? (
          <Navigate to="/aluno" replace />
        ) : (
          <PortalSelection 
            onSelectAthlete={() => navigate('/aluno')} 
            onSelectProfessor={() => window.location.assign('/paineldoprofessor/index.html?v=' + Date.now())} 
          />
        )
      } />

      <Route path="/professor/*" element={<Navigate to={`/paineldoprofessor/index.html?v=${Date.now()}`} replace />} />


      <Route path="/aluno/*" element={
        !session ? (
            <AuthView onBack={() => navigate('/')} />
        ) : !athlete ? (
            <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-color)', gap: '20px' }}>
                <Loader2 className="animate-spin" color="var(--primary-color)" size={32} />
                <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Carregando seu perfil...</p>
            </div>
        ) : (
            <>
                <UrlCleanup onConnected={fetchProfile} />
                <MainLayout 
                    athlete={athlete}
                    workouts={workouts}
                    fetchWorkouts={fetchWorkouts}
                    isRefreshing={isRefreshing}
                    setAthleteRaw={setAthleteRaw}
                    handlePhotoUpload={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                            const reader = new FileReader();
                            reader.onload = (ev) => setPhotoToEdit(ev.target.result);
                            reader.readAsDataURL(file);
                        }
                    }}
                    session={session}
                    updateProfile={updateProfile}
                    navigate={navigate}
                    deferredPrompt={deferredPrompt}
                    handleInstallApp={handleInstallApp}
                    theme={theme}
                    setTheme={setTheme}
                />
                {photoToEdit && (
                    <PhotoEditorModal 
                        image={photoToEdit} 
                        onClose={() => setPhotoToEdit(null)} 
                        onSave={(croppedImg) => {
                            updateProfile({ ...athlete, profileImage: croppedImg });
                            setPhotoToEdit(null);
                        }} 
                    />
                )}
            </>
        )
      } />


      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App = () => (
  <BrowserRouter>
    <AppContent />
  </BrowserRouter>
);

export default App;
