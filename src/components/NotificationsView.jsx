import React from 'react';
import { Bell, Calendar, Zap, Activity, Info } from 'lucide-react';
import { supabase } from '../lib/supabase';

const NotificationsView = () => {
  const [notifications, setNotifications] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let channelInstance = null;

    const setup = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }

      await fetchNotifications(session);

      channelInstance = supabase
        .channel(`notifications-${session.user.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, () => {
          fetchNotifications(session);
        })
        .subscribe();
    };

    setup();

    return () => {
      if (channelInstance) supabase.removeChannel(channelInstance);
    };
  }, []);

  const fetchNotifications = async (session) => {
    if (!session) {
      const { data: { session: s } } = await supabase.auth.getSession();
      if (!s) return;
      session = s;
    }

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('athlete_id', session.user.id)
      .order('created_at', { ascending: false });

    if (!error) setNotifications(data || []);
    setLoading(false);
  };

  const getIcon = (type) => {
    switch (type) {
      case 'training_update': return { icon: Calendar, color: '#007AFF' };
      case 'intensity_alert': return { icon: Zap, color: '#FF9500' };
      case 'performance': return { icon: Activity, color: '#34C759' };
      default: return { icon: Info, color: '#8E8E93' };
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Carregando avisos...</p>
      </div>
    );
  }
  return (
    <div className="animate-slide-up">
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Notificações</h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {notifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-secondary)' }}>
            <p style={{ fontSize: '0.9rem' }}>Nenhuma notificação por enquanto.</p>
          </div>
        ) : (
          notifications.map((n) => {
            const { icon: Icon, color } = getIcon(n.type);
            const time = new Date(n.created_at).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
            return (
              <div key={n.id} className="card" style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', padding: '1.25rem' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '12px',
                  background: `${color}15`, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', flexShrink: 0
                }}>
                  <Icon size={18} color={color} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700 }}>{n.title}</h4>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{time}</span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{n.text}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default NotificationsView;
