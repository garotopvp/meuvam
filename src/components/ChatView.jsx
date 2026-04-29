import React, { useState, useEffect, useRef } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

const ChatView = ({ session }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!session?.user) return;

    // Fetch initial messages
    fetchMessages();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('public:messages')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages' 
      }, (payload) => {
        setMessages(current => [...current, payload.new]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  useEffect(() => {
    // Scroll to bottom on new message
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchMessages = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data);
    }
    setIsLoading(false);
  };

  const sendMessage = async () => {
    if (!input.trim() || !session?.user) return;

    const newMessage = {
      sender_id: session.user.id,
      content: input,
    };

    const { error } = await supabase
      .from('messages')
      .insert([newMessage]);

    if (!error) {
      setInput('');
    }
  };

  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 8.5rem)' }}>
      <header style={{ marginBottom: '1rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Chat com Coach</h1>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Fale diretamente com seu treinador</p>
      </header>

      <div 
        ref={scrollRef}
        style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingBottom: '1rem' }}
      >
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
            <Loader2 className="animate-spin" color="var(--primary-color)" />
          </div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Comece uma conversa com seu treinador!
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === session.user.id;
            const time = new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            
            return (
              <div key={msg.id} style={{
                alignSelf: isMe ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
              }}>
                <div style={{
                  padding: '12px 16px',
                  borderRadius: isMe ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                  background: isMe ? 'var(--primary-color)' : 'var(--surface-accent)',
                  color: isMe ? '#fff' : 'var(--text-primary)',
                  fontSize: '0.9rem', 
                  lineHeight: '1.5',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                }}>
                  {msg.content}
                </div>
                <span style={{ 
                  fontSize: '0.65rem', 
                  color: 'var(--text-secondary)', 
                  paddingLeft: isMe ? '0' : '8px', 
                  paddingRight: isMe ? '8px' : '0',
                  marginTop: '4px', 
                  display: 'block',
                  textAlign: isMe ? 'right' : 'left'
                }}>
                  {!isMe ? 'Coach • ' : ''}{time}
                </span>
              </div>
            );
          })
        )}
      </div>

      <div style={{ display: 'flex', gap: '10px', paddingTop: '12px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-color)' }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Mensagem..."
          style={{
            flex: 1, padding: '14px 18px', borderRadius: '18px',
            border: '1px solid var(--border-color)', background: 'var(--surface-accent)',
            fontSize: '0.95rem', outline: 'none', fontFamily: 'inherit', color: 'var(--text-primary)'
          }}
        />
        <button 
          onClick={sendMessage} 
          disabled={!input.trim()}
          style={{
            width: '52px', height: '52px', borderRadius: '18px',
            background: 'var(--primary-color)', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            cursor: 'pointer', opacity: !input.trim() ? 0.6 : 1,
            transition: '0.2s'
          }}
        >
          <Send size={20} color="#fff" />
        </button>
      </div>
    </div>
  );
};

export default ChatView;
