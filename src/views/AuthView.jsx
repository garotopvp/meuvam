import React, { useState } from 'react';
import { 
  Zap, 
  Mail, 
  Lock, 
  User as UserIcon, 
  Loader2,
  ChevronRight
} from 'lucide-react';
import { supabase } from '../lib/supabase';

const AuthView = ({ onBack }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  React.useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsResettingPassword(true);
        setError('Digite sua nova senha abaixo e salve.');
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isResettingPassword) {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setError('Senha atualizada com sucesso! Você já está logado.');
        setIsResettingPassword(false);
        setTimeout(() => window.location.href = '/', 1500);
      } else if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        
        const user = data.user;
        if (user && (user.user_metadata?.role === 'professor' || user.email.includes('superacao'))) {
          await supabase.auth.signOut();
          throw new Error('Esta é uma conta de Professor e não pode ser usada no App do Aluno.');
        }
      } else {
        const { data, error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: { data: { full_name: name, role: 'athlete' } }
        });
        if (error) throw error;
        
        if (data.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert([
              { 
                id: data.user.id, 
                name: name, 
                email: email, 
                role: 'athlete' 
              }
            ]);
          if (profileError) console.error('Erro ao criar perfil:', profileError);
        }

        if (data.user && !data.session) {
          setError('Conta criada com sucesso! Por favor, verifique sua caixa de entrada (ou spam) para confirmar seu e-mail antes de entrar.');
          setIsLogin(true);
        }
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
      <button 
        onClick={onBack}
        style={{ position: 'absolute', top: '2rem', left: '2rem', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}
      >
        <ChevronRight size={18} style={{ transform: 'rotate(180deg)' }} /> Voltar
      </button>

      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ 
          width: '80px', 
          height: '80px', 
          background: 'white', 
          borderRadius: '20px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          margin: '0 auto 1.5rem',
          padding: '8px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.06)'
        }}>
          <img src="/assets/logo.png" alt="Superação Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: '8px' }}>Superação</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Assessoria de Corrida</p>
      </div>

      <div className="card" style={{ width: '100%', maxWidth: '380px', padding: '2rem' }}>
        <div style={{ display: 'inline-block', padding: '4px 12px', background: 'rgba(0, 122, 255, 0.1)', color: 'var(--primary-color)', borderRadius: '100px', fontSize: '11px', fontWeight: 700, marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Portal do Aluno
        </div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>
          {isLogin ? 'Bem-vindo de volta' : 'Criar sua conta'}
        </h2>

        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {!isLogin && !isResettingPassword && (
            <div style={{ position: 'relative' }}>
              <UserIcon size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input 
                className="auth-input"
                type="text" placeholder="Seu nome completo" required 
                value={name} onChange={e => setName(e.target.value)}
              />
            </div>
          )}
          {!isResettingPassword && (
            <div style={{ position: 'relative' }}>
              <Mail size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input 
                className="auth-input"
                type="email" placeholder="E-mail" required 
                value={email} onChange={e => setEmail(e.target.value)}
              />
            </div>
          )}
          <div style={{ position: 'relative' }}>
            <Lock size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input 
              className="auth-input"
              type="password" placeholder={isResettingPassword ? "Digite a NOVA senha" : "Senha"} required 
              value={password} onChange={e => setPassword(e.target.value)}
            />
          </div>

          {error && <p style={{ color: error.includes('sucesso') ? 'var(--primary-color)' : 'var(--error)', fontSize: '0.85rem', marginTop: '4px', fontWeight: error.includes('sucesso') ? 600 : 400 }}>{error}</p>}
          {error === 'E-mail ou senha incorretos.' && isLogin && (
            <button 
              type="button"
              onClick={async () => {
                if (!email) return setError('Por favor, digite seu e-mail para recuperar a senha.');
                setLoading(true);
                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                  redirectTo: window.location.origin,
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
            {loading ? <Loader2 className="animate-spin" size={20} /> : (isResettingPassword ? 'Salvar Nova Senha' : isLogin ? 'Entrar' : 'Cadastrar')}
          </button>
        </form>

        {!isResettingPassword && (
          <>
            <p style={{ marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              {isLogin ? 'Ainda não tem conta?' : 'Já possui uma conta?'} {' '}
              <button 
                onClick={() => setIsLogin(!isLogin)}
                style={{ background: 'none', border: 'none', color: 'var(--primary-color)', fontWeight: 600, cursor: 'pointer' }}
              >
                {isLogin ? 'Cadastre-se' : 'Faça login'}
              </button>
            </p>
            
            <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
              <button 
                onClick={() => window.location.href = '/paineldoprofessor/login.html'}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%' }}
              >
                Sou Professor? <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Acessar Portal do Coach</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthView;
