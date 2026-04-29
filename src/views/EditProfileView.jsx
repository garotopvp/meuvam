import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';

const inputStyle = {
  width: '100%', padding: '1rem', borderRadius: '16px',
  border: '1px solid var(--border-color)', background: 'var(--surface-accent)',
  fontSize: '1rem', fontWeight: 500, outline: 'none', fontFamily: 'inherit',
  color: 'var(--text-primary)'
};

const labelStyle = {
  fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)',
  textTransform: 'uppercase', paddingLeft: '4px'
};

const objectives = ["5km", "10km", "Meia Maratona", "Maratona", "Trail", "Saúde e Bem-estar"];

const EditProfileView = ({ athlete, onSave, onCancel }) => {
  const [temp, setTemp] = useState({ ...athlete });
  const upd = (key, val) => setTemp({ ...temp, [key]: val });

  return (
    <div className="animate-slide-up">
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Editar Perfil</h2>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={labelStyle}>Nome Completo</label>
          <input style={inputStyle} value={temp.name} onChange={(e) => upd('name', e.target.value)} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={labelStyle}>📅 Nascimento</label>
            <input type="date" style={inputStyle} value={temp.birthDate} onChange={(e) => upd('birthDate', e.target.value)} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={labelStyle}>👤 Gênero</label>
            <select style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }} value={temp.gender} onChange={(e) => upd('gender', e.target.value)}>
              <option value="Masculino">Masculino</option>
              <option value="Feminino">Feminino</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={labelStyle}>🎯 Objetivo Principal</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {objectives.map(obj => (
              <button 
                key={obj}
                onClick={() => upd('objective', obj)}
                style={{
                  padding: '8px 16px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 600,
                  border: temp.objective === obj ? '1px solid var(--primary-color)' : '1px solid var(--border-color)',
                  background: temp.objective === obj ? 'rgba(0,122,255,0.05)' : 'transparent',
                  color: temp.objective === obj ? 'var(--primary-color)' : 'var(--text-secondary)'
                }}
              >
                {obj}
              </button>
            ))}
          </div>
        </div>

        <button 
          className="btn-primary" 
          onClick={() => onSave(temp)}
          style={{ width: '100%', padding: '1rem', marginTop: '1rem' }}
        >
          Salvar Alterações
        </button>
      </div>
    </div>
  );
};

export default EditProfileView;
