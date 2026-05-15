import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share, PlusSquare, X } from 'lucide-react';

const IOSInstallPrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // 1. Verificar se é iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    
    // 2. Verificar se não está em modo standalone (já instalado)
    const isStandalone = window.navigator.standalone === true;
    
    // 3. Verificar se o usuário já fechou o prompt nesta sessão ou permanentemente
    const isDismissed = localStorage.getItem('pwa_ios_prompt_dismissed') === 'true';

    if (isIOS && !isStandalone && !isDismissed) {
      // Pequeno delay para não aparecer imediatamente ao carregar
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa_ios_prompt_dismissed', 'true');
  };

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          style={{
            position: 'fixed',
            bottom: '20px',
            left: '20px',
            right: '20px',
            zIndex: 9999,
            display: 'flex',
            justifyContent: 'center'
          }}
        >
          <div style={{
            background: 'var(--surface-color)',
            borderRadius: '24px',
            padding: '24px',
            width: '100%',
            maxWidth: '400px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
            border: '1px solid var(--border-color)',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <button 
              onClick={handleDismiss}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'var(--surface-accent)',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--text-secondary)'
              }}
            >
              <X size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: 'var(--primary-gradient)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--shadow-active)'
              }}>
                <img 
                    src="/favicon.ico" 
                    alt="Logo" 
                    style={{ width: '32px', height: '32px', borderRadius: '6px' }}
                    onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.parentElement.innerHTML = '<span style="color: white; font-weight: bold; font-size: 20px;">S</span>';
                    }}
                />
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                  Instalar Superação
                </h3>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>
                  Adicione à sua tela de início
                </p>
              </div>
            </div>

            <div style={{ 
              background: 'var(--surface-accent)', 
              borderRadius: '16px', 
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ 
                  background: 'white', 
                  width: '32px', 
                  height: '32px', 
                  borderRadius: '8px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
                }}>
                  <Share size={18} color="#007AFF" />
                </div>
                <p style={{ fontSize: '14px', color: 'var(--text-primary)', margin: 0 }}>
                  1. Toque no ícone de <strong>Compartilhar</strong> na barra inferior.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ 
                  background: 'white', 
                  width: '32px', 
                  height: '32px', 
                  borderRadius: '8px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
                }}>
                  <PlusSquare size={18} color="#000" />
                </div>
                <p style={{ fontSize: '14px', color: 'var(--text-primary)', margin: 0 }}>
                  2. Role para baixo e selecione <strong>Adicionar à Tela de Início</strong>.
                </p>
              </div>
            </div>

            <button 
              onClick={handleDismiss}
              style={{
                background: 'var(--primary-gradient)',
                color: 'white',
                border: 'none',
                borderRadius: '14px',
                padding: '12px',
                fontWeight: '600',
                fontSize: '15px',
                cursor: 'pointer',
                boxShadow: 'var(--shadow-active)'
              }}
            >
              Entendi
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default IOSInstallPrompt;
