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
            const { data: profile, error: profileError } = await supabaseClient
                .from('profiles')
                .select('role, email')
                .eq('id', data.session.user.id)
                .single();

            if (profileError || !profile || profile.role !== 'professor') {
                console.log("Acesso negado ao portal do professor: perfil não encontrado ou papel incorreto.");
                // Se estiver tentando entrar no painel logado mas não for professor, volta pro início
                if (isIndex) {
                    window.location.href = "/";
                }
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
    const pass = document.getElementById('auth-pass').value;
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
            if (msg === "Invalid login credentials") {
                msg = "E-mail ou senha incorretos.";
            } else if (msg.includes("Email not confirmed")) {
                msg = "Por favor, confirme seu e-mail antes de entrar. Verifique sua caixa de entrada ou spam.";
            }
            
            showMessage("Erro: " + msg, 'error');
            
            // Adicionar link de recuperar senha se for erro de credenciais
            if (msg === "E-mail ou senha incorretos.") {
                const msgDiv = document.getElementById('auth-message');
                const resetLink = document.createElement('div');
                resetLink.style.marginTop = '8px';
                resetLink.style.textAlign = 'center';
                resetLink.innerHTML = `<a href="javascript:void(0)" onclick="recoverPassword()" style="color:#007AFF; font-weight:600; text-decoration:none; font-size:12px;">Esqueceu a senha?</a>`;
                msgDiv.appendChild(resetLink);
            }
            
            btn.innerHTML = originalText;
            btn.disabled = false;
        } else {
            let { data: profile } = await supabaseClient
                .from('profiles')
                .select('role')
                .eq('id', data.user.id)
                .single();

            // Se o perfil não existe mas o usuário é professor no metadata, tenta criar
            if (!profile && data.user.user_metadata?.role === 'professor') {
                await supabaseClient.from('profiles').insert([{
                    id: data.user.id,
                    email: data.user.email,
                    name: data.user.user_metadata?.full_name || data.user.email.split('@')[0],
                    role: 'professor'
                }]);
                // Busca novamente para confirmar
                const { data: newProfile } = await supabaseClient.from('profiles').select('role').eq('id', data.user.id).single();
                profile = newProfile;
            }

            if (!profile || profile.role !== 'professor') {
                await supabaseClient.auth.signOut();
                let errMsg = "Acesso negado. Esta é uma conta de Aluno.";
                if (!profile) errMsg = "Perfil não encontrado. Se você é professor, solicite ao administrador para rodar o comando SQL de ativação.";
                showMessage(errMsg, 'error');
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
    const pass = document.getElementById('auth-pass').value;
    const passConfirm = document.getElementById('auth-pass-confirm').value;
    const btn = document.getElementById('register-btn');

    if (!supabaseConfigured) {
        alert("O Banco de Dados ainda não foi configurado.");
        return;
    }

    if (!fullName || !email || !pass || !passConfirm) return alert("Preencha todos os campos");
    if (pass.length < 6) return alert("A senha deve ter pelo menos 6 caracteres.");
    if (pass !== passConfirm) return alert("As senhas não coincidem.");

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

async function recoverPassword() {
    const email = document.getElementById('auth-email').value.trim();
    if (!email) return alert("Digite seu e-mail no campo acima para recuperar a senha.");
    
    if (confirm(`Deseja enviar um e-mail de recuperação para ${email}?`)) {
        const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '/paineldoprofessor/login.html',
        });
        if (error) {
            alert("Erro ao enviar: " + error.message);
        } else {
            showMessage("E-mail de recuperação enviado! Verifique sua caixa de entrada.", 'success');
        }
    }
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
