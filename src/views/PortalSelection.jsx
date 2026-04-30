import React from 'react';
import { User, ShieldCheck, Zap, ChevronRight } from 'lucide-react';

const PortalSelection = ({ onSelectAthlete, onSelectProfessor }) => {
  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '2rem',
      background: 'var(--bg-color)',
      textAlign: 'center'
    }}>
      <div style={{ marginBottom: '3rem', animation: 'fadeIn 0.8s ease-out' }}>
        <div style={{ 
          width: '80px', height: '80px', background: 'var(--primary-color)', 
          borderRadius: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1.5rem', boxShadow: '0 10px 25px rgba(0,122,255,0.3)'
        }}>
          <Zap color="#fff" size={40} fill="#fff" />
        </div>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-1px', marginBottom: '8px' }}>Superação</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', fontWeight: 500 }}>Assessoria Esportiva</p>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr', 
        gap: '1.5rem', 
        width: '100%', 
        maxWidth: '450px',
        animation: 'slideUp 0.6s ease-out' 
      }}>
        {/* Card Aluno */}
        <button 
          onClick={onSelectAthlete}
          style={{
            background: 'var(--card-bg)',
            border: '2px solid var(--border-color)',
            borderRadius: '24px',
            padding: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1.5rem',
            cursor: 'pointer',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            textAlign: 'left'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--primary-color)';
            e.currentTarget.style.transform = 'translateY(-5px)';
            e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-color)';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <div style={{ 
            width: '56px', height: '56px', background: 'rgba(0,122,255,0.1)', 
            borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--primary-color)'
          }}>
            <User size={28} />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '4px' }}>Sou Aluno</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Acesse seus treinos e fale com seu coach.</p>
          </div>
          <ChevronRight size={20} color="var(--text-secondary)" />
        </button>

        {/* Card Professor */}
        <button 
          onClick={onSelectProfessor}
          style={{
            background: 'var(--card-bg)',
            border: '2px solid var(--border-color)',
            borderRadius: '24px',
            padding: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1.5rem',
            cursor: 'pointer',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            textAlign: 'left'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--text-primary)';
            e.currentTarget.style.transform = 'translateY(-5px)';
            e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-color)';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <div style={{ 
            width: '56px', height: '56px', background: 'rgba(0,0,0,0.05)', 
            borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-primary)'
          }}>
            <ShieldCheck size={28} />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '4px' }}>Sou Professor</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Gestão de atletas e criação de planilhas.</p>
          </div>
          <ChevronRight size={20} color="var(--text-secondary)" />
        </button>
      </div>

      <p style={{ marginTop: '3rem', fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
        © {new Date().getFullYear()} Superação Assessoria. Todos os direitos reservados.
      </p>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default PortalSelection;
