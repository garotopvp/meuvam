import React, { useState, useEffect } from 'react';
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
import ChatView from './components/ChatView';
import NotificationsView from './components/NotificationsView';

// Data
import { athleteData } from './data/mockData';

const App = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [athlete, setAthleteRaw] = useState(athleteData);
  const [workouts, setWorkouts] = useState([]);
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [photoToEdit, setPhotoToEdit] = useState(null);

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
    }
  }, [session]);

  const mapSupabaseToAthlete = (data) => {
    return {
      ...athleteData, // Keep mock structure for zones/shoes for now
      id: data.id,
      name: data.name || athleteData.name,
      vam: data.vam || athleteData.vam,
      maxHR: data.max_hr || athleteData.maxHR,
      objective: data.objective || athleteData.objective,
      profileImage: data.avatar_url || athleteData.profileImage,
      gender: data.gender || athleteData.gender,
      lastVamTest: data.last_vam_test || athleteData.lastVamTest
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
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    // Fetch integrations
    const { data: integrationsData } = await supabase
      .from('integrations')
      .select('platform, username, connected')
      .eq('athlete_id', session.user.id);

    const mergedIntegrations = { ...athleteData.integrations };
    if (integrationsData) {
      integrationsData.forEach(intg => {
        mergedIntegrations[intg.platform] = {
          connected: intg.connected,
          username: intg.username
        };
      });
    }

    if (profileError && profileError.code === 'PGRST116') {
      const newProfile = {
        id: session.user.id,
        name: session.user.user_metadata?.full_name,
        vam: athleteData.vam,
        max_hr: athleteData.maxHR,
        objective: athleteData.objective,
        gender: athleteData.gender,
        last_vam_test: athleteData.lastVamTest
      };
      const { data: created, error: createError } = await supabase
        .from('profiles')
        .insert([newProfile])
        .select()
        .single();
      
      if (!createError) {
        setAthleteRaw({ ...mapSupabaseToAthlete(created), integrations: mergedIntegrations });
      }
    } else if (profileData) {
      setAthleteRaw({ ...mapSupabaseToAthlete(profileData), integrations: mergedIntegrations });
    }
  };

  const updateProfile = async (updates) => {
    const { error } = await supabase
      .from('profiles')
      .update({
        name: updates.name,
        objective: updates.objective,
        gender: updates.gender,
        birth_date: updates.birthDate,
        avatar_url: updates.profileImage
      })
      .eq('id', session.user.id);

    if (error) {
      console.error('Erro ao atualizar perfil:', error.message);
      alert('Erro ao salvar no banco de dados: ' + error.message);
    } else {
      setAthleteRaw({ ...athlete, ...updates });
      setIsEditing(false);
    }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setPhotoToEdit(ev.target.result);
      reader.readAsDataURL(file);
    }
  };

  const renderContent = () => {
    if (isEditing) {
      return (
        <EditProfileView 
          athlete={athlete} 
          onSave={updateProfile} 
          onCancel={() => setIsEditing(false)} 
        />
      );
    }

    switch (activeTab) {
      case 'home':
        return <HomeView athlete={athlete} workouts={workouts} />;
      case 'training':
        return <TrainingView workouts={workouts} onRefresh={fetchWorkouts} isRefreshing={isRefreshing} />;
      case 'stats':
        return <StatsView workouts={workouts} />;
      case 'chat':
        return <ChatView session={session} />;
      case 'notifications':
        return <NotificationsView />;
      case 'profile':
        return (
          <ProfileView 
            athlete={athlete} 
            setAthlete={setAthleteRaw} 
            onEdit={() => setIsEditing(true)} 
            onPhotoUpload={handlePhotoUpload}
            onLogout={() => supabase.auth.signOut()}
          />
        );
      default:
        return <HomeView athlete={athlete} workouts={workouts} />;
    }
  };

  if (isLoading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-color)' }}>
        <Loader2 className="animate-spin" color="var(--primary-color)" size={32} />
      </div>
    );
  }

  if (!session) {
    return <AuthView />;
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-color)' }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={isEditing ? 'editing' : activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="page-container"
        >
          {renderContent()}
        </motion.div>
      </AnimatePresence>
      {!isEditing && <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />}
      
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
    </div>
  );
};

export default App;
