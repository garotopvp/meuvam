import React, { useState } from 'react';
import { 
  Zap, 
  Mail, 
  Lock, 
  User as UserIcon, 
  Loader2 
} from 'lucide-react';
import { supabase } from '../lib/supabase';

const AuthView = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: { data: { full_name: name } }
        });
        if (error) throw error;
      }
    } catch (err) {
      let errorMsg = err.message;
      if (errorMsg === 'Invalid login credentials') errorMsg = 'E-mail ou senha incorretos.';
      else if (errorMsg === 'User already registered') errorMsg = 'Este e-mail já está em uso.';
      else if (errorMsg.includes('Password should be at least')) errorMsg = 'A senha deve ter pelo menos 6 caracteres.';
      else if (errorMsg.includes('Email not confirmed')) errorMsg = 'Por favor, confirme seu e-mail antes de entrar.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

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
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ 
          width: '64px', height: '64px', background: 'var(--primary-color)', 
          borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1.5rem', boxShadow: '0 8px 16px rgba(0,122,255,0.25)'
        }}>
          <Zap color="#fff" size={32} fill="#fff" />
        </div>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: '8px' }}>Superação</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Assessoria de Corrida</p>
      </div>

      <div className="card" style={{ width: '100%', maxWidth: '380px', padding: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>
          {isLogin ? 'Bem-vindo de volta' : 'Criar sua conta'}
        </h2>

        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {!isLogin && (
            <div style={{ position: 'relative' }}>
              <UserIcon size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input 
                className="auth-input"
                type="text" placeholder="Seu nome completo" required 
                value={name} onChange={e => setName(e.target.value)}
              />
            </div>
          )}
          <div style={{ position: 'relative' }}>
            <Mail size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input 
              className="auth-input"
              type="email" placeholder="E-mail" required 
              value={email} onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div style={{ position: 'relative' }}>
            <Lock size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input 
              className="auth-input"
              type="password" placeholder="Senha" required 
              value={password} onChange={e => setPassword(e.target.value)}
            />
          </div>

          {error && <p style={{ color: 'var(--error)', fontSize: '0.85rem', marginTop: '4px' }}>{error}</p>}
          {error === 'E-mail ou senha incorretos.' && isLogin && (
            <button 
              type="button"
              onClick={async () => {
                if (!email) return setError('Por favor, digite seu e-mail para recuperar a senha.');
                setLoading(true);
                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                  redirectTo: 'https://meuvam.com.br/',
                });
                setLoading(false);
                if (error) setError('Erro ao enviar e-mail de recuperação.');
                else setError('E-mail de recuperação enviado! Verifique sua caixa de entrada.');
              }}
              style={{ background: 'none', border: 'none', color: 'var(--primary-color)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', textAlign: 'right', marginTop: '-8px' }}
            >
              Esqueci minha senha
            </button>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="btn-primary" 
            style={{ marginTop: '0.5rem', background: 'var(--primary-color)', color: '#fff', border: 'none', padding: '14px', borderRadius: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : (isLogin ? 'Entrar' : 'Cadastrar')}
          </button>
        </form>

        <p style={{ marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          {isLogin ? 'Ainda não tem conta?' : 'Já possui uma conta?'} {' '}
          <button 
            onClick={() => setIsLogin(!isLogin)}
            style={{ background: 'none', border: 'none', color: 'var(--primary-color)', fontWeight: 600, cursor: 'pointer' }}
          >
            {isLogin ? 'Cadastre-se' : 'Faça login'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default AuthView;
