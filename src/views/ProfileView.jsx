import React from 'react';
import { 
  LogOut, 
  Camera, 
  ChevronRight, 
  Settings, 
  Zap,
  User 
} from 'lucide-react';
import ConnectivitySection from '../components/ConnectivitySection';

const ProfileStatCard = ({ label, value, unit }) => (
  <div className="card" style={{ textAlign: 'center', padding: '1rem 0.5rem', border: 'none', background: 'var(--surface-accent)' }}>
    <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>{label}</p>
    <p style={{ fontSize: '1.1rem', fontWeight: 700 }}>{value} <span style={{ fontSize: '0.7rem', fontWeight: 500 }}>{unit}</span></p>
  </div>
);

const ProfileView = ({ athlete, onEdit, onPhotoUpload, onLogout, setAthlete }) => {
  return (
    <div className="animate-slide-up">
      <header style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Meu Perfil</h1>
        <button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <Settings size={22} />
        </button>
      </header>

      {/* Profile Header Card */}
      <div className="card" style={{ 
        padding: '2rem 1.5rem', 
        textAlign: 'center', 
        marginBottom: '2rem',
        background: 'linear-gradient(135deg, var(--surface-color) 0%, var(--surface-accent) 100%)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Background decorative elements */}
        <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', borderRadius: '50%', background: 'var(--primary-color)', opacity: 0.05 }}></div>
        
        <div style={{ position: 'relative', display: 'inline-block', marginBottom: '1.25rem' }}>
          <div style={{ 
            width: '100px', 
            height: '100px', 
            borderRadius: '35px', 
            background: 'var(--surface-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--primary-color)',
            border: '3px solid var(--primary-color)',
            overflow: 'hidden',
            boxShadow: '0 12px 24px rgba(0, 122, 255, 0.15)'
          }}>
            {athlete.profileImage ? (
              <img src={athlete.profileImage} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <User size={48} />
            )}
          </div>
          <label style={{ 
            position: 'absolute', 
            bottom: '-4px', 
            right: '-4px', 
            width: '36px', 
            height: '36px', 
            background: 'var(--primary-color)', 
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            border: '3px solid var(--surface-color)',
            cursor: 'pointer',
            boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
          }}>
            <Camera size={16} />
            <input type="file" hidden accept="image/*" onChange={onPhotoUpload} />
          </label>
        </div>

        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>{athlete.name}</h2>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '1.5rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary-color)', background: 'rgba(0,122,255,0.1)', padding: '4px 12px', borderRadius: '20px' }}>
            {athlete.objective}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
          <ProfileStatCard label="VAM" value={athlete.vam} unit="km/h" />
          <ProfileStatCard label="FC MÁX" value={athlete.maxHr} unit="bpm" />
          <ProfileStatCard label="PESO" value={athlete.weight || '--'} unit="kg" />
        </div>

        <button 
          onClick={onEdit}
          style={{ 
            marginTop: '1.5rem', 
            background: 'transparent', 
            border: '1px solid var(--border-color)', 
            color: 'var(--text-primary)', 
            padding: '10px 20px', 
            borderRadius: '12px',
            fontSize: '0.85rem',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          Editar Perfil Completo
        </button>
      </div>

      {/* Info Section */}
      <section style={{ marginBottom: '2rem' }}>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', paddingLeft: '4px' }}>
          Último teste VAM: {athlete.lastVamTest}
        </p>
      </section>

      {/* Training Zones */}
      <section style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Zonas de Treino</h3>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {athlete.zones?.map((zone, i) => {
            const zoneColors = ['#8E8E93', '#007AFF', '#34C759', '#FF9500', '#FF3B30'];
            const color = zoneColors[i];
            return (
              <div key={i} style={{ 
                display: 'flex', 
                alignItems: 'center',
                padding: '14px 16px',
                borderRadius: '14px',
                background: `${color}45`,
                borderLeft: `5px solid ${color}`,
              }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>{zone.name}</p>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{zone.hrRange} bpm</p>
                </div>
                <span style={{ fontSize: '1rem', fontWeight: 800, color, textShadow: '0 1px 2px rgba(0,0,0,0.08)' }}>{zone.pace}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Gear / Shoes (Temporarily Removed) */}


      <ConnectivitySection athlete={athlete} setAthlete={setAthlete} />

      <button 
        onClick={onLogout}
        className="btn-primary" 
        style={{ 
          width: '100%', 
          background: 'var(--surface-accent)', 
          color: 'var(--error)', 
          fontWeight: 700, 
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          border: '1px solid var(--border-color)',
          fontSize: '0.9rem',
          padding: '16px'
        }}
      >
        <LogOut size={18} />
        Sair da Conta
      </button>
    </div>
  );
};

export default ProfileView;
