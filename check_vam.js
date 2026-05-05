import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: 'c:/Users/rinal/Desktop/Antigravity - Programas/Superação/Aplicativo Celular/.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const email = 'rinaldopedroso@gmail.com';
  const { data: profile } = await supabase.from('profiles').select('*').eq('email', email).single();
  console.log('Profile VAM:', profile.vam);
}

run();
