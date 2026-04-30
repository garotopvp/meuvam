const SUPABASE_URL = 'https://zljqlzwzwfzslftnymur.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsanFsend6d2Z6c2xmdG55bXVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczOTM0MTcsImV4cCI6MjA5Mjk2OTQxN30.fQVJWpPVw5ZmV-FXpLyqpUoXvITOAedvbRpxlzdm-Ec';

let supabaseConfigured = (SUPABASE_URL !== "COLE_SUA_URL_AQUI" && SUPABASE_KEY !== "COLE_SUA_CHAVE_AQUI");
let supabaseClient = null;

if (supabaseConfigured && window.supabase) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

document.addEventListener('DOMContentLoaded', async () => {
    if (supabaseClient) {
        const { data } = await supabaseClient.auth.getSession();
        const path = window.location.pathname;
        const isIndex = path.includes("/paineldoprofessor") && !path.includes("login") && !path.includes("register");
        
        if (data.session) {
            // Segurança: Verificar se é professor
            const { data: profile } = await supabaseClient
                .from('profiles')
                .select('role')
                .eq('id', data.session.user.id)
                .single();

            if (!profile) {
                console.error("Perfil não encontrado no Supabase para o ID:", data.session.user.id);
                alert("Erro: Perfil de professor não encontrado. Certifique-se de ter rodado o comando SQL para o e-mail " + data.session.user.email);
                await supabaseClient.auth.signOut();
                window.location.href = "/professor";
                return;
            }

            if (profile.role !== 'professor') {
                alert("Acesso Negado: Esta conta não possui permissão de Professor.");
                await supabaseClient.auth.signOut();
                window.location.href = "/professor";
                return;
            }

            if (path.includes("login") || path.includes("register") || path.includes("/professor")) {
                window.location.href = "/paineldoprofessor/";
            }
        } else {
            if (isIndex && !localStorage.getItem('vdot_offline')) {
                window.location.href = "/professor";
            }
        }
    }
});

function showMessage(text, type = 'error') {
    const msgDiv = document.getElementById('auth-message');
    if (!msgDiv) return;
    
    msgDiv.style.display = 'block';
    msgDiv.textContent = text;
    
    if (type === 'success') {
        msgDiv.style.background = '#f0fdf4';
        msgDiv.style.color = '#166534';
        msgDiv.style.border = '1px solid #bbf7d0';
    } else {
        msgDiv.style.background = '#fef2f2';
        msgDiv.style.color = '#991b1b';
        msgDiv.style.border = '1px solid #fecaca';
    }
}

async function login() {
    const email = document.getElementById('auth-email').value.trim();
    const pass = document.getElementById('auth-pass').value.trim();
    const btn = document.getElementById('login-btn');

    if (!supabaseConfigured) {
        alert("O Banco de Dados ainda nÃ£o foi configurado. Clique em Continuar Offline.");
        return;
    }

    if (!email || !pass) return alert("Preencha e-mail e senha");

    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<div class="loader"></div>';

    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password: pass });
        if (error) {
            let msg = error.message;
            if (msg.includes("Invalid login credentials")) msg = "E-mail ou senha incorretos.";
            showMessage("Erro: " + msg, 'error');
            btn.innerHTML = originalText;
            btn.disabled = false;
        } else {
            // Verificar se é professor na tabela de perfis antes de deixar entrar
            const { data: profile } = await supabaseClient
                .from('profiles')
                .select('role')
                .eq('id', data.user.id)
                .single();

            if (!profile || profile.role !== 'professor') {
                await supabaseClient.auth.signOut();
                showMessage("Acesso negado. Esta é uma conta de Aluno.", 'error');
                btn.innerHTML = originalText;
                btn.disabled = false;
                return;
            }

            localStorage.removeItem('vdot_offline');
            window.location.href = "/paineldoprofessor/";
        }
    } catch(err) {
        alert("Erro de conexão: " + err.message);
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

async function register() {
    const fullName = document.getElementById('auth-name').value.trim();
    const email = document.getElementById('auth-email').value.trim();
    const pass = document.getElementById('auth-pass').value.trim();
    const btn = document.getElementById('register-btn');

    if (!supabaseConfigured) {
        alert("O Banco de Dados ainda não foi configurado.");
        return;
    }

    if (!fullName || !email || !pass) return alert("Preencha todos os campos");
    if (pass.length < 6) return alert("A senha deve ter pelo menos 6 caracteres.");

    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<div class="loader"></div>';

    try {
        const { data, error } = await supabaseClient.auth.signUp({ 
            email, 
            password: pass,
            options: {
                data: { role: 'professor' }
            }
        });
        if (error) {
            let msg = error.message;
            if (msg.includes("User already registered")) msg = "E-mail já cadastrado. Faça login.";
            showMessage("Erro: " + msg, 'error');
            btn.innerHTML = originalText;
            btn.disabled = false;
        } else {
            if (data.user) {
                // Inserir na tabela de perfis para visibilidade na equipe
                await supabaseClient.from('profiles').insert([
                    { 
                        id: data.user.id, 
                        name: fullName, 
                        email: email, 
                        role: 'professor' 
                    }
                ]);
            }
            
            if (!data.session) {
                showMessage("SUCESSO! Por motivos de segurança, enviamos um link para o seu e-mail. Verifique a sua caixa de entrada (ou spam) e clique no link para autorizar a criação da sua conta. Depois volte aqui e faça o login.", 'success');
                btn.innerHTML = originalText;
                btn.disabled = false;
            } else {
                localStorage.removeItem('vdot_offline');
                window.location.href = "/paineldoprofessor/";
            }
        }
    } catch(err) {
        alert("Erro de conexão: " + err.message);
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

function skipLogin() {
    localStorage.setItem('vdot_offline', 'true');
    window.location.href = "index";
}

async function logout() {
    if (confirm("Deseja realmente sair da conta?")) {
        if (supabaseClient) {
            await supabaseClient.auth.signOut();
        }
        localStorage.removeItem('vdot_offline');
        window.location.href = "/professor";
    }
}
