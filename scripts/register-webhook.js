import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Carregar variáveis de ambiente do .env da raiz
dotenv.config({ path: join(__dirname, '../.env') });

const clientId = process.env.STRAVA_CLIENT_ID;
const clientSecret = process.env.STRAVA_CLIENT_SECRET;
const verifyToken = process.env.STRAVA_WEBHOOK_VERIFY_TOKEN || 'superacao_webhook_token_2026';

// URL de produção do seu aplicativo (mude se usar outro domínio)
const PRODUCTION_URL = 'https://www.meuvam.com.br'; 
const callbackUrl = `${PRODUCTION_URL}/api/strava/webhook`;

async function registerWebhook() {
  if (!clientId || !clientSecret) {
    console.error('❌ Erro: STRAVA_CLIENT_ID ou STRAVA_CLIENT_SECRET não definidos no arquivo .env!');
    process.exit(1);
  }

  console.log('=== REGISTRANDO ASSINATURA DE WEBHOOK NO STRAVA ===');
  console.log(`- Client ID: ${clientId}`);
  console.log(`- Callback URL: ${callbackUrl}`);
  console.log(`- Verify Token: ${verifyToken}`);
  console.log('--------------------------------------------------');

  const stravaUrl = 'https://www.strava.com/api/v3/push_subscriptions';

  // O Strava espera FormData tradicional na requisição de criação de assinatura
  const formData = new URLSearchParams();
  formData.append('client_id', clientId);
  formData.append('client_secret', clientSecret);
  formData.append('callback_url', callbackUrl);
  formData.append('verify_token', verifyToken);

  try {
    const response = await fetch(stravaUrl, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ SUCESSO! Webhook registrado com sucesso no Strava!');
      console.log('Dados da Assinatura:', JSON.stringify(data, null, 2));
    } else {
      console.error(`❌ ERRO (${response.status}) ao registrar webhook!`);
      console.error('Detalhes do erro do Strava:', JSON.stringify(data, null, 2));
      console.log('\nDica: Certifique-se de que o seu servidor de produção está online e que a URL do callback está acessível publicamente para o Strava validar o handshake.');
    }
  } catch (err) {
    console.error('❌ Falha crítica na requisição HTTP:', err.message);
  }
}

registerWebhook();
