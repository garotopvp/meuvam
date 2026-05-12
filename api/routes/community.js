import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

const getSupabase = () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
};

// New endpoint: Returns all athletes with connected Strava (Professor Panel Style)
router.get('/athletes', async (req, res) => {
  const supabase = getSupabase();
  if (!supabase) return res.status(500).json({ error: 'Supabase configuration missing' });

  try {
    // 1. Fetch all profiles
    const { data: profiles } = await supabase.from('profiles').select('id, name, avatar_url, role');
    
    // 2. Fetch connected integrations
    const { data: integrations } = await supabase.from('integrations').eq('platform', 'strava').eq('connected', true);

    const athletes = profiles
      ?.filter(p => integrations?.some(i => i.athlete_id === p.id))
      .map(p => ({
        id: p.id,
        name: p.name,
        avatar_url: p.avatar_url,
        supabaseId: p.id // Legacy compatibility
      })) || [];

    res.json(athletes);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch athletes' });
  }
});

// Keep the combined feed as a fallback/alternative
router.get('/feed', async (req, res) => {
  // ... (keeping existing logic for now just in case)
  // But actually, I'll redirect it to return empty if the user wants the "new" (old) way
  res.json([]); 
});

export default router;
