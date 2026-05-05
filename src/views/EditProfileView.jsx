import React, { useState } from 'react';

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
  const [formError, setFormError] = useState('');

  const upd = (key, val) => {
    setTemp(prev => {
      const newState = { ...prev, [key]: val };
      // Auto calculate Max HR when birthDate changes
      if (key === 'birthDate' && val) {
        const birth = new Date(val);
        const now = new Date();
        let age = now.getFullYear() - birth.getFullYear();
        if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age--;
        if (age > 0 && age < 120) {
          newState.maxHr = 220 - age;
        }
      }
      return newState;
    });
  };

  return (
    <div className="animate-slide-up" style={{ paddingBottom: '2rem' }}>
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
              <option value="Outro">Outro</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={labelStyle}>⚡ VAM (Pace ou km/h)</label>
            <input style={inputStyle} placeholder="ex: 4:30 ou 13.5" value={temp.vam} onChange={(e) => upd('vam', e.target.value)} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={labelStyle}>❤️ FC Máxima (bpm)</label>
            <input type="number" style={inputStyle} placeholder="ex: 185" value={temp.maxHr} onChange={(e) => upd('maxHr', e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={labelStyle}>⚖️ Peso (kg)</label>
          <input type="number" style={inputStyle} placeholder="ex: 70" value={temp.weight} onChange={(e) => upd('weight', e.target.value)} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={labelStyle}>🏁 Próxima Prova (Desafio)</label>
          <input style={inputStyle} placeholder="Ex: Maratona de SP" value={temp.nextRaceName} onChange={(e) => upd('nextRaceName', e.target.value)} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={labelStyle}>📅 Data da Prova</label>
          <input type="date" style={inputStyle} value={temp.nextRaceDate} onChange={(e) => upd('nextRaceDate', e.target.value)} />
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

        {formError && (
          <p style={{ color: 'var(--error)', fontSize: '0.85rem', fontWeight: 600, padding: '10px 14px', background: 'rgba(255,59,48,0.08)', borderRadius: '12px', marginTop: '0.5rem' }}>
            {formError}
          </p>
        )}
        <button 
          className="btn-primary" 
          onClick={() => {
            if (!temp.name || temp.name.trim() === '') {
              setFormError('O nome é obrigatório.');
              return;
            }
            if (!temp.birthDate) {
              setFormError('A data de nascimento é obrigatória.');
              return;
            }
            setFormError('');
            onSave(temp);
          }}
          style={{ width: '100%', padding: '1rem', marginTop: '1rem' }}
        >
          Salvar Alterações
        </button>
      </div>
    </div>
  );
};

export default EditProfileView;
