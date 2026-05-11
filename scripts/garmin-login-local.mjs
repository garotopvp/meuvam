/**
 * GARMIN LOGIN LOCAL
 * ==================
 * Roda APENAS na sua máquina (não na Vercel).
 * Faz login no Garmin localmente, pega o token e salva no Supabase.
 * Depois disso, o app na Vercel usa o token salvo automaticamente.
 *
 * COMO USAR:
 *   node scripts/garmin-login-local.mjs EMAIL SENHA ATHLETE_ID
 *
 * EXEMPLO:
 *   node scripts/garmin-login-local.mjs rinaldopedroso@gmail.com minhasenha abc-123-def
 *
 * Para achar o ATHLETE_ID: abra o Supabase > tabela "athletes" > coluna "id"
 */

import GarminConnect from 'garmin-connect';
import { createClient } from '@supabase/supabase-js';

// ── Configurações (iguais ao .env) ────────────────────────────────────────────
const SUPABASE_URL  = 'https://zljqlzwzwfzslftnymur.supabase.co';
const SUPABASE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsanFsend6d2Z6c2xmdG55bXVyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzM5MzQxNywiZXhwIjoyMDkyOTY5NDE3fQ.wJhriqog-ONdyulT2NG_puY_-Xj7OMDMPt7x_hnoRSQ';

// ── Argumentos da linha de comando ────────────────────────────────────────────
const [,, email, password, athleteId] = process.argv;

if (!email || !password || !athleteId) {
  console.error('\n❌ Uso: node scripts/garmin-login-local.mjs EMAIL SENHA ATHLETE_ID\n');
  console.error('   Ex: node scripts/garmin-login-local.mjs rinaldopedroso@gmail.com minhasenha abc-123-def');
  console.error('\n   Para achar o ATHLETE_ID: Supabase → tabela "athletes" → coluna "id"\n');
  process.exit(1);
}

// ── Login ─────────────────────────────────────────────────────────────────────
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log(`\n🔐 Tentando login no Garmin como: ${email}`);
console.log('   (Isso pode levar 5-15 segundos...)\n');

try {
  const GarminConstructor = GarminConnect.GarminConnect || GarminConnect;
  const client = new GarminConstructor({ username: email, password });
  await client.login();
  
  console.log('✅ Login no Garmin realizado com sucesso!');

  // Exporta o token de sessão
  const tokens = client.exportToken();
  const displayName = email.split('@')[0];

  console.log('💾 Salvando token no Supabase...');

  const { error: upsertError } = await supabase.from('integrations').upsert({
    athlete_id: athleteId,
    platform: 'garmin',
    username: displayName,
    connected: true,
    access_token: JSON.stringify(tokens),
    updated_at: new Date().toISOString()
  }, { onConflict: 'athlete_id, platform' });

  if (upsertError) {
    console.error('❌ Erro ao salvar no Supabase:', upsertError.message);
    process.exit(1);
  }

  console.log('\n🎉 Pronto! Token do Garmin salvo com sucesso no banco de dados.');
  console.log('   O app na Vercel agora consegue acessar seus treinos do Garmin.');
  console.log(`   Atleta: ${displayName} | ID: ${athleteId}\n`);

} catch (err) {
  console.error('\n❌ Erro ao fazer login no Garmin:', err.message);
  console.error('   Verifique se o email e senha estão corretos.\n');
  process.exit(1);
}
