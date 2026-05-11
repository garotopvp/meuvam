import React, { useState, useEffect } from 'react';
import { X, Info, Loader2 } from 'lucide-react';
import { StravaLogo, GarminLogo, PolarLogo, CorosLogo, AmazfitLogo } from './BrandLogos';

const API = '/api';

const platforms = [
  { key: 'strava', name: 'Strava', color: '#FC4C02', Logo: StravaLogo, authType: 'oauth' },
  { key: 'garmin', name: 'Garmin Connect', color: '#007CC3', Logo: GarminLogo, authType: 'credentials' },
  { key: 'amazfit', name: 'Amazfit (Zepp)', color: '#FF4B2B', Logo: AmazfitLogo, authType: 'bridge' },
  { key: 'polar', name: 'Polar Flow', color: '#D32F2F', Logo: PolarLogo, authType: 'credentials' },
  { key: 'coros', name: 'COROS', color: '#2196F3', Logo: CorosLogo, authType: 'credentials' },
];

const ConnectivitySection = ({ athlete, setAthlete }) => {
  const [loginModal, setLoginModal] = useState(null);
  const [showBridgeInfo, setShowBridgeInfo] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const API = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL + '/api' : '/api';
  
  // Verifica o status do Garmin diretamente no backend (bypassa problemas de RLS)
  useEffect(() => {
    if (athlete?.id) {
      fetch(`${API}/garmin/status?userId=${athlete.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.connected && !athlete.integrations?.garmin?.connected) {
            setAthlete(prev => ({
              ...prev,
              integrations: {
                ...prev.integrations,
                garmin: { connected: true, username: data.user?.displayName || 'garmin_user' }
              }
            }));
          }
        })
        .catch(console.error);
    }
  }, [athlete?.id]);

  const handleToggle = async (platform) => {
    const data = athlete.integrations ? athlete.integrations[platform.key] : null;

    if (data?.connected) {
      // Disconnect
      try {
        await fetch(`${API}/${platform.key}/disconnect`, { method: 'POST' });
      } catch {}
      
      const updated = { ...athlete, integrations: { ...athlete.integrations, [platform.key]: { connected: false, username: '' }}};
      setAthlete(updated);

      // Remover do Supabase
      import('../lib/supabase').then(async ({ supabase }) => {
        await supabase
          .from('integrations')
          .update({ connected: false, access_token: null, refresh_token: null })
          .match({ athlete_id: athlete.id, platform: platform.key });
      });

      return;
    }

    // Connect
    if (platform.authType === 'oauth') {
      if (!athlete.id) {
        setError('Erro: Sessão do atleta não carregada. Tente recarregar a página.');
        return;
      }
      window.location.href = `${API}/strava/auth?userId=${athlete.id}`;
    } else if (platform.authType === 'credentials') {
      setLoginModal(platform);
      setError('');
      setEmail('');
      setPassword('');
    } else if (platform.authType === 'bridge') {
      setShowBridgeInfo(platform);
    }
  };

  const handleCredentialsLogin = async () => {
    if (!loginModal) return;
    const platform = loginModal;
    
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/${platform.key}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, userId: athlete?.id })
      });
      const data = await res.json();

      if (res.ok) {
        const username = data.user?.displayName || email.split('@')[0];
        
        // 1. Validar e renovar sessão PRIMEIRO para evitar JWT Expired
        const { supabase } = await import('../lib/supabase');
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !sessionData.session) {
          console.error('[Connectivity] Sessão inválida:', sessionError);
          setError('Sua sessão expirou. Por favor, saia e entre novamente no aplicativo.');
          setLoading(false);
          return;
        }

        console.log(`[Connectivity] Salvando integração ${platform.name} para:`, athlete.id);
        
        const { error: upsertError } = await supabase.from('integrations').upsert({
          athlete_id: athlete.id,
          platform: platform.key,
          username: username,
          connected: true,
          updated_at: new Date().toISOString()
        }, { onConflict: 'athlete_id, platform' });

        if (upsertError) {
          console.error('[Connectivity] Erro ao salvar no banco:', upsertError);
          setError('Conectado, mas houve um erro ao salvar no seu perfil: ' + upsertError.message);
          setLoading(false);
          return;
        }

        // 2. Atualizar o estado global do atleta
        const updated = { 
          ...athlete, 
          integrations: { 
            ...athlete.integrations, 
            [platform.key]: { connected: true, username: username }
          }
        };
        setAthlete(updated);
        
        // 3. Limpar modal e campos
        setLoginModal(null);
        setEmail('');
        setPassword('');
      } else {
        setError(data.error || `Falha no login com ${platform.name}. Verifique suas credenciais.`);
      }
    } catch {
      setError('Erro de conexão com o servidor');
    }
    setLoading(false);
  };

  const inputStyle = {
    width: '100%', padding: '14px 16px', borderRadius: '14px',
    border: '1px solid var(--border-color)', background: 'var(--surface-accent)',
    fontSize: '0.95rem', fontWeight: 500, outline: 'none', fontFamily: 'inherit',
    color: 'var(--text-primary)'
  };

  return (
    <section style={{ marginBottom: '2.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Conectividade
        </h3>
        <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--primary-color)', background: 'rgba(0, 122, 255, 0.05)', padding: '2px 8px', borderRadius: '6px' }}>
          {Object.values(athlete.integrations || {}).filter(i => i.connected).length} Ativas
        </span>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(2, 1fr)', 
        gap: '12px' 
      }}>
        {platforms.map((platform) => {
          const data = athlete.integrations ? athlete.integrations[platform.key] : null;
          const Logo = platform.Logo;
          const isSoon = platform.authType === 'coming_soon';
          const isConnected = data?.connected;

          return (
            <div 
              key={platform.key} 
              onClick={() => !isSoon && handleToggle(platform)}
              style={{
                position: 'relative',
                display: 'flex', 
                flexDirection: 'column',
                gap: '12px',
                padding: '16px', 
                borderRadius: '20px',
                background: isConnected ? '#fff' : 'var(--surface-accent)',
                border: isConnected ? `1.5px solid ${platform.color}` : '1.5px solid transparent',
                boxShadow: isConnected ? `0 10px 25px ${platform.color}15` : 'none',
                opacity: isSoon ? 0.4 : 1,
                cursor: isSoon ? 'default' : 'pointer',
                transition: 'var(--transition-smooth)',
                overflow: 'hidden'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  background: isConnected && !['strava', 'garmin'].includes(platform.key) ? platform.color : 'rgba(0,0,0,0.05)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.3s ease',
                  overflow: 'hidden'
                }}>
                  <Logo size={36} color={isConnected ? "#fff" : "#8e8e93"} />
                </div>
                
                {!isSoon && (
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: isConnected ? platform.color : '#d1d1d6',
                    boxShadow: isConnected ? `0 0 8px ${platform.color}` : 'none'
                  }} />
                )}
              </div>

              <div>
                <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {platform.name}
                </p>
                <p style={{ 
                  fontSize: '0.65rem', 
                  color: isConnected ? 'var(--text-primary)' : 'var(--text-secondary)', 
                  fontWeight: 600,
                  marginTop: '2px'
                }}>
                  {isSoon ? 'Em breve' : isConnected ? `@${data.username}` : (platform.authType === 'bridge' ? 'Via Strava' : 'Conectar')}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Amazfit / Bridge Info Modal */}
      {showBridgeInfo && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 9999, padding: '1.5rem'
        }}>
          <div style={{
            background: '#fff', borderRadius: '24px', padding: '2rem',
            width: '100%', maxWidth: '380px', position: 'relative'
          }}>
            <button onClick={() => setShowBridgeInfo(null)} style={{
              position: 'absolute', top: '16px', right: '16px',
              background: 'none', border: 'none', cursor: 'pointer'
            }}>
              <X size={20} color="var(--text-secondary)" />
            </button>

            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '18px',
                background: showBridgeInfo.color, 
                margin: '0 auto 12px',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <AmazfitLogo size={32} color="#fff" />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Conectar {showBridgeInfo.name}</h3>
            </div>

            <div style={{ background: 'var(--surface-accent)', padding: '1.25rem', borderRadius: '16px', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '1rem' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--primary-color)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 900, flexShrink: 0 }}>1</div>
                <p style={{ fontSize: '0.85rem', fontWeight: 500 }}>No seu app **Zepp**, vá em **Perfil &gt; Adicionar Contas**.</p>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '1rem' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--primary-color)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 900, flexShrink: 0 }}>2</div>
                <p style={{ fontSize: '0.85rem', fontWeight: 500 }}>Selecione o **Strava** e faça o login.</p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--primary-color)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 900, flexShrink: 0 }}>3</div>
                <p style={{ fontSize: '0.85rem', fontWeight: 500 }}>Pronto! Seus treinos Amazfit aparecerão aqui via Strava.</p>
              </div>
            </div>

            <button onClick={() => setShowBridgeInfo(null)} style={{
              width: '100%', padding: '14px', borderRadius: '14px',
              background: 'var(--text-primary)', color: '#fff', border: 'none',
              fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer'
            }}>
              Entendi
            </button>
          </div>
        </div>
      )}

      {/* Credentials Login Modal (Generic for Garmin, Polar, Coros) */}
      {loginModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 9999, padding: '1.5rem'
        }}>
          <div style={{
            background: '#fff', borderRadius: '24px', padding: '2rem',
            width: '100%', maxWidth: '380px', position: 'relative'
          }}>
            <button onClick={() => setLoginModal(null)} style={{
              position: 'absolute', top: '16px', right: '16px',
              background: 'none', border: 'none', cursor: 'pointer'
            }}>
              <X size={20} color="var(--text-secondary)" />
            </button>

            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '18px',
                background: loginModal.key === 'garmin' ? 'transparent' : loginModal.color, 
                margin: '0 auto 12px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden'
              }}>
                {loginModal.key === 'garmin' ? <GarminLogo size={64} /> : <loginModal.Logo size={32} color="#fff" />}
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Conectar {loginModal.name}</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Use suas credenciais do {loginModal.name}
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input
                type="email" placeholder="Email" value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle}
              />
              <input
                type="password" placeholder="Senha" value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCredentialsLogin()}
                style={inputStyle}
              />

              {error && (
                <p style={{ color: '#FF3B30', fontSize: '0.8rem', fontWeight: 600, textAlign: 'center' }}>{error}</p>
              )}

              <button onClick={handleCredentialsLogin} disabled={loading || !email || !password}
                style={{
                  width: '100%', padding: '14px', borderRadius: '14px',
                  background: loading ? '#ccc' : loginModal.color,
                  color: '#fff', border: 'none', fontSize: '1rem',
                  fontWeight: 700, cursor: loading ? 'default' : 'pointer',
                  fontFamily: 'inherit', marginTop: '4px'
                }}>
                {loading ? <Loader2 className="animate-spin" size={20} /> : 'Entrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default ConnectivitySection;
