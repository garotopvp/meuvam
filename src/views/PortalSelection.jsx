import { User, ShieldCheck, ChevronRight, Smartphone, Download } from 'lucide-react';

const PortalSelection = ({ onSelectAthlete, onSelectProfessor, deferredPrompt, onInstall }) => {
  const t = {
    bg: '#f8fafc',
    cardBg: '#ffffff',
    border: '1px solid #e2e8f0',
    text: '#0f172a',
    subText: '#64748b',
    accent: '#ef4444',
    logoShadow: 'rgba(239,68,68,0.05)',
    radius: '12px'
  };

  const renderCard = (type) => {
    const isAthlete = type === 'athlete';
    const onClick = isAthlete ? onSelectAthlete : onSelectProfessor;
    const Icon = isAthlete ? User : ShieldCheck;
    const title = isAthlete ? 'Sou Aluno' : 'Sou Professor';
    const desc = isAthlete ? 'Acesse seus treinos e fale com seu coach.' : 'Gestão de atletas e criação de planilhas.';
    const accentColor = isAthlete ? t.accent : t.text;

    return (
      <button 
        onClick={onClick} 
        style={{
          background: t.cardBg, 
          border: t.border, 
          borderLeft: `6px solid ${accentColor}`, 
          borderRadius: '12px', 
          padding: '1.5rem 1.8rem',
          display: 'flex', 
          alignItems: 'center', 
          gap: '1.5rem', 
          cursor: 'pointer',
          transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)', 
          textAlign: 'left', 
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', 
          width: '100%',
          position: 'relative',
          overflow: 'hidden'
        }} 
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'translateX(8px)';
          e.currentTarget.style.background = '#ffffff';
          e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.08)';
        }} 
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'translateX(0)';
          e.currentTarget.style.background = '#ffffff';
          e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.05)';
        }}
      >
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '4px', color: t.text, letterSpacing: '-0.3px' }}>{title}</h3>
          <p style={{ fontSize: '0.85rem', color: t.subText, fontWeight: 500 }}>{desc}</p>
        </div>
        <div style={{ 
          background: `${accentColor}10`, 
          padding: '10px', 
          borderRadius: '12px',
          color: accentColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Icon size={24} />
        </div>
      </button>
    );
  };

  return (
    <div style={{ 
      minHeight: '100vh', display: 'flex', flexDirection: 'column', 
      alignItems: 'center', justifyContent: 'center', padding: '2rem',
      background: t.bg, textAlign: 'center'
    }}>
      <div style={{ marginBottom: '1rem', animation: 'fadeIn 1s ease-out' }}>
        <div style={{ 
          width: '220px', height: '220px', display: 'flex', alignItems: 'center', 
          justifyContent: 'center', margin: '0 auto', position: 'relative'
        }}>
          <div style={{ position: 'absolute', width: '130%', height: '130%', background: `radial-gradient(circle, ${t.logoShadow} 0%, transparent 70%)`, top: '-15%', left: '-15%', zIndex: 0 }} />
          <img src="/assets/logo.png" alt="Superação Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', position: 'relative', zIndex: 1 }} />
        </div>
      </div>

      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        gap: '1.2rem', width: '100%', maxWidth: '420px',
        animation: 'slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1)' 
      }}>
        {renderCard('athlete')}
        {renderCard('professor')}

        {/* PWA Install for Android */}
        {deferredPrompt && (
          <div style={{
            marginTop: '1.5rem',
            padding: '1.25rem',
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px dashed var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            animation: 'fadeIn 1s ease-out'
          }}>
            <div style={{ background: 'rgba(0,122,255,0.1)', padding: '10px', borderRadius: '12px', color: '#007aff' }}>
              <Smartphone size={22} />
            </div>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: t.text }}>Instalar no Android</h4>
              <p style={{ fontSize: '0.75rem', color: t.subText }}>Acesso rápido aos seus treinos.</p>
            </div>
            <button 
              onClick={onInstall}
              style={{
                background: t.text,
                color: '#fff',
                border: 'none',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
            >
              <Download size={14} /> INSTALAR
            </button>
          </div>
        )}
      </div>

      <p style={{ marginTop: '4rem', fontSize: '0.85rem', color: t.subText, fontWeight: 600, opacity: 0.7, letterSpacing: '0.5px' }}>
        © {new Date().getFullYear()} SUPERAÇÃO ASSESSORIA
      </p>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default PortalSelection;
