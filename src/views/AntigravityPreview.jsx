import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Activity,
  Calendar,
  MessageCircle,
  TrendingUp,
  Users,
  Smartphone,
} from 'lucide-react';
import '../styles/antigravity-theme.css';

const features = [
  {
    icon: Calendar,
    title: 'Planilhas inteligentes',
    text: 'Treinos organizados por semana, com zonas de FC e ritmo alinhados ao seu coach.',
  },
  {
    icon: Activity,
    title: 'Atividades sincronizadas',
    text: 'Garmin e Strava integrados — seu histórico e mapas em um só lugar.',
  },
  {
    icon: MessageCircle,
    title: 'Coach no bolso',
    text: 'Chat direto com o professor, avisos e feedback sem sair do app.',
  },
  {
    icon: TrendingUp,
    title: 'Evolução visível',
    text: 'Gráficos e métricas para acompanhar volume, consistência e progresso.',
  },
];

const AntigravityPreview = () => {
  return (
    <div className="ag-page">
      <header className="ag-header">
        <Link to="/preview" className="ag-logo">
          <span className="ag-logo-mark" aria-hidden />
          Superação
        </Link>
        <button type="button" className="ag-menu-btn" aria-label="Menu">
          <span />
          <span />
          <span />
        </button>
      </header>

      <section className="ag-hero ag-grain">
        <div>
          <Link to="/" className="ag-back-link">
            <ArrowLeft size={16} />
            Voltar ao app
          </Link>
          <div className="ag-hero-logo">
            <div className="ag-logo-mark" aria-hidden />
            <div className="ag-logo" style={{ justifyContent: 'center' }}>
              Superação
            </div>
          </div>
          <h1>
            Corra mais alto com a assessoria do próximo nível
          </h1>
          <div className="ag-hero-actions">
            <Link to="/aluno" className="ag-btn ag-btn-primary">
              <Smartphone size={18} />
              Entrar como aluno
            </Link>
            <a href="/professor/resumo" className="ag-btn ag-btn-secondary">
              Área do professor
            </a>
          </div>
        </div>
      </section>

      <section className="ag-section ag-section-light">
        <h2>Feito para corredores na era do treino conectado</h2>
        <p className="ag-section-lead">
          O Superação une planilha, dados do relógio e comunicação com o coach — com a mesma
          clareza visual que você vê em produtos Google: limpo, confiável e sem distração.
        </p>
        <div className="ag-feature-grid">
          {features.map(({ icon: Icon, title, text }) => (
            <article key={title} className="ag-card">
              <div className="ag-card-icon">
                <Icon size={20} strokeWidth={1.75} />
              </div>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="ag-section ag-grain" style={{ background: 'var(--ag-bg-hero)' }}>
        <h2>Disponível para sua equipe</h2>
        <p className="ag-section-lead">
          Preview visual inspirado em antigravity.google — para você decidir se aplica ao app inteiro.
        </p>
        <div className="ag-cta-row">
          <div className="ag-cta-block">
            <p className="ag-label">Para atletas</p>
            <span className="ag-badge">App mobile</span>
            <h3>Alcance novas metas</h3>
            <Link to="/aluno" className="ag-btn ag-btn-primary">
              Abrir portal do aluno
            </Link>
          </div>
          <div className="ag-cta-block">
            <p className="ag-label">Para coaches</p>
            <span className="ag-badge">Painel web</span>
            <h3>Eleve toda a assessoria</h3>
            <a href="/professor/resumo" className="ag-btn ag-btn-secondary">
              <Users size={18} />
              Painel do professor
            </a>
          </div>
        </div>
      </section>

      <footer className="ag-footer">
        Preview de design · Inspirado em{' '}
        <a
          href="https://antigravity.google/"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'inherit', textDecoration: 'underline' }}
        >
          Google Antigravity
        </a>
        {' '}· Marca Superação preservada
      </footer>

      <div className="ag-preview-banner">
        Modo preview
        <Link to="/">Sair e ver app atual</Link>
      </div>
    </div>
  );
};

export default AntigravityPreview;
