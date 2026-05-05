import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: 'c:/Users/rinal/Desktop/Antigravity - Programas/Superação/Aplicativo Celular/.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const email = 'rinaldopedroso@gmail.com';
  const { error } = await supabase.from('profiles').update({ vam: '4:00' }).eq('email', email);
  if (error) console.error(error);
  else console.log('VAM atualizada para 4:00');
}

run();
