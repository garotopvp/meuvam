import React, { useState } from 'react';
import { X } from 'lucide-react';
import { StravaLogo, GarminLogo, PolarLogo, CorosLogo } from './BrandLogos';

const API = '/api';

const platforms = [
  { key: 'strava', name: 'Strava', color: '#FC4C02', Logo: StravaLogo, authType: 'oauth' },
  { key: 'garmin', name: 'Garmin Connect', color: '#007CC3', Logo: GarminLogo, authType: 'credentials' },
  { key: 'polar', name: 'Polar Flow', color: '#D32F2F', Logo: PolarLogo, authType: 'coming_soon' },
  { key: 'coros', name: 'COROS', color: '#2196F3', Logo: CorosLogo, authType: 'coming_soon' },
];

const ConnectivitySection = ({ athlete, setAthlete }) => {
  const [loginModal, setLoginModal] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleToggle = async (platform) => {
    const data = athlete.integrations[platform.key];

    if (data.connected) {
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
      // Strava - redirect to OAuth passing the user ID
      if (!athlete.id) {
        setError('Erro: Sessão do atleta não carregada. Tente recarregar a página.');
        return;
      }
      window.location.href = `${API}/strava/auth?userId=${athlete.id}`;
    } else if (platform.authType === 'credentials') {
      setLoginModal(platform);
      setError('');
    }
  };

  const handleGarminLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/garmin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (res.ok) {
        const garminUsername = data.user?.displayName || email.split('@')[0];
        const updated = { ...athlete, integrations: { ...athlete.integrations, garmin: { connected: true, username: garminUsername }}};
        setAthlete(updated);
        setLoginModal(null);
        
        // Salvar conexão do Garmin no banco de dados para não esquecer
        import('../lib/supabase').then(async ({ supabase }) => {
          await supabase.from('integrations').upsert({
            athlete_id: athlete.id,
            platform: 'garmin',
            username: garminUsername,
            connected: true,
            updated_at: new Date().toISOString()
          }, { onConflict: 'athlete_id, platform' });
        });

        setEmail('');
        setPassword('');
      } else {
        setError(data.error || 'Falha no login');
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
          {Object.values(athlete.integrations).filter(i => i.connected).length} Ativas
        </span>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(2, 1fr)', 
        gap: '12px' 
      }}>
        {platforms.map((platform) => {
          const data = athlete.integrations[platform.key];
          const Logo = platform.Logo;
          const isSoon = platform.authType === 'coming_soon';

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
                background: data.connected ? '#fff' : 'var(--surface-accent)',
                border: data.connected ? `1.5px solid ${platform.color}` : '1.5px solid transparent',
                boxShadow: data.connected ? `0 10px 25px ${platform.color}15` : 'none',
                opacity: isSoon ? 0.4 : 1,
                cursor: isSoon ? 'default' : 'pointer',
                transition: 'var(--transition-smooth)',
                overflow: 'hidden'
              }}
            >
              {/* Background Accent for Connected */}
              {data.connected && (
                <div style={{
                  position: 'absolute',
                  top: '-20px',
                  right: '-20px',
                  width: '60px',
                  height: '60px',
                  background: `${platform.color}10`,
                  borderRadius: '50%',
                  filter: 'blur(20px)'
                }} />
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  background: data.connected && !['strava', 'garmin'].includes(platform.key) ? platform.color : 'rgba(0,0,0,0.05)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.3s ease',
                  overflow: 'hidden'
                }}>
                  <Logo size={['strava', 'garmin'].includes(platform.key) ? 36 : 20} color={data.connected ? "#fff" : "#8e8e93"} />
                </div>
                
                {!isSoon && (
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: data.connected ? platform.color : '#d1d1d6',
                    boxShadow: data.connected ? `0 0 8px ${platform.color}` : 'none'
                  }} />
                )}
              </div>

              <div>
                <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {platform.name}
                </p>
                <p style={{ 
                  fontSize: '0.65rem', 
                  color: data.connected ? 'var(--text-primary)' : 'var(--text-secondary)', 
                  fontWeight: 600,
                  marginTop: '2px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {isSoon ? 'Em breve' : data.connected ? `@${data.username}` : 'Desconectado'}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Garmin Login Modal */}
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
                Use suas credenciais do Garmin Connect
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
                onKeyDown={(e) => e.key === 'Enter' && handleGarminLogin()}
                style={inputStyle}
              />

              {error && (
                <p style={{ color: '#FF3B30', fontSize: '0.8rem', fontWeight: 600, textAlign: 'center' }}>{error}</p>
              )}

              <button onClick={handleGarminLogin} disabled={loading || !email || !password}
                style={{
                  width: '100%', padding: '14px', borderRadius: '14px',
                  background: loading ? '#ccc' : loginModal.color,
                  color: '#fff', border: 'none', fontSize: '1rem',
                  fontWeight: 700, cursor: loading ? 'default' : 'pointer',
                  fontFamily: 'inherit', marginTop: '4px'
                }}>
                {loading ? 'Conectando...' : 'Entrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default ConnectivitySection;
