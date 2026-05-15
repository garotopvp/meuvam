import React from 'react';
import { Smartphone, Globe, Compass, CheckCircle2, Tablet, ArrowDownCircle } from 'lucide-react';

const InstallView = () => {
  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#f8fafc', 
      color: '#0f172a', 
      fontFamily: '"Inter", -apple-system, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '2rem'
    }}>
      {/* Header */}
      <div style={{ 
        width: '100%', 
        maxWidth: '450px', 
        textAlign: 'center',
        marginTop: 'calc(2rem + var(--safe-area-top))',
        animation: 'fadeIn 0.6s ease-out'
      }}>
        <div style={{ 
          width: '90px', 
          height: '90px', 
          background: '#ffffff',
          borderRadius: '22px',
          margin: '0 auto 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden'
        }}>
          <img src="/assets/logo.png" alt="MeuVAM Logo" style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
        </div>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.25rem', color: '#1e293b' }}>MeuVAM</h1>
        <p style={{ color: '#64748b', fontSize: '1rem', fontWeight: 500, marginBottom: '2.5rem' }}>Assessoria Esportiva Superação</p>
      </div>

      {/* Chamada Principal */}
      <div style={{ 
        width: '100%', 
        maxWidth: '450px', 
        textAlign: 'center',
        marginBottom: '2.5rem',
        padding: '0 10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#007aff', marginBottom: '10px' }}>
            <ArrowDownCircle size={24} />
            <span style={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '1px' }}>Instalação rápida</span>
        </div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, lineHeight: '1.3' }}>Siga as instruções abaixo para baixar o App no seu celular</h2>
      </div>

      {/* GUIA ANDROID */}
      <div style={{ 
        width: '100%', 
        maxWidth: '450px', 
        background: '#fff', 
        borderRadius: '24px', 
        padding: '2rem',
        border: '1px solid #e2e8f0',
        marginBottom: '1.5rem',
        boxShadow: '0 4px 6px rgba(0,0,0,0.02)'
      }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px', color: '#10b981' }}>
          <Smartphone size={22} /> Para usuários ANDROID
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', gap: '15px' }}>
            <div style={{ minWidth: '28px', height: '28px', background: '#f0fdf4', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#10b981', fontSize: '0.85rem' }}>1</div>
            <p style={{ fontSize: '0.95rem', color: '#475569', lineHeight: '1.4' }}>Abra este link no navegador <b>Google Chrome</b>.</p>
          </div>
          <div style={{ display: 'flex', gap: '15px' }}>
            <div style={{ minWidth: '28px', height: '28px', background: '#f0fdf4', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#10b981', fontSize: '0.85rem' }}>2</div>
            <p style={{ fontSize: '0.95rem', color: '#475569', lineHeight: '1.4' }}>Toque nos <b>três pontinhos</b> no canto superior direito do navegador.</p>
          </div>
          <div style={{ display: 'flex', gap: '15px' }}>
            <div style={{ minWidth: '28px', height: '28px', background: '#f0fdf4', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#10b981', fontSize: '0.85rem' }}>3</div>
            <p style={{ fontSize: '0.95rem', color: '#475569', lineHeight: '1.4' }}>Selecione <b>"Instalar aplicativo"</b> ou "Adicionar à tela inicial".</p>
          </div>
        </div>
      </div>

      {/* GUIA IOS */}
      <div style={{ 
        width: '100%', 
        maxWidth: '450px', 
        background: '#fff', 
        borderRadius: '24px', 
        padding: '2rem',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 6px rgba(0,0,0,0.02)',
        marginBottom: '3rem'
      }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px', color: '#007aff' }}>
          <Tablet size={22} /> Para usuários iPHONE (iOS)
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', gap: '15px' }}>
            <div style={{ minWidth: '28px', height: '28px', background: '#eff6ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#007aff', fontSize: '0.85rem' }}>1</div>
            <p style={{ fontSize: '0.95rem', color: '#475569', lineHeight: '1.4' }}>Abra este link obrigatoriamente no navegador <b>Safari</b>.</p>
          </div>
          <div style={{ display: 'flex', gap: '15px' }}>
            <div style={{ minWidth: '28px', height: '28px', background: '#eff6ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#007aff', fontSize: '0.85rem' }}>2</div>
            <p style={{ fontSize: '0.95rem', color: '#475569', lineHeight: '1.4' }}>Toque no ícone de <b>Compartilhar</b> <Compass size={16} style={{ verticalAlign: 'middle', display: 'inline' }} /> (quadrado com seta para cima).</p>
          </div>
          <div style={{ display: 'flex', gap: '15px' }}>
            <div style={{ minWidth: '28px', height: '28px', background: '#eff6ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#007aff', fontSize: '0.85rem' }}>3</div>
            <p style={{ fontSize: '0.95rem', color: '#475569', lineHeight: '1.4' }}>Role as opções e toque em <b>"Adicionar à Tela de Início"</b>.</p>
          </div>
        </div>
      </div>

      <footer style={{ marginTop: 'auto', padding: '2rem 0', textAlign: 'center', opacity: 0.3 }}>
        <p style={{ fontSize: '0.75rem', fontWeight: 700 }}>MEUVAM &copy; 2026</p>
      </footer>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default InstallView;
