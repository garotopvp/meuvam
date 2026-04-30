import React, { useState, useEffect } from 'react';
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
import StatsView from './views/StatsView';
import ProfileView from './views/ProfileView';
import EditProfileView from './views/EditProfileView';
import AuthView from './views/AuthView';
import PortalSelection from './views/PortalSelection';
import ChatView from './components/ChatView';
import NotificationsView from './components/NotificationsView';

// Data
import { athleteData } from './data/mockData';

const UrlCleanup = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('strava') === 'connected') {
      setTimeout(() => {
        navigate(location.pathname, { replace: true });
      }, 1500);
    }
  }, [location, navigate]);

  return null;
};

const MainLayout = ({ athlete, workouts, fetchWorkouts, isRefreshing, setAthleteRaw, handlePhotoUpload, session, updateProfile, setIsEditing, isEditing, setPhotoToEdit }) => {
  const location = useLocation();
  
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-color)' }}>
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
            <Route path="/" element={<HomeView athlete={athlete} workouts={workouts} />} />
            <Route path="/treinos" element={<TrainingView workouts={workouts} onRefresh={fetchWorkouts} isRefreshing={isRefreshing} />} />
            <Route path="/estatisticas" element={<StatsView workouts={workouts} />} />
            <Route path="/coach" element={<ChatView session={session} />} />
            <Route path="/avisos" element={<NotificationsView />} />
            <Route path="/perfil" element={
              isEditing ? (
                <EditProfileView 
                  athlete={athlete} 
                  onSave={updateProfile} 
                  onCancel={() => setIsEditing(false)} 
                />
              ) : (
                <ProfileView 
                  athlete={athlete} 
                  setAthlete={setAthleteRaw} 
                  onEdit={() => setIsEditing(true)} 
                  onPhotoUpload={handlePhotoUpload}
                  onLogout={() => supabase.auth.signOut()}
                />
              )
            } />
            <Route path="*" element={<Navigate to="/aluno" replace />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
      {!isEditing && <BottomNav />}
    </div>
  );
};

const AppContent = () => {
  const [athlete, setAthleteRaw] = useState(athleteData);
  const [workouts, setWorkouts] = useState([]);
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [photoToEdit, setPhotoToEdit] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
        fetchProfile();
        fetchWorkouts();

        // Inscreve no canal Realtime para atualizações automáticas de treinos
        const workoutSubscription = supabase.channel('workouts-channel')
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
              fetchWorkouts(); // Recarrega os treinos ao receber alteração
            }
          )
          .subscribe();

        return () => {
          supabase.removeChannel(workoutSubscription);
        };
    }
  }, [session]);

  const mapSupabaseToAthlete = (data) => {
    return {
      ...athleteData,
      id: data.id,
      name: data.name || 'Novo Atleta',
      vam: data.vam || '--',
      maxHR: data.max_hr || '--',
      maxHr: data.max_hr || '--', // Suporte para ambas as grafias
      objective: data.objective || 'Definir Objetivo',
      profileImage: data.avatar_url || null,
      gender: data.gender || '--',
      email: data.email || '',
      birthDate: data.birth_date || '',
      lastVamTest: data.last_vam_test || '--',
      weight: data.weight || '-- kg',
      integrations: {
        strava: { connected: false, username: '' },
        garmin: { connected: false, username: '' },
        polar: { connected: false, username: '' },
        coros: { connected: false, username: '' }
      }
    };
  };

  const fetchWorkouts = async () => {
    setIsRefreshing(true);
    const { data, error } = await supabase
      .from('workouts')
      .select('*')
      .eq('athlete_id', session.user.id)
      .order('date', { ascending: false });

    if (!error && data) {
      setWorkouts(data);
    }
    setIsRefreshing(false);
  };

  const fetchProfile = async () => {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (profileData) {
      if (profileData.role === 'professor') {
        window.location.href = '/paineldoprofessor/';
        return;
      }
      setAthleteRaw(mapSupabaseToAthlete(profileData));
    }
  };

  const updateProfile = async (updates) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: updates.name,
          objective: updates.objective,
          gender: updates.gender,
          avatar_url: updates.profileImage,
          birth_date: updates.birthDate
        })
        .eq('id', session.user.id);

      if (error) throw error;
      await fetchProfile();
      setIsEditing(false);
    } catch (err) {
      alert('Erro: ' + err.message);
    }
  };

  if (isLoading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-color)' }}>
        <Loader2 className="animate-spin" color="var(--primary-color)" size={32} />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={
        <PortalSelection 
          onSelectAthlete={() => navigate('/aluno')} 
          onSelectProfessor={() => window.location.href = '/professor'} 
        />
      } />

      <Route path="/aluno/*" element={
        !session ? (
            <AuthView onBack={() => navigate('/')} />
        ) : (
            <>
                <UrlCleanup />
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
                    setIsEditing={setIsEditing}
                    isEditing={isEditing}
                    setPhotoToEdit={setPhotoToEdit}
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
