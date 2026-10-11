import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ofacvjvhzduvmhosvheh.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_AoNKk_DuoUWQLk_oIJLNWA_LpeIQGlT';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
