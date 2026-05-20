import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  console.log("=== LENDO PERFIS DE ATLETAS ===");
  const resP = await supabase
    .from('profiles')
    .select('id, name, email, role, vam')
    .order('name');
    
  console.log("Perfil Raw Return:", JSON.stringify(resP, null, 2));
  
  if (resP.data) {
    resP.data.forEach(p => {
      console.log(`- [${p.role}] Name: "${p.name}", Email: "${p.email}", VAM: "${p.vam}", ID: "${p.id}"`);
    });
  }

  console.log("\n=== LENDO ÚLTIMOS TREINOS INSERIDOS ===");
  const resW = await supabase
    .from('workouts')
    .select('id, athlete_id, date, title, type, description, status')
    .order('date', { ascending: false })
    .limit(15);
    
  console.log("Treinos Raw Return:", JSON.stringify(resW, null, 2));

  if (resW.data && resP.data) {
    resW.data.forEach(w => {
      const athleteName = resP.data.find(p => p.id === w.athlete_id)?.name || "Desconhecido";
      console.log(`- Date: ${w.date} | Athlete: "${athleteName}" (ID: ${w.athlete_id}) | Title: "${w.title}" | Type: "${w.type}" | Status: ${w.status}`);
    });
  }
}

run();
