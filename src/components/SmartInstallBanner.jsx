import React, { useState, useEffect } from 'react';
import { Smartphone, ArrowRight, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SmartInstallBanner = () => {
  const [isVisible, setIsVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // 1. Verifica se já está rodando como APP instalado
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
                         || window.navigator.standalone 
                         || document.referrer.includes('android-app://');

    // 2. Verifica se é dispositivo móvel
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    // 3. Verifica se o usuário já fechou o banner nesta sessão
    const isDismissed = sessionStorage.getItem('install-banner-dismissed');

    // 4. Não mostrar na própria página de instalação
    const isInstallPage = window.location.pathname.includes('/instalar') || window.location.pathname.includes('/baixar');

    if (isMobile && !isStandalone && !isDismissed && !isInstallPage) {
      // Pequeno delay para não aparecer de soco
      setTimeout(() => setIsVisible(true), 2000);
    }
  }, []);

  if (!isVisible) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 'calc(1rem + var(--safe-area-top))',
      left: '1rem',
      right: '1rem',
      zIndex: 9999,
      background: '#ffffff',
      borderRadius: '20px',
      padding: '12px 16px',
      boxShadow: '0 15px 30px rgba(0,0,0,0.12)',
      border: '1px solid #f1f5f9',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      animation: 'slideDown 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
    }}>
      <div style={{ 
        width: '40px', 
        height: '40px', 
        borderRadius: '12px', 
        background: 'rgba(0, 122, 255, 0.1)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: '#007aff'
      }}>
        <Smartphone size={22} />
      </div>

      <div style={{ flex: 1 }} onClick={() => navigate('/instalar')}>
        <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', marginBottom: '2px' }}>
          Instalar no seu Celular
        </h4>
        <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
          Toque para ver o guia <ArrowRight size={12} />
        </p>
      </div>

      <button 
        onClick={() => {
          setIsVisible(false);
          sessionStorage.setItem('install-banner-dismissed', 'true');
        }}
        style={{ 
          background: 'none', 
          border: 'none', 
          color: '#94a3b8', 
          padding: '8px',
          cursor: 'pointer'
        }}
      >
        <X size={18} />
      </button>

      <style>{`
        @keyframes slideDown {
          from { transform: translateY(-100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default SmartInstallBanner;
