import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

const PRECO_UNITARIO = 62.99;
const TAMANHOS = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'XXG'];
const WHATSAPP_NUMERO = '5547996858698'; // Substitua pelo número real da equipe

const PedidoRegataView = () => {
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [quantidades, setQuantidades] = useState(
    Object.fromEntries(TAMANHOS.map(t => [t, 0]))
  );
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [erro, setErro] = useState('');

  const totalPecas = Object.values(quantidades).reduce((a, b) => a + b, 0);
  const totalValor = totalPecas * PRECO_UNITARIO;

  const alterarQtd = (tamanho, delta) => {
    setQuantidades(prev => ({
      ...prev,
      [tamanho]: Math.max(0, (prev[tamanho] || 0) + delta)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nome.trim()) { setErro('Por favor, informe seu nome.'); return; }
    if (totalPecas === 0) { setErro('Selecione ao menos 1 tamanho.'); return; }
    setErro('');
    setEnviando(true);

    const itensTexto = TAMANHOS
      .filter(t => quantidades[t] > 0)
      .map(t => `${t}: ${quantidades[t]}x`)
      .join(', ');

    const resumo = {
      nome,
      telefone,
      itens: quantidades,
      total_pecas: totalPecas,
      total_valor: totalValor,
      criado_em: new Date().toISOString(),
    };

    // Salvar no Supabase (tabela pedidos_regata)
    try {
      await supabase.from('pedidos_regata').insert([resumo]);
    } catch (_) {
      // fallback: salva no localStorage
      const existentes = JSON.parse(localStorage.getItem('pedidos_regata') || '[]');
      existentes.push(resumo);
      localStorage.setItem('pedidos_regata', JSON.stringify(existentes));
    }

    // Redirecionar para WhatsApp
    const mensagem = encodeURIComponent(
      `🏃 *Pedido - Regata Cavada Superação*\n\n` +
      `👤 *Nome:* ${nome}\n` +
      `📱 *Telefone:* ${telefone || 'Não informado'}\n\n` +
      `📦 *Tamanhos:*\n${TAMANHOS.filter(t => quantidades[t] > 0).map(t => `  • ${t}: ${quantidades[t]} un`).join('\n')}\n\n` +
      `🔢 *Total:* ${totalPecas} peça${totalPecas > 1 ? 's' : ''}\n` +
      `💰 *Valor:* R$ ${totalValor.toFixed(2).replace('.', ',')}\n\n` +
      `💳 *Pagamento via PIX:* superacao@assessoria.com.br\n` +
      `Após o pagamento, envie o comprovante aqui! ✅`
    );

    setSucesso(true);
    setEnviando(false);

    setTimeout(() => {
      window.open(`https://wa.me/${WHATSAPP_NUMERO}?text=${mensagem}`, '_blank');
    }, 800);
  };

  if (sucesso) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.successIcon}>✅</div>
          <h2 style={styles.successTitle}>Pedido registrado!</h2>
          <p style={styles.successText}>
            Você será redirecionado para o WhatsApp da equipe para enviar o comprovante do PIX.
          </p>
          <p style={styles.pixKey}>
            🔑 Chave PIX: <strong>superacao@assessoria.com.br</strong>
          </p>
          <button
            style={styles.btnPrimary}
            onClick={() => {
              setSucesso(false);
              setNome('');
              setTelefone('');
              setQuantidades(Object.fromEntries(TAMANHOS.map(t => [t, 0])));
            }}
          >
            Fazer outro pedido
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.badge}>🆕 Lançamento</div>
        <h1 style={styles.titulo}>Regata Cavada<br />Superação</h1>
        <p style={styles.subtitulo}>Confecção Z-NINE · R$ {PRECO_UNITARIO.toFixed(2).replace('.', ',')} por peça</p>
        <div style={styles.imagemContainer}>
          <img
            src="/images/regata-cavada-superacao.png"
            alt="Regata Cavada Superação"
            style={styles.imagem}
            onError={e => { e.target.style.display = 'none'; }}
          />
        </div>
      </div>

      {/* Formulário */}
      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Seus dados</h3>
          <div style={styles.field}>
            <label style={styles.label}>Nome completo *</label>
            <input
              type="text"
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Ex: João Silva"
              style={styles.input}
              required
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>WhatsApp</label>
            <input
              type="tel"
              value={telefone}
              onChange={e => setTelefone(e.target.value)}
              placeholder="(47) 99999-9999"
              style={styles.input}
            />
          </div>
        </div>

        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Selecione os tamanhos</h3>
          <p style={styles.hint}>Toque em + ou − para ajustar a quantidade por tamanho</p>

          <div style={styles.tamanhosGrid}>
            {TAMANHOS.map(tam => (
              <div key={tam} style={{
                ...styles.tamanhoCard,
                ...(quantidades[tam] > 0 ? styles.tamanhoCardAtivo : {})
              }}>
                <span style={styles.tamanhoLabel}>{tam}</span>
                <div style={styles.tamanhoControles}>
                  <button
                    type="button"
                    onClick={() => alterarQtd(tam, -1)}
                    style={styles.btnControle}
                    disabled={quantidades[tam] === 0}
                  >
                    −
                  </button>
                  <span style={styles.tamanhoQtd}>{quantidades[tam]}</span>
                  <button
                    type="button"
                    onClick={() => alterarQtd(tam, 1)}
                    style={{ ...styles.btnControle, ...styles.btnMais }}
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Resumo */}
        {totalPecas > 0 && (
          <div style={styles.resumoCard}>
            <div style={styles.resumoRow}>
              <span style={styles.resumoLabel}>Total de peças</span>
              <span style={styles.resumoValor}>{totalPecas}</span>
            </div>
            <div style={styles.divider} />
            <div style={styles.resumoRow}>
              <span style={{ ...styles.resumoLabel, fontWeight: 700 }}>Valor total</span>
              <span style={styles.resumoTotal}>
                R$ {totalValor.toFixed(2).replace('.', ',')}
              </span>
            </div>
          </div>
        )}

        {erro && <p style={styles.erro}>{erro}</p>}

        <button
          type="submit"
          disabled={enviando || totalPecas === 0}
          style={{
            ...styles.btnPrimary,
            opacity: (enviando || totalPecas === 0) ? 0.5 : 1,
            cursor: (enviando || totalPecas === 0) ? 'not-allowed' : 'pointer',
          }}
        >
          {enviando ? '⏳ Registrando...' : '📲 Confirmar pedido via WhatsApp'}
        </button>

        <div style={styles.pixInfo}>
          <p>💳 Pagamento via PIX após confirmação</p>
          <p style={{ fontWeight: 700 }}>superacao@assessoria.com.br</p>
        </div>
      </form>
    </div>
  );
};

const styles = {
  page: {
    minHeight: '100vh',
    background: 'var(--bg-color, #f5f5f5)',
    paddingBottom: '100px',
  },
  header: {
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    color: 'white',
    padding: '2rem 1.5rem 1.5rem',
    textAlign: 'center',
  },
  badge: {
    display: 'inline-block',
    background: 'rgba(255,255,255,0.15)',
    color: 'white',
    fontSize: '0.75rem',
    fontWeight: 700,
    letterSpacing: '0.08em',
    padding: '4px 12px',
    borderRadius: '100px',
    marginBottom: '0.75rem',
    textTransform: 'uppercase',
  },
  titulo: {
    fontSize: '2rem',
    fontWeight: 900,
    letterSpacing: '-0.04em',
    lineHeight: 1.15,
    margin: '0 0 0.4rem',
  },
  subtitulo: {
    fontSize: '0.95rem',
    opacity: 0.75,
    margin: '0 0 1.5rem',
    fontWeight: 500,
  },
  imagemContainer: {
    width: '100%',
    maxWidth: '280px',
    margin: '0 auto',
    borderRadius: '16px',
    overflow: 'hidden',
    background: 'rgba(255,255,255,0.05)',
  },
  imagem: {
    width: '100%',
    height: 'auto',
    display: 'block',
  },
  form: {
    padding: '1.25rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  card: {
    background: 'var(--surface-color, white)',
    borderRadius: '16px',
    padding: '1.25rem',
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
  },
  sectionTitle: {
    fontSize: '1rem',
    fontWeight: 700,
    color: 'var(--text-primary, #1a1a2e)',
    margin: '0 0 0.75rem',
    letterSpacing: '-0.02em',
  },
  field: {
    marginBottom: '0.75rem',
  },
  label: {
    display: 'block',
    fontSize: '0.8rem',
    fontWeight: 600,
    color: 'var(--text-secondary, #666)',
    marginBottom: '0.35rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  input: {
    width: '100%',
    padding: '0.7rem 1rem',
    borderRadius: '10px',
    border: '1.5px solid var(--border-color, #e5e5e5)',
    fontSize: '0.95rem',
    background: 'var(--bg-color, #f9f9f9)',
    color: 'var(--text-primary, #1a1a2e)',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  },
  hint: {
    fontSize: '0.8rem',
    color: 'var(--text-secondary, #888)',
    marginBottom: '1rem',
    margin: '-0.25rem 0 1rem',
  },
  tamanhosGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '0.6rem',
  },
  tamanhoCard: {
    border: '1.5px solid var(--border-color, #e5e5e5)',
    borderRadius: '12px',
    padding: '0.75rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
    background: 'var(--bg-color, #f9f9f9)',
    transition: 'all 0.2s ease',
  },
  tamanhoCardAtivo: {
    border: '1.5px solid #0f3460',
    background: 'rgba(15, 52, 96, 0.06)',
  },
  tamanhoLabel: {
    fontSize: '1rem',
    fontWeight: 800,
    color: 'var(--text-primary, #1a1a2e)',
    letterSpacing: '0.02em',
  },
  tamanhoControles: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
  },
  btnControle: {
    width: '30px',
    height: '30px',
    borderRadius: '50%',
    border: '1.5px solid var(--border-color, #ddd)',
    background: 'white',
    fontSize: '1.1rem',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: 'var(--text-primary, #333)',
    transition: 'all 0.15s',
    lineHeight: 1,
  },
  btnMais: {
    background: '#0f3460',
    border: '1.5px solid #0f3460',
    color: 'white',
  },
  tamanhoQtd: {
    fontSize: '1.1rem',
    fontWeight: 800,
    minWidth: '24px',
    textAlign: 'center',
    color: 'var(--text-primary, #1a1a2e)',
  },
  resumoCard: {
    background: 'linear-gradient(135deg, #1a1a2e, #0f3460)',
    borderRadius: '16px',
    padding: '1.25rem',
    color: 'white',
  },
  resumoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.25rem 0',
  },
  resumoLabel: {
    fontSize: '0.9rem',
    opacity: 0.8,
    fontWeight: 500,
  },
  resumoValor: {
    fontSize: '1rem',
    fontWeight: 700,
  },
  resumoTotal: {
    fontSize: '1.5rem',
    fontWeight: 900,
    letterSpacing: '-0.03em',
  },
  divider: {
    height: '1px',
    background: 'rgba(255,255,255,0.15)',
    margin: '0.6rem 0',
  },
  btnPrimary: {
    width: '100%',
    padding: '1rem',
    borderRadius: '14px',
    border: 'none',
    background: 'linear-gradient(135deg, #25d366, #128c7e)',
    color: 'white',
    fontSize: '1rem',
    fontWeight: 800,
    letterSpacing: '-0.01em',
    cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(37, 211, 102, 0.35)',
    transition: 'all 0.2s ease',
  },
  pixInfo: {
    textAlign: 'center',
    fontSize: '0.85rem',
    color: 'var(--text-secondary, #888)',
    lineHeight: 1.6,
  },
  erro: {
    color: '#e53e3e',
    fontSize: '0.85rem',
    fontWeight: 600,
    textAlign: 'center',
    padding: '0.5rem',
    background: 'rgba(229,62,62,0.08)',
    borderRadius: '8px',
  },
  successIcon: {
    fontSize: '3.5rem',
    textAlign: 'center',
    marginBottom: '1rem',
  },
  successTitle: {
    fontSize: '1.5rem',
    fontWeight: 900,
    textAlign: 'center',
    color: 'var(--text-primary, #1a1a2e)',
    letterSpacing: '-0.03em',
    margin: '0 0 0.5rem',
  },
  successText: {
    textAlign: 'center',
    color: 'var(--text-secondary, #666)',
    fontSize: '0.9rem',
    lineHeight: 1.6,
    margin: '0 0 1rem',
  },
  pixKey: {
    textAlign: 'center',
    background: 'rgba(15,52,96,0.08)',
    borderRadius: '10px',
    padding: '0.75rem',
    fontSize: '0.9rem',
    color: '#0f3460',
    marginBottom: '1.25rem',
  },
};

export default PedidoRegataView;
