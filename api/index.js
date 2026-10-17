import express from 'express';
import cors from 'cors';
import stravaRoutes from './routes/strava.js';
import garminRoutes from './routes/garmin.js';
import communityRoutes from './routes/community.js';
import watchSyncRoutes from './routes/watchSync.js';

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'https://meuvam.com.br',
  'https://www.meuvam.com.br',
  'https://superacao-mobile-app.vercel.app'
];

app.use(cors({ 
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Bloqueado pela política de CORS'));
    }
  }, 
  credentials: true 
}));

app.use(express.json());

// Routes
app.use('/api/strava', stravaRoutes);
app.use('/api/garmin', garminRoutes);
app.use('/api/community', communityRoutes);
app.use('/api', watchSyncRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(), 
    platform: 'vercel',
    env: {
      strava: !!process.env.STRAVA_CLIENT_ID,
      supabase: !!process.env.SUPABASE_URL
    }
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({ 
    error: 'Internal Server Error', 
    message: err.message,
    path: req.path
  });
});

export default app;
