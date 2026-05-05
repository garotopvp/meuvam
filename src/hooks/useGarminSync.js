import { useState, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

// Internal helper — strips the '/api' prefix from API_BASE if already included
// so that callers can always write `${API}/garmin/...` uniformly.
const API = API_BASE.endsWith('/api') ? API_BASE : `${API_BASE}/api`;

/**
 * useGarminSync — manages Garmin Connect authentication and workout sync.
 *
 * Returns:
 *   garminStatus   — { connected: bool, user: {email, displayName} | null }
 *   isLoading      — bool
 *   lastResult     — result of last sync operation
 *   garminLogin(email, password, userId) — async
 *   garminLogout(userId)                — async
 *   checkStatus(userId)                 — async
 *   pushWorkout(userId, workout)        — create + schedule a single workout
 *   syncPlan(userId, workouts[])        — bulk push full plan
 */
export function useGarminSync() {
  const [garminStatus, setGarminStatus] = useState({ connected: false, user: null });
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  // ── Check connection status ────────────────────────────────────────────────
  const checkStatus = useCallback(async (userId) => {
    if (!userId) return;
    try {
      const r = await fetch(`${API}/garmin/status?userId=${userId}`);
      const data = await r.json();
      setGarminStatus({ connected: data.connected, user: data.user });
      return data;
    } catch {
      setGarminStatus({ connected: false, user: null });
    }
  }, []);

  // ── Login ──────────────────────────────────────────────────────────────────
  const garminLogin = useCallback(async (email, password, userId) => {
    setIsLoading(true);
    setLastResult(null);
    try {
      const r = await fetch(`${API}/garmin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, userId }),
      });
      const data = await r.json();
      if (data.success) {
        setGarminStatus({ connected: true, user: data.user });
        setLastResult({ success: true, message: `Conectado ao Garmin como ${data.user.displayName}` });
      } else {
        setLastResult({ success: false, message: data.error });
      }
      return data;
    } catch (err) {
      const msg = 'Erro de conexão com o servidor';
      setLastResult({ success: false, message: msg });
      return { success: false, error: msg };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Logout ─────────────────────────────────────────────────────────────────
  const garminLogout = useCallback(async (userId) => {
    try {
      await fetch(`${API}/garmin/disconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
    } catch { /* silent */ }
    setGarminStatus({ connected: false, user: null });
    setLastResult(null);
  }, []);

  // ── Push single workout (create + schedule) ────────────────────────────────
  const pushWorkout = useCallback(async (userId, workout) => {
    setIsLoading(true);
    setLastResult(null);
    try {
      const r = await fetch(`${API}/garmin/workout/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, workout }),
      });
      const data = await r.json();
      setLastResult(data);
      return data;
    } catch (err) {
      const result = { success: false, message: 'Erro ao enviar treino para o Garmin' };
      setLastResult(result);
      return result;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Sync full plan ─────────────────────────────────────────────────────────
  const syncPlan = useCallback(async (userId, workouts) => {
    setIsLoading(true);
    setLastResult(null);
    try {
      const r = await fetch(`${API}/garmin/workout/sync-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, workouts }),
      });
      const data = await r.json();
      setLastResult(data);
      return data;
    } catch (err) {
      const result = { success: false, message: 'Erro ao sincronizar planilha com o Garmin' };
      setLastResult(result);
      return result;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    garminStatus,
    isLoading,
    lastResult,
    garminLogin,
    garminLogout,
    checkStatus,
    pushWorkout,
    syncPlan,
  };
}
