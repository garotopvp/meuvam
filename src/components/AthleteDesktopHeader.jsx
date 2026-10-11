import React from 'react';
import { 
  Zap, 
  Activity, 
  LogOut, 
  Download,
  Calendar,
  Users,
  MessageSquare,
  User
} from 'lucide-react';
import { Button } from './ui/button';

export default function AthleteDesktopHeader({
  athlete,
  navigate,
  location,
  deferredPrompt,
  onInstall,
  onLogout
}) {
  const pathname = location?.pathname || '/aluno';

  const isTabActive = (path) => {
    if (path === '/aluno') {
      return pathname === '/aluno' || pathname === '/aluno/' || pathname === '/aluno/treinos' || pathname.startsWith('/aluno/treinos/');
    }
    return pathname.startsWith(path);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5">
        {/* Logo e Assessoria */}
        <div className="flex items-center gap-6">
          <div 
            onClick={() => navigate('/aluno')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 p-1 dark:bg-slate-800 transition group-hover:scale-105">
              <img 
                src="/assets/logo.png" 
                alt="Superação" 
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">MeuVAM</span>
              </div>
              <p className="text-[11px] text-slate-400">Assessoria Superação</p>
            </div>
          </div>

          {/* Links Desktop - Ícones Profissionais Vetoriais */}
          <nav className="flex items-center gap-1.5 border-l border-slate-200 pl-4 dark:border-slate-800 text-xs font-semibold">
            <button 
              onClick={() => navigate('/aluno')} 
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 transition-all font-bold ${
                isTabActive('/aluno')
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
              }`}
            >
              <Calendar className="h-4 w-4" />
              <span>Calendário de Treinos</span>
            </button>
            <button 
              onClick={() => navigate('/aluno/feed')} 
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 transition-all font-bold ${
                isTabActive('/aluno/feed')
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Comunidade</span>
            </button>
            <button 
              onClick={() => navigate('/aluno/coach')} 
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 transition-all font-bold ${
                isTabActive('/aluno/coach')
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
              }`}
            >
              <MessageSquare className="h-4 w-4" />
              <span>Coach IA</span>
            </button>
            <button 
              onClick={() => navigate('/aluno/perfil')} 
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 transition-all font-bold ${
                isTabActive('/aluno/perfil')
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
              }`}
            >
              <User className="h-4 w-4" />
              <span>Meu Perfil</span>
            </button>
          </nav>
        </div>

        {/* Métricas rápidas no topo */}
        <div className="hidden lg:flex items-center gap-4">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50 px-3 py-1.5 dark:border-slate-800 dark:bg-slate-800/60">
            <Zap className="h-4 w-4 text-cyan-500" />
            <div className="text-left leading-tight">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Seu VAM</p>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{athlete?.vam ? `${athlete.vam} km/h` : '15.5 km/h'}</p>
            </div>
          </div>
        </div>

        {/* Perfil e Ações */}
        <div className="flex items-center gap-3">
          {deferredPrompt && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onInstall}
              className="gap-1.5 text-xs font-semibold"
            >
              <Download className="h-3.5 w-3.5" />
              Instalar App no PC
            </Button>
          )}

          <div 
            onClick={() => navigate('/aluno/perfil')}
            className="flex items-center gap-2.5 border-l border-slate-200 pl-3 dark:border-slate-800 cursor-pointer"
          >
            <div className="h-9 w-9 overflow-hidden rounded-full border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
              {athlete?.profileImage ? (
                <img src={athlete.profileImage} alt={athlete?.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center font-bold text-blue-600 text-xs">
                  {athlete?.name ? athlete.name.charAt(0) : 'A'}
                </div>
              )}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold leading-none text-slate-900 dark:text-white">{athlete?.name || 'Atleta'}</p>
              <p className="text-[10px] text-slate-400">Atleta</p>
            </div>
          </div>

          {onLogout && (
            <button 
              onClick={onLogout}
              title="Sair da Conta"
              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-red-600 dark:hover:bg-slate-800"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
