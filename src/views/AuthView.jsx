import React, { useState } from 'react';
import { 
  Zap, 
  Mail, 
  Lock, 
  User as UserIcon, 
  Loader2,
  ChevronLeft,
  Eye,
  EyeOff,
  ArrowLeft
} from 'lucide-react';
import { supabase } from '../lib/supabase';

const AuthView = ({ onBack }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('signup') === 'true' || window.location.pathname.includes('/cadastro')) {
      setIsLogin(false);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsResettingPassword(true);
        setError('Digite sua nova senha abaixo e salve.');
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleRecoverPassword = async () => {
    if (!email) {
      setError('Por favor, digite seu e-mail acima para recuperar a senha.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      setError('E-mail de recuperação enviado! Verifique sua caixa de entrada.');
    } catch (err) {
      setError('Erro ao enviar e-mail: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isResettingPassword) {
        if (password !== confirmPassword) {
          throw new Error('As senhas não coincidem.');
        }
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
        if (password !== confirmPassword) {
          throw new Error('As senhas não coincidem.');
        }
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
      background: '#f8fafc',
      textAlign: 'center'
    }}>
      {/* Botão de Voltar Padronizado */}
      <button 
        onClick={onBack}
        style={{ 
          position: 'absolute', 
          top: 'calc(1.5rem + var(--safe-area-top))', 
          left: '1.5rem', 
          background: '#fff', 
          border: '1px solid #e2e8f0', 
          color: '#64748b', 
          cursor: 'pointer', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          padding: '10px 16px',
          borderRadius: '12px',
          fontSize: '0.85rem',
          fontWeight: 700,
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
          transition: 'all 0.2s'
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#0f172a'; e.currentTarget.style.transform = 'translateX(-4px)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.transform = 'translateX(0)'; }}
      >
        <ArrowLeft size={18} /> Voltar
      </button>


      <div style={{ marginBottom: '1rem', animation: 'fadeIn 0.8s ease-out' }}>
        <div style={{ 
          width: '220px', 
          height: '220px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          margin: '0 auto',
          position: 'relative'
        }}>
          <img 
            src="/assets/logo.png" 
            alt="Superação Logo" 
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'contain'
            }} 
          />
        </div>
      </div>

      <div className="card" style={{ 
        width: '100%', 
        maxWidth: '380px', 
        padding: '2.5rem 2rem',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '24px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.03)'
      }}>
        <div style={{ display: 'inline-block', padding: '4px 12px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--primary-color)', borderRadius: '100px', fontSize: '11px', fontWeight: 800, marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {window.location.pathname.includes('professor') ? 'Portal do Professor' : 'Portal do Aluno'}
        </div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '2rem', color: '#0f172a' }}>
          {isLogin ? 'Bem-vindo de volta' : 'Crie sua conta'}
        </h2>

        {error && (
          <div style={{ 
            padding: '12px', 
            borderRadius: '12px', 
            background: error.includes('sucesso') ? '#f0fdf4' : '#fef2f2', 
            color: error.includes('sucesso') ? '#166534' : '#991b1b',
            border: `1px solid ${error.includes('sucesso') ? '#bbf7d0' : '#fecaca'}`,
            fontSize: '0.85rem',
            marginBottom: '20px',
            fontWeight: 500
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {!isLogin && !isResettingPassword && (
            <div style={{ position: 'relative' }}>
              <UserIcon size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input 
                className="auth-input"
                type="text" placeholder="Seu nome completo" required 
                value={name} onChange={e => setName(e.target.value)}
                style={{ paddingLeft: '48px' }}
              />
            </div>
          )}
          {!isResettingPassword && (
            <div style={{ position: 'relative' }}>
              <Mail size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input 
                className="auth-input"
                type="email" placeholder="E-mail" required 
                value={email} onChange={e => setEmail(e.target.value)}
                style={{ paddingLeft: '48px' }}
              />
            </div>
          )}
          <div style={{ position: 'relative' }}>
            <Lock size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input 
              className="auth-input"
              type={showPassword ? "text" : "password"} 
              placeholder={isResettingPassword ? "Digite a NOVA senha" : "Senha"} required 
              value={password} onChange={e => setPassword(e.target.value)}
              style={{ paddingLeft: '48px', paddingRight: '48px' }}
            />
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {(!isLogin || isResettingPassword) && (
            <div style={{ position: 'relative' }}>
              <Lock size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input 
                className="auth-input"
                type={showPassword ? "text" : "password"} 
                placeholder="Confirme a senha" required 
                value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                style={{ paddingLeft: '48px', paddingRight: '48px' }}
              />
            </div>
          )}

          {isLogin && !isResettingPassword && (
            <div style={{ textAlign: 'right', marginTop: '-4px', marginBottom: '8px' }}>
              <button 
                type="button"
                onClick={handleRecoverPassword}
                style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
              >
                Esqueceu a senha?
              </button>
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="btn-primary" 
            style={{ 
              marginTop: '0.5rem', 
              background: 'var(--primary-color)', 
              color: '#fff', 
              border: 'none', 
              padding: '16px', 
              borderRadius: '16px', 
              fontWeight: 800, 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)'
            }}
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : (isResettingPassword ? 'Salvar Nova Senha' : isLogin ? 'Entrar no App' : 'Cadastrar Conta')}

          </button>
        </form>

        {!isResettingPassword && (
          <p style={{ marginTop: '2rem', fontSize: '0.9rem', color: '#64748b', fontWeight: 500 }}>
            {isLogin ? 'Ainda não tem conta?' : 'Já possui uma conta?'} {' '}
            <button 
              onClick={() => setIsLogin(!isLogin)}
              style={{ background: 'none', border: 'none', color: 'var(--primary-color)', fontWeight: 800, cursor: 'pointer' }}
            >
              {isLogin ? 'Cadastre-se' : 'Faça login'}
            </button>
          </p>
        )}
      </div>
    </div>
  );
};

export default AuthView;
