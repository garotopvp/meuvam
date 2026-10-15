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
      .channel(`chat:${session.user.id}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: `athlete_id=eq.${session.user.id}`
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
      .eq('athlete_id', session.user.id)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data);
    }
    setIsLoading(false);
  };

  const sendMessage = async () => {
    if (!input.trim() || !session?.user) return;

    const newMessage = {
      athlete_id: session.user.id,
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
    <div className="animate-slide-up flex flex-col h-[calc(100vh-8.5rem)] w-full">
      <header className="mb-3">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Chat com Coach</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">Fale diretamente com seu treinador</p>
      </header>

      <div className="flex-1 flex flex-col rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto flex flex-col gap-2.5 pb-3 pr-1"
        >
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="animate-spin text-blue-600" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12 px-4 text-slate-400 text-sm">
              Comece uma conversa com seu treinador!
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.sender_id === session.user.id;
              const time = new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
              
              return (
                <div key={msg.id || msg.uuid} style={{
                  alignSelf: isMe ? 'flex-end' : 'flex-start',
                  maxWidth: '75%',
                }}>
                  <div style={{
                    padding: '12px 18px',
                    borderRadius: isMe ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                    background: isMe ? 'var(--primary-color, #2563eb)' : '#f1f5f9',
                    color: isMe ? '#fff' : '#0f172a',
                    fontSize: '0.92rem', 
                    lineHeight: '1.5',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.04)'
                  }}>
                    {msg.content}
                  </div>
                  <span style={{ 
                    fontSize: '0.65rem', 
                    color: '#94a3b8', 
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

        <div className="flex gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Digite uma mensagem para o seu treinador..."
            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
          <button 
            onClick={sendMessage} 
            disabled={!input.trim()}
            className="h-12 w-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition disabled:opacity-50 shrink-0 shadow-sm"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatView;
