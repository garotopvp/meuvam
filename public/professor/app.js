// ═══════════════════════════════════════
//  MeuVAM v1.2 — by Superação
// ═══════════════════════════════════════

// ─── SUPABASE ───
const supabaseUrl = 'https://ofacvjvhzduvmhosvheh.supabase.co';
const supabaseKey = 'sb_publishable_AoNKk_DuoUWQLk_oIJLNWA_LpeIQGlT';

// Usar o cliente do auth.js se disponível para manter a sessão
let dbClient = (typeof supabaseClient !== 'undefined' && supabaseClient) ? supabaseClient : supabase.createClient(supabaseUrl, supabaseKey);

// Injetar CSS para Hover e transições das ações do calendário
(() => {
    const style = document.createElement('style');
    style.innerHTML = `
        .workout-calendar-item:hover {
            box-shadow: 0 4px 10px rgba(0,0,0,0.08) !important;
            transform: translateY(-1px);
            z-index: 10 !important;
        }
        .workout-calendar-item:hover .workout-actions-overlay {
            display: flex !important;
        }
        .workout-calendar-item:hover .workout-metric-text {
            display: none !important;
        }
        .workout-actions-overlay i {
            transition: all 0.15s ease;
        }
        .workout-actions-overlay i:hover {
            transform: scale(1.25);
            filter: brightness(0.7);
        }
    `;
    document.head.appendChild(style);
})();

// ─── STATE ───
let rawCats = [];
let rawGroups = [];
let athletes = [];
let historyPlans = [];

try {
    rawCats = JSON.parse(localStorage.getItem('vdot_cats'));
} catch (e) {
    console.error("Erro ao carregar vdot_cats do localStorage:", e);
}

try {
    rawGroups = JSON.parse(localStorage.getItem('vdot_groups')) || [];
} catch (e) {
    console.error("Erro ao carregar vdot_groups do localStorage:", e);
    rawGroups = [];
}

if (!Array.isArray(rawGroups)) {
    rawGroups = [];
}

if (!Array.isArray(rawCats) || !rawCats.length) {
    rawCats = [...new Set(rawGroups.map(g => g && g.category || 'Geral'))];
    if (!rawCats.length) rawCats = ['5km','10km','Maratona'];
}

rawGroups = rawGroups.map(g => {
    if (!g || typeof g !== 'object') return null;
    const category = g.category || 'Geral';
    let plan = [];
    if (Array.isArray(g.plan)) {
        plan = g.plan.map(p => {
            if (!p) return { active: false, phases: [] };
            if (p.phases) return p;
            return {
                active: !!p.active,
                phases: [
                    { type: 'warmup', volPct: 0, vamPct: 0, desc: '' },
                    { type: 'main', volPct: p.volPct || 0, vamPct: p.vamPct || 0, desc: p.desc || '' },
                    { type: 'cooldown', volPct: 0, vamPct: 0, desc: '' }
                ]
            };
        });
    } else {
        // Fallback para plano vazio (7 dias) se g.plan não for array
        plan = Array.from({ length: 7 }, () => ({
            active: false,
            phases: [
                { type: 'warmup', volPct: 0, vamPct: 0, desc: '' },
                { type: 'main', volPct: 0, vamPct: 0, desc: '' },
                { type: 'cooldown', volPct: 0, vamPct: 0, desc: '' }
            ]
        }));
    }
    return { ...g, category, plan };
}).filter(Boolean);

if (!rawGroups.length) {
    if (!rawCats.includes('5km')) rawCats.push('5km');
    rawGroups = [{
        id: 1,
        name: "Base 1 (Início)",
        category: "5km",
        volume: 30,
        plan: [
            { active: true, phases: [{ type: 'warmup', volPct: 10, vamPct: 65, desc: "Trote" }, { type: 'main', volPct: 15, vamPct: 85, desc: "Tiros curtos" }, { type: 'cooldown', volPct: 5, vamPct: 60, desc: "Caminhada" }] },
            { active: false, phases: [{ type: 'warmup', volPct: 0, vamPct: 0, desc: '' }, { type: 'main', volPct: 0, vamPct: 0, desc: '' }, { type: 'cooldown', volPct: 0, vamPct: 0, desc: '' }] },
            { active: true, phases: [{ type: 'warmup', volPct: 0, vamPct: 0, desc: '' }, { type: 'main', volPct: 20, vamPct: 75, desc: "Rodagem leve" }, { type: 'cooldown', volPct: 0, vamPct: 0, desc: '' }] },
            { active: false, phases: [{ type: 'warmup', volPct: 0, vamPct: 0, desc: '' }, { type: 'main', volPct: 0, vamPct: 0, desc: '' }, { type: 'cooldown', volPct: 0, vamPct: 0, desc: '' }] },
            { active: true, phases: [{ type: 'warmup', volPct: 5, vamPct: 65, desc: '' }, { type: 'main', volPct: 15, vamPct: 80, desc: "Fartlek" }, { type: 'cooldown', volPct: 5, vamPct: 65, desc: '' }] },
            { active: false, phases: [{ type: 'warmup', volPct: 0, vamPct: 0, desc: '' }, { type: 'main', volPct: 0, vamPct: 0, desc: '' }, { type: 'cooldown', volPct: 0, vamPct: 0, desc: '' }] },
            { active: true, phases: [{ type: 'warmup', volPct: 0, vamPct: 0, desc: '' }, { type: 'main', volPct: 30, vamPct: 65, desc: "Longo" }, { type: 'cooldown', volPct: 0, vamPct: 0, desc: '' }] }
        ]
    }];
}

let categories = rawCats, groups = rawGroups;

try {
    athletes = JSON.parse(localStorage.getItem('vdot_athletes')) || [];
    if (!Array.isArray(athletes)) athletes = [];
} catch (e) {
    console.error("Erro ao carregar vdot_athletes:", e);
    athletes = [];
}

try {
    historyPlans = JSON.parse(localStorage.getItem('vdot_history')) || [];
    if (!Array.isArray(historyPlans)) historyPlans = [];
} catch (e) {
    console.error("Erro ao carregar vdot_history:", e);
    historyPlans = [];
}

let activeCategory = null, athleteSort = { key: 'name', asc: true };
let _currentStravaActivities = [];
let _currentGarminActivities = [];

// ─── CACHEAR ID DO PROFESSOR ───
// Necessário para o chat funcionar sem chamadas async
(async () => {
    try {
        if (!window._profId) {
            const { data } = await dbClient.auth.getSession();
            if (data?.session?.user?.id) {
                window._profId = data.session.user.id;
            }
        }
    } catch(e) { /* silencioso */ }
})();

// ─── GARANTIR SESSÃO VÁLIDA (renova JWT expirado) ───
async function ensureSession() {
    try {
        const { data: sessionData, error: sessionError } = await dbClient.auth.getSession();
        if (sessionError || !sessionData?.session) {
            // Sem sessão ativa — tenta renovar
            const { data: refreshData, error: refreshError } = await dbClient.auth.refreshSession();
            if (refreshError || !refreshData?.session) {
                // Refresh token também expirou — forçar novo login
                sessionStorage.removeItem('vdot_role');
                window.location.href = 'login.html?session_expired=true';
                return false;
            }
            window._profId = refreshData.session.user.id;
            return true;
        }

        const expiresAt = sessionData.session.expires_at; // segundos Unix
        const nowSec = Math.floor(Date.now() / 1000);
        if (expiresAt && expiresAt - nowSec < 60) {
            // Token expira em menos de 60 s — renova proativamente
            const { data: refreshData, error: refreshError } = await dbClient.auth.refreshSession();
            if (!refreshError && refreshData?.session) {
                window._profId = refreshData.session.user.id;
            }
        }
        return true;
    } catch (e) {
        console.error('[ensureSession] Erro:', e);
        return true; // não bloquear operação em erros inesperados
    }
}

// ─── SAVE ───
function saveState(k=['cats','groups','athletes','history']){
    if(k.includes('cats'))localStorage.setItem('vdot_cats',JSON.stringify(categories));
    if(k.includes('groups'))localStorage.setItem('vdot_groups',JSON.stringify(groups));
    if(k.includes('athletes'))localStorage.setItem('vdot_athletes',JSON.stringify(athletes));
    if(k.includes('history'))localStorage.setItem('vdot_history',JSON.stringify(historyPlans));
}

// ─── DOM ───
const $=id=>document.getElementById(id);
const allModals=['modal-group','modal-athlete','modal-history','modal-export','modal-assign','modal-duplicate','modal-strava','modal-strava-graph','modal-garmin-details','modal-activity-detail','modal-tutorial'].map(id=>$(id)).filter(Boolean);
const daysNames=['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'];
const phaseLabels={warmup:'Aquecimento',main:'Principal',run:'Corrida',walk:'Caminhada',recovery:'Recuperação',rest:'Descanso',cooldown:'Desaquec.',other:'Outros'};
/** Cores semânticas — alinhadas a style.css */
const SEM_COLOR = {
    ui: '#1a73e8',
    brand: '#e63946',
    success: '#1e8e3e',
    warning: '#f9ab00',
    danger: '#d93025',
    strava: '#fc4c02',
};

const VAM_ZONES=[{label:'Recuperação',pct:60,color:'#94a3b8'},{label:'Aeróbico Leve',pct:70,color:'#3b82f6'},{label:'Aeróbico',pct:80,color:'#10b981'},{label:'Limiar',pct:90,color:SEM_COLOR.warning},{label:'VAM (Máximo)',pct:100,color:SEM_COLOR.danger}];

// ─── UTILS ───
function generateId(){return Date.now();}
function formatPace(p){let m=Math.floor(p),s=Math.round((p-m)*60);if(s===60){m++;s=0;}return`${m}:${s.toString().padStart(2,'0')}`;}
function movingAverage(data, windowSize = 5) {
    if (!data || data.length === 0) return [];
    const result = [];
    for (let i = 0; i < data.length; i++) {
        let sum = 0, count = 0;
        for (let j = Math.max(0, i - windowSize + 1); j <= i; j++) {
            if (data[j] !== null && data[j] !== undefined) {
                sum += data[j]; count++;
            }
        }
        result.push(count > 0 ? sum / count : null);
    }
    return result;
}

async function fetchWithTimeout(resource, options = {}) {
    const { timeout = 12000 } = options;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(resource, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
}
function vamToPace(k){if(!k||k<=0)return'Livre';return formatPace(60/k)+'/km';}
function closeModals(shouldNavigate = true){
    allModals.forEach(m=>m.classList.remove('show'));
    if (shouldNavigate) {
        const v = localStorage.getItem('vdot_lastView') || 'dashboard';
        const c = localStorage.getItem('vdot_lastCat') || '';
        localStorage.setItem('vdot_lastSubId', '');
        navigate(v, c, false, null);
    }
}

function openTutorialModal() {
    const modal = $('modal-tutorial');
    if (modal) {
        modal.classList.add('show');
    }
}

function closeTutorialModal() {
    const modal = $('modal-tutorial');
    if (modal) {
        modal.classList.remove('show');
    }
}
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModals();});

let _toastTimer=null,_undoFn=null;
function showToast(msg,type='default',undoFn=null){
    const t=$('toast');$('toast-msg').textContent=msg;
    t.style.background=type==='error'?SEM_COLOR.danger:(type==='success'?SEM_COLOR.success:'#111827');
    // Remove old undo button
    const old=t.querySelector('.toast-undo');if(old)old.remove();
    if(undoFn){
        _undoFn=undoFn;
        const btn=document.createElement('button');btn.className='toast-undo';btn.textContent='Desfazer';
        btn.onclick=()=>{_undoFn();t.classList.remove('show');};t.appendChild(btn);
    }
    t.classList.add('show');clearTimeout(_toastTimer);_toastTimer=setTimeout(()=>{t.classList.remove('show');_undoFn=null;},5000);
}

// ─── DARK MODE ───
function toggleDarkMode(){
    const isDark=document.documentElement.getAttribute('data-theme')==='dark';
    document.documentElement.setAttribute('data-theme',isDark?'light':'dark');
    localStorage.setItem('vdot_theme',isDark?'light':'dark');
    updateThemeUI();
}
function updateThemeUI(){
    const isDark=document.documentElement.getAttribute('data-theme')==='dark';
    const icon=$('theme-icon'),label=$('theme-label');
    if(icon)icon.className=isDark?'ri-sun-line':'ri-moon-line';
    if(label)label.textContent=isDark?'Modo Claro':'Modo Escuro';
    const themeBtn=document.querySelector('.theme-toggle');
    if(themeBtn)themeBtn.setAttribute('data-tooltip',isDark?'Modo Claro':'Modo Escuro');
}
(function initTheme(){
    const t=localStorage.getItem('vdot_theme');
    if(t)document.documentElement.setAttribute('data-theme',t);
    updateThemeUI();
})();

// ─── DESKTOP SIDEBAR COLLAPSE ───
function toggleCollapse(){
    const sidebar = $('sidebar');
    const mainContent = $('main-content');
    if (!sidebar || !mainContent) return;
    
    const isCollapsed = sidebar.classList.toggle('collapsed');
    mainContent.classList.toggle('sidebar-collapsed', isCollapsed);
    localStorage.setItem('sidebar_collapsed', isCollapsed ? 'true' : 'false');
    
    const btn = $('collapse-btn');
    if(btn) btn.setAttribute('data-tooltip', isCollapsed ? 'Expandir Menu' : 'Recolher Menu');
}
(function initCollapse(){
    const isCollapsed = localStorage.getItem('sidebar_collapsed') === 'true';
    const sidebar = $('sidebar');
    const mainContent = $('main-content');
    if (sidebar && mainContent && isCollapsed) {
        sidebar.classList.add('collapsed');
        mainContent.classList.add('sidebar-collapsed');
    }
    const btn = $('collapse-btn');
    if(btn) btn.setAttribute('data-tooltip', isCollapsed ? 'Expandir Menu' : 'Recolher Menu');
})();

// ─── MOBILE SIDEBAR ───
function toggleSidebar(){
    $('sidebar').classList.toggle('open');
    $('sidebar-overlay').classList.toggle('open');
}


// ─── NAVIGATION ───
const ROUTES = {
    'dashboard': 'resumo',
    'groups': 'pastas',
    'athletes': 'atletas',
    'staff': 'equipe',
    'strava-feed': 'feed',
    'garmin-feed': 'garmin',
    'calculator': 'calculadoras',
    'chat': 'chat',
    'activity': 'atividade',
    'tutorial': 'tutorial'
};

const REVERSE_ROUTES = Object.fromEntries(Object.entries(ROUTES).map(([k, v]) => [v, k]));

function navigate(viewId, cat, skipPush = false, subId = null) {
    console.log('Navegando para:', viewId);
    try {
        if (viewId === 'tutorial') {
            navigate('dashboard', cat, skipPush, subId);
            setTimeout(() => openTutorialModal(), 150);
            return;
        }

        if(viewId!=='groups')activeCategory=null;
        if(viewId==='groups'&&cat!==undefined)activeCategory=cat;
        
        // Fechar modais ao navegar para uma view principal (evita recursão se já estiver pulando o push)
        if (viewId !== 'activity' && !skipPush) closeModals(false);
        
        const section = $(`view-${viewId}`);
        if (!section) {
            console.error(`Erro: Seção view-${viewId} não encontrada no HTML.`);
            return;
        }

        document.querySelectorAll('.view-section').forEach(s=>s.classList.remove('active'));
        document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
        
        section.classList.add('active');
        document.querySelector(`[data-view="${viewId}"]`)?.classList.add('active');
        
        localStorage.setItem('vdot_lastView',viewId);
        localStorage.setItem('vdot_lastCat',activeCategory||'');
        localStorage.setItem('vdot_lastSubId', subId || '');

        // Update URL
        if (!skipPush) {
            const path = ROUTES[viewId] || '';
            const baseUrl = '/professor';
            let newUrl = baseUrl + (path ? '/' + path : '/');
            
            if (viewId === 'groups') {
                if (cat) newUrl += '/' + encodeURIComponent(cat);
                if (subId) {
                    if (subId === 'new') newUrl += '/novo';
                    else newUrl += '/editar/' + subId;
                }
            } else if (viewId === 'athletes' && subId) {
                if (typeof subId === 'string' && subId.startsWith('historico_')) {
                    newUrl += '/historico/' + subId.replace('historico_', '');
                } else {
                    newUrl += '/editar/' + subId;
                }
            } else if (viewId === 'chat' && subId) {
                newUrl += '/' + subId;
            } else if (viewId === 'activity' && subId) {
                newUrl = baseUrl + '/atividade/' + subId;
            } else if (path && viewId !== 'groups') {
                // Outras views simples
            }

            if (window.location.pathname !== newUrl) {
                history.pushState({ viewId, cat, subId }, '', newUrl);
            }
        }
        
        if(viewId==='dashboard') renderDashboard();
        if(viewId==='groups') renderGroups();
        if(viewId==='athletes') {
            renderAthletes();
            setTimeout(() => syncAthletesFromSupabase(), 100); 
        }
        if(viewId==='chat') {
            renderChat();
            setTimeout(() => syncAthletesFromSupabase(), 100);
        }
        if(viewId==='staff') renderStaff();
        if(viewId==='strava-feed') renderStravaFeed(false);
        if(viewId==='garmin-feed') {
            renderGarminFeed(false);
            setTimeout(() => syncAthletesFromSupabase(), 100);
        }
        if(viewId==='calculator') renderCalculator();
        
        updateBreadcrumb(viewId, cat, subId);

        // Close mobile sidebar
        $('sidebar')?.classList.remove('open');
        $('sidebar-overlay')?.classList.remove('open');
    } catch (err) {
        console.error('Falha na navegação:', err);
    }
}

function updateBreadcrumb(viewId, cat, subId) {
    const el = $('breadcrumb');
    if (!el) return;
    
    if (viewId === 'dashboard' || !viewId) {
        el.style.display = 'none';
        el.innerHTML = '';
        return;
    }
    
    el.style.display = 'flex';
    let html = `<span onclick="navigate('dashboard')" style="cursor:pointer;color:var(--primary);">Dashboard</span>`;
    
    const viewName = ROUTES[viewId] || viewId;
    const viewLabel = viewName.charAt(0).toUpperCase() + viewName.slice(1);
    
    html += ` <i class="ri-arrow-right-s-line" style="margin:0 4px;color:var(--text-muted);opacity:0.5;"></i> <span onclick="navigate('${viewId}')" style="cursor:pointer;${!cat && !subId ? 'font-weight:700;color:var(--text);' : 'color:var(--primary);'}">${viewLabel}</span>`;
    
    if (cat) {
        html += ` <i class="ri-arrow-right-s-line" style="margin:0 4px;color:var(--text-muted);opacity:0.5;"></i> <span onclick="viewCategory('${cat}')" style="cursor:pointer;${!subId ? 'font-weight:700;color:var(--text);' : 'color:var(--primary);'}">${cat}</span>`;
    }
    
    if (subId) {
        let name = subId;
        if (viewId === 'athletes') {
            const a = athletes.find(x => x.id == subId || x.supabaseId == subId);
            if (a) name = a.name;
        } else if (viewId === 'groups') {
            const g = groups.find(x => x.id == subId);
            if (g) name = g.name;
        } else if (subId === 'new') {
            name = 'Novo';
        }
        html += ` <i class="ri-arrow-right-s-line" style="margin:0 4px;color:var(--text-muted);opacity:0.5;"></i> <span class="current" style="font-weight:700;color:var(--text);">${name}</span>`;
    }
    
    el.innerHTML = html;
}


document.querySelectorAll('.nav-item').forEach(item=>{
    item.addEventListener('click',e=>{
        e.preventDefault();
        navigate(e.currentTarget.dataset.view);
    });
});

window.addEventListener('popstate', (e) => {
    if (e.state && e.state.viewId) {
        if (e.state.viewId === 'activity') {
            if (typeof openActivityDetail === 'function') openActivityDetail(e.state.id, true);
        } else if (e.state.subId && typeof e.state.subId === 'string' && e.state.subId.startsWith('historico_')) {
            const athleteId = e.state.subId.replace('historico_', '');
            navigate('athletes', null, true, e.state.subId);
            openHistory(athleteId);
        } else {
            navigate(e.state.viewId, e.state.cat, true, e.state.subId);
        }
    } else {
        const parts = window.location.pathname.split('/').filter(Boolean);
        const profIdx = parts.indexOf('professor');
        
        if (profIdx === -1) {
            navigate('dashboard', null, true);
            return;
        }

        const sectionPart = parts[profIdx + 1];
        const isActivity = window.location.pathname.includes('/atividade/');
        
        if (isActivity && typeof openActivityDetail === 'function') {
            const actId = parts[profIdx + 2];
            openActivityDetail(actId, true);
        } else {
            const viewId = REVERSE_ROUTES[sectionPart] || 'dashboard';
            // Para simplicidade no popstate sem state object, voltamos apenas para a view principal
            // Se houver subId, ele deveria estar no e.state
            navigate(viewId, null, true);
        }
    }
});

(function restoreNav(){
    const parts = window.location.pathname.split('/').filter(Boolean);
    const profIdx = parts.indexOf('professor');
    
    // Se não estiver no portal do professor, não faz nada
    if (profIdx === -1) {
        navigate('dashboard', null, true);
        return;
    }

    const sectionPart = parts[profIdx + 1]; // 'dashboard', 'pastas', etc.
    const extraPart = parts[profIdx + 2] ? decodeURIComponent(parts[profIdx + 2]) : null;

    if (sectionPart === 'atividade') {
        const actId = parts[profIdx + 2];
        navigate('dashboard', null, true);
        setTimeout(() => { if(typeof openActivityDetail === 'function') openActivityDetail(actId, true); }, 1000);
        return;
    }

    const viewId = REVERSE_ROUTES[sectionPart] || 'dashboard';
    
    if (viewId === 'groups') {
        const cat = extraPart;
        const action = parts[profIdx + 3];
        const subId = parts[profIdx + 4];
        
        activeCategory = cat;
        navigate('groups', cat, true, subId || (action === 'novo' ? 'new' : null));
        
        if (action === 'novo') {
            setTimeout(() => openGroupModal(cat), 500);
        } else if (action === 'editar' && subId) {
            setTimeout(() => openGroupModal(subId, true), 500);
        }
    } else if (viewId === 'athletes') {
        const action = parts[profIdx + 2]; // 'editar', 'historico' ou ID
        const subId = parts[profIdx + 3]; // ID ou subId
        
        if (action === 'historico' && subId) {
            navigate('athletes', null, true, 'historico_' + subId);
            setTimeout(() => openHistory(subId), 500);
        } else if (action === 'editar' || subId === 'treino') {
            const athleteId = subId === 'treino' ? action : subId;
            const isWorkout = subId === 'treino';
            
            navigate('athletes', null, true, athleteId);
            setTimeout(() => {
                const a = (athletes || []).find(x => x.id == athleteId || x.supabaseId == athleteId);
                if (isWorkout && a && a.groupId) editGroup(a.groupId);
                else if (!isWorkout) openAthleteModal(athleteId);
            }, 800);
        } else if (action) {
             // Caso a URL seja /alunos/ID
             navigate('athletes', null, true, action);
             setTimeout(() => openAthleteModal(action), 500);
        } else {
            navigate('athletes', null, true);
        }
    } else {
        navigate(viewId, null, true);
    }
})();

// ═══════════════════════════════════════
//  DASHBOARD
// ═══════════════════════════════════════
function renderDashboard(){
    const h=new Date().getHours();
    $('dashboard-greeting').textContent=`${h<12?'Bom dia':h<18?'Boa tarde':'Boa noite'}! Resumo da assessoria.`;
    
    const activeAthletes = athletes.filter(a => a.role !== 'professor');
    $('stat-athletes').textContent=activeAthletes.length;
    $('stat-athletes-sub').textContent=activeAthletes.length===0?'Nenhum cadastrado':`${activeAthletes.filter(a=>a.groupId).length} com planilha`;
    $('stat-groups').textContent=groups.length;
    $('stat-groups-sub').textContent=`Em ${categories.length} pasta(s)`;
    $('stat-history').textContent=historyPlans.length;
    const today=new Date().toDateString();
    const tc=historyPlans.filter(h=>new Date(h.id).toDateString()===today).length;
    $('stat-history-sub').textContent=tc>0?`${tc} hoje`:'Nenhum hoje';
    $('stat-cats').textContent=categories.length;
    $('stat-cats-sub').textContent=categories.slice(0,3).join(', ')+(categories.length>3?'...':'');

    // Notifications
    const notifs=[];
    const noGroup=activeAthletes.filter(a=>!a.groupId);
    if(noGroup.length)notifs.push({icon:'ri-user-unfollow-line',type:'warning',msg:`${noGroup.length} atleta(s) sem planilha associada`,action:`navigate('athletes')`});
    const noTest=activeAthletes.filter(a=>!a.testTime);
    if(noTest.length)notifs.push({icon:'ri-flask-line',type:'warning',msg:`${noTest.length} atleta(s) sem teste VAM registrado`,action:`navigate('athletes')`});
    $('dashboard-notifs').innerHTML=notifs.map(n=>`<div class="alert-banner alert-banner--${n.type}" onclick="${n.action}">
        <i class="${n.icon}" style="font-size:18px;"></i>
        <span>${n.msg}</span>
        <i class="ri-arrow-right-s-line"></i>
    </div>`).join('');

    // Recent
    const recent=[...historyPlans].sort((a,b)=>b.id-a.id).slice(0,5);
    const rec=$('dashboard-recent');
    if(!recent.length){rec.innerHTML='<div style="padding:32px;text-align:center;color:var(--text-muted);"><i class="ri-image-line" style="font-size:36px;display:block;margin-bottom:8px;opacity:0.3;"></i>Nenhum treino gerado.</div>';return;}
    rec.innerHTML=recent.map(h=>{const a=athletes.find(x=>x.id===h.athleteId);const d=new Date(h.id).toLocaleDateString('pt-BR');
        return`<div style="display:flex;justify-content:space-between;align-items:center;padding:14px 20px;border-bottom:1px solid var(--border);"><div><div style="font-weight:600;font-size:14px;">${a?a.name:'Removido'}</div><div style="font-size:12px;color:var(--text-muted);">${h.calcData.categoryName} · ${h.calcData.groupName} · ${h.calcData.volume}km</div></div><div style="display:flex;align-items:center;gap:8px;"><span style="font-size:12px;color:var(--text-muted);">${d}</span><button class="btn btn-secondary" onclick="viewExport(${h.id})" style="padding:5px 10px;font-size:12px;"><i class="ri-eye-line"></i> Ver</button></div></div>`;
    }).join('');
}

function importBasePlans() {
    if (!confirm('Deseja importar os treinos Base 1, 2, 3 e 4 dentro da pasta "Planilha Importada"?')) return;
    
    const targetCat = "Planilha Importada";
    if (!categories.includes(targetCat)) categories.push(targetCat);

    const data = [
        { name: "Base 01", vol: 72, days: [
            { d: 0, steps: [{ t: "warmup", v: 1.0, p: "06:40" }, { t: "run", v: 6.0, p: "06:29" }, { t: "cooldown", v: 1.0, p: "06:40" }] },
            { d: 1, steps: [{ t: "warmup", v: 1.0, p: "06:40" }, { t: "run", v: 10.0, p: "06:40" }, { t: "cooldown", v: 1.0, p: "06:40" }] },
            { d: 2, steps: [{ t: "warmup", v: 1.0, p: "06:40" }, { t: "run", v: 12.0, p: "06:59" }, { t: "cooldown", v: 1.0, p: "06:40" }] },
            { d: 3, steps: [{ t: "warmup", v: 1.0, p: "06:40" }, { t: "run", v: 6.0, p: "06:29" }, { t: "cooldown", v: 1.0, p: "06:40" }] },
            { d: 4, steps: [{ t: "warmup", v: 1.0, p: "06:40" }, { t: "run", v: 11.2, p: "06:59", n: "7 voltas Asturias" }, { t: "cooldown", v: 1.0, p: "06:40" }] },
            { d: 5, steps: [{ t: "warmup", v: 1.0, p: "06:40" }, { t: "run", v: 15.0, p: "06:29" }, { t: "cooldown", v: 1.0, p: "06:40" }] }
        ]},
        { name: "Base 02", vol: 59, days: [
            { d: 0, steps: [{ t: "warmup", v: 1.0, p: "07:00" }, { t: "run", v: 6.0, p: "06:29" }, { t: "cooldown", v: 1.0, p: "07:00" }] },
            { d: 1, steps: [{ t: "warmup", v: 1.0, p: "07:00" }, { t: "run", v: 8.0, p: "06:40" }, { t: "cooldown", v: 1.0, p: "07:00" }] },
            { d: 2, steps: [{ t: "warmup", v: 1.0, p: "07:30" }, { t: "run", v: 10.0, p: "06:59" }, { t: "cooldown", v: 1.0, p: "07:30" }] },
            { d: 3, steps: [{ t: "warmup", v: 1.0, p: "07:00" }, { t: "run", v: 6.0, p: "06:29" }, { t: "cooldown", v: 1.0, p: "07:00" }] },
            { d: 4, steps: [{ t: "warmup", v: 1.0, p: "07:30" }, { t: "run", v: 6.0, p: "06:59", n: "Areia Tombo" }, { t: "cooldown", v: 1.0, p: "07:30" }] },
            { d: 5, steps: [{ t: "warmup", v: 1.0, p: "07:00" }, { t: "run", v: 15.0, p: "06:29" }, { t: "cooldown", v: 1.0, p: "07:00" }] }
        ]},
        { name: "Base 03", vol: 70, days: [
            { d: 0, steps: [{ t: "warmup", v: 1.0, p: "07:00" }, { t: "run", v: 7.0, p: "06:03" }, { t: "cooldown", v: 1.0, p: "07:00" }] },
            { d: 1, steps: [{ t: "warmup", v: 1.0, p: "07:00" }, { t: "run", v: 6.0, p: "06:13" }, { t: "cooldown", v: 1.0, p: "07:00" }] },
            { d: 2, steps: [{ t: "warmup", v: 1.0, p: "07:30" }, { t: "run", v: 10.0, p: "06:03" }, { t: "cooldown", v: 1.0, p: "07:30" }] },
            { d: 3, steps: [{ t: "warmup", v: 1.0, p: "07:00" }, { t: "run", v: 8.0, p: "06:29" }, { t: "cooldown", v: 1.0, p: "07:00" }] },
            { d: 4, steps: [{ t: "warmup", v: 1.0, p: "07:30" }, { t: "run", v: 9.6, p: "06:03", n: "Asturias" }, { t: "cooldown", v: 1.0, p: "07:30" }] },
            { d: 5, steps: [{ t: "warmup", v: 1.0, p: "07:00" }, { t: "run", v: 16.0, p: "06:18" }, { t: "cooldown", v: 1.0, p: "07:00" }] }
        ]},
        { name: "Base 04", vol: 62, days: [
            { d: 0, steps: [{ t: "warmup", v: 1.0, p: "07:03" }, { t: "run", v: 5.0, p: "06:03" }, { t: "cooldown", v: 1.0, p: "07:03" }] },
            { d: 1, steps: [{ t: "warmup", v: 1.0, p: "07:13" }, { t: "run", v: 7.0, p: "06:13" }, { t: "cooldown", v: 1.0, p: "07:13" }] },
            { d: 2, steps: [{ t: "warmup", v: 1.0, p: "07:03" }, { t: "run", v: 10.0, p: "06:03" }, { t: "cooldown", v: 1.0, p: "07:03" }] },
            { d: 3, steps: [{ t: "warmup", v: 1.0, p: "07:29" }, { t: "run", v: 6.0, p: "06:29" }, { t: "cooldown", v: 1.0, p: "07:29" }] },
            { d: 4, steps: [{ t: "warmup", v: 1.0, p: "07:03" }, { t: "run", v: 8.0, p: "06:03", n: "Areão" }, { t: "cooldown", v: 1.0, p: "07:03" }] },
            { d: 5, steps: [{ t: "warmup", v: 1.0, p: "07:18" }, { t: "run", v: 17.0, p: "06:18" }, { t: "cooldown", v: 1.0, p: "07:18" }] }
        ]}
    ];

    data.forEach(item => {
        const plan = Array.from({ length: 7 }, (_, i) => {
            const dayData = item.days.find(d => d.d === i);
            const steps = dayData ? dayData.steps.map(s => ({
                id: Date.now() + Math.random(),
                type: s.t === 'run' ? 'main' : s.t,
                label: s.t === 'warmup' ? 'Aquecimento' : s.t === 'cooldown' ? 'Desaquecimento' : 'Rodagem',
                duration: { type: 'distance', value: s.v.toString() },
                intensity: { type: 'pace', value: s.p },
                notes: s.n || ""
            })) : [];

            // Add phases for backward compatibility
            const phases = steps.map(s => ({
                type: s.type,
                title: s.label,
                km: s.duration.value,
                pace: s.intensity.value,
                desc: s.notes,
                volPct: 100,
                vamPct: 100
            }));

            return { active: !!dayData, steps, phases };
        });
        groups.push({ id: Date.now() + Math.random(), name: item.name, category: targetCat, volume: item.vol, plan });
    });

    saveState(['cats', 'groups']);
    renderDashboard();
    renderGroups();
    showToast("Treinos importados para 'Planilha Importada'!");
}

// ═══════════════════════════════════════
//  CALCULATORS
// ═══════════════════════════════════════
function switchCalcTab(t){document.querySelectorAll('.calc-tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===t));document.querySelectorAll('.calc-tab-panel').forEach(p=>p.style.display='none');$(`calc-tab-${t}`).style.display='block';}
function renderCalculator(){buildTreadmillQuickTable();}

const DIST_SHORT=[{label:'200 m',pct:130},{label:'300 m',pct:127},{label:'400 m',pct:125},{label:'800 m',pct:120}];
const DIST_LONG=[{label:'3 km',pct:100},{label:'5 km',pct:97},{label:'8 km',pct:95},{label:'10 km',pct:93},{label:'12 km',pct:92},{label:'15 km',pct:90},{label:'18 km',pct:89},{label:'21 km (Meia)',pct:88},{label:'42 km (Maratona)',pct:82},{label:'Regenerativo',pct:65}];

function calculateVAM(){
    const t=parseFloat($('calc-time').value);const res=$('calc-result'),zones=$('calc-zones');
    if(!t||t<=0){res.style.display='none';if($('calc-distance-table'))$('calc-distance-table').style.display='none';return;}
    const vam=180/t;res.style.display='block';$('calc-vam').textContent=vam.toFixed(1)+' km/h';
    // Highlight the 3km/VAM zone visually to simulate athlete zone during the 3km test
    const vamZone = VAM_ZONES.find(z=>z.pct===100) || VAM_ZONES[VAM_ZONES.length-1];
    zones.innerHTML=VAM_ZONES.map(z=>{const spd=vam*(z.pct/100);const isVam = z.pct===vamZone.pct;const extraStyle = isVam?`box-shadow:0 6px 18px ${z.color}22;border-radius:8px;background:linear-gradient(90deg, ${z.color}11, transparent);`:`background:var(--bg);`;return`<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;border-left:4px solid ${z.color};${extraStyle}"><span style="font-size:13px;font-weight:600;color:${isVam?z.color:'inherit'}">${z.label} (${z.pct}%)</span><span style="font-size:14px;font-weight:800;color:${z.color};">${vamToPace(spd)}</span></div>`;}).join('');
    if($('calc-distance-table'))$('calc-distance-table').style.display='block';
    const thR=`<tr style="background:var(--bg);"><th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text-muted);">Dist.</th><th style="padding:10px 16px;text-align:center;font-size:11px;font-weight:700;color:var(--text-muted);">% VAM</th><th style="padding:10px 16px;text-align:right;font-size:11px;font-weight:700;color:var(--text-muted);">Pace</th></tr>`;
    if($('tbl-short'))$('tbl-short').innerHTML=thR+DIST_SHORT.map((d,i)=>`<tr style="${i%2===0?'background:var(--bg);':''}"><td style="padding:10px 16px;font-weight:600;">${d.label}</td><td style="padding:10px 16px;text-align:center;color:#ef4444;font-weight:700;">${d.pct}%</td><td style="padding:10px 16px;text-align:right;font-weight:800;">${vamToPace(vam*(d.pct/100))}</td></tr>`).join('');
    if($('tbl-long')){
        $('tbl-long').innerHTML=thR+DIST_LONG.map((d,i)=>{
            const isVamRow = d.pct===(VAM_ZONES.find(z=>z.pct===100)?.pct || 100);
            const pctColor = isVamRow ? (VAM_ZONES.find(z=>z.pct===100)?.color || '#2563eb') : '#2563eb';
            const bg = i%2===0 ? 'background:var(--bg);' : '';
            const rowStyle = isVamRow ? `background:${pctColor}11;box-shadow:inset 4px 0 0 ${pctColor}22;` : bg;
            return `<tr style="${rowStyle}"><td style="padding:10px 16px;font-weight:600;">${d.label}</td><td style="padding:10px 16px;text-align:center;color:${pctColor};font-weight:700;">${d.pct}%</td><td style="padding:10px 16px;text-align:right;font-weight:800;">${vamToPace(vam*(d.pct/100))}</td></tr>`;
        }).join('');
    }
}
function onRaceDistChange(){$('race-dist-custom-wrap').style.display=$('race-dist-select').value==='custom'?'block':'none';calculateRace();}
function calculateRace(){
    const sel=$('race-dist-select')?.value;const dist=sel==='custom'?parseFloat($('race-dist-custom')?.value):parseFloat(sel);
    const h=Math.max(0,parseInt($('race-h')?.value)||0),m=Math.max(0,parseInt($('race-m')?.value)||0),s=Math.max(0,parseInt($('race-s')?.value)||0);
    const tot=h*3600+m*60+s;
    if(!dist||dist<=0||tot<=0){if($('race-main-result'))$('race-main-result').style.display='none';return;}
    const psk=tot/dist,pM=Math.floor(psk/60),pS=Math.round(psk%60),ps=`${pM}:${pS.toString().padStart(2,'0')}/km`;
    $('race-main-result').style.display='block';$('race-pace-result').textContent=ps;$('race-speed-result').textContent=(dist/(tot/3600)).toFixed(2)+' km/h';
    const sp=dist<=10?1:5;const splits=[];let k=sp;while(k<dist-0.01){splits.push(parseFloat(k.toFixed(3)));k+=sp;}splits.push(parseFloat(dist.toFixed(3)));
    $('race-splits-dist').textContent=`${dist} km`;
    const rows=splits.map((k,i)=>{const el=psk*k;const eH=Math.floor(el/3600),eM=Math.floor((el%3600)/60),eS=Math.round(el%60);const ts=eH>0?`${eH}h ${eM.toString().padStart(2,'0')}:${eS.toString().padStart(2,'0')}`:`${eM.toString().padStart(2,'0')}:${eS.toString().padStart(2,'0')}`;const fin=i===splits.length-1;const bg=fin?'background:linear-gradient(135deg,#0f172a,#1e3a5f);':(i%2===0?'background:var(--bg);':'');const fg=fin?'color:#fff;':'';const lb=fin&&k!==Math.round(k)?`${k.toFixed(3)} km (chegada)`:`${k%1===0?k:k.toFixed(3)} km`;
        return`<tr style="${bg}"><td style="padding:11px 20px;font-weight:700;${fg}">${lb}</td><td style="padding:11px 20px;font-weight:600;${fg}">${ps}</td><td style="padding:11px 20px;font-weight:800;text-align:right;${fg}">${ts}</td></tr>`;}).join('');
    $('race-splits-body').innerHTML=`<table style="width:100%;border-collapse:collapse;font-size:13px;"><thead><tr style="background:var(--bg);"><th style="padding:10px 20px;text-align:left;font-size:11px;color:var(--text-muted);">Split</th><th style="padding:10px 20px;text-align:left;font-size:11px;color:var(--text-muted);">Pace</th><th style="padding:10px 20px;text-align:right;font-size:11px;color:var(--text-muted);">Acumulado</th></tr></thead><tbody>${rows}</tbody></table>`;
}
function calcTreadmill(mode){
    if(mode==='speed'){const s=parseFloat($('tread-speed').value),el=$('tread-speed-result');if(!s||s<=0){el.style.display='none';return;}el.style.display='block';$('tread-pace-out').textContent=formatPace(60/s)+'/km';}
    else{const mm=Math.max(0,parseInt($('tread-pace-m').value)||0),ss=Math.max(0,parseInt($('tread-pace-s').value)||0),el=$('tread-pace-result'),p=mm+ss/60;if(p<=0){el.style.display='none';return;}el.style.display='block';$('tread-speed-out').textContent=(60/p).toFixed(1)+' km/h';}
}
function buildTreadmillQuickTable(){
    const speeds=[
        {kmh:8,color:'#94a3b8'},{kmh:9,color:'#64748b'},{kmh:10,color:'#10b981'},
        {kmh:11,color:'#3b82f6'},{kmh:12,color:'#2563eb'},{kmh:13,color:'#6366f1'},
        {kmh:14,color:'#f59e0b'},{kmh:15,color:'#f97316'},{kmh:16,color:'#ef4444'},
        {kmh:17,color:'#dc2626'},{kmh:18,color:'#b91c1c'},{kmh:20,color:'#7f1d1d'}
    ];
    const tb=$('tread-quick-table');if(!tb)return;
    tb.innerHTML=speeds.map((s,i)=>`<tr style="${i%2===0?'background:var(--bg);':''}"><td style="padding:10px 16px;font-weight:800;color:${s.color};">${s.kmh} km/h</td><td style="padding:10px 16px;font-weight:700;">${formatPace(60/s.kmh)}/km</td></tr>`).join('');
}

// ═══════════════════════════════════════
//  CATEGORIES
// ═══════════════════════════════════════
function openCategoryModal(){const n=prompt('Nome da nova pasta? (Ex: 21km)');if(!n||!n.trim())return;if(categories.includes(n.trim())){showToast('Já existe!','error');return;}categories.push(n.trim());saveState(['cats']);renderGroups();showToast('Pasta criada!');}
function viewCategory(cat){
    activeCategory = cat;
    localStorage.setItem('vdot_lastCat', cat || '');
    renderGroups();
    navigate('groups', cat);
}
function editCategory(old){const n=prompt(`Renomear '${old}' para:`,old);if(!n||!n.trim()||n===old)return;if(categories.includes(n)){showToast('Já existe!','error');return;}categories=categories.map(c=>c===old?n:c);groups.forEach(g=>{if(g.category===old)g.category=n;});if(activeCategory===old)activeCategory=n;saveState(['cats','groups']);renderGroups();showToast('Renomeada!');}
function deleteCategory(cat){if(!confirm(`Apagar '${cat}' e TODOS os treinos dentro?`))return;const backup={cats:[...categories],groups:JSON.parse(JSON.stringify(groups))};categories=categories.filter(c=>c!==cat);groups=groups.filter(g=>g.category!==cat);if(activeCategory===cat)activeCategory=null;saveState(['cats','groups']);renderGroups();showToast('Pasta excluída!','default',()=>{categories=backup.cats;groups=backup.groups;saveState(['cats','groups']);renderGroups();});}
function moveCat(cat,dir){const i=categories.indexOf(cat),t=i+dir;if(t<0||t>=categories.length)return;[categories[i],categories[t]]=[categories[t],categories[i]];saveState(['cats']);renderGroups();}

// ═══════════════════════════════════════
//  GROUPS
// ═══════════════════════════════════════
function renderGroups(){
    const list=$('groups-list'),header=$('groups-page-header');
    if(activeCategory===null){
        header.style.display='flex';
        if(!categories.length){list.innerHTML='<div style="text-align:center;padding:64px 32px;color:var(--text-muted);"><i class="ri-folder-open-line" style="font-size:56px;display:block;margin-bottom:16px;opacity:0.25;"></i><strong style="font-size:18px;">Nenhuma pasta</strong><p style="font-size:14px;margin-top:6px;">Clique em "Nova Pasta" para começar.</p></div>';return;}
        const last=categories.length-1;
        list.innerHTML=`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:20px;">${categories.map((cat,i)=>{
            const count=groups.filter(g=>g.category===cat).length;
            const disL=i===0?'disabled style="opacity:0.3;cursor:not-allowed"':'';
            const disR=i===last?'disabled style="opacity:0.3;cursor:not-allowed"':'';
            return`<div class="stat-card" style="cursor:default;transition:0.2s;" onmouseover="this.style.borderColor='var(--primary)';this.style.transform='translateY(-2px)'" onmouseout="this.style.borderColor='var(--border)';this.style.transform='translateY(0)'">
                <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
                    <div style="width:44px;height:44px;background:#eff6ff;border-radius:10px;display:flex;align-items:center;justify-content:center;"><i class="ri-folder-open-fill" style="font-size:22px;color:var(--primary);"></i></div>
                    <div><h3 style="font-size:18px;font-weight:700;cursor:pointer;" onclick="viewCategory('${cat}')">${cat}</h3><span style="font-size:12px;color:var(--text-muted);">${count} treino(s)</span></div>
                </div>
                <div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--border);padding-top:14px;">
                    <button class="btn btn-primary" style="padding:7px 14px;font-size:13px;" onclick="viewCategory('${cat}')"><i class="ri-folder-open-line"></i> Acessar</button>
                    <div style="display:flex;gap:2px;">
                        <button class="btn btn-tertiary" onclick="moveCat('${cat}',-1)" ${disL}><i class="ri-arrow-left-s-line"></i></button>
                        <button class="btn btn-tertiary" onclick="moveCat('${cat}',1)" ${disR}><i class="ri-arrow-right-s-line"></i></button>
                        <button class="btn btn-tertiary" onclick="editCategory('${cat}')"><i class="ri-edit-line"></i></button>
                        <button class="btn btn-tertiary btn-icon-danger" onclick="deleteCategory('${cat}')"><i class="ri-delete-bin-line"></i></button>
                    </div>
                </div>
            </div>`;}).join('')}</div>`;
    } else {
        header.style.display='none';
        const cg=groups.filter(g=>g.category===activeCategory);
        const cards=cg.map(g=>{
            const rows=g.plan.map((d,i)=>{
                if(!d.active)return'';
                const steps = d.steps || d.phases || [];
                const ph = steps.map(p => {
                    if (p.type === 'repetition') {
                        const inner = (p.steps || []).map(is => {
                            const dur = is.duration ? (is.duration.type === 'time' ? is.duration.value + 'min' : is.duration.value + 'km') : '--';
                            const int = is.intensity && is.intensity.value > 0 ? ` @ ${is.intensity.value}%VAM` : '';
                            return `${is.label || phaseLabels[is.type]}: ${dur}${int}`;
                        }).join(' + ');
                        return `<div class="plan-ph" style="border-left: 2px solid var(--primary); padding-left: 8px; margin: 4px 0;"><strong>${p.count}x</strong> (${inner})</div>`;
                    }

                    const label = phaseLabels[p.type] || p.label || p.title || p.type;
                    let detail = '';
                    
                    if (p.duration) {
                        const unit = p.duration.type === 'time' ? 'min' : 'km';
                        detail = `${p.duration.value}${unit}`;
                        if (p.intensity && p.intensity.value > 0) {
                            detail += ` @ ${p.intensity.value}%VAM`;
                        }
                    } else if (p.km) {
                        detail = `${p.km}km @ ${p.pace || 'Livre'}`;
                    } else if (p.volPct) {
                        detail = `${p.volPct}%V / ${p.vamPct}%VAM`;
                    }
                    
                    return `<div class="plan-ph"><span><strong>${label}:</strong> ${detail}</span>${(p.desc || p.notes) ? `<span style="font-style:italic;color:#059669;">${p.desc || p.notes}</span>` : ''}</div>`;
                }).join('');
                return`<div class="plan-row"><div class="plan-row-top"><div class="day">${daysNames[i]}</div></div>${ph}</div>`;
            }).join('');
            return`<div class="plan-card"><div class="plan-header"><div><h3>${g.name}</h3><span style="font-size:11px;color:var(--text-muted);">Vol: ${g.volume}km/sem</span></div><div style="display:flex;gap:2px;">
                <button class="btn btn-tertiary" onclick="openAssignModal('${g.id}')" title="Vincular Alunos"><i class="ri-user-add-line"></i></button>
                <button class="btn btn-tertiary" onclick="openDuplicateModal('${g.id}')" title="Duplicar p/ outra pasta"><i class="ri-folders-line"></i></button>
                <button class="btn btn-tertiary" onclick="cloneGroup('${g.id}')" title="Clonar"><i class="ri-file-copy-line"></i></button>
                <button class="btn btn-tertiary" onclick="editGroup('${g.id}')" title="Editar"><i class="ri-edit-line"></i></button>
                <button class="btn btn-tertiary btn-icon-danger" onclick="deleteGroup('${g.id}')" title="Excluir"><i class="ri-delete-bin-line"></i></button>
            </div></div><div class="plan-body">${rows||'<div style="padding:16px 0;color:#999;font-size:12px;font-style:italic;">Não configurado.</div>'}</div></div>`;}).join('');
        const empty=!cg.length?'<div style="text-align:center;padding:64px 32px;color:var(--text-muted);grid-column:1/-1;"><i class="ri-calendar-line" style="font-size:48px;display:block;margin-bottom:16px;opacity:0.25;"></i><strong>Pasta vazia</strong><p style="font-size:13px;margin-top:6px;">Adicione um treino.</p></div>':'';
        list.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border);padding-bottom:20px;margin-bottom:28px;flex-wrap:wrap;gap:12px;">
            <div style="display:flex;align-items:center;gap:16px;"><button class="btn btn-secondary" onclick="viewCategory(null)"><i class="ri-arrow-left-line"></i> Voltar</button><h2 style="font-size:26px;font-weight:700;">${activeCategory}</h2></div>
            <button class="btn btn-primary" onclick="openGroupModal('${activeCategory}')"><i class="ri-add-line"></i> Novo Treino</button>
        </div><div class="cards-grid">${empty}${cards}</div>`;
    }
}

// ─── GROUP MODAL ───
// ─── PROFESSIONAL WORKOUT BUILDER (Garmin Clone) ───
let _editingPlan = null;
let _selectedDayIdx = 0;
let _expandedStepIdx = null; // Track which step is currently being edited/expanded
let _expandedParentIdx = null;

function openGroupModal(catOrId, isEdit = false) {
    const id = isEdit ? catOrId : null;
    const cat = isEdit ? null : catOrId;
    const modal = $('modal-group');
    if (!modal) return;
    
    const g = id ? groups.find(x => x.id == id) : null;
    modal.dataset.editing = id || '';
    modal.dataset.category = isEdit ? (g ? g.category : null) : cat;
    
    const title = g ? g.name : 'Treino de corrida';
    $('group-name').value = title;
    $('display-group-name').textContent = title;
    
    if ($('group-volume')) $('group-volume').value = g ? g.volume : '';
    if ($('group-notes')) $('group-notes').value = g ? (g.notes || '') : '';
    
    const type = g ? (g.type || 'Corrida') : 'Corrida';
    setGroupTypePill(type);
    
    // Initialize or Clone Plan with Migration for old formats
    if (g && g.plan) {
        _editingPlan = JSON.parse(JSON.stringify(g.plan));
        // Migração: Se o dia tiver 'phases' mas não 'steps', converter para 'steps'
        _editingPlan.forEach(day => {
            if (!day.steps && day.phases) {
                day.steps = day.phases.map(p => ({
                    id: generateId() + Math.random(),
                    type: p.type || 'run',
                    label: p.title || '',
                    duration: { type: p.km ? 'distance' : 'time', value: (p.km || p.time || '10').toString() },
                    intensity: { type: p.pace ? 'pace' : 'vam', value: p.pace || p.vamPct || 0 },
                    notes: p.desc || ''
                }));
            }
            if (day.steps) {
                day.steps = day.steps.map(s => normalizeWorkoutStep(s)).filter(Boolean);
            } else {
                day.steps = [];
            }
        });
    } else {
        _editingPlan = Array.from({ length: 7 }, () => ({
            active: true,
            steps: [
                { id: generateId() + 1, type: 'warmup', label: 'Aquecimento', duration: { type: 'time', value: '15' }, intensity: { type: 'vam', value: 0 }, notes: '' },
                { id: generateId() + 2, type: 'run', label: 'Corrida', duration: { type: 'distance', value: '1.00' }, intensity: { type: 'vam', value: 90 }, notes: '' },
                { id: generateId() + 3, type: 'cooldown', label: 'Desaquecimento', duration: { type: 'time', value: '10' }, intensity: { type: 'vam', value: 0 }, notes: '' }
            ]
        }));
    }
    


    _selectedDayIdx = 0;
    _expandedStepIdx = null;
    _expandedParentIdx = null;
    renderEditorSidebar();
    renderEditorSteps();
    
    // Atualizar URL para refletir abertura do modal (apenas se não for skipPush ou se vier de um clique direto)
    if (!isEdit) {
        navigate('groups', catOrId, false, 'new');
    }
    // Se for edição, o caller (editGroup ou restoreNav) já deve ter chamado o navigate correspondente.
    // Chamar navigate aqui de novo com skipPush=false causaria o fechamento do modal recém-aberto.

    modal.classList.add('show');
}

function renderEditorSidebar() {
    const container = $('editor-days-sidebar');
    container.innerHTML = daysNames.map((dn, i) => {
        const active = _editingPlan[i].active;
        const isSelected = _selectedDayIdx === i;
        const stepCount = _editingPlan[i].steps.length;
        return `
            <div class="editor-day-item ${isSelected ? 'selected' : ''} ${!active ? 'inactive' : ''}" onclick="selectEditorDay(${i})">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-weight:700; font-size:13px;">${dn}</span>
                    <input type="checkbox" ${active ? 'checked' : ''} onclick="event.stopPropagation(); toggleEditorDay(${i})" style="width:14px; height:14px;">
                </div>
                <span style="font-size:10px; color:var(--text-muted);">${active ? stepCount + ' etapas' : 'Descanso'}</span>
            </div>
        `;
    }).join('');
}

function selectEditorDay(idx) {
    _selectedDayIdx = idx;
    renderEditorSidebar();
    renderEditorSteps();
}

function toggleEditorDay(idx) {
    _editingPlan[idx].active = !_editingPlan[idx].active;
    renderEditorSidebar();
    if (_selectedDayIdx === idx) renderEditorSteps();
}

function getWorkoutSummaryHtml(steps, vamKmh) {
    if (!steps || steps.length === 0) return '';
    let totalDist = 0;
    let totalTime = 0;
    const calcStep = (step) => {
        const durVal = parseFloat(step.duration?.value) || 0;
        if (durVal <= 0) return {d: 0, t: 0};
        let dist = 0, time = 0;
        if (step.duration.type === 'distance') {
            dist = durVal;
            const intVal = parseFloat(step.intensity?.value) || 0;
            if (step.intensity?.type === 'vam' && intVal > 0) {
                const speed = vamKmh * (intVal / 100);
                if (speed > 0) time = (dist / speed) * 60;
            } else if (step.intensity?.type === 'pace' && step.intensity?.value) {
                const parts = step.intensity.value.split(':');
                if (parts.length === 2) {
                    const totalMins = parseInt(parts[0]) + (parseInt(parts[1]) / 60);
                    time = dist * totalMins;
                }
            } else { time = (dist / 10) * 60; }
        } else if (step.duration.type === 'time') {
            time = durVal;
            const intVal = parseFloat(step.intensity?.value) || 0;
            if (step.intensity?.type === 'vam' && intVal > 0) {
                dist = (vamKmh * (intVal / 100)) * (time / 60);
            } else if (step.intensity?.type === 'pace' && step.intensity?.value) {
                const parts = step.intensity.value.split(':');
                if (parts.length === 2) {
                    const totalMins = parseInt(parts[0]) + (parseInt(parts[1]) / 60);
                    if (totalMins > 0) dist = (60 / totalMins) * (time / 60);
                }
            } else { dist = 10 * (time / 60); }
        }
        return {d: dist, t: time};
    };
    steps.forEach(s => {
        if (s.type === 'repetition' && s.steps && s.repeats) {
            let repD = 0, repT = 0;
            s.steps.forEach(sub => { const res = calcStep(sub); repD += res.d; repT += res.t; });
            totalDist += repD * parseInt(s.repeats);
            totalTime += repT * parseInt(s.repeats);
        } else {
            const res = calcStep(s);
            totalDist += res.d;
            totalTime += res.t;
        }
    });
    const hours = Math.floor(totalTime / 60);
    const mins = Math.round(totalTime % 60);
    const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins} min`;
    return `
        <div style="background: var(--bg); border-top: 1px solid var(--border-strong); padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; border-radius: 0 0 8px 8px; font-weight: 600; font-size: 13px; margin-top: 10px;">
            <div style="color: var(--text-muted);"><i class="ri-ruler-line" style="margin-right: 4px;"></i> Total Est.: <span style="color: var(--primary);">${totalDist.toFixed(2)} km</span></div>
            <div style="color: var(--text-muted);"><i class="ri-timer-line" style="margin-right: 4px;"></i> Tempo Est.: <span style="color: var(--primary);">${timeStr}</span></div>
        </div>
    `;
}

function renderEditorSteps() {
    const container = $('editor-steps-container');
    const day = _editingPlan[_selectedDayIdx];

    if (!day.active) {
        container.innerHTML = `
            <div style="height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; color:var(--text-muted); opacity:0.6;">
                <i class="ri-moon-clear-line" style="font-size:48px; margin-bottom:16px;"></i>
                <p>Este dia está marcado como <strong>Descanso</strong>.</p>
                <button class="btn btn-secondary" onclick="toggleEditorDay(${_selectedDayIdx})" style="margin-top:12px;">Ativar este dia</button>
            </div>
        `;
        return;
    }

    // Distance preview calculator initialization
    if (typeof window._previewVam === 'undefined') {
        const gId = parseInt($('modal-group')?.dataset?.editing || '0');
        const linked = athletes.find(a => a.groupId == gId && a.testTime);
        if (linked) {
            window._previewVam = 180 / linked.testTime;
            window._previewAthleteId = `athlete-${linked.id}`;
        } else {
            window._previewVam = 14.0;
            window._previewAthleteId = '14';
        }
    }

    const previewHtml = '';

    const stepsHtml = day.steps.map((step, idx) => {
        if (step.type === 'repetition') {
            return renderRepetitionStep(step, idx);
        }
        return renderNormalStep(step, idx);
    }).join('');

    container.innerHTML = `
        ${previewHtml}
        <div class="steps-list" id="main-steps-list" style="flex: 1; overflow-y: auto; min-height: 0;">
            ${stepsHtml || '<div style="padding:40px; text-align:center; color:var(--text-muted); border:2px dashed #eee; border-radius:8px;">Arraste as etapas para cá ou use os botões ao lado.</div>'}
        </div>
        ${getWorkoutSummaryHtml(day.steps, window._previewVam)}
    `;

    initSortable();
}

function initSortable() {
    const mainList = document.getElementById('main-steps-list');
    if (mainList) {
        new Sortable(mainList, {
            animation: 150,
            handle: '.step-drag-handle',
            onEnd: (evt) => {
                const day = _editingPlan[_selectedDayIdx];
                const item = day.steps.splice(evt.oldIndex, 1)[0];
                day.steps.splice(evt.newIndex, 0, item);
                // No need to re-render everything as DOM is already updated by Sortable
                // but we might want to ensure internal state is clean
            }
        });
    }

    // Nested sortables for repetitions
    document.querySelectorAll('.repetition-inner').forEach((el, pIdx) => {
        new Sortable(el, {
            animation: 150,
            handle: '.step-drag-handle',
            onEnd: (evt) => {
                // We need to find the parent repetition step index
                // For simplicity, I'll add data-index to the cards
                const parentIdx = parseInt(el.closest('.repetition-card').dataset.index);
                const day = _editingPlan[_selectedDayIdx];
                const repStep = day.steps[parentIdx];
                const item = repStep.steps.splice(evt.oldIndex, 1)[0];
                repStep.steps.splice(evt.newIndex, 0, item);
            }
        });
    });
}
function getStepCalculations(step, vamKmh) {
    if (!step || !step.duration || !step.intensity || !vamKmh || vamKmh <= 0) return null;
    
    const durVal = parseFloat(step.duration.value) || 0;
    const intVal = parseFloat(step.intensity.value) || 0;
    
    if (durVal <= 0) return null;
    
    // We only calculate if intensity is VAM
    if (step.intensity.type !== 'vam' || intVal <= 0) return null;
    
    const speed = vamKmh * (intVal / 100); // km/h
    
    if (step.duration.type === 'time') {
        // Calculate estimated distance
        const dist = speed * (durVal / 60);
        return {
            type: 'distance',
            value: `${dist.toFixed(2)} km`,
            label: 'Distância Est.'
        };
    } else if (step.duration.type === 'distance') {
        // Calculate estimated time
        const hours = durVal / speed;
        const mins = hours * 60;
        const wholeMins = Math.floor(mins);
        const secs = Math.round((mins - wholeMins) * 60);
        const timeStr = secs > 0 ? `${wholeMins}m ${secs}s` : `${wholeMins} min`;
        return {
            type: 'time',
            value: timeStr,
            label: 'Tempo Est.'
        };
    }
    
    return null;
}

function renderNormalStep(step, idx, parentIdx = null) {
    const calc = getStepCalculations(step, window._previewVam);
    
    return `
        <div class="step-card" style="width: 100%; display: flex; align-items: stretch; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; margin-bottom: 8px; background: white; transition: all 0.2s;">
            <div class="step-indicator ${step.type || 'run'}" style="width: 6px; flex-shrink: 0; align-self: stretch;"></div>
            <div class="step-drag-handle" style="display: flex; align-items: center; justify-content: center; padding: 0 8px 0 4px; color: #94a3b8; cursor: grab;"><i class="ri-more-2-fill" style="transform: rotate(90deg); font-size: 16px;"></i></div>
            
            <div class="tp-step-content" style="flex: 1; padding: 8px 12px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                <!-- Type Selection -->
                <div style="display: flex; flex-direction: column; gap: 4px;">
                    <label style="font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Etapa</label>
                    <select onchange="updateStepField(${idx}, 'type', this.value, ${parentIdx}); renderEditorSteps();" class="tp-step-select" style="font-weight: 700; width: 125px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 10px; font-size: 13px; color: #334155; background: #ffffff; outline: none; cursor: pointer; font-family: inherit;">
                        <option value="warmup" ${step.type === 'warmup' ? 'selected' : ''}>Aquecimento</option>
                        <option value="run" ${step.type === 'run' ? 'selected' : ''}>Corrida</option>
                        <option value="walk" ${step.type === 'walk' ? 'selected' : ''}>Caminhada</option>
                        <option value="recovery" ${step.type === 'recovery' ? 'selected' : ''}>Recuperação</option>
                        <option value="rest" ${step.type === 'rest' ? 'selected' : ''}>Descanso</option>
                        <option value="cooldown" ${step.type === 'cooldown' ? 'selected' : ''}>Desaquecimento</option>
                        <option value="other" ${step.type === 'other' ? 'selected' : ''}>Outros</option>
                    </select>
                </div>

                <!-- Duration -->
                <div style="display: flex; flex-direction: column; gap: 4px;">
                    <label style="font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Duração</label>
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <input type="text" value="${step.duration?.value || ''}" onchange="updateStepNestedField(${idx}, 'duration', 'value', this.value, ${parentIdx}); renderEditorSteps();" class="tp-step-input" style="width: 55px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 8px; font-size: 13px; font-weight: 700; text-align: center; outline: none; color: #0f172a; font-family: inherit;" placeholder="Ex: 10">
                        <select onchange="updateStepNestedField(${idx}, 'duration', 'type', this.value, ${parentIdx}); renderEditorSteps();" class="tp-step-select" style="width: 65px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 4px; font-size: 13px; color: #334155; background: #ffffff; outline: none; cursor: pointer; font-family: inherit;">
                            <option value="time" ${step.duration?.type === 'time' ? 'selected' : ''}>min</option>
                            <option value="distance" ${step.duration?.type === 'distance' ? 'selected' : ''}>km</option>
                        </select>
                    </div>
                </div>

                <!-- Intensity Target -->
                <div style="display: flex; flex-direction: column; gap: 4px;">
                    <label style="font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Intensidade</label>
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <select onchange="updateStepNestedField(${idx}, 'intensity', 'type', this.value, ${parentIdx}); renderEditorSteps();" class="tp-step-select" style="width: 120px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 6px; font-size: 13px; color: #334155; background: #ffffff; outline: none; cursor: pointer; font-family: inherit;">
                            <option value="none" ${step.intensity?.type === 'none' ? 'selected' : ''}>Sem objetivo</option>
                            <option value="vam" ${step.intensity?.type === 'vam' ? 'selected' : ''}>% VAM</option>
                            <option value="pace" ${step.intensity?.type === 'pace' ? 'selected' : ''}>Ritmo</option>
                            <option value="hr_zone" ${step.intensity?.type === 'hr_zone' ? 'selected' : ''}>Zona F.C.</option>
                            <option value="cadence" ${step.intensity?.type === 'cadence' ? 'selected' : ''}>Cadência</option>
                        </select>
                        ${step.intensity?.type !== 'none' ? `
                            <div style="display: flex; align-items: center; gap: 2px;">
                                <input type="text" value="${step.intensity?.value || ''}" onchange="updateStepNestedField(${idx}, 'intensity', 'value', this.value, ${parentIdx}); renderEditorSteps();" class="tp-step-input" style="width: 50px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 8px; font-size: 13px; font-weight: 700; text-align: center; outline: none; color: #0f172a; font-family: inherit;" placeholder="...">
                                <span style="font-size: 11px; font-weight: 700; color: #64748b; margin-left: 2px; user-select: none;">
                                    ${step.intensity?.type === 'vam' ? '%' : step.intensity?.type === 'pace' ? '/km' : step.intensity?.type === 'hr_zone' ? 'Z' : 'spm'}
                                </span>
                            </div>
                        ` : ''}
                    </div>
                </div>

                <!-- Live VAM calculations estimation pill -->
                ${calc ? `
                <div style="display: flex; flex-direction: column; gap: 4px; min-width: 90px;">
                    <label style="font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">${calc.label}</label>
                    <div style="background: #eff6ff; color: #1265C2; font-size: 12px; font-weight: 800; padding: 6px 10px; border-radius: 6px; border: 1px solid rgba(18, 101, 194, 0.12); text-align: center; min-height: 33px; display: flex; align-items: center; justify-content: center; width: 100%;">
                        ${calc.value}
                    </div>
                </div>
                ` : ''}

                <!-- Step specific notes input -->
                <div style="display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 150px;">
                    <label style="font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Instruções para o bloco</label>
                    <input type="text" value="${step.notes || ''}" onchange="updateStepField(${idx}, 'notes', this.value, ${parentIdx}); renderEditorSteps();" class="tp-step-notes" style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 12px; font-size: 13px; color: #475569; background: #f8fafc; outline: none; width: 100%; transition: all 0.2s; font-family: inherit;" placeholder="Nota para o atleta...">
                </div>

                <!-- Delete Step Button -->
                <div style="display: flex; align-items: center; justify-content: center; padding-left: 4px; margin-left: auto;">
                    <button onclick="removeEditorStep(${idx}, ${parentIdx}); renderEditorSteps();" style="border: none; background: transparent; cursor: pointer; color: #94a3b8; transition: color 0.15s; padding: 6px;" onmouseover="this.style.color='#ef4444'" onmouseout="this.style.color='#94a3b8'">
                        <i class="ri-delete-bin-line" style="font-size: 18px;"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

function toggleExpandStep(idx, parentIdx = null) {
    // Deprecated expansion toggle, keeping signature for backward compatibility
    _expandedStepIdx = null;
    _expandedParentIdx = null;
    renderEditorSteps();
}

function renderRepetitionStep(step, idx) {
    const innerStepsHtml = (step.steps || []).map((s, sIdx) => renderNormalStep(s, sIdx, idx)).join('');
    return `
        <div class="step-card repetition-card" data-index="${idx}" style="flex-direction: column; min-height: auto; width: 100%; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; margin-bottom: 12px; background: #f8fafc; display: flex; align-items: stretch; position: relative;">
            <div class="repetition-header" style="display: flex; align-items: center; gap: 8px; width: 100%; padding: 10px 16px; background: #f1f5f9; border-bottom: 1px solid #e2e8f0;">
                <div class="step-drag-handle" style="padding-left: 0; cursor: move; color: #94a3b8;"><i class="ri-more-2-fill" style="transform: rotate(90deg); font-size: 16px;"></i></div>
                <i class="ri-repeat-line" style="color:#1265C2; font-size:18px; font-weight: 700;"></i>
                <div style="flex: 1; display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 13px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.5px;">Repetir</span>
                    <input type="number" value="${step.count || 2}" style="width: 55px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 4px 8px; font-size: 13px; font-weight: 700; text-align: center; outline: none; font-family: inherit;" onchange="updateStepField(${idx}, 'count', this.value); renderEditorSteps();">
                    <span style="font-size: 13px; font-weight: 700; color: #475569;">Vezes</span>
                </div>
                <button onclick="removeEditorStep(${idx}); renderEditorSteps();" style="border: none; background: transparent; cursor: pointer; color: #94a3b8; transition: color 0.15s; padding: 6px;" onmouseover="this.style.color='#ef4444'" onmouseout="this.style.color='#94a3b8'">
                    <i class="ri-delete-bin-line" style="font-size: 18px;"></i>
                </button>
            </div>
            <div class="repetition-inner" style="padding: 12px; display: flex; flex-direction: column; gap: 8px; width: 100%; border-left: 4px solid #1265C2; padding-left: 12px;">
                ${innerStepsHtml}
                <button class="btn-text-link" style="margin-top: 4px; font-weight: 700; display: flex; align-items: center; gap: 4px; color: #1265C2;" onclick="addEditorStep('run', ${idx})">
                    <i class="ri-add-line"></i> Adicionar etapa à repetição
                </button>
            </div>
        </div>
    `;
}

function addEditorStep(type, parentIdx = null) {
    const newStep = {
        id: generateId(),
        type: type === 'repetition' ? 'repetition' : type,
        label: '',
        duration: { type: 'time', value: '10' },
        intensity: { type: 'vam', value: 75 },
        notes: ''
    };

    if (type === 'repetition') {
        newStep.count = 2;
        newStep.steps = [
            { id: generateId() + 1, type: 'run', label: 'Trabalho', duration: { type: 'distance', value: '0.4' }, intensity: { type: 'vam', value: 95 }, notes: '' },
            { id: generateId() + 2, type: 'recovery', label: 'Descanso', duration: { type: 'time', value: '1' }, intensity: { type: 'vam', value: 0 }, notes: '' }
        ];
    }

    if (parentIdx !== null) {
        _editingPlan[_selectedDayIdx].steps[parentIdx].steps.push(newStep);
    } else {
        _editingPlan[_selectedDayIdx].steps.push(newStep);
    }
    renderEditorSteps();
}

function removeEditorStep(idx, parentIdx = null) {
    if (parentIdx !== null) {
        _editingPlan[_selectedDayIdx].steps[parentIdx].steps.splice(idx, 1);
    } else {
        _editingPlan[_selectedDayIdx].steps.splice(idx, 1);
    }
    renderEditorSteps();
}

function updateStepField(idx, field, value, parentIdx = null) {
    if (parentIdx !== null) {
        _editingPlan[_selectedDayIdx].steps[parentIdx].steps[idx][field] = value;
    } else {
        _editingPlan[_selectedDayIdx].steps[idx][field] = value;
    }
}

function updateStepNestedField(idx, group, field, value, parentIdx = null) {
    if (parentIdx !== null) {
        _editingPlan[_selectedDayIdx].steps[parentIdx].steps[idx][group][field] = value;
    } else {
        _editingPlan[_selectedDayIdx].steps[idx][group][field] = value;
    }
}

function saveGroup() {
    const modal = $('modal-group'), 
          id = modal.dataset.editing, 
          name = $('group-name').value.trim(), 
          cat = modal.dataset.category, 
          vol = parseFloat($('group-volume').value) || 0,
          type = $('group-type').value || 'Corrida';

    if (!name) return showToast('Nome do treino é obrigatório', 'error');

    const groupData = {
        id: id ? parseInt(id) : generateId(),
        name,
        type,
        category: cat,
        volume: vol,
        notes: $('group-notes') ? $('group-notes').value : '',
        plan: _editingPlan
    };

    if (id) {
        const idx = groups.findIndex(x => x.id == id);
        if (idx !== -1) groups[idx] = groupData;
        showToast('Treino atualizado com sucesso!');
    } else {
        groups.push(groupData);
        showToast('Novo treino profissional criado!');
    }

    saveState(['groups']);
    closeModals();
    renderGroups();
}

function setGroupTypePill(type) {
    const hiddenInput = $('group-type');
    if (hiddenInput) hiddenInput.value = type;

    // Desativar pílulas anteriores e ativar a selecionada
    document.querySelectorAll('.group-type-pill').forEach(btn => {
        const btnType = btn.getAttribute('data-type');
        if (btnType === type) {
            btn.style.opacity = '1';
            btn.style.transform = 'scale(1.03)';
            btn.style.boxShadow = '0 2px 6px rgba(0,0,0,0.05)';
            if (btnType === 'Corrida') { btn.style.background = '#fef9c3'; btn.style.color = '#92400e'; btn.style.borderColor = '#fbbf24'; }
            else if (btnType === 'Natação') { btn.style.background = '#f0f9ff'; btn.style.color = '#0369a1'; btn.style.borderColor = '#bae6fd'; }
            else if (btnType === 'Ciclismo') { btn.style.background = '#f0fdf4'; btn.style.color = '#166534'; btn.style.borderColor = '#bbf7d0'; }
            else if (btnType === 'Fortalecimento') { btn.style.background = '#f5f3ff'; btn.style.color = '#5b21b6'; btn.style.borderColor = '#ddd6fe'; }
            else if (btnType === 'Outros') { btn.style.background = '#f8fafc'; btn.style.color = '#475569'; btn.style.borderColor = '#e2e8f0'; }
        } else {
            btn.style.opacity = '0.4';
            btn.style.transform = 'scale(1)';
            btn.style.boxShadow = 'none';
            btn.style.background = '#f8fafc';
            btn.style.color = '#475569';
            btn.style.borderColor = '#e2e8f0';
        }
    });

    // Atualizar o ícone do Garmin no cabeçalho e sua cor de fundo dinamicamente
    const iconContainer = $('group-type-icon-container');
    if (iconContainer) {
        let iconBg = '#1265c2'; // Default blue
        if (type === 'Corrida') {
            iconContainer.innerHTML = '<i class="ri-run-line"></i>';
            iconBg = '#fbbf24'; // Yellow
        } else if (type === 'Natação') {
            iconContainer.innerHTML = '<svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor" style="vertical-align: middle;"><path d="M2 21v-2q.95 0 1.425-.5T5.3 18t1.925.5t1.425.5t1.425-.5T12 18t1.925.5t1.425.5t1.425-.5T18.7 18t1.875.5T22 19v2q-1.475 0-1.937-.5T18.7 20t-1.425.5-1.925.5t-1.925-.5T12 20t-1.425.5-1.925.5t-1.925-.5T5.3 20t-1.363.5T2 21m0-4.5v-2q.95 0 1.425-.5t1.875-.5t1.938.5t1.412.5q.9 0 1.425-.5T12 13.5t1.925.5t1.425.5t1.425-.5t1.925-.5t1.875.5t1.425.5v2q-1.475 0-1.937-.5t-1.363-.5t-1.388.5t-1.962.5q-1.425 0-1.937-.5T12 15.5q-.95 0-1.412.5t-1.938.5t-1.963-.5t-1.387-.5t-1.362.5T2 16.5m4.9-5.1l3.325-3.325l-1-1q-.825-.825-1.75-1.2T5.2 5.5V3q1.875 0 3.1.413T10.7 5l6.4 6.4q-.425.275-.825.438T15.35 12q-.9 0-1.425-.5T12 11t-1.925.5t-1.425.5q-.525 0-.925-.162T6.9 11.4m11.575-7.663q.725.738.725 1.763q0 1.05-.725 1.775T16.7 8t-1.775-.725T14.2 5.5q0-1.025.725-1.763T16.7 3t1.775.738"/></svg>';
            iconBg = '#0284c7'; // Sky Blue
        } else if (type === 'Ciclismo') {
            iconContainer.innerHTML = '<i class="ri-riding-line"></i>';
            iconBg = '#16a34a'; // Green
        } else if (type === 'Fortalecimento') {
            iconContainer.innerHTML = '<svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor" style="vertical-align: middle;"><path d="M6 5h2v14H6zm10 0h2v14h-2zM3 9h3v6H3zm15 0h3v6h-3zM8 11h8v2H8z"/></svg>';
            iconBg = '#7c3aed'; // Violet/Purple
        } else if (type === 'Outros') {
            iconContainer.innerHTML = '<i class="ri-clipboard-line"></i>';
            iconBg = '#475569'; // Slate
        }
        iconContainer.style.background = iconBg;
    }
}

function editGroup(id){
    const g = groups.find(x => x.id == id);
    navigate('groups', g ? g.category : null, false, id);
    openGroupModal(id, true);
}
function cloneGroup(id){const c=JSON.parse(JSON.stringify(groups.find(g=>g.id==id)));c.id=generateId();c.name+=' (Cópia)';groups.push(c);saveState(['groups']);renderGroups();showToast('Clonado!');}
function deleteGroup(id){if(!confirm('Excluir este treino?'))return;const backup=JSON.parse(JSON.stringify(groups.find(g=>g.id==id)));groups=groups.filter(g=>g.id!=id);athletes.forEach(a=>{if(a.groupId==id)a.groupId=null;});saveState(['groups','athletes']);renderGroups();showToast('Treino apagado.','default',()=>{groups.push(backup);saveState(['groups']);renderGroups();});}

// ─── DUPLICATE TO FOLDER ───
let _dupGroupId=null;
function openDuplicateModal(gId){_dupGroupId=gId;const g=groups.find(x=>x.id==gId);const others=categories.filter(c=>c!==g.category);
    $('dup-folder-list').innerHTML=others.length?others.map(c=>`<button class="btn btn-secondary" style="width:100%;justify-content:center;" onclick="doDuplicate('${c}')"><i class="ri-folder-open-line"></i> ${c}</button>`).join(''):'<div style="color:var(--text-muted);text-align:center;padding:16px;">Crie outra pasta primeiro.</div>';
    $('modal-duplicate').classList.add('show');
}
function doDuplicate(targetCat){const c=JSON.parse(JSON.stringify(groups.find(g=>g.id==_dupGroupId)));c.id=generateId();c.category=targetCat;c.name+=' (Cópia)';groups.push(c);saveState(['groups']);closeModals();showToast(`Duplicado para ${targetCat}!`);}

// ─── ASSIGN ───
function openAssignModal(gId){currentAssignGroupId=gId;const g=groups.find(x=>x.id==gId);$('modal-assign-title').textContent=`Vincular: ${g.name}`;const list=$('assign-athlete-list');
    const activeAthletes = athletes.filter(a => a.role !== 'professor');
    if(!activeAthletes.length){list.innerHTML='<div style="color:var(--text-muted);font-size:13px;text-align:center;padding:16px;">Nenhum aluno.</div>';}
    else{list.innerHTML=activeAthletes.map(a=>{const chk=a.groupId==gId?'checked':'';return`<label style="display:flex;align-items:center;gap:8px;padding:12px;background:var(--panel);border:1px solid ${chk?'var(--primary)':'var(--border)'};border-radius:4px;cursor:pointer;"><input type="checkbox" class="assign-chk" value="${a.id}" ${chk} style="width:16px;height:16px;accent-color:var(--primary);"><span style="font-weight:500;">${a.name}</span></label>`;}).join('');}
    $('modal-assign').classList.add('show');
}
function saveAssign(){if(!currentAssignGroupId)return;const assigned=new Set([...document.querySelectorAll('.assign-chk:checked')].map(c=>String(c.value)));
    athletes.forEach(a=>{if(assigned.has(String(a.id)))a.groupId=currentAssignGroupId;else if(a.groupId==currentAssignGroupId)a.groupId=null;});
    saveState(['athletes']);closeModals();renderAthletes();renderDashboard();showToast('Vinculado!');}

// ═══════════════════════════════════════
//  ATHLETES
// ═══════════════════════════════════════
function sortAthletes(key){if(athleteSort.key===key)athleteSort.asc=!athleteSort.asc;else{athleteSort.key=key;athleteSort.asc=true;}renderAthletes();}

function renderAthletes(){
    const q=($('athlete-search')?.value||'').toLowerCase();
    let filtered=athletes.filter(a => {
        const matchesSearch = (a.name || '').toLowerCase().includes(q);
        const isNotProfessor = a.role !== 'professor';
        return matchesSearch && isNotProfessor;
    });
    // Sort
    filtered.sort((a,b)=>{
        let va,vb;
        if(athleteSort.key==='name'){va=(a.name || '').toLowerCase();vb=(b.name || '').toLowerCase();}
        else if(athleteSort.key==='vam'){va=a.testTime?(180/a.testTime):0;vb=b.testTime?(180/b.testTime):0;}
        else{va=a.name || '';vb=b.name || '';}
        if(va<vb)return athleteSort.asc?-1:1;if(va>vb)return athleteSort.asc?1:-1;return 0;
    });
    const empty=$('athlete-empty');
    if(!filtered.length){$('athletes-list').innerHTML='';if(empty)empty.style.display='block';return;}
    if(empty)empty.style.display='none';
    $('athletes-list').innerHTML=filtered.map(a=>{
        const g=groups.find(x=>x.id==a.groupId);const plan=g?`${g.category} — ${g.name}`:'Sem planilha';
        const vam=a.testTime?(180/a.testTime).toFixed(1)+' km/h':'-';
        const noteSnip=a.notes?`<span style="font-size:11px;color:var(--text-muted);max-width:120px;display:inline-block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${a.notes.replace(/"/g,'&quot;')}">${a.notes}</span>`:'<span style="font-size:11px;color:var(--border-strong);">—</span>';
        const displayName = a.name && a.name.trim() !== '' ? a.name : `<span style="color:var(--text-muted);font-style:italic;">Sem nome (${a.email || 'Novo'})</span>`;
        return`<tr>
            <td>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <div style="width:32px; height:32px; border-radius:50%; overflow:hidden; display:flex; align-items:center; justify-content:center; background:#f1f5f9; border:1px solid #e2e8f0;">
                        ${a.avatar_url ? `<img src="${a.avatar_url}" style="width:100%;height:100%;object-fit:cover;">` : `<span style="font-size:12px;font-weight:700;color:var(--primary);">${(a.name && a.name.trim() !== '') ? a.name.charAt(0).toUpperCase() : 'A'}</span>`}
                    </div>
                    <strong onclick="editAthlete('${a.id}')" style="cursor:pointer;color:var(--primary-color);text-decoration:none;">${displayName}</strong>
                    ${(a.lastActivityDate && (new Date() - new Date(a.lastActivityDate)) > 5 * 24 * 60 * 60 * 1000) ? `<span title="Inativo há mais de 5 dias" style="color:var(--warning); font-size:16px;"><i class="ri-error-warning-fill"></i></span>` : ''}
                </div>
                ${a.phone?`<div style="font-size:11px;color:var(--text-muted);">${a.phone}</div>`:''}
            </td>
            <td style="font-size:13px;color:var(--text-muted);">${a.email || '—'}</td>
            <td><span class="badge">${plan}</span></td>
            <td style="font-weight:700;color:var(--primary);">${vam}</td>
            <td>${noteSnip}</td>
            <td style="text-align:right;white-space:nowrap;">
                <button class="btn btn-tertiary" onclick="openStravaActivities('${a.id}')" title="Atividades Strava" style="color:#fc4c02;"><i class="ri-strava-line"></i></button>
                <button class="btn btn-tertiary" onclick="openHistory('${a.id}')" title="Calendário de Treinos" style="color:var(--primary);"><i class="ri-calendar-2-line"></i></button>
                <button class="btn btn-tertiary" onclick="editAthlete('${a.id}')" title="Editar"><i class="ri-edit-line"></i></button>
                <button class="btn btn-tertiary btn-icon-danger" onclick="deleteAthlete('${a.id}')" title="Excluir"><i class="ri-delete-bin-line"></i></button>
                <button class="btn btn-primary" onclick="generateAndExport('${a.id}')" style="padding:6px 12px;font-size:12px;margin-left:4px;"><i class="ri-send-plane-2-line"></i> Enviar</button>
            </td></tr>`;}).join('');
}

function toggleHRFields() {
    const method = $('athlete-hr-method').value;
    $('col-resting-hr').style.display = method === 'rfc' ? 'block' : 'none';
    $('col-lthr').style.display = method === 'lthr' ? 'block' : 'none';
}

function calculateHRZones(athlete) {
    const method = athlete.hrMethod || 'max';
    const maxHR = athlete.maxHr || 190;
    const restingHR = athlete.restingHr || 60;
    const lthr = athlete.lthr || 170;

    const zones = { z1: 0, z2: 0, z3: 0, z4: 0, z5: 0 };

    if (method === 'max') {
        zones.z1 = maxHR * 0.71;
        zones.z2 = maxHR * 0.78;
        zones.z3 = maxHR * 0.85;
        zones.z4 = maxHR * 0.93;
    } else if (method === 'rfc') {
        const reserve = maxHR - restingHR;
        zones.z1 = (reserve * 0.60) + restingHR;
        zones.z2 = (reserve * 0.70) + restingHR;
        zones.z3 = (reserve * 0.80) + restingHR;
        zones.z4 = (reserve * 0.90) + restingHR;
    } else if (method === 'lthr') {
        // Protocolo Joe Friel para LTHR
        zones.z1 = lthr * 0.85;
        zones.z2 = lthr * 0.89;
        zones.z3 = lthr * 0.94;
        zones.z4 = lthr * 0.99;
    }

    return zones;
}

function previewAthleteVAM(){
    // Preview removido a pedido do usuario
}

function openAthleteModal(id=null){
    const modal=$('modal-athlete');modal.dataset.editing=id||'';$('modal-athlete-title').textContent=id?'Editar Atleta':'Novo Atleta';
    const sel=$('athlete-group');const opts=['<option value="">-- Selecione --</option>'];
    categories.forEach(cat=>{const cg=groups.filter(g=>g.category===cat);if(!cg.length)return;opts.push(`<optgroup label="${cat}">${cg.map(g=>`<option value="${g.id}">${g.name}</option>`).join('')}</optgroup>`);});sel.innerHTML=opts.join('');
    const a=id?athletes.find(x=>x.id==id):null;
    const clearBtn = $('btn-clear-workouts');
    if (clearBtn) clearBtn.style.display = id ? 'flex' : 'none';
    
    $('athlete-name').value=a?a.name:'';$('athlete-phone').value=a?(a.phone||''):'';$('athlete-dob').value=a?(a.dob||''):'';$('athlete-test-hr').value=a?(a.maxHr||''):'';$('athlete-test').value=a?(a.testTime||''):'';$('athlete-notes').value=a?(a.notes||''):'';sel.value=a?(a.groupId||''):'';
    
    const preview = $('athlete-photo-preview');
    if (preview) {
        if (a && a.avatar_url) {
            preview.innerHTML = `<img src="${a.avatar_url}" style="width:100%; height:100%; object-fit:cover;">`;
        } else if (a && a.name) {
            preview.innerHTML = `<span style="font-size:32px; font-weight:800; color:var(--primary);">${a.name.charAt(0).toUpperCase()}</span>`;
        } else {
            preview.innerHTML = `<i class="ri-user-line" style="font-size:40px; color:var(--text-muted);"></i>`;
        }
    }
    
    // Novos campos de FC
    $('athlete-hr-method').value = a?(a.hrMethod||'max'):'max';
    $('athlete-resting-hr').value = a?(a.restingHr||''):'';
    $('athlete-lthr').value = a?(a.lthr||''):'';
    
    toggleHRFields();
    calculateTheoreticalHR();previewAthleteVAM();modal.classList.add('show');
}
function calculateTheoreticalHR(){const dob=$('athlete-dob').value,el=$('athlete-theo-hr');if(!dob){el.value='';return;}const b=new Date(dob),now=new Date();let age=now.getFullYear()-b.getFullYear();const m=now.getMonth()-b.getMonth();if(m<0||(m===0&&now.getDate()<b.getDate()))age--;el.value=(age>0&&age<120)?`${220-age} bpm (${age} anos)`:'';}
function saveAthlete(){
    const id=$('modal-athlete').dataset.editing,
          name=$('athlete-name').value.trim(),
          phone=$('athlete-phone').value,
          dob=$('athlete-dob').value,
          maxHr=parseInt($('athlete-test-hr').value)||null,
          hrMethod=$('athlete-hr-method').value,
          restingHr=parseInt($('athlete-resting-hr').value)||null,
          lthr=parseInt($('athlete-lthr').value)||null,
          testTime=parseFloat($('athlete-test').value.replace(',', '.'))||null,
          groupId=parseInt($('athlete-group').value)||null,
          notes=$('athlete-notes').value.trim();
    
    if(!name)return showToast('Nome obrigatório','error');
    if(id){
        const idx = athletes.findIndex(x=>x.id==id);
        if(idx !== -1) {
            Object.assign(athletes[idx],{name,phone,dob,maxHr,hrMethod,restingHr,lthr,testTime,groupId,notes});
            // Update Supabase if linked
            if (athletes[idx].supabaseId) {
                dbClient.from('profiles').update({ 
                    max_hr: maxHr, 
                    hr_method: hrMethod,
                    resting_hr: restingHr,
                    lthr: lthr,
                    vam: testTime ? 180/testTime : null 
                }).eq('id', athletes[idx].supabaseId).then();
            }
        }
    }
    else{athletes.push({id:generateId(),name,phone,dob,maxHr,hrMethod,restingHr,lthr,testTime,groupId,notes});}
    saveState(['athletes']);closeModals();renderAthletes();renderDashboard();showToast(id?'Atualizado!':'Cadastrado!');
}
function editAthlete(id){
    navigate('athletes', null, false, id);
    openAthleteModal(id);
}
function deleteAthlete(id){const a=athletes.find(x=>x.id==id);if(!confirm(`Excluir "${a?.name}"?`))return;
    const backupA=JSON.parse(JSON.stringify(a));const backupH=historyPlans.filter(h=>h.athleteId==id).map(h=>JSON.parse(JSON.stringify(h)));
    athletes=athletes.filter(x=>x.id!=id);historyPlans=historyPlans.filter(h=>h.athleteId!=id);
    saveState(['athletes','history']);renderAthletes();renderDashboard();
    showToast('Atleta excluído.','default',()=>{athletes.push(backupA);historyPlans.push(...backupH);saveState(['athletes','history']);renderAthletes();renderDashboard();});
}

// ═══════════════════════════════════════
//  HISTORY
// ═══════════════════════════════════════
let currentHistoryAthleteId=null;
let calendarCurrentDate = new Date();
let calendarWorkouts = [];

async function openHistory(aId) {
    currentHistoryAthleteId = aId;
    const a = athletes.find(x => x.id == aId);
    if (!a) return;
    
    // Update URL to history subpath
    const baseUrl = '/professor';
    const newUrl = baseUrl + '/atletas/historico/' + aId;
    if (window.location.pathname !== newUrl) {
        history.pushState({ viewId: 'athletes', subId: 'historico_' + aId }, '', newUrl);
    }
    localStorage.setItem('vdot_lastSubId', 'historico_' + aId);
    
    $('hist-athlete-name').textContent = a.name;
    calendarCurrentDate = new Date(); // Iniciar no mês corrente
    
    // Renderizar o histórico de planilhas antigas na parte inferior
    renderHistoryList(aId);
    
    // Coluna de Referência VAM/Ritmos removida a pedido do usuário
    
    // Exibir o modal
    $('modal-history').classList.add('show');
    
    // Inicializar e renderizar a biblioteca de treinos
    setTimeout(() => {
        initHistoryLibrary();
    }, 100);
    
    // Carregar os treinos em tempo real e renderizar no calendário
    await loadCalendarWorkouts();
}

async function loadCalendarWorkouts() {
    const container = $('history-calendar-container');
    if (!container) return;
    
    container.innerHTML = `
        <div style="display:flex; justify-content:center; align-items:center; padding:60px; color:var(--text-muted);">
            <i class="ri-loader-4-line ri-spin" style="font-size:36px; margin-right:8px; color:var(--primary);"></i>
            <span>Carregando calendário de treinos...</span>
        </div>
    `;
    
    const a = athletes.find(x => x.id == currentHistoryAthleteId);
    if (!a) return;
    
    try {
        if (!a.supabaseId) {
            container.innerHTML = `
                <div style="padding:40px; text-align:center; color:var(--text-muted);">
                    <i class="ri-information-line" style="font-size:40px; display:block; margin-bottom:12px; color:var(--primary);"></i>
                    <h4 style="font-weight:700; color:var(--text); margin-bottom:8px;">Atleta Manual (Sem Conta no App)</h4>
                    <p style="font-size:13px; max-width:500px; margin:0 auto; line-height:1.5;">
                        Este atleta não possui uma conta de login vinculada no aplicativo. Para gerenciar treinos diários interativos no calendário e sincronizar atividades do Strava/Garmin, vincule um e-mail de acesso nas configurações do atleta.
                    </p>
                </div>
            `;
            return;
        }
        
        // Buscar todos os treinos da tabela workouts do Supabase
        const { data, error } = await dbClient
            .from('workouts')
            .select('*')
            .eq('athlete_id', a.supabaseId)
            .order('date', { ascending: true });
            
        if (error) throw error;
        
        calendarWorkouts = data || [];
        renderHistoryCalendar();
    } catch (err) {
        console.error("Erro ao carregar calendário:", err);
        const errMsg = err?.message || (typeof err === 'string' ? err : JSON.stringify(err)) || 'Erro de conexão desconhecido';
        container.innerHTML = `
            <div style="padding:40px; text-align:center; color:var(--danger); max-width:500px; margin:0 auto;">
                <i class="ri-error-warning-line" style="font-size:44px; display:block; margin-bottom:16px;"></i>
                <h4 style="font-weight:700; color:var(--text); margin-bottom:8px; font-size:16px;">Erro ao Carregar Histórico</h4>
                <p style="font-size:13px; line-height:1.6; margin-bottom:20px; color:var(--text-muted);">
                    Não foi possível conectar ao banco de dados de treinos:<br>
                    <span style="font-family:monospace; background:rgba(217,48,37,0.06); padding:4px 8px; border-radius:4px; font-size:12px; display:inline-block; margin-top:6px; font-weight:600; border:1px solid rgba(217,48,37,0.15);">${errMsg}</span>
                </p>
                <div style="display:flex; justify-content:center; gap:12px; flex-wrap:wrap;">
                    <button class="btn btn-secondary" onclick="loadCalendarWorkouts()" style="padding:10px 16px; font-size:12px; font-weight:700;">
                        <i class="ri-refresh-line"></i> Tentar Novamente
                    </button>
                    <button class="btn btn-primary" onclick="forceLogoutAndRedirect()" style="padding:10px 16px; font-size:12px; font-weight:700; background:#d93025; border-color:#d93025; color:white;">
                        <i class="ri-logout-box-r-line"></i> Fazer Login Novamente
                    </button>
                </div>
            </div>
        `;
    }
}

async function forceLogoutAndRedirect() {
    try {
        sessionStorage.removeItem('vdot_role');
        localStorage.removeItem('vdot_offline');
        if (typeof dbClient !== 'undefined' && dbClient.auth) {
            await dbClient.auth.signOut();
        }
    } catch (e) {
        console.error("Erro no logout automático:", e);
    }
    window.location.href = "login.html?session_expired=true";
}

let calendarViewMode = 'month'; // 'week', 'month', 'year'

function parsePaceToMinutes(paceStr) {
    if (!paceStr) return 0;
    const clean = paceStr.replace(/['"]/g, ':').replace(/[^0-9:]/g, '');
    const parts = clean.split(':');
    if (parts.length === 1) {
        const mins = parseFloat(parts[0]);
        return isNaN(mins) ? 0 : mins;
    } else if (parts.length >= 2) {
        const mins = parseFloat(parts[0]) || 0;
        const secs = parseFloat(parts[1]) || 0;
        return mins + (secs / 60);
    }
    return 0;
}

function getStepDuration(step, athleteVam) {
    if (!step) return 0;
    if (step.type === 'repetition') {
        const count = parseInt(step.count) || 2;
        let subDuration = 0;
        if (Array.isArray(step.steps)) {
            step.steps.forEach(s => {
                subDuration += getStepDuration(s, athleteVam);
            });
        }
        return subDuration * count;
    }
    
    const durType = step.duration?.type || 'time';
    const durVal = parseFloat(step.duration?.value) || 0;
    
    if (durType === 'time') {
        return durVal;
    } else if (durType === 'distance') {
        let speedKmh = 12;
        if (athleteVam && athleteVam > 0) {
            const intType = step.intensity?.type || 'none';
            const intVal = parseFloat(step.intensity?.value) || 0;
            if (intType === 'vam' && intVal > 0) {
                speedKmh = (intVal / 100) * athleteVam;
            } else if (intType === 'pace' && intVal > 0) {
                speedKmh = 60 / intVal;
            } else {
                const stepType = step.type || 'run';
                if (stepType === 'warmup' || stepType === 'cooldown' || stepType === 'recovery') {
                    speedKmh = 0.65 * athleteVam;
                } else {
                    speedKmh = 0.75 * athleteVam;
                }
            }
        }
        if (speedKmh <= 0) speedKmh = 12;
        return (durVal / speedKmh) * 60;
    }
    return 0;
}

function getWorkoutPlannedDuration(wk, athleteVam) {
    if (!wk) return 0;
    
    const steps = wk.metrics?.structured_steps || wk.steps;
    if (Array.isArray(steps) && steps.length > 0) {
        let durationMinutes = 0;
        steps.forEach(s => {
            durationMinutes += getStepDuration(normalizeWorkoutStep(s), athleteVam);
        });
        if (durationMinutes > 0) return durationMinutes;
    }
    
    const dist = parseFloat(wk.metrics?.distance_value) || parseFloat(wk.distance) || 0;
    const paceStr = wk.metrics?.pace_value || wk.metrics?.duration;
    if (dist > 0 && paceStr && paceStr !== '--') {
        const paceMins = parsePaceToMinutes(paceStr);
        if (paceMins > 0) {
            return dist * paceMins;
        }
    }
    
    if (paceStr && paceStr !== '--' && !dist) {
        const paceMins = parsePaceToMinutes(paceStr);
        if (paceMins > 0) return paceMins;
    }
    
    if (dist > 0) {
        const speedKmh = (athleteVam && athleteVam > 0) ? (0.75 * athleteVam) : 12;
        return (dist / speedKmh) * 60;
    }
    
    return 0;
}

function formatDurationFromMinutes(mins) {
    if (!mins || isNaN(mins) || mins <= 0) return '';
    const totalSeconds = Math.round(mins * 60);
    const hrs = Math.floor(totalSeconds / 3600);
    const remainingSecs = totalSeconds % 3600;
    const m = Math.floor(remainingSecs / 60);
    const s = remainingSecs % 60;
    
    if (hrs > 0) {
        return `${hrs}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    } else {
        return `${m}:${String(s).padStart(2, '0')}`;
    }
}

function changeCalendarView(mode) {
    calendarViewMode = mode;
    renderHistoryCalendar();
}

function handleYearDayClick(dateStr) {
    calendarCurrentDate = new Date(dateStr + 'T12:00:00');
    calendarViewMode = 'month';
    renderHistoryCalendar();
}

function renderHistoryCalendar() {
    const container = $('history-calendar-container');
    if (!container) return;
    
    const year = calendarCurrentDate.getFullYear();
    const month = calendarCurrentDate.getMonth();
    
    const monthNames = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    const monthName = monthNames[month];
    
    // Obter atleta e VAM
    const athlete = athletes.find(x => x.id == currentHistoryAthleteId);
    const athleteVam = athlete && athlete.testTime ? (180 / athlete.testTime) : 12;
    
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    // Título e Datas baseados no modo de visualização
    let headerTitle = "";
    if (calendarViewMode === 'week') {
        const currentDayOfWeek = calendarCurrentDate.getDay();
        const offsetToMonday = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
        const mondayDate = new Date(calendarCurrentDate);
        mondayDate.setDate(calendarCurrentDate.getDate() + offsetToMonday);
        
        const sundayDate = new Date(mondayDate);
        sundayDate.setDate(mondayDate.getDate() + 6);
        
        const mName = mondayDate.getDate();
        const mMonth = monthNames[mondayDate.getMonth()];
        const sName = sundayDate.getDate();
        const sMonth = monthNames[sundayDate.getMonth()];
        const yName = mondayDate.getFullYear();
        
        if (mondayDate.getMonth() === sundayDate.getMonth()) {
            headerTitle = `${mName} a ${sName} de ${mMonth} de ${yName}`;
        } else {
            headerTitle = `${mName} de ${mMonth} a ${sName} de ${sMonth} de ${yName}`;
        }
    } else if (calendarViewMode === 'year') {
        headerTitle = `Ano ${year}`;
    } else { // 'month'
        headerTitle = `${monthName} ${year}`;
    }
    
    // Renderizar o cabeçalho comum
    let html = `
        <div class="calendar-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:12px; flex-shrink:0; border-bottom:1px solid var(--border-strong); padding-bottom:12px;">
            <div style="display:flex; align-items:center; gap:10px;">
                <h3 style="font-size:18px; font-weight:800; color:var(--text); margin:0;">${headerTitle}</h3>
                <span style="font-size:11px; background:rgba(18,101,194,0.1); color:var(--primary); padding:3px 8px; border-radius:100px; font-weight:700;">
                    ${calendarWorkouts.length} treinos cadastrados
                </span>
            </div>
            
            <!-- Garmin-style Segmented View Switcher -->
            <div class="calendar-view-switcher" style="display:flex; background:var(--border); padding:2px; border-radius:8px; border:1px solid var(--border-strong); align-items:center;">
                <button onclick="changeCalendarView('week')" style="background:${calendarViewMode === 'week' ? 'var(--primary)' : 'transparent'}; color:${calendarViewMode === 'week' ? 'white' : 'var(--text-muted)'}; border:none; padding:5px 14px; font-size:11px; font-weight:700; border-radius:6px; cursor:pointer; transition:all 0.2s; outline:none;">Semana</button>
                <button onclick="changeCalendarView('month')" style="background:${calendarViewMode === 'month' ? 'var(--primary)' : 'transparent'}; color:${calendarViewMode === 'month' ? 'white' : 'var(--text-muted)'}; border:none; padding:5px 14px; font-size:11px; font-weight:700; border-radius:6px; cursor:pointer; transition:all 0.2s; outline:none;">Mês</button>
                <button onclick="changeCalendarView('year')" style="background:${calendarViewMode === 'year' ? 'var(--primary)' : 'transparent'}; color:${calendarViewMode === 'year' ? 'white' : 'var(--text-muted)'}; border:none; padding:5px 14px; font-size:11px; font-weight:700; border-radius:6px; cursor:pointer; transition:all 0.2s; outline:none;">Ano</button>
            </div>
            
            <div style="display:flex; gap:6px;">
                <button class="btn btn-secondary" onclick="changeCalendarMonth(-1)" style="padding:6px 12px; font-size:12px;"><i class="ri-arrow-left-s-line"></i> Anterior</button>
                <button class="btn btn-secondary" onclick="changeCalendarMonth(0)" style="padding:6px 12px; font-size:12px;">Hoje</button>
                <button class="btn btn-secondary" onclick="changeCalendarMonth(1)" style="padding:6px 12px; font-size:12px;">Próximo <i class="ri-arrow-right-s-line"></i></button>
            </div>
        </div>
    `;
    
    // Renderização baseada no modo
    if (calendarViewMode === 'week') {
        const currentDayOfWeek = calendarCurrentDate.getDay();
        const offsetToMonday = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
        const mondayDate = new Date(calendarCurrentDate);
        mondayDate.setDate(calendarCurrentDate.getDate() + offsetToMonday);

        const weekDays = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(mondayDate);
            d.setDate(mondayDate.getDate() + i);
            const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            const isToday = dateStr === todayStr;
            const dayWorkouts = calendarWorkouts.filter(w => w.date.split('T')[0] === dateStr);
            
            weekDays.push({
                dateStr,
                dayNum: d.getDate(),
                isToday,
                workouts: dayWorkouts
            });
        }
        
        html += `
            <div class="calendar-grid" style="display:grid; grid-template-columns: repeat(7, 1fr); gap:8px; flex:1; min-height:350px;">
        `;
        const weekdaysLabels = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
        for (let d = 0; d < 7; d++) {
            const cell = weekDays[d];
            const label = weekdaysLabels[d];
            
            html += `
                <div class="calendar-day-box" 
                     onclick="handleCalendarDayClick(event, '${cell.dateStr}')" 
                     ondragover="event.preventDefault(); this.style.borderColor='var(--primary)';" 
                     ondragleave="this.style.borderColor='${cell.isToday ? 'var(--primary)' : 'var(--border-strong)'}';" 
                     ondrop="this.style.borderColor='${cell.isToday ? 'var(--primary)' : 'var(--border-strong)'}'; handleWorkoutDrop(event, '${cell.dateStr}')"
                     style="height:100%; min-height:300px; background:var(--bg); border: 1px solid ${cell.isToday ? 'var(--primary)' : 'var(--border-strong)'}; border-radius:10px; padding:8px; display:flex; flex-direction:column; gap:6px; cursor:pointer; transition:all 0.15s; position:relative; overflow:hidden;">
                    
                    <div style="display:flex; justify-content:space-between; align-items:center; flex-shrink:0; border-bottom:1px solid var(--border-strong); padding-bottom:4px;">
                        <div style="display:flex; flex-direction:column;">
                            <span style="font-size:9px; font-weight:700; color:var(--text-muted); text-transform:uppercase;">${label}</span>
                            <span style="font-size:16px; font-weight:800; color:${cell.isToday ? 'var(--primary)' : 'var(--text)'};">${cell.dayNum}</span>
                        </div>
                        ${cell.isToday ? `<span style="width:5px; height:5px; background:var(--primary); border-radius:50%;"></span>` : ''}
                    </div>
                    
                    <div style="flex:1; display:flex; flex-direction:column; gap:4px; overflow-y:auto; min-height:0; margin-top:2px;">
                        ${cell.workouts.map(wk => {
                            const isCompleted = wk.status === 'completed';
                            const wkDist = parseFloat(wk.metrics?.distance_value) || parseFloat(wk.distance) || null;
                            const wkRealDist = parseFloat(wk.metrics?.real_distance) || parseFloat(wk.real_distance) || null;
                            const metricText = isCompleted 
                                ? `${wkRealDist ? wkRealDist.toFixed(1) : (wkDist ? wkDist.toFixed(1) : '0')}km` 
                                : `${wkDist ? wkDist.toFixed(1) : '—'}km`;

                            const plannedDur = getWorkoutPlannedDuration(wk, athleteVam);
                            let realDur = null;
                            if (isCompleted) {
                                realDur = wk.metrics?.real_duration;
                                if (!realDur) {
                                    const realDistVal = parseFloat(wk.metrics?.real_distance) || parseFloat(wk.real_distance);
                                    const realPaceStr = wk.metrics?.real_pace || wk.real_pace;
                                    if (realDistVal > 0 && realPaceStr) {
                                        const realPaceMins = parsePaceToMinutes(realPaceStr);
                                        if (realPaceMins > 0) realDur = realDistVal * realPaceMins;
                                    }
                                }
                                if (!realDur) realDur = plannedDur;
                            }
                            const durationText = isCompleted
                                ? (realDur ? formatDurationFromMinutes(realDur) : '')
                                : (plannedDur ? formatDurationFromMinutes(plannedDur) : '');

                            let badgeBg = '#fff9c4'; 
                            let borderStroke = '#fdd835'; 
                            let textColor = '#1e293b'; 
                            let typeIcon = '<i class="ri-run-line" style="font-size:12px;"></i>';

                            if (wk.type === 'Natação') {
                                badgeBg = '#e0f2fe'; borderStroke = '#7dd3fc'; textColor = '#0369a1';
                                typeIcon = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style="display:inline-block;vertical-align:middle;margin-right:2px;"><path d="M2 21v-2q.95 0 1.425-.5T5.3 18t1.925.5t1.425.5t1.425-.5T12 18t1.925.5t1.425.5t1.425-.5T18.7 18t1.875.5T22 19v2q-1.475 0-1.937-.5T18.7 20t-1.425.5t-1.925.5t-1.925-.5T12 20t-1.425.5t-1.925.5t-1.925-.5T5.3 20t-1.363.5T2 21m0-4.5v-2q.95 0 1.425-.5t1.875-.5t1.938.5t1.412.5q.9 0 1.425-.5T12 13.5t1.925.5t1.425.5t1.425-.5t1.925-.5t1.875.5t1.425.5v2q-1.475 0-1.937-.5t-1.363-.5t-1.388.5t-1.962.5q-1.425 0-1.937-.5T12 15.5q-.95 0-1.412.5t-1.938.5t-1.963-.5t-1.387-.5t-1.362.5T2 16.5m4.9-5.1l3.325-3.325l-1-1q-.825-.825-1.75-1.2T5.2 5.5V3q1.875 0 3.1.413T10.7 5l6.4 6.4q-.425.275-.825.438T15.35 12q-.9 0-1.425-.5T12 11t-1.925.5t-1.425.5q-.525 0-.925-.162T6.9 11.4m11.575-7.663q.725.738.725 1.763q0 1.05-.725 1.775T16.7 8t-1.775-.725T14.2 5.5q0-1.025.725-1.763T16.7 3t1.775.738"/></svg>';
                            } else if (wk.type === 'Ciclismo') {
                                badgeBg = '#ecfdf5'; borderStroke = '#6ee7b7'; textColor = '#047857';
                                typeIcon = '<i class="ri-riding-line" style="font-size:12px;"></i>';
                            } else if (wk.type === 'Fortalecimento') {
                                badgeBg = '#f5f3ff'; borderStroke = '#c084fc'; textColor = '#6d28d9';
                                typeIcon = '<i class="ri-focus-3-line" style="font-size:12px;"></i>';
                            } else if (wk.type === 'Outros') {
                                badgeBg = '#f8fafc'; borderStroke = '#cbd5e1'; textColor = '#475569';
                                typeIcon = '<i class="ri-file-list-3-line" style="font-size:12px;"></i>';
                            }

                            if (isCompleted) {
                                borderStroke = '#10b981';
                                typeIcon = '<i class="ri-checkbox-circle-fill" style="font-size:12px; color:#10b981;"></i>';
                            }

                            return `
                                <div draggable="true" 
                                     ondragstart="handleWorkoutDragStart(event, '${wk.id}')" 
                                     onclick="handleCalendarWorkoutClick(event, '${wk.id}')" 
                                     oncontextmenu="handleWorkoutContextMenu(event, '${wk.id}')"
                                     class="workout-calendar-item"
                                     style="background:${badgeBg}; color:${textColor}; padding:6px 8px; border-radius:6px; font-size:11px; font-weight:500; display:flex; flex-direction:column; gap:2px; border:1px solid ${borderStroke}; cursor:grab; position:relative; box-shadow:0 1px 3px rgba(0,0,0,0.05); transition:all 0.15s;" 
                                     title="Clique para editar\nArraste para mover/copiar (Ctrl)\nBotão direito para copiar/excluir\n\n${wk.title}\n${wk.description || ''}">
                                    
                                    <div style="display:flex; align-items:center; gap:4px; width:100%;">
                                        <span style="display:inline-flex; align-items:center; opacity:0.8;">${typeIcon}</span>
                                        <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex:1; font-weight:600;">${wk.title}</span>
                                    </div>

                                    <div class="workout-metric-text" style="font-size:9.5px; opacity:0.7; display:flex; align-items:center; flex-wrap:wrap; gap:4px; font-weight:450; margin-top:2px;">
                                        <span>${metricText}</span>
                                        ${durationText ? `<span style="display:flex; align-items:center; gap:2px; opacity:0.8;"><i class="ri-time-line" style="font-size:10px;"></i> ${durationText}</span>` : ''}
                                    </div>

                                    <div class="workout-actions-overlay" style="display:none; gap:10px; align-items:center; justify-content:center; border-radius:4px; margin-top:2px; width:100%;">
                                        <i class="ri-file-copy-line" onclick="event.stopPropagation(); event.preventDefault(); quickDuplicateWorkout('${wk.id}')" title="Duplicar neste dia" style="cursor:pointer; font-size:12px; color:#f59e0b;"></i>
                                        <i class="ri-send-plane-line" onclick="event.stopPropagation(); event.preventDefault(); openSendWorkoutToAthleteModal('${wk.id}')" title="Copiar p/ Outro Aluno" style="cursor:pointer; font-size:12px; color:#3b82f6;"></i>
                                        <i class="ri-folder-add-line" onclick="event.stopPropagation(); event.preventDefault(); openSendWorkoutToFolderModal('${wk.id}')" title="Salvar como Modelo" style="cursor:pointer; font-size:12px; color:#0891b2;"></i>
                                        <i class="ri-delete-bin-line btn-icon-danger" onclick="event.stopPropagation(); event.preventDefault(); quickDeleteWorkout('${wk.id}')" title="Excluir" style="cursor:pointer; font-size:12px;"></i>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }
        html += `</div>`; // Fechar a grid

        // Barra de Totais semanais premium
        let plannedSum = 0;
        let completedSum = 0;
        let plannedDurationSum = 0;
        let completedDurationSum = 0;
        
        weekDays.forEach(cell => {
            if (cell.workouts) {
                cell.workouts.forEach(wk => {
                    const dist = parseFloat(wk.metrics?.distance_value) || parseFloat(wk.distance) || 0;
                    plannedSum += dist;
                    const plannedDur = getWorkoutPlannedDuration(wk, athleteVam);
                    plannedDurationSum += plannedDur;
                    
                    if (wk.status === 'completed') {
                        const realDist = parseFloat(wk.metrics?.real_distance) || parseFloat(wk.real_distance) || dist;
                        completedSum += realDist;
                        
                        let realDur = wk.metrics?.real_duration;
                        if (!realDur) {
                            const realDistVal = parseFloat(wk.metrics?.real_distance) || parseFloat(wk.real_distance);
                            const realPaceStr = wk.metrics?.real_pace || wk.real_pace;
                            if (realDistVal > 0 && realPaceStr) {
                                const realPaceMins = parsePaceToMinutes(realPaceStr);
                                if (realPaceMins > 0) realDur = realDistVal * realPaceMins;
                            }
                        }
                        if (!realDur) realDur = plannedDur;
                        completedDurationSum += realDur;
                    }
                });
            }
        });

        const pDurText = plannedDurationSum > 0 ? formatDurationFromMinutes(plannedDurationSum) : '';
        const cDurText = completedDurationSum > 0 ? formatDurationFromMinutes(completedDurationSum) : '';

        html += `
            <div style="background:var(--panel); border:1px solid var(--border-strong); border-radius:12px; padding:12px 16px; display:flex; justify-content:space-around; align-items:center; margin-top:12px; box-shadow:0 2px 10px rgba(0,0,0,0.03);">
                <div style="display:flex; flex-direction:column; gap:2px; text-align:center;">
                    <span style="font-size:10px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px;">Distância Planejada</span>
                    <span style="font-size:16px; font-weight:800; color:var(--text);">${plannedSum.toFixed(1)} km</span>
                </div>
                
                <div style="width:1px; height:24px; background:var(--border-strong);"></div>
                
                <div style="display:flex; flex-direction:column; gap:2px; text-align:center;">
                    <span style="font-size:10px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px;">Tempo Planejado</span>
                    <span style="font-size:16px; font-weight:800; color:var(--text);"><i class="ri-time-line" style="color:var(--primary); margin-right:3px;"></i>${pDurText || '—'}</span>
                </div>
                
                <div style="width:1px; height:24px; background:var(--border-strong);"></div>
                
                <div style="display:flex; flex-direction:column; gap:2px; text-align:center;">
                    <span style="font-size:10px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px;">Distância Realizada</span>
                    <span style="font-size:16px; font-weight:800; color:var(--success);">${completedSum.toFixed(1)} km</span>
                </div>
                
                <div style="width:1px; height:24px; background:var(--border-strong);"></div>
                
                <div style="display:flex; flex-direction:column; gap:2px; text-align:center;">
                    <span style="font-size:10px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px;">Tempo Realizado</span>
                    <span style="font-size:16px; font-weight:800; color:var(--success);"><i class="ri-time-line" style="margin-right:3px;"></i>${cDurText || '—'}</span>
                </div>
            </div>
        `;
        
    } else if (calendarViewMode === 'year') {
        html += `
            <div class="calendar-grid-year" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap:12px; flex:1; min-height:0; overflow-y:auto; padding:2px;">
        `;

        for (let m = 0; m < 12; m++) {
            const firstDay = new Date(year, m, 1);
            const lastDay = new Date(year, m + 1, 0);
            const totalDays = lastDay.getDate();
            
            let startDayOfWeek = firstDay.getDay();
            startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
            
            html += `
                <div style="background:var(--panel); border:1px solid var(--border-strong); border-radius:10px; padding:10px; transition:all 0.15s; display:flex; flex-direction:column; gap:4px;" class="mini-month-card">
                    <h4 style="font-size:12.5px; font-weight:800; color:var(--primary); margin:0 0 4px 0; text-align:center;">${monthNames[m]}</h4>
                    
                    <div style="display:grid; grid-template-columns: repeat(7, 1fr); gap:4px; text-align:center; font-size:9px; font-weight:700; color:var(--text-muted); border-bottom:1px solid var(--border-strong); padding-bottom:3px; opacity:0.8;">
                        ${["S", "T", "Q", "Q", "S", "S", "D"].map(d => `<div>${d}</div>`).join('')}
                    </div>
                    
                    <div style="display:grid; grid-template-columns: repeat(7, 1fr); gap:4px 2px; text-align:center; font-size:10px; margin-top:2px;">
            `;
            
            for (let empty = 0; empty < startDayOfWeek; empty++) {
                html += `<div></div>`;
            }
            
            for (let day = 1; day <= totalDays; day++) {
                const dateStr = `${year}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const dayWorkouts = calendarWorkouts.filter(w => w.date.split('T')[0] === dateStr);
                const isToday = dateStr === todayStr;
                
                let hasWorkout = dayWorkouts.length > 0;
                let cellStyle = `display:flex; justify-content:center; align-items:center; height:24px; width:24px; border-radius:50%; font-size:10.5px; cursor:pointer; transition:all 0.15s; margin:auto;`;
                let titleAttr = "";
                let textStyle = "";
                
                if (hasWorkout) {
                    const completed = dayWorkouts.some(w => w.status === 'completed');
                    let color = '#fbbf24'; // default yellow
                    let bgColor = '#fef9c3'; // light yellow
                    let textColor = '#92400e';
                    
                    if (completed) {
                        color = '#10b981';
                        bgColor = '#d1fae5';
                        textColor = '#065f46';
                    } else {
                        const firstType = dayWorkouts[0].type;
                        if (firstType === 'Natação') {
                            color = '#0284c7';
                            bgColor = '#e0f2fe';
                            textColor = '#075985';
                        } else if (firstType === 'Ciclismo') {
                            color = '#10b981';
                            bgColor = '#d1fae5';
                            textColor = '#065f46';
                        } else if (firstType === 'Fortalecimento') {
                            color = '#8b5cf6';
                            bgColor = '#f3e8ff';
                            textColor = '#5b21b6';
                        } else if (firstType === 'Outros') {
                            color = '#64748b';
                            bgColor = '#f1f5f9';
                            textColor = '#334155';
                        }
                    }
                    
                    if (isToday) {
                        cellStyle += ` background:${bgColor}; border:1.5px solid var(--primary); font-weight:800;`;
                    } else {
                        cellStyle += ` background:${bgColor}; font-weight:800;`;
                    }
                    textStyle = `color:${textColor};`;
                    titleAttr = `title="${dayWorkouts.map(w => w.title).join(', ')}"`;
                } else if (isToday) {
                    cellStyle += ` border:1.5px solid var(--primary); font-weight:800;`;
                    textStyle = `color:var(--primary);`;
                } else {
                    cellStyle += ` font-weight:500;`;
                    textStyle = `color:var(--text);`;
                }
                
                html += `
                    <div onclick="event.stopPropagation(); handleYearDayClick('${dateStr}')" 
                         style="${cellStyle} ${textStyle}" 
                         ${titleAttr}>
                        ${day}
                    </div>
                `;
            }
            
            html += `
                    </div>
                </div>
            `;
        }

        html += `</div>`;
        
    } else { // 'month'
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const totalDays = lastDay.getDate();
        
        let startDayOfWeek = firstDay.getDay();
        startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
        
        const prevMonthLastDay = new Date(year, month, 0).getDate();
        const totalRenderedCells = startDayOfWeek + totalDays;
        const remainingCells = 7 - (totalRenderedCells % 7);
        const paddingNext = remainingCells < 7 ? remainingCells : 0;
        const totalCellsCount = totalRenderedCells + paddingNext;
        const numRows = totalCellsCount / 7;
        
        html += `
            <div class="calendar-grid" style="display:grid; grid-template-columns: repeat(7, 1fr) 90px; grid-template-rows: auto repeat(${numRows}, 1fr); gap:6px; flex:1; min-height:0;">
                <!-- Headers da semana -->
                ${["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom", "Soma"].map(d => `
                    <div style="text-align:center; font-weight:700; font-size:12px; color:${d === 'Soma' ? 'var(--primary)' : 'var(--text-muted)'}; padding:4px 0; border-bottom:2px solid var(--border-strong);">
                        ${d}
                    </div>
                `).join('')}
        `;
        
        const dayCells = [];
        for (let i = 0; i < totalCellsCount; i++) {
            const cellDate = new Date(year, month, 1 - startDayOfWeek + i);
            const cellYear = cellDate.getFullYear();
            const cellMonth = cellDate.getMonth();
            const cellDayNum = cellDate.getDate();
            const isCurrentMonth = cellMonth === month && cellYear === year;
            const dateStr = `${cellYear}-${String(cellMonth + 1).padStart(2, '0')}-${String(cellDayNum).padStart(2, '0')}`;
            const isToday = dateStr === todayStr;
            
            const dayWorkouts = calendarWorkouts.filter(w => w.date.split('T')[0] === dateStr);
            
            dayCells.push({
                dateStr,
                dayNum: cellDayNum,
                isCurrentMonth,
                isToday,
                workouts: dayWorkouts
            });
        }
        
        for (let w = 0; w < numRows; w++) {
            for (let d = 0; d < 7; d++) {
                const cell = dayCells[w * 7 + d];
                if (!cell.isCurrentMonth) {
                    html += `
                        <div style="height:100%; min-height:0; background:var(--bg); border:1px solid var(--border-strong); border-radius:8px; padding:6px; opacity:0.35; cursor:not-allowed; overflow:hidden;">
                            <span style="font-size:11px; font-weight:600; color:var(--text-muted);">${cell.dayNum}</span>
                        </div>
                    `;
                } else {
                    html += `
                        <div class="calendar-day-box" 
                             onclick="handleCalendarDayClick(event, '${cell.dateStr}')" 
                             ondragover="event.preventDefault(); this.style.borderColor='var(--primary)';" 
                             ondragleave="this.style.borderColor='${cell.isToday ? 'var(--primary)' : 'var(--border-strong)'}';" 
                             ondrop="this.style.borderColor='${cell.isToday ? 'var(--primary)' : 'var(--border-strong)'}'; handleWorkoutDrop(event, '${cell.dateStr}')"
                             style="height:100%; min-height:0; background:var(--bg); border: 1px solid ${cell.isToday ? 'var(--primary)' : 'var(--border-strong)'}; border-radius:8px; padding:6px; display:flex; flex-direction:column; gap:4px; cursor:pointer; transition:all 0.15s; position:relative; overflow:hidden;">
                            <div style="display:flex; justify-content:space-between; align-items:center; flex-shrink:0;">
                                <span style="font-size:11px; font-weight:600; color:${cell.isToday ? 'var(--primary)' : 'var(--text)'};">${cell.dayNum}</span>
                                ${cell.isToday ? `<span style="width:5px; height:5px; background:var(--primary); border-radius:50%;"></span>` : ''}
                            </div>
                            
                            <div style="flex:1; display:flex; flex-direction:column; gap:4px; overflow-y:auto; min-height:0; margin-top:2px;">
                                ${cell.workouts.map(wk => {
                                    const isCompleted = wk.status === 'completed';
                                    const wkDist = parseFloat(wk.metrics?.distance_value) || parseFloat(wk.distance) || null;
                                    const wkRealDist = parseFloat(wk.metrics?.real_distance) || parseFloat(wk.real_distance) || null;
                                    const metricText = isCompleted 
                                        ? `${wkRealDist ? wkRealDist.toFixed(1) : (wkDist ? wkDist.toFixed(1) : '0')}km` 
                                        : `${wkDist ? wkDist.toFixed(1) : '—'}km`;

                                    const plannedDur = getWorkoutPlannedDuration(wk, athleteVam);
                                    let realDur = null;
                                    if (isCompleted) {
                                        realDur = wk.metrics?.real_duration;
                                        if (!realDur) {
                                            const realDistVal = parseFloat(wk.metrics?.real_distance) || parseFloat(wk.real_distance);
                                            const realPaceStr = wk.metrics?.real_pace || wk.real_pace;
                                            if (realDistVal > 0 && realPaceStr) {
                                                const realPaceMins = parsePaceToMinutes(realPaceStr);
                                                if (realPaceMins > 0) realDur = realDistVal * realPaceMins;
                                            }
                                        }
                                        if (!realDur) realDur = plannedDur;
                                    }
                                    const durationText = isCompleted
                                        ? (realDur ? formatDurationFromMinutes(realDur) : '')
                                        : (plannedDur ? formatDurationFromMinutes(plannedDur) : '');

                                    let badgeBg = '#fff9c4'; 
                                    let borderStroke = '#fdd835'; 
                                    let textColor = '#1e293b'; 
                                    let typeIcon = '<i class="ri-run-line" style="font-size:12px;"></i>';

                                    if (wk.type === 'Natação') {
                                        badgeBg = '#e0f2fe'; borderStroke = '#7dd3fc'; textColor = '#0369a1';
                                        typeIcon = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style="display:inline-block;vertical-align:middle;margin-right:2px;"><path d="M2 21v-2q.95 0 1.425-.5T5.3 18t1.925.5t1.425.5t1.425-.5T12 18t1.925.5t1.425.5t1.425-.5T18.7 18t1.875.5T22 19v2q-1.475 0-1.937-.5T18.7 20t-1.425.5t-1.925.5t-1.925-.5T12 20t-1.425.5t-1.925.5t-1.925-.5T5.3 20t-1.363.5T2 21m0-4.5v-2q.95 0 1.425-.5t1.875-.5t1.938.5t1.412.5q.9 0 1.425-.5T12 13.5t1.925.5t1.425.5t1.425-.5t1.925-.5t1.875.5t1.425.5v2q-1.475 0-1.937-.5t-1.363-.5t-1.388.5t-1.962.5q-1.425 0-1.937-.5T12 15.5q-.95 0-1.412.5t-1.938.5t-1.963-.5t-1.387-.5t-1.362.5T2 16.5m4.9-5.1l3.325-3.325l-1-1q-.825-.825-1.75-1.2T5.2 5.5V3q1.875 0 3.1.413T10.7 5l6.4 6.4q-.425.275-.825.438T15.35 12q-.9 0-1.425-.5T12 11t-1.925.5t-1.425.5q-.525 0-.925-.162T6.9 11.4m11.575-7.663q.725.738.725 1.763q0 1.05-.725 1.775T16.7 8t-1.775-.725T14.2 5.5q0-1.025.725-1.763T16.7 3t1.775.738"/></svg>';
                                    } else if (wk.type === 'Ciclismo') {
                                        badgeBg = '#ecfdf5'; borderStroke = '#6ee7b7'; textColor = '#047857';
                                        typeIcon = '<i class="ri-riding-line" style="font-size:12px;"></i>';
                                    } else if (wk.type === 'Fortalecimento') {
                                        badgeBg = '#f5f3ff'; borderStroke = '#c084fc'; textColor = '#6d28d9';
                                        typeIcon = '<i class="ri-focus-3-line" style="font-size:12px;"></i>';
                                    } else if (wk.type === 'Outros') {
                                        badgeBg = '#f8fafc'; borderStroke = '#cbd5e1'; textColor = '#475569';
                                        typeIcon = '<i class="ri-file-list-3-line" style="font-size:12px;"></i>';
                                    }

                                    if (isCompleted) {
                                        borderStroke = '#10b981';
                                        typeIcon = '<i class="ri-checkbox-circle-fill" style="font-size:12px; color:#10b981;"></i>';
                                    }

                                    return `
                                        <div draggable="true" 
                                             ondragstart="handleWorkoutDragStart(event, '${wk.id}')" 
                                             onclick="handleCalendarWorkoutClick(event, '${wk.id}')" 
                                             oncontextmenu="handleWorkoutContextMenu(event, '${wk.id}')"
                                             class="workout-calendar-item"
                                             style="background:${badgeBg}; color:${textColor}; padding:6px 8px; border-radius:6px; font-size:11px; font-weight:500; display:flex; flex-direction:column; gap:2px; border:1px solid ${borderStroke}; cursor:grab; position:relative; box-shadow:0 1px 2px rgba(0,0,0,0.03); transition:all 0.15s;" 
                                             title="${wk.title}">
                                            
                                            <div style="display:flex; align-items:center; gap:4px; width:100%;">
                                                <span style="display:inline-flex; align-items:center; opacity:0.8;">${typeIcon}</span>
                                                <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex:1; font-weight:800;">${wk.title}</span>
                                            </div>

                                            <div class="workout-metric-text" style="font-size:9.5px; opacity:0.8; display:flex; align-items:center; flex-wrap:wrap; gap:4px; font-weight:600; margin-top:2px;">
                                                <span>${metricText}</span>
                                                ${durationText ? `<span style="display:flex; align-items:center; gap:2px; opacity:0.8;"><i class="ri-time-line" style="font-size:10px;"></i> ${durationText}</span>` : ''}
                                            </div>

                                            <div class="workout-actions-overlay" style="display:none; gap:10px; align-items:center; justify-content:center; border-radius:4px; margin-top:2px; width:100%;">
                                                <i class="ri-file-copy-line" onclick="event.stopPropagation(); event.preventDefault(); quickDuplicateWorkout('${wk.id}')" title="Duplicar neste dia" style="cursor:pointer; font-size:12px; color:#f59e0b;"></i>
                                                <i class="ri-send-plane-line" onclick="event.stopPropagation(); event.preventDefault(); openSendWorkoutToAthleteModal('${wk.id}')" title="Copiar p/ Outro Aluno" style="cursor:pointer; font-size:12px; color:#3b82f6;"></i>
                                                <i class="ri-folder-add-line" onclick="event.stopPropagation(); event.preventDefault(); openSendWorkoutToFolderModal('${wk.id}')" title="Salvar como Modelo" style="cursor:pointer; font-size:12px; color:#0891b2;"></i>
                                                <i class="ri-delete-bin-line btn-icon-danger" onclick="event.stopPropagation(); event.preventDefault(); quickDeleteWorkout('${wk.id}')" title="Excluir" style="cursor:pointer; font-size:12px;"></i>
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    `;
                }
            }
            
            let plannedSum = 0;
            let completedSum = 0;
            let plannedDurationSum = 0;
            let completedDurationSum = 0;
            for (let d = 0; d < 7; d++) {
                const cell = dayCells[w * 7 + d];
                if (cell && cell.workouts) {
                    cell.workouts.forEach(wk => {
                        const dist = parseFloat(wk.metrics?.distance_value) || parseFloat(wk.distance) || 0;
                        plannedSum += dist;
                        const plannedDur = getWorkoutPlannedDuration(wk, athleteVam);
                        plannedDurationSum += plannedDur;
                        
                        if (wk.status === 'completed') {
                            const realDist = parseFloat(wk.metrics?.real_distance) || parseFloat(wk.real_distance) || dist;
                            completedSum += realDist;
                            
                            let realDur = wk.metrics?.real_duration;
                            if (!realDur) {
                                const realDistVal = parseFloat(wk.metrics?.real_distance) || parseFloat(wk.real_distance);
                                const realPaceStr = wk.metrics?.real_pace || wk.real_pace;
                                if (realDistVal > 0 && realPaceStr) {
                                    const realPaceMins = parsePaceToMinutes(realPaceStr);
                                    if (realPaceMins > 0) realDur = realDistVal * realPaceMins;
                                }
                            }
                            if (!realDur) realDur = plannedDur;
                            completedDurationSum += realDur;
                        }
                    });
                }
            }
            
            const hasCompleted = completedSum > 0;
            const plannedDurText = plannedDurationSum > 0 ? formatDurationFromMinutes(plannedDurationSum) : '';
            const completedDurText = completedDurationSum > 0 ? formatDurationFromMinutes(completedDurationSum) : '';

            html += `
                <div class="calendar-weekly-sum-box" 
                     style="height:100%; min-height:0; background:var(--panel); border:1px solid var(--border-strong); border-left:3px solid var(--primary); border-radius:8px; padding:6px; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center; transition:all 0.15s; gap:2px;">
                    <span style="font-size:9px; font-weight:700; color:var(--primary); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:2px;">Soma</span>
                    
                    <div style="display:flex; flex-direction:column; gap:1px;">
                        <span style="font-size:13px; font-weight:800; color:var(--text);">${plannedSum > 0 ? plannedSum.toFixed(1) + ' km' : '—'}</span>
                        ${plannedDurText ? `<span style="font-size:10px; color:var(--text-muted); font-weight:600;"><i class="ri-time-line" style="font-size:9.5px;"></i> ${plannedDurText}</span>` : ''}
                    </div>
                    
                    ${hasCompleted ? `
                        <div style="width:80%; height:1px; background:var(--border-strong); margin:4px 0;"></div>
                        <div style="display:flex; flex-direction:column; gap:1px;">
                            <span style="font-size:11px; font-weight:800; color:var(--success);">✓ ${completedSum.toFixed(1)} km</span>
                            ${completedDurText ? `<span style="font-size:9.5px; color:var(--success); font-weight:700;"><i class="ri-time-line" style="font-size:9px;"></i> ${completedDurText}</span>` : ''}
                        </div>
                    ` : ''}
                </div>
            `;
        }
        
        html += `</div>`;
    }
    
    container.innerHTML = html;
    
    if (!document.getElementById('calendar-hover-styles')) {
        const styleEl = document.createElement('style');
        styleEl.id = 'calendar-hover-styles';
        styleEl.innerHTML = `
            .calendar-day-box:hover {
                transform: translateY(-2px);
                border-color: var(--primary) !important;
                box-shadow: 0 4px 12px rgba(0,0,0,0.06);
                background: var(--panel) !important;
            }
            .calendar-weekly-sum-box:hover {
                transform: translateY(-2px);
                border-color: var(--primary) !important;
                border-style: solid !important;
                box-shadow: 0 4px 12px rgba(0,0,0,0.06);
                background: var(--panel) !important;
            }
            .workout-calendar-item:hover {
                box-shadow: 0 4px 10px rgba(0,0,0,0.08) !important;
                transform: translateY(-1px);
                z-index: 10 !important;
            }
            .workout-calendar-item:hover .workout-actions-overlay {
                display: flex !important;
            }
            .workout-calendar-item:hover .workout-metric-text {
                display: none !important;
            }
            .mini-month-card:hover {
                transform: translateY(-2px);
                border-color: var(--primary) !important;
                box-shadow: 0 4px 12px rgba(0,0,0,0.06);
            }
        `;
        document.head.appendChild(styleEl);
    }
}

function changeCalendarMonth(offset) {
    if (offset === 0) {
        calendarCurrentDate = new Date();
    } else {
        if (calendarViewMode === 'week') {
            calendarCurrentDate.setDate(calendarCurrentDate.getDate() + offset * 7);
        } else if (calendarViewMode === 'year') {
            calendarCurrentDate.setFullYear(calendarCurrentDate.getFullYear() + offset);
        } else { // 'month'
            calendarCurrentDate.setMonth(calendarCurrentDate.getMonth() + offset);
        }
    }
    renderHistoryCalendar();
}

function handleWorkoutDragStart(e, wId) {
    e.dataTransfer.setData('text/plain', wId);
    e.dataTransfer.effectAllowed = 'copyMove';
}

async function handleWorkoutDrop(e, targetDateStr) {
    e.preventDefault();
    e.stopPropagation();
    
    const templateData = e.dataTransfer.getData('text/workout-template');
    if (templateData) {
        try {
            const template = JSON.parse(templateData);
            createWorkoutFromTemplate(template, targetDateStr);
        } catch (err) {
            console.error('Erro no drag template:', err);
        }
        return;
    }
    
    const wId = e.dataTransfer.getData('text/plain');
    if (!wId) return;
    
    const isCopy = e.ctrlKey; // Apenas copia se a tecla Ctrl estiver ativamente pressionada
    const workout = calendarWorkouts.find(x => String(x.id) === String(wId));
    if (!workout) return;
    
    if (!isCopy && workout.date.split('T')[0] === targetDateStr) return;
    
    if (isCopy) {
        const newWorkout = { ...workout, id: Date.now(), date: targetDateStr + 'T12:00:00', status: 'planned' };
        calendarWorkouts.push(newWorkout);
        renderHistoryCalendar();
        
        const { error } = await dbClient.from('workouts').insert([{
            athlete_id: currentHistoryAthleteId,
            date: targetDateStr,
            title: workout.title,
            type: workout.type,
            description: workout.description,
            metrics: workout.metrics,
            status: 'planned'
        }]);
        if (error) { showToast('Erro ao duplicar treino.'); loadCalendarWorkouts(); }
        else { showToast('Treino copiado!'); loadCalendarWorkouts(); }
    } else {
        const oldDate = workout.date;
        
        // Atualiza a lista de treinos do calendário de forma imutável
        calendarWorkouts = calendarWorkouts.map(x => 
            String(x.id) === String(wId) ? { ...x, date: targetDateStr + 'T12:00:00' } : x
        );
        renderHistoryCalendar();
        
        const { error } = await dbClient.from('workouts').update({ date: targetDateStr }).eq('id', wId);
        if (error) { 
            // Reverte a alteração em caso de falha de conexão/banco
            calendarWorkouts = calendarWorkouts.map(x => 
                String(x.id) === String(wId) ? { ...x, date: oldDate } : x
            );
            renderHistoryCalendar(); 
            showToast('Erro ao mover treino.'); 
        } else { 
            showToast('Treino movido!'); 
        }
    }
}

function handleWorkoutContextMenu(e, wId) {
    e.preventDefault();
    e.stopPropagation();
    
    const oldMenu = document.getElementById('workout-context-menu');
    if (oldMenu) oldMenu.remove();
    
    const menu = document.createElement('div');
    menu.id = 'workout-context-menu';
    menu.style.position = 'fixed';
    menu.style.left = e.clientX + 'px';
    menu.style.top = e.clientY + 'px';
    menu.style.background = 'var(--panel)';
    menu.style.border = '1px solid var(--border)';
    menu.style.borderRadius = '12px';
    menu.style.padding = '6px 0';
    menu.style.boxShadow = '0 10px 30px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.02)';
    menu.style.zIndex = '1050';
    menu.style.minWidth = '160px';
    
    menu.innerHTML = `
        <div onclick="quickDuplicateWorkout('${wId}')" style="padding:8px 14px; cursor:pointer; font-size:13px; font-weight:500; display:flex; gap:10px; align-items:center; color:var(--text); transition:all 0.15s ease;" onmouseover="this.style.background='var(--bg)'; this.style.color='var(--primary)';" onmouseout="this.style.background='transparent'; this.style.color='var(--text)';">
            <i class="ri-file-copy-line" style="font-size:15px; opacity:0.75;"></i> Duplicar Treino
        </div>
        <div onclick="openSendWorkoutToAthleteModal('${wId}')" style="padding:8px 14px; cursor:pointer; font-size:13px; font-weight:500; display:flex; gap:10px; align-items:center; color:var(--text); transition:all 0.15s ease;" onmouseover="this.style.background='var(--bg)'; this.style.color='var(--primary)';" onmouseout="this.style.background='transparent'; this.style.color='var(--text)';">
            <i class="ri-send-plane-line" style="font-size:15px; opacity:0.75;"></i> Copiar p/ Aluno
        </div>
        <div onclick="openSendWorkoutToFolderModal('${wId}')" style="padding:8px 14px; cursor:pointer; font-size:13px; font-weight:500; display:flex; gap:10px; align-items:center; color:var(--text); transition:all 0.15s ease;" onmouseover="this.style.background='var(--bg)'; this.style.color='var(--primary)';" onmouseout="this.style.background='transparent'; this.style.color='var(--text)';">
            <i class="ri-folder-add-line" style="font-size:15px; opacity:0.75;"></i> Salvar na Biblioteca
        </div>
        <div onclick="quickDeleteWorkout('${wId}')" style="padding:8px 14px; cursor:pointer; font-size:13px; font-weight:500; display:flex; gap:10px; align-items:center; color:var(--danger); transition:all 0.15s ease;" onmouseover="this.style.background='var(--bg)'; this.style.color='var(--danger)';" onmouseout="this.style.background='transparent'; this.style.color='var(--danger)';">
            <i class="ri-delete-bin-line" style="font-size:15px; opacity:0.75;"></i> Excluir Treino
        </div>
    `;
    
    document.body.appendChild(menu);
    
    setTimeout(() => {
        const closeMenu = () => {
            if (menu) menu.remove();
            document.removeEventListener('click', closeMenu);
            document.removeEventListener('contextmenu', closeMenu);
        };
        document.addEventListener('click', closeMenu);
        document.addEventListener('contextmenu', closeMenu);
    }, 10);
}

async function quickDuplicateWorkout(wId) {
    const workout = calendarWorkouts.find(x => String(x.id) === String(wId));
    if (!workout) return;
    
    const newWorkout = { ...workout, id: Date.now(), status: 'planned' };
    calendarWorkouts.push(newWorkout);
    renderHistoryCalendar();
    
    const { error } = await dbClient.from('workouts').insert([{
        athlete_id: currentHistoryAthleteId,
        date: workout.date.split('T')[0],
        title: workout.title,
        type: workout.type,
        description: workout.description,
        metrics: workout.metrics,
        status: 'planned'
    }]);
    
    if (error) { showToast('Erro ao duplicar.'); loadCalendarWorkouts(); }
    else { showToast('Treino duplicado no mesmo dia!'); loadCalendarWorkouts(); }
}

async function quickDeleteWorkout(wId) {
    if (!confirm('Excluir permanentemente este treino?')) return;
    
    calendarWorkouts = calendarWorkouts.filter(x => String(x.id) !== String(wId));
    renderHistoryCalendar();
    
    const { error } = await dbClient.from('workouts').delete().eq('id', wId);
    if (error) { showToast('Erro ao excluir.'); loadCalendarWorkouts(); }
    else { showToast('Treino excluído!'); }
}

// ==========================================
// AÇÕES RÁPIDAS DE COPIAR E ARQUIVAR TREINOS
// ==========================================

function openSendWorkoutToAthleteModal(wId) {
    const workout = calendarWorkouts.find(x => String(x.id) === String(wId));
    if (!workout) return;
    
    const oldModal = document.getElementById('modal-send-workout-athlete');
    if (oldModal) oldModal.remove();
    
    const modal = document.createElement('div');
    modal.id = 'modal-send-workout-athlete';
    modal.className = 'modal active';
    modal.style.zIndex = '1100';
    modal.style.background = 'rgba(0,0,0,0.5)';
    modal.style.backdropFilter = 'blur(4px)';
    
    // Ordenar alunos por nome (excluindo o atual se possível)
    const sortedAthletes = [...athletes]
        .filter(a => String(a.id) !== String(currentHistoryAthleteId))
        .sort((a, b) => a.name.localeCompare(b.name));
    
    modal.innerHTML = `
        <div class="modal-card" style="max-width:420px; border-radius:12px; overflow:hidden; border:none; box-shadow:0 20px 25px -5px rgba(0,0,0,0.15);">
            <div class="modal-header" style="background:#fff; border-bottom:1px solid var(--border); padding:16px 20px; display:flex; justify-content:space-between; align-items:center;">
                <h3 style="font-weight:800; font-size:16px; display:flex; align-items:center; gap:8px; color:var(--text); margin:0;">
                    <i class="ri-send-plane-fill" style="color:var(--primary); font-size:18px;"></i> Copiar para Aluno
                </h3>
                <button class="btn-close" onclick="document.getElementById('modal-send-workout-athlete').remove()" style="border:none; background:transparent; cursor:pointer; font-size:20px; color:var(--text-muted);"><i class="ri-close-line"></i></button>
            </div>
            <div class="modal-body" style="padding:20px; background:#fff; max-height:400px; overflow-y:auto; display:flex; flex-direction:column; gap:12px;">
                <p style="font-size:13px; color:var(--text-muted); margin:0 0 4px 0; line-height:1.4;">
                    Selecione um aluno para copiar o treino <strong>"${workout.title}"</strong> para o mesmo dia (${workout.date.split('T')[0]}):
                </p>
                <div style="display:flex; flex-direction:column; gap:8px;">
                    ${sortedAthletes.length ? sortedAthletes.map(a => `
                        <div onclick="executeSendWorkoutToAthlete('${wId}', '${a.id}')" style="padding:12px; background:var(--panel); border:1px solid var(--border-strong); border-radius:8px; display:flex; align-items:center; gap:10px; cursor:pointer; transition:all 0.15s; font-weight:700; font-size:13px;" onmouseover="this.style.borderColor='var(--primary)'; this.style.background='#eff6ff';" onmouseout="this.style.borderColor='var(--border-strong)'; this.style.background='var(--panel)';">
                            <div style="width:32px; height:32px; background:var(--primary); color:white; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:14px; flex-shrink:0;">
                                ${a.name.charAt(0).toUpperCase()}
                            </div>
                            <div style="flex:1; min-width:0; text-align:left;">
                                <div style="color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${a.name}</div>
                                <div style="font-size:10px; color:var(--text-muted); font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${a.email || 'Conta Manual'}</div>
                            </div>
                            <i class="ri-arrow-right-s-line" style="font-size:18px; color:var(--text-muted);"></i>
                        </div>
                    `).join('') : '<div style="color:var(--text-muted); text-align:center; padding:16px; font-size:13px;">Você não possui outros alunos cadastrados.</div>'}
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

async function executeSendWorkoutToAthlete(wId, targetAthleteId) {
    const workout = calendarWorkouts.find(x => String(x.id) === String(wId));
    if (!workout) return;
    
    const targetAthlete = athletes.find(a => String(a.id) === String(targetAthleteId));
    if (!targetAthlete) return;
    
    if (!targetAthlete.supabaseId) {
        showToast('Aluno manual não tem conta vinculada. Configure um e-mail.', 'error');
        return;
    }
    
    const { error } = await dbClient.from('workouts').insert([{
        athlete_id: targetAthlete.supabaseId,
        date: workout.date.split('T')[0],
        title: workout.title,
        type: workout.type,
        description: workout.description,
        metrics: workout.metrics,
        status: 'planned'
    }]);
    
    const modal = document.getElementById('modal-send-workout-athlete');
    if (modal) modal.remove();
    
    if (error) {
        showToast('Erro ao copiar treino.', 'error');
    } else {
        showToast(`Treino enviado para ${targetAthlete.name}!`);
        if (String(currentHistoryAthleteId) === String(targetAthleteId)) {
            loadCalendarWorkouts();
        }
    }
}

function openSendWorkoutToFolderModal(wId) {
    const workout = calendarWorkouts.find(x => String(x.id) === String(wId));
    if (!workout) return;
    
    const oldModal = document.getElementById('modal-send-workout-folder');
    if (oldModal) oldModal.remove();
    
    const modal = document.createElement('div');
    modal.id = 'modal-send-workout-folder';
    modal.className = 'modal active';
    modal.style.zIndex = '1100';
    modal.style.background = 'rgba(0,0,0,0.5)';
    modal.style.backdropFilter = 'blur(4px)';
    
    const dateObj = new Date(workout.date.split('T')[0] + 'T12:00:00');
    let jsDay = dateObj.getDay();
    let defaultDayIdx = jsDay === 0 ? 6 : jsDay - 1;
    
    const daysOfWeekNames = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"];
    
    modal.innerHTML = `
        <div class="modal-card" style="max-width:440px; border-radius:12px; overflow:hidden; border:none; box-shadow:0 20px 25px -5px rgba(0,0,0,0.15);">
            <div class="modal-header" style="background:#fff; border-bottom:1px solid var(--border); padding:16px 20px; display:flex; justify-content:space-between; align-items:center;">
                <h3 style="font-weight:800; font-size:16px; display:flex; align-items:center; gap:8px; color:var(--text); margin:0;">
                    <i class="ri-folder-add-fill" style="color:#0891b2; font-size:18px;"></i> Salvar na Biblioteca
                </h3>
                <button class="btn-close" onclick="document.getElementById('modal-send-workout-folder').remove()" style="border:none; background:transparent; cursor:pointer; font-size:20px; color:var(--text-muted);"><i class="ri-close-line"></i></button>
            </div>
            <div class="modal-body" style="padding:20px; background:#fff; max-height:480px; overflow-y:auto; display:flex; flex-direction:column; gap:14px; text-align:left;">
                <p style="font-size:13px; color:var(--text-muted); margin:0; line-height:1.4;">
                    Salve o treino <strong>"${workout.title}"</strong> como modelo em uma de suas pastas de treinos semanais.
                </p>
                
                <div style="display:flex; flex-direction:column; gap:4px;">
                    <label style="font-weight:800; font-size:11px; color:#475569; text-transform:uppercase; letter-spacing:0.5px;">1. Pasta (Categoria)</label>
                    <select id="send-folder-cat-select" onchange="updateSendFolderGroupOptions()" style="width:100%; padding:10px; border:1px solid var(--border-strong); border-radius:6px; background:var(--bg); color:var(--text); font-weight:600;">
                        <option value="">-- Selecione a Pasta --</option>
                        ${categories.map(c => `<option value="${c}">${c}</option>`).join('')}
                    </select>
                </div>
                
                <div style="display:flex; flex-direction:column; gap:4px;">
                    <label style="font-weight:800; font-size:11px; color:#475569; text-transform:uppercase; letter-spacing:0.5px;">2. Semana de Treino (Modelo)</label>
                    <select id="send-folder-group-select" style="width:100%; padding:10px; border:1px solid var(--border-strong); border-radius:6px; background:var(--bg); color:var(--text); font-weight:600;" disabled>
                        <option value="">-- Selecione a Categoria Primeiro --</option>
                    </select>
                    <div style="display:flex; justify-content:flex-end; margin-top:2px;">
                        <button onclick="createNewGroupInSendModal('${wId}')" id="btn-create-group-send" style="font-size:11.5px; color:var(--primary); font-weight:800; border:none; background:transparent; cursor:pointer; display:none; padding:4px 0;">
                            + Criar Novo Modelo Semanal
                        </button>
                    </div>
                </div>
                
                <div style="display:flex; flex-direction:column; gap:4px;">
                    <label style="font-weight:800; font-size:11px; color:#475569; text-transform:uppercase; letter-spacing:0.5px;">3. Dia Alvo do Modelo</label>
                    <select id="send-folder-day-select" style="width:100%; padding:10px; border:1px solid var(--border-strong); border-radius:6px; background:var(--bg); color:var(--text); font-weight:600;">
                        ${daysOfWeekNames.map((d, idx) => `
                            <option value="${idx}" ${idx === defaultDayIdx ? 'selected' : ''}>${d}</option>
                        `).join('')}
                    </select>
                </div>
                
                <button class="btn btn-primary" onclick="executeSendWorkoutToFolder('${wId}')" style="width:100%; font-weight:800; padding:12px; margin-top:8px; display:flex; align-items:center; justify-content:center; gap:8px;">
                    <i class="ri-checkbox-circle-line"></i> Confirmar e Salvar na Pasta
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function updateSendFolderGroupOptions() {
    const cat = document.getElementById('send-folder-cat-select').value;
    const groupSelect = document.getElementById('send-folder-group-select');
    const btnCreate = document.getElementById('btn-create-group-send');
    
    if (!cat) {
        groupSelect.innerHTML = '<option value="">-- Selecione a Categoria Primeiro --</option>';
        groupSelect.disabled = true;
        btnCreate.style.display = 'none';
        return;
    }
    
    const catGroups = groups.filter(g => g.category === cat);
    
    if (catGroups.length === 0) {
        groupSelect.innerHTML = '<option value="">Nenhum modelo nesta pasta. Crie um!</option>';
        groupSelect.disabled = true;
    } else {
        groupSelect.innerHTML = `
            <option value="">-- Selecione o Modelo Semanal --</option>
            ${catGroups.map(g => `<option value="${g.id}">${g.name}</option>`).join('')}
        `;
        groupSelect.disabled = false;
    }
    btnCreate.style.display = 'block';
}

function createNewGroupInSendModal(wId) {
    const cat = document.getElementById('send-folder-cat-select').value;
    if (!cat) return;
    
    const newName = prompt('Nome do novo Modelo Semanal? (Ex: Semana 1 - Preparação)');
    if (!newName || !newName.trim()) return;
    
    const plan = Array.from({ length: 7 }, () => ({
        title: '',
        type: 'Corrida',
        distance: '',
        pace: '',
        description: '',
        steps: []
    }));
    
    const newGroup = {
        id: Date.now() + Math.random(),
        name: newName.trim(),
        category: cat,
        volume: '0km',
        plan: plan
    };
    
    groups.push(newGroup);
    saveState(['groups']);
    
    updateSendFolderGroupOptions();
    document.getElementById('send-folder-group-select').value = newGroup.id;
    
    showToast('Novo Modelo Semanal criado!');
}

function executeSendWorkoutToFolder(wId) {
    const workout = calendarWorkouts.find(x => String(x.id) === String(wId));
    if (!workout) return;
    
    const groupId = document.getElementById('send-folder-group-select').value;
    const dayIdx = parseInt(document.getElementById('send-folder-day-select').value);
    
    if (!groupId) {
        alert('Selecione ou crie um Modelo Semanal primeiro.');
        return;
    }
    
    const group = groups.find(g => String(g.id) === String(groupId));
    if (!group) return;
    
    group.plan[dayIdx] = {
        title: workout.title,
        type: workout.type || 'Corrida',
        distance: workout.distance || '',
        pace: workout.pace || '',
        description: workout.description || '',
        steps: workout.metrics?.steps || []
    };
    
    let totalVol = 0;
    group.plan.forEach(d => {
        if (d && d.distance) {
            const v = parseFloat(d.distance.toString().replace(',', '.'));
            if (!isNaN(v)) totalVol += v;
        }
    });
    group.volume = totalVol > 0 ? `${totalVol.toFixed(1)}km` : '0km';
    
    saveState(['groups']);
    
    const modal = document.getElementById('modal-send-workout-folder');
    if (modal) modal.remove();
    
    showToast('Modelo salvo com sucesso na sua Biblioteca!');
    
    if (typeof renderGroups === 'function') {
        renderGroups();
    }
}

function handleCalendarDayClick(event, dateStr) {
    if (event.target.closest('[onclick^="handleCalendarWorkoutClick"]')) return;
    openEditWorkoutModal(null, dateStr);
}

function handleCalendarWorkoutClick(event, workoutId) {
    event.stopPropagation();
    event.preventDefault();
    const workout = calendarWorkouts.find(w => String(w.id) === String(workoutId));
    if (workout) {
        openEditWorkoutModal(workout);
    }
}

let _editingCalendarWorkout = null;
let _calendarWorkoutSelectedStepIdx = 0;
let _calendarWorkoutSelectedParentIdx = null;
let _calendarWorkoutExpandedStepIdx = null;
let _calendarWorkoutExpandedParentIdx = null;

function updatePlannedMetricsFromSteps() {
    if (!_editingCalendarWorkout || !_editingCalendarWorkout.steps || _editingCalendarWorkout.steps.length === 0) return;
    
    let totalDist = 0;
    let totalTimeMins = 0;
    const vamKmh = window._calendarWorkoutPreviewVam || 14.0;
    
    const calcStepMetrics = (step) => {
        const durVal = parseFloat(step.duration?.value) || 0;
        if (durVal <= 0) return;
        
        if (step.duration.type === 'distance') {
            totalDist += durVal;
            const intVal = parseFloat(step.intensity?.value) || 0;
            let speed = 12.0;
            if (step.intensity?.type === 'vam' && intVal > 0) {
                speed = vamKmh * (intVal / 100);
            } else if (step.intensity?.type === 'pace' && step.intensity?.value) {
                const parts = step.intensity.value.split(':');
                if (parts.length === 2) {
                    const m = parseInt(parts[0]);
                    const s = parseInt(parts[1]);
                    const totalMins = m + (s / 60);
                    if (totalMins > 0) speed = 60 / totalMins;
                }
            }
            totalTimeMins += (durVal / speed) * 60;
        } else if (step.duration.type === 'time') {
            totalTimeMins += durVal;
            const intVal = parseFloat(step.intensity?.value) || 0;
            if (step.intensity?.type === 'vam' && intVal > 0) {
                totalDist += (vamKmh * (intVal / 100)) * (durVal / 60);
            } else if (step.intensity?.type === 'pace' && step.intensity?.value) {
                const parts = step.intensity.value.split(':');
                if (parts.length === 2) {
                    const m = parseInt(parts[0]);
                    const s = parseInt(parts[1]);
                    const totalMins = m + (s / 60);
                    if (totalMins > 0) totalDist += (60 / totalMins) * (durVal / 60);
                }
            } else {
                totalDist += 10 * (durVal / 60);
            }
        }
    };
    
    _editingCalendarWorkout.steps.forEach(s => {
        if (s.type === 'repetition' && s.steps) {
            const count = parseInt(s.count) || 2;
            for (let i = 0; i < count; i++) {
                s.steps.forEach(sub => calcStepMetrics(sub));
            }
        } else {
            calcStepMetrics(s);
        }
    });
    
    const distInput = $('edit-workout-dist');
    const durationInput = $('edit-workout-pace');
    
    if (distInput) {
        distInput.value = totalDist > 0 ? totalDist.toFixed(2) : '';
    }
    
    if (durationInput) {
        const totalSecs = Math.round(totalTimeMins * 60);
        const hrs = Math.floor(totalSecs / 3600);
        const mins = Math.floor((totalSecs % 3600) / 60);
        const secs = totalSecs % 60;
        
        let formatted = "";
        if (hrs > 0) {
            formatted = `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        } else {
            formatted = `${mins}:${String(secs).padStart(2, '0')}`;
        }
        durationInput.value = formatted;
    }
    
    const calcPaceEl = $('edit-workout-calc-pace');
    if (calcPaceEl) {
        if (totalDist > 0 && totalTimeMins > 0) {
            const paceDecimal = totalTimeMins / totalDist;
            const paceMins = Math.floor(paceDecimal);
            const paceSecs = Math.round((paceDecimal - paceMins) * 60);
            calcPaceEl.textContent = `${paceMins}:${String(paceSecs).padStart(2, '0')}`;
        } else {
            calcPaceEl.textContent = '--:--';
        }
    }
}

function renderCalendarWorkoutSteps() {
    const container = $('calendar-workout-steps-editor-wrap') || $('calendar-workout-steps-container');
    if (!container || !_editingCalendarWorkout) return;

    if (typeof window._calendarWorkoutPreviewVam === 'undefined') {
        const a = athletes.find(x => x.id == currentHistoryAthleteId);
        if (a && a.testTime) {
            window._calendarWorkoutPreviewVam = 180 / a.testTime;
            window._calendarWorkoutPreviewAthleteId = `athlete-${a.id}`;
        } else {
            window._calendarWorkoutPreviewVam = 14.0;
            window._calendarWorkoutPreviewAthleteId = '14';
        }
    }

    if ((_calendarWorkoutSelectedStepIdx === null || _calendarWorkoutSelectedStepIdx >= _editingCalendarWorkout.steps.length) && _editingCalendarWorkout.steps.length > 0) {
        _calendarWorkoutSelectedStepIdx = 0;
        _calendarWorkoutSelectedParentIdx = null;
    }

    const previewHtml = buildWorkoutVisualGraphHtml(_editingCalendarWorkout.steps);

    const stepsHtml = _editingCalendarWorkout.steps.map((step, idx) => {
        if (step.type === 'repetition') {
            return renderCalendarWorkoutCompactRepetitionStep(step, idx);
        }
        return renderCalendarWorkoutCompactStep(step, idx);
    }).join('');

    container.innerHTML = `
        ${previewHtml}
        <div class="steps-list" id="calendar-workout-steps-list" style="flex: 1; overflow-y: auto; min-height: 0; padding: 12px; width: 100%; background: #ffffff;">
            ${stepsHtml || '<div style="padding:40px; text-align:center; color:var(--text-muted); border:2px dashed #eee; border-radius:8px; font-size:12px;">Use o painel ao lado para adicionar etapas de aquecimento, corrida, desaquecimento, etc.</div>'}
        </div>
        ${getWorkoutSummaryHtml(_editingCalendarWorkout.steps, window._calendarWorkoutPreviewVam)}
    `;

    initCalendarWorkoutSortable();
    renderEditWorkoutVamPreview(window._calendarWorkoutPreviewAthleteId);
    
    updatePlannedMetricsFromSteps();
    renderSelectedStepEditor();
}

function initCalendarWorkoutSortable() {
    const mainList = document.getElementById('calendar-workout-steps-list');
    if (mainList) {
        new Sortable(mainList, {
            animation: 150,
            handle: '.step-drag-handle',
            onEnd: (evt) => {
                const item = _editingCalendarWorkout.steps.splice(evt.oldIndex, 1)[0];
                _editingCalendarWorkout.steps.splice(evt.newIndex, 0, item);
            }
        });
    }

    document.querySelectorAll('#calendar-workout-steps-list .repetition-inner').forEach((el) => {
        const pIdx = parseInt(el.parentElement.getAttribute('data-index'));
        new Sortable(el, {
            animation: 150,
            handle: '.step-drag-handle',
            onEnd: (evt) => {
                const item = _editingCalendarWorkout.steps[pIdx].steps.splice(evt.oldIndex, 1)[0];
                _editingCalendarWorkout.steps[pIdx].steps.splice(evt.newIndex, 0, item);
            }
        });
    });
}

function normalizeWorkoutStep(step) {
    if (!step) return null;
    
    const id = step.id || generateId();
    
    // Ensure duration object
    let duration = { type: 'time', value: '10' };
    if (step.duration) {
        if (typeof step.duration === 'object') {
            duration.type = step.duration.type || 'time';
            duration.value = String(step.duration.value !== undefined ? step.duration.value : '10');
        } else {
            duration.value = String(step.duration);
            duration.type = (String(step.duration).includes('km') || parseFloat(step.duration) < 5) ? 'distance' : 'time';
        }
    }
    
    // Ensure intensity object
    let intensity = { type: 'none', value: 0 };
    if (step.intensity) {
        if (typeof step.intensity === 'object') {
            intensity.type = step.intensity.type || 'none';
            intensity.value = step.intensity.value !== undefined ? step.intensity.value : 0;
        } else {
            intensity.value = parseFloat(step.intensity) || 0;
            intensity.type = intensity.value > 0 ? 'vam' : 'none';
        }
    }
    
    const normalized = {
        id: id,
        type: step.type || 'run',
        label: step.label || '',
        duration: duration,
        intensity: intensity,
        notes: step.notes || ''
    };
    
    if (step.type === 'repetition') {
        normalized.count = parseInt(step.count) || 2;
        normalized.steps = Array.isArray(step.steps) 
            ? step.steps.map(s => normalizeWorkoutStep(s)).filter(Boolean)
            : [];
    }
    
    return normalized;
}

function renderCalendarWorkoutCompactStep(step, idx, parentIdx = null) {
    const isSelected = (_calendarWorkoutSelectedStepIdx === idx && _calendarWorkoutSelectedParentIdx === parentIdx);
    const stepTypeLabels = {
        warmup: 'Aquecimento',
        run: 'Corrida',
        walk: 'Caminhada',
        recovery: 'Recuperação',
        rest: 'Descanso',
        cooldown: 'Desaquecimento',
        other: 'Outros'
    };
    
    const label = step.label || stepTypeLabels[step.type] || step.type;
    const durVal = step.duration?.value || '';
    const durUnit = step.duration?.type === 'time' ? 'min' : step.duration?.type === 'distance' ? 'km' : '';
    
    let intensityText = 'Sem objetivo';
    if (step.intensity?.type === 'vam') {
        intensityText = `${step.intensity.value}% VAM`;
    } else if (step.intensity?.type === 'pace') {
        intensityText = `${step.intensity.value}/km`;
    } else if (step.intensity?.type === 'hr_zone') {
        intensityText = `Zona ${step.intensity.value}`;
    } else if (step.intensity?.type === 'cadence') {
        intensityText = `${step.intensity.value} spm`;
    }
    
    const indicatorColor = step.type === 'warmup' ? '#a5bed9' : 
                           (step.type === 'run' ? '#0c3886' : 
                           (step.type === 'recovery' ? '#d5e0ee' : 
                           (step.type === 'cooldown' ? '#8faadc' : '#cbd5e1')));

    return `
        <div class="step-card compact-step-card ${isSelected ? 'active-step-card' : ''}" 
             onclick="selectCalendarWorkoutStep(${idx}, ${parentIdx})"
             style="width: 100%; display: flex; align-items: center; border: 1px solid ${isSelected ? '#1265C2' : '#cbd5e1'}; border-radius: 6px; overflow: hidden; margin-bottom: 6px; background: white; cursor: pointer; transition: all 0.15s; box-shadow: ${isSelected ? '0 0 0 2px rgba(18,101,194,0.15)' : 'none'};">
            <div style="width: 6px; align-self: stretch; background: ${indicatorColor};"></div>
            <div class="step-drag-handle" style="display: flex; align-items: center; justify-content: center; padding: 0 8px; color: #94a3b8; cursor: grab;" onclick="event.stopPropagation();">
                <i class="ri-more-2-fill" style="transform: rotate(90deg); font-size: 14px;"></i>
            </div>
            
            <div style="flex: 1; padding: 8px 12px; display: flex; align-items: center; justify-content: space-between; gap: 12px;">
                <div style="display: flex; flex-direction: column; min-width: 0;">
                    <span style="font-size: 12px; font-weight: 700; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px;">${label}</span>
                    ${step.notes ? `<span style="font-size: 10px; color: #64748b; font-style: italic; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px;">${step.notes}</span>` : ''}
                </div>
                <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
                    <span style="font-size: 10px; font-weight: 700; color: #475569; background: #f1f5f9; padding: 3px 6px; border-radius: 4px;">
                        ${durVal} ${durUnit}
                    </span>
                    <span style="font-size: 10px; font-weight: 700; color: #1265C2; background: #eff6ff; padding: 3px 6px; border-radius: 4px;">
                        ${intensityText}
                    </span>
                </div>
            </div>
        </div>
    `;
}

function renderCalendarWorkoutCompactRepetitionStep(step, idx) {
    const isSelected = (_calendarWorkoutSelectedStepIdx === idx && _calendarWorkoutSelectedParentIdx === null);
    const innerStepsHtml = (step.steps || []).map((s, sIdx) => renderCalendarWorkoutCompactStep(s, sIdx, idx)).join('');
    
    return `
        <div class="repetition-card ${isSelected ? 'active-step-card' : ''}" data-index="${idx}"
             style="width: 100%; display: flex; flex-direction: column; border: 1px solid ${isSelected ? '#1265C2' : '#cbd5e1'}; border-radius: 8px; overflow: hidden; margin-bottom: 8px; background: #f8fafc; box-shadow: ${isSelected ? '0 0 0 2px rgba(18,101,194,0.15)' : 'none'};">
            
            <div class="repetition-header" onclick="selectCalendarWorkoutStep(${idx}, null)"
                 style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: #f1f5f9; border-bottom: 1px solid #e2e8f0; cursor: pointer;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <div class="step-drag-handle" style="cursor: move; color: #94a3b8;" onclick="event.stopPropagation();"><i class="ri-more-2-fill" style="transform: rotate(90deg); font-size: 14px;"></i></div>
                    <i class="ri-repeat-line" style="color: #1265C2; font-size: 14px; font-weight: 700;"></i>
                    <span style="font-size: 11px; font-weight: 800; color: #475569; text-transform: uppercase;">Repetir ${step.count || 2} Vezes</span>
                </div>
            </div>
            
            <div class="repetition-inner" style="padding: 8px; display: flex; flex-direction: column; gap: 4px; border-left: 3px solid #1265C2; margin-left: 8px;">
                ${innerStepsHtml}
            </div>
        </div>
    `;
}

function selectCalendarWorkoutStep(idx, parentIdx = null) {
    _calendarWorkoutSelectedStepIdx = idx;
    _calendarWorkoutSelectedParentIdx = parentIdx;
    renderCalendarWorkoutSteps();
}

function renderSelectedStepEditor() {
    const container = $('tp-selected-step-editor');
    if (!container) return;
    
    if (_calendarWorkoutSelectedStepIdx === null || !_editingCalendarWorkout || !_editingCalendarWorkout.steps || _editingCalendarWorkout.steps.length === 0) {
        container.innerHTML = `
            <div style="padding: 30px 10px; text-align: center; color: #94a3b8; border: 1px dashed #cbd5e1; border-radius: 8px; background: white; font-size: 12px; font-weight: 600;">
                Selecione uma etapa no centro para editar seus detalhes aqui.
            </div>
        `;
        return;
    }
    
    let step = null;
    if (_calendarWorkoutSelectedParentIdx !== null) {
        const parent = _editingCalendarWorkout.steps[_calendarWorkoutSelectedParentIdx];
        if (parent && parent.steps) {
            step = parent.steps[_calendarWorkoutSelectedStepIdx];
        }
    } else {
        step = _editingCalendarWorkout.steps[_calendarWorkoutSelectedStepIdx];
    }
    
    if (!step) {
        container.innerHTML = `
            <div style="padding: 30px 10px; text-align: center; color: #94a3b8; border: 1px dashed #cbd5e1; border-radius: 8px; background: white; font-size: 12px; font-weight: 600;">
                Selecione uma etapa no centro para editar seus detalhes aqui.
            </div>
        `;
        return;
    }
    
    if (step.type === 'repetition') {
        container.innerHTML = `
            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); display: flex; flex-direction: column; gap: 12px;">
                <h3 style="font-size: 12px; font-weight: 800; color: #1e293b; margin: 0; display: flex; align-items: center; gap: 6px;">
                    <i class="ri-repeat-line" style="color: #1265C2;"></i> Configurar Repetição
                </h3>
                
                <div>
                    <label style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 4px;">Vezes a repetir</label>
                    <input type="number" min="2" max="50" value="${step.count || 2}" 
                           oninput="updateCalendarWorkoutStepField(${_calendarWorkoutSelectedStepIdx}, 'count', parseInt(this.value)); updatePlannedMetricsFromSteps(); renderCalendarWorkoutSteps();"
                           style="width: 100%; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; font-size: 13px; font-weight: 700; color: #0f172a; outline: none;">
                </div>
                
                <button onclick="addCalendarWorkoutStep('run', ${_calendarWorkoutSelectedStepIdx})" 
                        style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 8px; background: #eff6ff; color: #1265C2; border: 1px solid #bae6fd; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer; transition: all 0.2s;"
                        onmouseover="this.style.background='#dbeafe'" onmouseout="this.style.background='#eff6ff'">
                    <i class="ri-add-line"></i> Adicionar etapa à repetição
                </button>
                
                <button onclick="removeCalendarWorkoutStep(${_calendarWorkoutSelectedStepIdx}, null); _calendarWorkoutSelectedStepIdx = null; _calendarWorkoutSelectedParentIdx = null; updatePlannedMetricsFromSteps(); renderCalendarWorkoutSteps();" 
                        style="width: 100%; margin-top: 10px; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 10px; background: #fee2e2; color: #ef4444; border: none; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer; transition: all 0.2s;"
                        onmouseover="this.style.background='#fecaca'" onmouseout="this.style.background='#fee2e2'">
                    <i class="ri-delete-bin-line"></i> Excluir Repetição
                </button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); display: flex; flex-direction: column; gap: 12px;">
            <h3 style="font-size: 12px; font-weight: 800; color: #1e293b; margin: 0; display: flex; align-items: center; gap: 6px;">
                <i class="ri-edit-box-line" style="color: #1265C2;"></i> Editar Bloco
            </h3>
            
            <div>
                <label style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 4px;">Nome da Etapa</label>
                <input type="text" value="${step.label || ''}" 
                       oninput="updateCalendarWorkoutStepField(${_calendarWorkoutSelectedStepIdx}, 'label', this.value, ${_calendarWorkoutSelectedParentIdx}); renderCalendarWorkoutSteps();"
                       placeholder="Ex: Aquecimento, Tiro Rápido..."
                       style="width: 100%; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; font-size: 12px; color: #1e293b; outline: none;">
            </div>
            
            <div>
                <label style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 4px;">Tipo de Bloco</label>
                <select onchange="updateCalendarWorkoutStepField(${_calendarWorkoutSelectedStepIdx}, 'type', this.value, ${_calendarWorkoutSelectedParentIdx}); renderCalendarWorkoutSteps();"
                        style="width: 100%; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; font-size: 12px; color: #334155; background: white; outline: none; cursor: pointer;">
                    <option value="warmup" ${step.type === 'warmup' ? 'selected' : ''}>Aquecimento</option>
                    <option value="run" ${step.type === 'run' ? 'selected' : ''}>Corrida</option>
                    <option value="walk" ${step.type === 'walk' ? 'selected' : ''}>Caminhada</option>
                    <option value="recovery" ${step.type === 'recovery' ? 'selected' : ''}>Recuperação</option>
                    <option value="rest" ${step.type === 'rest' ? 'selected' : ''}>Descanso</option>
                    <option value="cooldown" ${step.type === 'cooldown' ? 'selected' : ''}>Desaquecimento</option>
                    <option value="other" ${step.type === 'other' ? 'selected' : ''}>Outros</option>
                </select>
            </div>
            
            <div>
                <label style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 4px;">Duração</label>
                <div style="display: flex; gap: 6px;">
                    <input type="text" value="${step.duration?.value || ''}" 
                           oninput="updateCalendarWorkoutStepNestedField(${_calendarWorkoutSelectedStepIdx}, 'duration', 'value', this.value, ${_calendarWorkoutSelectedParentIdx}); updatePlannedMetricsFromSteps(); renderCalendarWorkoutSteps();"
                           placeholder="Ex: 10"
                           style="flex: 1; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; font-size: 12px; color: #1e293b; outline: none; text-align: center; font-weight: 700;">
                    <select onchange="updateCalendarWorkoutStepNestedField(${_calendarWorkoutSelectedStepIdx}, 'duration', 'type', this.value, ${_calendarWorkoutSelectedParentIdx}); updatePlannedMetricsFromSteps(); renderCalendarWorkoutSteps();"
                            style="width: 80px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; font-size: 12px; color: #334155; background: white; outline: none; cursor: pointer;">
                        <option value="time" ${step.duration?.type === 'time' ? 'selected' : ''}>min</option>
                        <option value="distance" ${step.duration?.type === 'distance' ? 'selected' : ''}>km</option>
                    </select>
                </div>
            </div>
            
            <div>
                <label style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 4px;">Intensidade</label>
                <div style="display: flex; flex-direction: column; gap: 6px;">
                    <select onchange="updateCalendarWorkoutStepNestedField(${_calendarWorkoutSelectedStepIdx}, 'intensity', 'type', this.value, ${_calendarWorkoutSelectedParentIdx}); updatePlannedMetricsFromSteps(); renderCalendarWorkoutSteps();"
                            style="width: 100%; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; font-size: 12px; color: #334155; background: white; outline: none; cursor: pointer;">
                        <option value="none" ${step.intensity?.type === 'none' ? 'selected' : ''}>Sem objetivo</option>
                        <option value="vam" ${step.intensity?.type === 'vam' ? 'selected' : ''}>% VAM</option>
                        <option value="pace" ${step.intensity?.type === 'pace' ? 'selected' : ''}>Ritmo</option>
                        <option value="hr_zone" ${step.intensity?.type === 'hr_zone' ? 'selected' : ''}>Zona F.C.</option>
                        <option value="cadence" ${step.intensity?.type === 'cadence' ? 'selected' : ''}>Cadência</option>
                    </select>
                    
                    ${step.intensity?.type !== 'none' ? `
                        <div style="display: flex; align-items: center; gap: 6px; margin-top: 2px;">
                            <input type="text" value="${step.intensity?.value || ''}" 
                                   oninput="updateCalendarWorkoutStepNestedField(${_calendarWorkoutSelectedStepIdx}, 'intensity', 'value', this.value, ${_calendarWorkoutSelectedParentIdx}); updatePlannedMetricsFromSteps(); renderCalendarWorkoutSteps();"
                                   placeholder="Valor"
                                   style="flex: 1; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; font-size: 12px; color: #1e293b; outline: none; text-align: center; font-weight: 700;">
                            <span style="font-size: 11px; font-weight: 700; color: #64748b; width: 35px; text-align: left;">
                                ${step.intensity?.type === 'vam' ? '%' : step.intensity?.type === 'pace' ? '/km' : step.intensity?.type === 'hr_zone' ? 'Z' : 'spm'}
                            </span>
                        </div>
                    ` : ''}
                </div>
            </div>
            
            <div>
                <label style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 4px;">Instruções do Bloco</label>
                <textarea oninput="updateCalendarWorkoutStepField(${_calendarWorkoutSelectedStepIdx}, 'notes', this.value, ${_calendarWorkoutSelectedParentIdx}); renderCalendarWorkoutSteps();"
                          placeholder="Nota específica para este bloco..."
                          style="width: 100%; height: 60px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; font-size: 12px; color: #334155; outline: none; resize: none; font-family: inherit;">${step.notes || ''}</textarea>
            </div>
            
            <button onclick="removeCalendarWorkoutStep(${_calendarWorkoutSelectedStepIdx}, ${_calendarWorkoutSelectedParentIdx}); _calendarWorkoutSelectedStepIdx = null; _calendarWorkoutSelectedParentIdx = null; updatePlannedMetricsFromSteps(); renderCalendarWorkoutSteps();" 
                    style="width: 100%; margin-top: 8px; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 10px; background: #fee2e2; color: #ef4444; border: none; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer; transition: all 0.2s;"
                    onmouseover="this.style.background='#fecaca'" onmouseout="this.style.background='#fee2e2'">
                <i class="ri-delete-bin-line"></i> Excluir Bloco
            </button>
        </div>
    `;
}
function toggleCalendarWorkoutExpandStep(idx, parentIdx = null) {
    if (_calendarWorkoutExpandedStepIdx === idx && _calendarWorkoutExpandedParentIdx === parentIdx) {
        _calendarWorkoutExpandedStepIdx = null;
        _calendarWorkoutExpandedParentIdx = null;
    } else {
        _calendarWorkoutExpandedStepIdx = idx;
        _calendarWorkoutExpandedParentIdx = parentIdx;
    }
    renderCalendarWorkoutSteps();
}

function addCalendarWorkoutStep(type, parentIdx = null) {
    const newStep = {
        id: generateId(),
        type: type === 'repetition' ? 'repetition' : type,
        label: '',
        duration: { type: 'time', value: '10' },
        intensity: { type: 'vam', value: 75 },
        notes: ''
    };

    if (type === 'repetition') {
        newStep.count = 2;
        newStep.steps = [
            { id: generateId() + 1, type: 'run', label: 'Trabalho', duration: { type: 'distance', value: '0.4' }, intensity: { type: 'vam', value: 95 }, notes: '' },
            { id: generateId() + 2, type: 'recovery', label: 'Descanso', duration: { type: 'time', value: '1' }, intensity: { type: 'vam', value: 0 }, notes: '' }
        ];
    }

    if (parentIdx !== null) {
        _editingCalendarWorkout.steps[parentIdx].steps.push(newStep);
        _calendarWorkoutSelectedStepIdx = _editingCalendarWorkout.steps[parentIdx].steps.length - 1;
        _calendarWorkoutSelectedParentIdx = parentIdx;
    } else {
        _editingCalendarWorkout.steps.push(newStep);
        _calendarWorkoutSelectedStepIdx = _editingCalendarWorkout.steps.length - 1;
        _calendarWorkoutSelectedParentIdx = null;
    }
    renderCalendarWorkoutSteps();
}

function removeCalendarWorkoutStep(idx, parentIdx = null) {
    if (parentIdx !== null) {
        _editingCalendarWorkout.steps[parentIdx].steps.splice(idx, 1);
    } else {
        _editingCalendarWorkout.steps.splice(idx, 1);
    }
    renderCalendarWorkoutSteps();
}

function updateCalendarWorkoutStepField(idx, field, value, parentIdx = null) {
    if (parentIdx !== null) {
        _editingCalendarWorkout.steps[parentIdx].steps[idx][field] = value;
    } else {
        _editingCalendarWorkout.steps[idx][field] = value;
    }
}

function updateCalendarWorkoutStepNestedField(idx, group, field, value, parentIdx = null) {
    if (parentIdx !== null) {
        _editingCalendarWorkout.steps[parentIdx].steps[idx][group][field] = value;
    } else {
        _editingCalendarWorkout.steps[idx][group][field] = value;
    }
}

function openEditWorkoutModal(workout = null, defaultDate = null) {
    const modal = $('modal-edit-workout');
    if (!modal) return;

    // Reset VAM preview state to hidden by default when opening
    _vamPreviewVisible = false;
    const vamBtn = $('toggle-vam-btn');
    if (vamBtn) {
        vamBtn.style.background = 'transparent';
        vamBtn.style.color = 'var(--text)';
        vamBtn.style.borderColor = 'var(--border-strong)';
    }

    const idEl            = $('edit-workout-id');
    const dateEl          = $('edit-workout-date');
    const titleInput      = $('edit-workout-title');
    const typeHidden      = $('edit-workout-type');
    const descInput       = $('edit-workout-desc');
    const distInput       = $('edit-workout-dist');
    const paceInput       = $('edit-workout-pace');
    const statusSelect    = $('edit-workout-status');
    const effortInput     = $('edit-workout-effort');
    const deleteBtn       = $('edit-workout-delete-btn');
    const realDistInput   = $('edit-workout-real-dist');
    const realDurInput    = $('edit-workout-real-duration');
    const realPaceInput   = $('edit-workout-real-pace');

    _calendarWorkoutSelectedStepIdx = 0;
    _calendarWorkoutSelectedParentIdx = null;

    if (workout) {
        idEl.value          = workout.id;
        dateEl.value        = workout.date.split('T')[0];
        titleInput.value    = workout.title || '';
        descInput.value     = workout.description || '';
        distInput.value     = workout.metrics?.distance_value || (workout.metrics?.distance ? workout.metrics.distance.replace(' km','') : '') || '';
        paceInput.value     = workout.metrics?.pace_value || workout.metrics?.duration || '';
        statusSelect.value  = workout.status || 'pending';
        effortInput.value   = workout.metrics?.effort_score || '';
        deleteBtn.style.display = 'block';
        realDistInput.value = workout.metrics?.real_distance || '';
        realDurInput.value  = workout.metrics?.real_duration || '';
        realPaceInput.value = workout.metrics?.real_pace || '';

        setWorkoutTypePill(workout.type || 'Corrida');

        if (workout.metrics && Array.isArray(workout.metrics.structured_steps)) {
            const rawSteps = JSON.parse(JSON.stringify(workout.metrics.structured_steps));
            _editingCalendarWorkout = { steps: rawSteps.map(s => normalizeWorkoutStep(s)).filter(Boolean) };
        } else {
            _editingCalendarWorkout = { steps: [] };
        }
    } else {
        idEl.value          = '';
        dateEl.value        = defaultDate;
        titleInput.value    = '';
        descInput.value     = '';
        distInput.value     = '';
        paceInput.value     = '';
        statusSelect.value  = 'pending';
        effortInput.value   = '';
        deleteBtn.style.display = 'none';
        realDistInput.value = '';
        realDurInput.value  = '';
        realPaceInput.value = '';

        setWorkoutTypePill('Corrida');
        _editingCalendarWorkout = { steps: [] };
    }

    // Default step structure if steps are empty
    if (_editingCalendarWorkout.steps.length === 0) {
        _editingCalendarWorkout.steps = [
            { id: generateId(), type: 'warmup', label: 'Aquecimento', duration: { type: 'time', value: '10' }, intensity: { type: 'none', value: 0 }, notes: '' },
            { id: generateId() + 1, type: 'run', label: 'Corrida', duration: { type: 'time', value: '10' }, intensity: { type: 'vam', value: 75 }, notes: '' },
            { id: generateId() + 2, type: 'cooldown', label: 'Desaquecimento', duration: { type: 'time', value: '10' }, intensity: { type: 'vam', value: 75 }, notes: '' }
        ];
    }
    
    toggleEditWorkoutCompletedFields();
    
    const tabsEl = $('workout-modal-tabs');
    if (tabsEl) {
        if (workout && workout.status === 'completed') {
            tabsEl.style.display = 'flex';
            switchWorkoutModalTab('presc', false);
        } else {
            tabsEl.style.display = 'none';
            switchWorkoutModalTab('presc', false);
        }
    }
    
    renderCalendarWorkoutSteps();
    modal.classList.add('show');
}

function closeEditWorkoutModal() {
    const modal = $('modal-edit-workout');
    if (modal) modal.classList.remove('show');
    
    // Restaurar campos ocultados no modo template
    const dateRow = $('edit-workout-date')?.closest('.form-row') || $('edit-workout-date');
    if (dateRow) dateRow.style.display = 'flex';
    const statusRow = $('edit-workout-status')?.closest('.form-row') || $('edit-workout-status');
    if (statusRow) statusRow.style.display = 'flex';
    
    const saveBtn = $('save-workout-btn') || document.querySelector('#modal-edit-workout .btn-primary');
    if (saveBtn) {
        saveBtn.textContent = 'Salvar Treino';
    }
    
    window._editingLibraryTemplateMode = false;
    window._editingLibraryTemplateId = null;
}

let _currentWorkoutModalTab = 'presc';
let comparisonChartInstance = null;

function switchWorkoutModalTab(tab, shouldRender = true) {
    _currentWorkoutModalTab = tab;
    
    const tabPresc = $('tab-workout-presc');
    const tabComp = $('tab-workout-comp');
    const editorWrap = $('calendar-workout-steps-editor-wrap');
    const compWrap = $('calendar-workout-comparison-wrap');
    
    if (tab === 'presc') {
        if (tabPresc) tabPresc.classList.add('active');
        if (tabComp) tabComp.classList.remove('active');
        if (editorWrap) editorWrap.style.display = 'flex';
        if (compWrap) compWrap.style.display = 'none';
        
        // Mostrar botões de adicionar etapas
        const runBtn = document.querySelector('[onclick="addCalendarWorkoutStep(\'run\')"]');
        const repBtn = document.querySelector('[onclick="addCalendarWorkoutStep(\'repetition\')"]');
        if (runBtn) runBtn.parentElement.style.display = 'flex';
    } else {
        if (tabPresc) tabPresc.classList.remove('active');
        if (tabComp) tabComp.classList.add('active');
        if (editorWrap) editorWrap.style.display = 'none';
        if (compWrap) compWrap.style.display = 'flex';
        
        // Esconder botões de adicionar etapas
        const runBtn = document.querySelector('[onclick="addCalendarWorkoutStep(\'run\')"]');
        const repBtn = document.querySelector('[onclick="addCalendarWorkoutStep(\'repetition\')"]');
        if (runBtn) runBtn.parentElement.style.display = 'none';
        
        if (shouldRender) {
            renderWorkoutComparison();
        }
    }
}

function renderWorkoutComparison() {
    const wrap = $('calendar-workout-comparison-wrap');
    if (!wrap || !_editingCalendarWorkout) return;

    const wk = calendarWorkouts.find(w => String(w.id) === String($('edit-workout-id').value));
    if (!wk) return;

    // --- IDÉIA 2: CÁLCULO DE ADERÊNCIA (MATCH SCORE) ---
    const plannedDist = parseFloat(wk.metrics?.distance_value) || parseFloat(wk.distance) || 0;
    const realDist = parseFloat(wk.metrics?.real_distance) || parseFloat(wk.real_distance) || 0;
    
    const athlete = athletes.find(x => x.id == currentHistoryAthleteId);
    const athleteVam = athlete && athlete.testTime ? (180 / athlete.testTime) : 12;
    const plannedDur = getWorkoutPlannedDuration(wk, athleteVam);
    const realDur = parseFloat(wk.metrics?.real_duration) || parseFloat(wk.real_duration) || 0;
    
    const targetPaceStr = wk.metrics?.pace_value || wk.metrics?.duration;
    const targetPaceMin = targetPaceStr ? parsePaceToMinutes(targetPaceStr) : (plannedDist > 0 ? plannedDur / plannedDist : 0);
    const realPaceStr = wk.metrics?.real_pace || wk.real_pace;
    const realPaceMin = realPaceStr ? parsePaceToMinutes(realPaceStr) : (realDist > 0 ? realDur / realDist : 0);

    const distDiffPct = plannedDist > 0 ? ((realDist - plannedDist) / plannedDist) * 100 : 0;
    const durDiffPct = plannedDur > 0 ? ((realDur - plannedDur) / plannedDur) * 100 : 0;
    const paceDiffPct = targetPaceMin > 0 ? ((realPaceMin - targetPaceMin) / targetPaceMin) * 100 : 0;

    let sumAbsDevs = 0;
    let devCount = 0;
    if (plannedDist > 0) { sumAbsDevs += Math.min(100, Math.abs(distDiffPct)); devCount++; }
    if (plannedDur > 0) { sumAbsDevs += Math.min(100, Math.abs(durDiffPct)); devCount++; }
    if (targetPaceMin > 0) { sumAbsDevs += Math.min(100, Math.abs(paceDiffPct)); devCount++; }
    
    const matchScore = devCount > 0 ? Math.round(100 - (sumAbsDevs / devCount)) : 100;
    
    let scoreColor = '#10b981'; // Green
    let scoreText = 'Aderência Excelente';
    if (matchScore < 70) {
        scoreColor = '#ef4444'; // Red
        scoreText = 'Fora do Alvo';
    } else if (matchScore < 88) {
        scoreColor = '#f59e0b'; // Orange
        scoreText = 'Aderência Moderada';
    }

    const getBadge = (diffPct) => {
        const absDiff = Math.abs(diffPct);
        let color = '#10b981'; // green
        let text = `Dentro do Alvo (${diffPct >= 0 ? '+' : ''}${diffPct.toFixed(1)}%)`;
        
        if (absDiff > 15) {
            color = '#ef4444'; // red
            text = `${diffPct >= 0 ? 'Mais alto' : 'Mais baixo'} (${diffPct >= 0 ? '+' : ''}${diffPct.toFixed(1)}%)`;
        } else if (absDiff > 5) {
            color = '#f59e0b'; // orange
            text = `Desvio Moderado (${diffPct >= 0 ? '+' : ''}${diffPct.toFixed(1)}%)`;
        }
        
        return `<span style="font-size:11px; background:${color}15; color:${color}; padding:3px 8px; border-radius:100px; font-weight:700; border:1px solid ${color}25;">${text}</span>`;
    };

    // --- IDÉIA 3: COMPARAÇÃO DE VOLTAS E TIROS (SPLIT MATCHER) ---
    const plannedKmsPace = [];
    
    if (Array.isArray(_editingCalendarWorkout.steps)) {
        _editingCalendarWorkout.steps.forEach(step => {
            const stepNorm = normalizeWorkoutStep(step);
            if (stepNorm.type === 'repetition') {
                const count = parseInt(stepNorm.count) || 2;
                for (let r = 0; r < count; r++) {
                    if (Array.isArray(stepNorm.steps)) {
                        stepNorm.steps.forEach(subStep => {
                            const subNorm = normalizeWorkoutStep(subStep);
                            extractPacesFromStep(subNorm, plannedKmsPace, athleteVam);
                        });
                    }
                }
            } else {
                extractPacesFromStep(stepNorm, plannedKmsPace, athleteVam);
            }
        });
    }

    const realSplits = wk.metrics?.splits || [];
    
    let splitsTableHtml = '';
    if (realSplits.length > 0) {
        splitsTableHtml = `
            <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; margin-top: 10px;">
                <thead>
                    <tr style="border-bottom: 2px solid var(--border-strong); background: rgba(0,0,0,0.02);">
                        <th style="padding: 10px 12px; font-weight: 800; color: var(--text-muted);">KM</th>
                        <th style="padding: 10px 12px; font-weight: 800; color: var(--text-muted);">Pace Proposto</th>
                        <th style="padding: 10px 12px; font-weight: 800; color: var(--text-muted);">Pace Real (Strava)</th>
                        <th style="padding: 10px 12px; font-weight: 800; color: var(--text-muted);">Desvio / Status</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        realSplits.forEach((split, index) => {
            const kmNum = split.split || (index + 1);
            const realPaceDecimal = split.moving_time / (split.distance / 1000) / 60;
            const realPaceFormatted = formatDurationFromMinutes(realPaceDecimal);
            
            const plannedPaceDecimal = plannedKmsPace[index] || targetPaceMin || (athleteVam ? 60 / athleteVam : 5.0);
            const plannedPaceFormatted = formatDurationFromMinutes(plannedPaceDecimal);
            
            const diffSecs = Math.round((realPaceDecimal - plannedPaceDecimal) * 60);
            const absDiffSecs = Math.abs(diffSecs);
            
            let statusText = '';
            let statusColor = '#10b981'; // green
            if (absDiffSecs <= 10) {
                statusText = `Aderência Perfeita (${diffSecs >= 0 ? '+' : ''}${diffSecs}s/km)`;
            } else if (absDiffSecs <= 25) {
                statusColor = '#f59e0b'; // orange
                statusText = `${diffSecs > 0 ? 'Mais Lento' : 'Mais Rápido'} (${diffSecs >= 0 ? '+' : ''}${diffSecs}s/km)`;
            } else {
                statusColor = '#ef4444'; // red
                statusText = `${diffSecs > 0 ? 'Forte Desaceleração' : 'Ritmo excessivo'} (${diffSecs >= 0 ? '+' : ''}${diffSecs}s/km)`;
            }
            
            splitsTableHtml += `
                <tr style="border-bottom: 1px solid var(--border-strong);">
                    <td style="padding: 12px; font-weight: 800;">${kmNum}</td>
                    <td style="padding: 12px; font-weight: 700; color: var(--text-muted);">${plannedPaceFormatted}/km</td>
                    <td style="padding: 12px; font-weight: 800; color: var(--primary);">${realPaceFormatted}/km</td>
                    <td style="padding: 12px; font-weight: 600; color: ${statusColor};">${statusText}</td>
                </tr>
            `;
        });
        
        splitsTableHtml += `
                </tbody>
            </table>
        `;
    } else {
        splitsTableHtml = `
            <div style="padding: 24px; text-align: center; color: var(--text-muted); font-size: 13px; font-weight: 600; border: 1.5px dashed var(--border-strong); border-radius: 8px;">
                <i class="ri-information-line" style="font-size: 18px; vertical-align: middle; margin-right: 4px;"></i> 
                Nenhuma volta individual (split) de 1 km foi retornada pelo Strava para este treino.
            </div>
        `;
    }

    let stravaBtnHtml = '';
    const stravaId = wk.strava_id;
    if (stravaId) {
        stravaBtnHtml = `
            <a href="https://www.strava.com/activities/${stravaId}" target="_blank" rel="noopener noreferrer" style="display: inline-flex; align-items: center; gap: 8px; background: #fc4c02; color: white; padding: 10px 18px; border-radius: 8px; font-size: 12px; font-weight: 800; text-decoration: none; box-shadow: 0 4px 12px rgba(252, 76, 2, 0.25); transition: all 0.2s; border: none; cursor: pointer; flex-shrink: 0; align-self: center;" onmouseover="this.style.background='#e04302'; this.style.transform='translateY(-1px)';" onmouseout="this.style.background='#fc4c02'; this.style.transform='translateY(0)';">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="vertical-align: middle;"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.556L8.344 12.4h3.065L8.344 4 3.2 12.4h3.065z"/></svg>
                Ver no Strava <i class="ri-external-link-line" style="font-size: 11px;"></i>
            </a>
        `;
    }

    wrap.innerHTML = `
        <div style="display: flex; gap: 16px; align-items: stretch; margin-bottom: 20px;">
            <div class="stat-card" style="flex: 1; display: flex; align-items: center; gap: 20px; background: linear-gradient(135deg, ${scoreColor}12 0%, ${scoreColor}04 100%); border: 1.5px solid ${scoreColor}30; margin: 0; padding: 20px; border-radius: 12px; box-shadow: none; width: 100%;">
                <div style="position: relative; width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: white; box-shadow: 0 8px 20px rgba(0,0,0,0.05); flex-shrink: 0; border: 4px solid ${scoreColor};">
                    <span style="font-size: 24px; font-weight: 900; color: ${scoreColor};">${matchScore}%</span>
                </div>
                <div style="flex: 1;">
                    <h4 style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.5px; margin: 0 0 2px 0;">Aderência à Planilha</h4>
                    <h3 style="font-size: 18px; font-weight: 900; color: ${scoreColor}; margin: 0 0 4px 0; letter-spacing: -0.5px;">${scoreText}</h3>
                    <p style="font-size: 12px; color: var(--text-muted); margin: 0; line-height: 1.4; font-weight: 500;">Métrica calculada cruzando distância, ritmo e duração com o prescrito pelo treinador.</p>
                </div>
                ${stravaBtnHtml}
            </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px;">
            <div class="stat-card" style="margin: 0; padding: 14px 16px; background: var(--panel); border: 1px solid var(--border-strong);">
                <div style="font-size:10px; color:var(--text-muted); font-weight:700; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px;">Volume (Distância)</div>
                <div style="display: flex; align-items: baseline; gap: 8px; margin-bottom: 8px;">
                    <div style="font-size: 20px; font-weight: 900; color: var(--text);">${realDist.toFixed(2)} km</div>
                    <div style="font-size: 11px; color: var(--text-muted); font-weight: 600;">Proposto: ${plannedDist.toFixed(1)} km</div>
                </div>
                ${getBadge(distDiffPct)}
            </div>
            
            <div class="stat-card" style="margin: 0; padding: 14px 16px; background: var(--panel); border: 1px solid var(--border-strong);">
                <div style="font-size:10px; color:var(--text-muted); font-weight:700; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px;">Duração (Tempo)</div>
                <div style="display: flex; align-items: baseline; gap: 8px; margin-bottom: 8px;">
                    <div style="font-size: 20px; font-weight: 900; color: var(--text);">${realDur ? formatDurationFromMinutes(realDur) : '--'}</div>
                    <div style="font-size: 11px; color: var(--text-muted); font-weight: 600;">Proposto: ${plannedDur ? formatDurationFromMinutes(plannedDur) : '--'}</div>
                </div>
                ${getBadge(durDiffPct)}
            </div>

            <div class="stat-card" style="margin: 0; padding: 14px 16px; background: var(--panel); border: 1px solid var(--border-strong);">
                <div style="font-size:10px; color:var(--text-muted); font-weight:700; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px;">Pace Médio</div>
                <div style="display: flex; align-items: baseline; gap: 8px; margin-bottom: 8px;">
                    <div style="font-size: 20px; font-weight: 900; color: var(--text);">${realPaceStr || '--'}/km</div>
                    <div style="font-size: 11px; color: var(--text-muted); font-weight: 600;">Proposto: ${targetPaceStr || '--'}/km</div>
                </div>
                ${getBadge(paceDiffPct)}
            </div>
        </div>

        <!-- IDÉIA 1: OVERLAY DE GRÁFICOS (PLANEJADO VS REAL) -->
        <div class="stat-card" style="margin: 0 0 20px 0; padding: 16px; background: var(--panel); border: 1px solid var(--border-strong);">
            <h4 style="font-size: 13px; font-weight: 800; color: var(--text); margin: 0 0 14px 0; display: flex; align-items: center; gap: 6px;">
                <i class="ri-line-chart-line" style="color: var(--primary); font-size: 18px;"></i> Comparativo de Ritmo (Pace Planejado vs Real)
            </h4>
            <div style="height: 220px; position: relative; width: 100%;">
                <canvas id="workout-comparison-chart"></canvas>
            </div>
        </div>

        <!-- IDÉIA 3: TABELA ANALÍTICA DE VOLTAS (SPLIT MATCHER) -->
        <div class="stat-card" style="margin: 0; padding: 16px; background: var(--panel); border: 1px solid var(--border-strong);">
            <h4 style="font-size: 13px; font-weight: 800; color: var(--text); margin: 0 0 14px 0; display: flex; align-items: center; gap: 6px;">
                <i class="ri-list-check" style="color: var(--primary); font-size: 18px;"></i> Análise de Desempenho por Quilômetro
            </h4>
            <div style="overflow-x: auto; width: 100%;">
                ${splitsTableHtml}
            </div>
        </div>
    `;

    setTimeout(() => {
        const ctx = document.getElementById('workout-comparison-chart');
        if (!ctx) return;

        if (comparisonChartInstance) {
            comparisonChartInstance.destroy();
        }

        const maxPoints = Math.max(realSplits.length, plannedKmsPace.length);
        const chartLabels = [];
        const realPaceDataset = [];
        const plannedPaceDataset = [];

        for (let i = 0; i < maxPoints; i++) {
            chartLabels.push(`Km ${i + 1}`);
            
            if (realSplits[i]) {
                const realP = realSplits[i].moving_time / (realSplits[i].distance / 1000) / 60;
                realPaceDataset.push(parseFloat(realP.toFixed(2)));
            } else {
                realPaceDataset.push(null);
            }

            if (plannedKmsPace[i]) {
                plannedPaceDataset.push(parseFloat(plannedKmsPace[i].toFixed(2)));
            } else {
                plannedPaceDataset.push(targetPaceMin ? parseFloat(targetPaceMin.toFixed(2)) : null);
            }
        }

        comparisonChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartLabels,
                datasets: [
                    {
                        label: 'Ritmo Proposto (Target)',
                        data: plannedPaceDataset,
                        borderColor: 'rgba(18, 101, 194, 0.9)',
                        backgroundColor: 'rgba(18, 101, 194, 0.05)',
                        borderWidth: 3,
                        pointBackgroundColor: '#1265C2',
                        pointBorderColor: '#fff',
                        pointRadius: 4,
                        tension: 0.15,
                        fill: false
                    },
                    {
                        label: 'Ritmo Real (Executado)',
                        data: realPaceDataset,
                        borderColor: '#fc4c02',
                        backgroundColor: 'rgba(252, 76, 2, 0.12)',
                        borderWidth: 3,
                        pointBackgroundColor: '#fc4c02',
                        pointBorderColor: '#fff',
                        pointRadius: 4,
                        tension: 0.15,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            pointStyle: 'circle',
                            font: { size: 11, weight: '700', family: "'Inter', sans-serif" },
                            color: '#475569'
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(255, 255, 255, 0.98)',
                        titleColor: '#1e293b',
                        bodyColor: '#475569',
                        borderColor: 'rgba(0,0,0,0.06)',
                        borderWidth: 1,
                        padding: 10,
                        titleFont: { size: 12, weight: '800' },
                        bodyFont: { size: 12, weight: '700' },
                        callbacks: {
                            label: (context) => {
                                const val = context.parsed.y;
                                const m = Math.floor(val);
                                const s = Math.round((val - m) * 60);
                                return `${context.dataset.label}: ${m}:${s.toString().padStart(2, '0')} /km`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { font: { size: 11, weight: '700', family: "'Inter', sans-serif" }, color: '#64748b' }
                    },
                    y: {
                        reverse: true,
                        grid: { color: 'rgba(0,0,0,0.03)' },
                        ticks: {
                            font: { size: 10, weight: '700', family: "'Inter', sans-serif" },
                            color: '#64748b',
                            callback: (val) => {
                                const m = Math.floor(val);
                                const s = Math.round((val - m) * 60);
                                return `${m}:${s.toString().padStart(2, '0')}`;
                            }
                        }
                    }
                }
            }
        });
    }, 150);
}

function extractPacesFromStep(step, array, athleteVam) {
    if (!step) return;
    const durType = step.duration?.type || 'time';
    const durVal = parseFloat(step.duration?.value) || 0;
    
    let kms = 1;
    let speedKmh = 12;
    
    if (athleteVam && athleteVam > 0) {
        const intType = step.intensity?.type || 'none';
        const intVal = parseFloat(step.intensity?.value) || 0;
        if (intType === 'vam' && intVal > 0) {
            speedKmh = (intVal / 100) * athleteVam;
        } else if (intType === 'pace' && intVal > 0) {
            speedKmh = 60 / intVal;
        } else {
            const stepType = step.type || 'run';
            if (stepType === 'warmup' || stepType === 'cooldown' || stepType === 'recovery') {
                speedKmh = 0.65 * athleteVam;
            } else {
                speedKmh = 0.75 * athleteVam;
            }
        }
    }
    
    const paceMinDecimal = 60 / speedKmh;

    if (durType === 'distance') {
        kms = Math.max(1, Math.round(durVal));
    } else {
        kms = Math.max(1, Math.round((speedKmh * (durVal / 60))));
    }

    for (let k = 0; k < kms; k++) {
        array.push(paceMinDecimal);
    }
}

let _vamPreviewVisible = false;

function toggleVamPreview() {
    _vamPreviewVisible = !_vamPreviewVisible;
    const pv = $('edit-workout-vam-preview');
    const btn = $('toggle-vam-btn');
    if (pv) {
        pv.style.display = _vamPreviewVisible ? 'flex' : 'none';
    }
    if (btn) {
        if (_vamPreviewVisible) {
            btn.style.background = 'var(--primary)';
            btn.style.color = 'white';
            btn.style.borderColor = 'var(--primary)';
        } else {
            btn.style.background = 'transparent';
            btn.style.color = 'var(--text)';
            btn.style.borderColor = 'var(--border-strong)';
        }
    }
}

function renderEditWorkoutVamPreview(athleteIdOrSpeed) {
    const pv = $('edit-workout-vam-preview');
    if (!pv) return;
    
    let a = null;
    let vam = 14.0;
    let t = 12.86;
    
    if (athleteIdOrSpeed) {
        const idStr = athleteIdOrSpeed.toString();
        if (idStr.startsWith('athlete-')) {
            const cleanId = idStr.replace('athlete-', '');
            a = athletes.find(x => x.id == cleanId || x.supabaseId == cleanId);
        } else {
            a = athletes.find(x => x.id == idStr || x.supabaseId == idStr);
        }
    }
    
    if (a) {
        t = parseFloat((a.testTime || '').toString().replace(',', '.'));
        if (!t || t <= 0) {
            pv.style.display = 'none';
            return;
        }
        vam = 180 / t;
    } else {
        vam = parseFloat(athleteIdOrSpeed) || 14.0;
        t = 180 / vam;
    }
    
    pv.style.display = _vamPreviewVisible ? 'flex' : 'none';
    
    const testTimeEl = $('edit-workout-modal-test-time');
    if (testTimeEl) testTimeEl.textContent = `${parseFloat(t.toFixed(2)).toString().replace('.', ',')} min`;
    
    const modalVamEl = $('edit-workout-modal-vam');
    if (modalVamEl) modalVamEl.textContent = `${vam.toFixed(1)} km/h`;
    
    const vamZonesEl = $('edit-workout-vam-zones');
    const vamZone = VAM_ZONES.find(z => z.pct === 100) || VAM_ZONES[VAM_ZONES.length - 1];
    
    if (vamZonesEl) {
        vamZonesEl.innerHTML = VAM_ZONES.map(z => {
            const spd = vam * (z.pct / 100);
            const isVam = z.pct === vamZone.pct;
            const extraStyle = isVam ? `box-shadow:0 6px 18px ${z.color}22;border-radius:8px;background:linear-gradient(90deg, ${z.color}11, transparent);` : `background:var(--bg);`;
            return `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;border-left:4px solid ${z.color};${extraStyle}"><span style="font-size:13px;font-weight:600;color:${isVam ? z.color : 'inherit'}">${z.label} (${z.pct}%)</span><span style="font-size:14px;font-weight:800;color:${z.color};">${vamToPace(spd)}</span></div>`;
        }).join('');
    }
    
    const thR = `<tr style="background:var(--bg);"><th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text-muted);">Dist.</th><th style="padding:10px 16px;text-align:center;font-size:11px;font-weight:700;color:var(--text-muted);">% VAM</th><th style="padding:10px 16px;text-align:right;font-size:11px;font-weight:700;color:var(--text-muted);">Pace</th></tr>`;
    
    const tblShort = $('edit-workout-tbl-short');
    if (tblShort) {
        tblShort.innerHTML = thR + DIST_SHORT.map((d, i) => `
            <tr style="${i % 2 === 0 ? 'background:var(--bg);' : ''}">
                <td style="padding:10px 16px;font-weight:600;color:var(--text);">${d.label}</td>
                <td style="padding:10px 16px;text-align:center;color:#ef4444;font-weight:700;">${d.pct}%</td>
                <td style="padding:10px 16px;text-align:right;font-weight:800;color:var(--text);">${vamToPace(vam * (d.pct / 100))}</td>
            </tr>
        `).join('');
    }
    
    const tblLong = $('edit-workout-tbl-long');
    if (tblLong) {
        tblLong.innerHTML = thR + DIST_LONG.map((d, i) => {
            const isVamRow = d.pct === (VAM_ZONES.find(z => z.pct === 100)?.pct || 100);
            const pctColor = isVamRow ? (VAM_ZONES.find(z => z.pct === 100)?.color || '#2563eb') : '#2563eb';
            const bg = i % 2 === 0 ? 'background:var(--bg);' : '';
            const rowStyle = isVamRow ? `background:${pctColor}11;box-shadow:inset 4px 0 0 ${pctColor}22;` : bg;
            return `
                <tr style="${rowStyle}">
                    <td style="padding:10px 16px;font-weight:600;color:var(--text);">${d.label}</td>
                    <td style="padding:10px 16px;text-align:center;color:${pctColor};font-weight:700;">${d.pct}%</td>
                    <td style="padding:10px 16px;text-align:right;font-weight:800;color:var(--text);">${vamToPace(vam * (d.pct / 100))}</td>
                </tr>
            `;
        }).join('');
    }
    
    if (a) {
        // Zonas de Frequência Cardíaca
        const tempAthleteForHR = {
            maxHr: parseInt(a.maxHr),
            hrMethod: a.hrMethod || 'max',
            restingHr: parseInt(a.restingHr),
            lthr: parseInt(a.lthr)
        };
        const hrZones = calculateHRZones(tempAthleteForHR);
        const hrHtml = `
            <div style="margin-top:12px; padding-top:12px; border-top:1px dashed var(--border-strong);">
                <div style="font-size:11px; font-weight:700; color:var(--primary); text-transform:uppercase; margin-bottom:8px;">Zonas de Frequência Cardíaca</div>
                <div style="display:grid; grid-template-columns: repeat(5, 1fr); gap:4px; text-align:center;">
                    <div style="font-size:10px;color:var(--text);"><div style="background:#94a3b8; height:4px; border-radius:2px; margin-bottom:2px;"></div>Z1<br><b>&lt;${Math.round(hrZones.z1)}</b></div>
                    <div style="font-size:10px;color:var(--text);"><div style="background:#3b82f6; height:4px; border-radius:2px; margin-bottom:2px;"></div>Z2<br><b>&lt;${Math.round(hrZones.z2)}</b></div>
                    <div style="font-size:10px;color:var(--text);"><div style="background:#10b981; height:4px; border-radius:2px; margin-bottom:2px;"></div>Z3<br><b>&lt;${Math.round(hrZones.z3)}</b></div>
                    <div style="font-size:10px;color:var(--text);"><div style="background:#f59e0b; height:4px; border-radius:2px; margin-bottom:2px;"></div>Z4<br><b>&lt;${Math.round(hrZones.z4)}</b></div>
                    <div style="font-size:10px;color:var(--text);"><div style="background:#ef4444; height:4px; border-radius:2px; margin-bottom:2px;"></div>Z5<br><b>&gt;${Math.round(hrZones.z4)}</b></div>
                </div>
            </div>
        `;
        if (vamZonesEl) vamZonesEl.innerHTML += hrHtml;
    }
}

// Updates hidden input value, icon badge, and pill visual states
function setWorkoutTypePill(type) {
    const typeHidden = $('edit-workout-type');
    if (typeHidden) typeHidden.value = type;

    const config = {
        'Corrida':        { bg:'#fef9c3', border:'#fbbf24', text:'#92400e', icon:'ri-run-line',       iconBg:'#fbbf24' },
        'Natação':        { bg:'#e0f2fe', border:'#38bdf8', text:'#0369a1', icon:'<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="display:block;"><path d="M2 21v-2q.95 0 1.425-.5T5.3 18t1.925.5t1.425.5t1.425-.5T12 18t1.925.5t1.425.5t1.425-.5T18.7 18t1.875.5T22 19v2q-1.475 0-1.937-.5T18.7 20t-1.425.5t-1.925.5t-1.925-.5T12 20t-1.425.5t-1.925.5t-1.925-.5T5.3 20t-1.363.5T2 21m0-4.5v-2q.95 0 1.425-.5t1.875-.5t1.938.5t1.412.5q.9 0 1.425-.5T12 13.5t1.925.5t1.425.5t1.425-.5t1.925-.5t1.875.5t1.425.5v2q-1.475 0-1.937-.5t-1.363-.5t-1.388.5t-1.962.5q-1.425 0-1.937-.5T12 15.5q-.95 0-1.412.5t-1.938.5t-1.963-.5t-1.387-.5t-1.362.5T2 16.5m4.9-5.1l3.325-3.325l-1-1q-.825-.825-1.75-1.2T5.2 5.5V3q1.875 0 3.1.413T10.7 5l6.4 6.4q-.425.275-.825.438T15.35 12q-.9 0-1.425-.5T12 11t-1.925.5t-1.425.5q-.525 0-.925-.162T6.9 11.4m11.575-7.663q.725.738.725 1.763q0 1.05-.725 1.775T16.7 8t-1.775-.725T14.2 5.5q0-1.025.725-1.763T16.7 3t1.775.738"/></svg>',  iconBg:'#0ea5e9' },
        'Ciclismo':       { bg:'#dcfce7', border:'#4ade80', text:'#166534', icon:'ri-riding-line',    iconBg:'#22c55e' },
        'Fortalecimento': { bg:'#ede9fe', border:'#a78bfa', text:'#5b21b6', icon:'<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="display:block;"><path d="M6 5h2v14H6zm10 0h2v14h-2zM3 9h3v6H3zm15 0h3v6h-3zM8 11h8v2H8z"/></svg>',   iconBg:'#8b5cf6' },
        'Outros':         { bg:'#f1f5f9', border:'#94a3b8', text:'#475569', icon:'ri-clipboard-line', iconBg:'#64748b' },
    };
    const c = config[type] || config['Outros'];

    // Update icon button style
    const iconBtn = $('edit-workout-type-btn');
    if (iconBtn) {
        iconBtn.style.background = c.iconBg;
    }
    
    const iconEl = $('edit-workout-type-icon');
    if (iconEl) {
        iconEl.innerHTML = c.icon.startsWith('<svg') ? c.icon : `<i class="${c.icon}"></i>`;
    }

    // Update label subtitle
    const textLabel = $('edit-workout-type-text-label');
    if (textLabel) {
        textLabel.textContent = type;
        textLabel.style.color = c.iconBg; // Use a cor tema correspondente
    }
}

function toggleWorkoutTypeDropdown(event) {
    if (event) event.stopPropagation();
    const menu = $('workout-type-dropdown-menu');
    if (menu) {
        menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
    }
}

function selectWorkoutType(type, event) {
    if (event) event.stopPropagation();
    setWorkoutTypePill(type);
    const menu = $('workout-type-dropdown-menu');
    if (menu) menu.style.display = 'none';
    
    // Recarrega os passos e o gráfico para pintar com a cor da nova modalidade
    if (typeof renderCalendarWorkoutSteps === 'function') {
        renderCalendarWorkoutSteps();
    }
}

// Fechar dropdown de tipo ao clicar fora
document.addEventListener('click', () => {
    const menu = $('workout-type-dropdown-menu');
    if (menu) menu.style.display = 'none';
});


function toggleEditWorkoutCompletedFields() {
    const status = $('edit-workout-status').value;
    const isCompleted = status === 'completed';
    
    const realDist = $('edit-workout-real-dist');
    const realDur = $('edit-workout-real-duration');
    const realPace = $('edit-workout-real-pace');
    const effort = $('edit-workout-effort');
    
    if (realDist) {
        realDist.disabled = !isCompleted;
        realDist.style.backgroundColor = isCompleted ? '#ffffff' : '#f1f5f9';
    }
    if (realDur) {
        realDur.disabled = !isCompleted;
        realDur.style.backgroundColor = isCompleted ? '#ffffff' : '#f1f5f9';
    }
    if (realPace) {
        realPace.disabled = !isCompleted;
        realPace.style.backgroundColor = isCompleted ? '#ffffff' : '#f1f5f9';
    }
    if (effort) {
        effort.disabled = !isCompleted;
        effort.style.backgroundColor = isCompleted ? '#ffffff' : '#f1f5f9';
    }
}

async function saveIndividualWorkout() {
    const id = $('edit-workout-id').value;
    const date = $('edit-workout-date').value;
    const title = $('edit-workout-title').value.trim() || 'Corrida';
    const type = $('edit-workout-type').value;
    const description = $('edit-workout-desc').value.trim();
    let distance = parseFloat($('edit-workout-dist').value) || null;
    let pace = $('edit-workout-pace').value.trim() || null;
    
    if (_editingCalendarWorkout && _editingCalendarWorkout.steps && _editingCalendarWorkout.steps.length > 0) {
        let totalDist = 0;
        const vamKmh = window._calendarWorkoutPreviewVam || 14.0;
        
        const calcDist = (step) => {
            const durVal = parseFloat(step.duration?.value) || 0;
            if (durVal <= 0) return 0;
            if (step.duration.type === 'distance') return durVal;
            if (step.duration.type === 'time') {
                const intVal = parseFloat(step.intensity?.value) || 0;
                if (step.intensity?.type === 'vam' && intVal > 0) {
                    return (vamKmh * (intVal / 100)) * (durVal / 60);
                } else if (step.intensity?.type === 'pace' && step.intensity?.value) {
                    const parts = step.intensity.value.split(':');
                    if (parts.length === 2) {
                        const m = parseInt(parts[0]);
                        const s = parseInt(parts[1]);
                        const totalMins = m + (s / 60);
                        if (totalMins > 0) return (60 / totalMins) * (durVal / 60);
                    }
                } else {
                    return 10 * (durVal / 60);
                }
            }
            return 0;
        };

        _editingCalendarWorkout.steps.forEach(s => {
            if (s.type === 'repetition' && s.steps && s.repeats) {
                let repDist = 0;
                s.steps.forEach(sub => repDist += calcDist(sub));
                totalDist += repDist * parseInt(s.repeats);
            } else {
                totalDist += calcDist(s);
            }
        });
        
        if (totalDist > 0) {
            distance = parseFloat(totalDist.toFixed(2));
        }
    }
    const status = $('edit-workout-status').value;
    const effort_score = parseInt($('edit-workout-effort').value) || null;
    
    const real_distance = parseFloat($('edit-workout-real-dist').value) || null;
    const real_duration = parseInt($('edit-workout-real-duration').value) || null;
    const real_pace = $('edit-workout-real-pace').value.trim() || null;
    
    const a = athletes.find(x => x.id == currentHistoryAthleteId);
    if (!a || !a.supabaseId) {
        showToast("Erro: Atleta sem conta vinculada.", "error");
        return;
    }

    const typeLabels = { 
        warmup: 'Aquecimento', 
        run: 'Corrida', 
        walk: 'Caminhada', 
        recovery: 'Recuperação', 
        rest: 'Descanso', 
        cooldown: 'Desaquecimento', 
        other: 'Outros' 
    };

    // Compile text description from Garmin steps
    let compiledDescription = "";
    if (_editingCalendarWorkout && _editingCalendarWorkout.steps.length > 0) {
        compiledDescription = _editingCalendarWorkout.steps.map(s => {
            if (s.type === 'repetition') {
                const inner = s.steps.map(is => {
                    const dur = is.duration.type === 'lap_button' ? 'Até Lap' : `${is.duration.value}${is.duration.type === 'time' ? 'min' : 'km'}`;
                    const intensity = is.intensity.value > 0 ? ` @ ${is.intensity.value}% VAM` : '';
                    return `   - ${is.label || typeLabels[is.type] || is.type}: ${dur}${intensity}`;
                }).join('\n');
                return `${s.count}x Repetições de:\n${inner}`;
            } else {
                const dur = s.duration.type === 'lap_button' ? 'Até Lap' : `${s.duration.value}${s.duration.type === 'time' ? 'min' : 'km'}`;
                const intensity = s.intensity.value > 0 ? ` @ ${s.intensity.value}% VAM` : '';
                return `${s.label || typeLabels[s.type] || s.type}: ${dur}${intensity}`;
            }
        }).join('\n\n');
        
        // Append additional description text if any
        if (description) {
            compiledDescription += `\n\nNotas:\n${description}`;
        }
    } else {
        compiledDescription = description;
    }
    
    const payload = {
        athlete_id: a.supabaseId,
        date: date + 'T09:00:00Z',
        title,
        type,
        description: compiledDescription,
        status,
        metrics: {
            distance: distance ? `${distance} km` : '--',
            duration: pace || '--',
            distance_value: distance,
            pace_value: pace,
            effort_score: effort_score,
            real_distance: status === 'completed' ? real_distance : null,
            real_duration: status === 'completed' ? real_duration : null,
            real_pace: status === 'completed' ? real_pace : null,
            structured_steps: _editingCalendarWorkout ? _editingCalendarWorkout.steps : null
        }
    };
    
    if (window._editingLibraryTemplateMode) {
        try {
            const typeLower = (payload.type || 'Corrida').toLowerCase();
            const mappedType = typeLower === 'corrida' ? 'run' : typeLower === 'ciclismo' ? 'bike' : typeLower === 'natação' ? 'swim' : 'other';
            
            const newTemplate = {
                id: window._editingLibraryTemplateId || 't-custom-' + Date.now(),
                title: payload.title,
                type: mappedType,
                category: mappedType,
                description: payload.description,
                metrics: {
                    distance: payload.metrics.distance_value ? payload.metrics.distance_value + ' km' : 'N/A',
                    duration: payload.metrics.duration || 'N/A'
                },
                structured_steps: payload.metrics.structured_steps
            };
            
            saveCustomLibraryTemplate(newTemplate);
            
            showToast("Modelo salvo na Biblioteca!", "success");
            closeEditWorkoutModal();
            renderLibraryTemplates();
            
            window._editingLibraryTemplateMode = false;
            window._editingLibraryTemplateId = null;
        } catch (err) {
            console.error(err);
            showToast("Erro ao salvar modelo.", "error");
        }
        return;
    }
    
    try {
        if (id) {
            const { error } = await dbClient
                .from('workouts')
                .update(payload)
                .eq('id', id);
                
            if (error) throw error;
            showToast("Treino atualizado com sucesso!");
        } else {
            const { error } = await dbClient
                .from('workouts')
                .insert([payload]);
                
            if (error) throw error;
            showToast("Treino adicionado com sucesso!");
        }
        
        closeEditWorkoutModal();
        await loadCalendarWorkouts();
    } catch (err) {
        console.error("Erro ao salvar treino:", err);
        showToast("Erro ao salvar treino.", "error");
    }
}

async function deleteIndividualWorkout() {
    const id = $('edit-workout-id').value;
    if (!id) return;
    
    if (!confirm("Deseja realmente excluir permanentemente este treino individual?")) return;
    
    try {
        const { error } = await dbClient
            .from('workouts')
            .delete()
            .eq('id', id);
            
        if (error) throw error;
        
        showToast("Treino individual excluído.");
        closeEditWorkoutModal();
        await loadCalendarWorkouts();
    } catch (err) {
        console.error("Erro ao excluir treino:", err);
        showToast("Erro ao excluir treino.", "error");
    }
}
function renderHistoryList(aId){
    const list = $('history-list');
    if (!list) return;
    const plans=historyPlans.filter(p=>p.athleteId==aId).sort((a,b)=>b.id-a.id);
    if(!plans.length){list.innerHTML='<div style="padding:32px;color:var(--text-muted);text-align:center;"><i class="ri-calendar-line" style="font-size:36px;display:block;margin-bottom:8px;opacity:0.3;"></i>Nenhum treino.</div>';return;}
    const toolbar=`<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 20px;background:var(--bg);border-bottom:1px solid var(--border);position:sticky;top:0;z-index:1;"><label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;font-weight:600;color:var(--text-muted);"><input type="checkbox" id="hist-select-all" onchange="toggleSelectAllHistory()" style="width:15px;height:15px;accent-color:var(--primary);">Selecionar todos (${plans.length})</label><button class="btn btn-danger-solid" id="hist-delete-selected" onclick="deleteSelectedHistory()" style="padding:6px 12px;font-size:12px;display:none;"><i class="ri-delete-bin-line"></i> Excluir</button></div>`;
    const rows=plans.map(p=>{const d=new Date(p.id).toLocaleDateString('pt-BR');return`<div class="history-item"><div style="display:flex;align-items:center;gap:12px;"><input type="checkbox" class="hist-chk" value="${p.id}" onchange="updateHistoryToolbar()" style="width:16px;height:16px;accent-color:var(--primary);cursor:pointer;"><div><div class="hist-date">${d}</div><div class="hist-vol">${p.calcData.categoryName} / ${p.calcData.groupName} · ${p.calcData.volume}km</div></div></div><div style="display:flex;gap:6px;"><button class="btn btn-secondary" onclick="viewExport(${p.id})" style="padding:5px 10px;font-size:12px;"><i class="ri-image-line"></i> Ver</button><button class="btn btn-tertiary btn-icon-danger" onclick="deleteHistory(${p.id})" style="padding:5px 8px;font-size:12px;"><i class="ri-delete-bin-line"></i></button></div></div>`;}).join('');
    list.innerHTML=toolbar+rows;
}
function updateHistoryToolbar(){const all=[...document.querySelectorAll('.hist-chk')],sel=all.filter(c=>c.checked),btn=$('hist-delete-selected'),ca=$('hist-select-all');if(btn){btn.style.display=sel.length>0?'inline-flex':'none';btn.innerHTML=`<i class="ri-delete-bin-line"></i> Excluir ${sel.length}`;}if(ca){ca.indeterminate=sel.length>0&&sel.length<all.length;ca.checked=sel.length===all.length&&all.length>0;}}
function toggleSelectAllHistory(){const checked=$('hist-select-all').checked;document.querySelectorAll('.hist-chk').forEach(c=>{c.checked=checked;});updateHistoryToolbar();}
function deleteHistory(hId){if(!confirm('Excluir do histórico?'))return;historyPlans=historyPlans.filter(h=>h.id!==hId);saveState(['history']);renderHistoryList(currentHistoryAthleteId);renderDashboard();showToast('Excluído.');}
function deleteSelectedHistory(){const sel=[...document.querySelectorAll('.hist-chk:checked')].map(c=>parseInt(c.value));if(!sel.length)return;if(!confirm(`Excluir ${sel.length} treino(s)?`))return;const s=new Set(sel);historyPlans=historyPlans.filter(h=>!s.has(h.id));saveState(['history']);renderHistoryList(currentHistoryAthleteId);renderDashboard();showToast(`${sel.length} excluído(s).`);}

// ─── STRAVA ACTIVITIES ───
async function openStravaActivities(athleteId) {
    const a = athletes.find(x => x.id == athleteId);
    if (!a) return;
    
    $('strava-athlete-name').textContent = a.name;
    $('strava-list').innerHTML = '';
    $('strava-loading').style.display = 'block';
    $('modal-strava').classList.add('show');

    try {
        // Usar a URL absoluta se estiver no painel do professor (que está em /professor/)
        if (!a.supabaseId) {
            $('strava-loading').style.display = 'none';
            $('strava-list').innerHTML = `<div style="padding:40px; text-align:center; color:var(--text-muted);"><i class="ri-information-line" style="font-size:32px; display:block; margin-bottom:8px; opacity:0.5;"></i>Aluno manual (sem conta vinculada no App).</div>`;
            return;
        }
        const response = await fetch(`/api/strava/activities?userId=${a.supabaseId}`);
        const activities = await response.json();
        
        $('strava-loading').style.display = 'none';
        
        if (!activities || activities.error || !activities.length) {
            $('strava-list').innerHTML = `<div style="padding:40px; text-align:center; color:var(--text-muted);">
                <i class="ri-information-line" style="font-size:32px; display:block; margin-bottom:8px; opacity:0.5;"></i>
                ${activities?.error || 'Nenhuma atividade encontrada no Strava para este atleta.'}
            </div>`;
            return;
        }

        $('strava-list').innerHTML = activities.map(act => {
            const date = new Date(act.date).toLocaleDateString('pt-BR');
            return `<div class="history-item">
                <div style="display:flex; align-items:center; gap:12px;">
                    <div style="width:36px; height:36px; border-radius:8px; background:#fc4c0215; color:#fc4c02; display:flex; align-items:center; justify-content:center;">
                        <i class="ri-run-line"></i>
                    </div>
                    <div>
                        <div style="font-weight:700; font-size:14px; color:var(--text-primary);">${act.title}</div>
                        <div style="font-size:12px; color:var(--text-muted);">${date} · ${act.metrics.distance} · ${act.metrics.pace}/km</div>
                    </div>
                </div>
                <div style="text-align:right;">
                    <div style="font-weight:800; color:var(--primary);">${act.metrics.duration}</div>
                    <div style="font-size:10px; color:var(--text-muted); text-transform:uppercase;">Duração</div>
                </div>
            </div>`;
        }).join('');
    } catch (err) {
        console.error('Erro ao buscar Strava:', err);
        $('strava-loading').style.display = 'none';
        $('strava-list').innerHTML = `<div style="padding:40px; text-align:center; color:var(--danger);">Erro ao conectar com o Strava.</div>`;
    }
}

// ═══════════════════════════════════════
//  EXPORT / IMAGE
// ═══════════════════════════════════════
function calculatePlan(athlete){
    const g=groups.find(x=>x.id==athlete.groupId);if(!g||!athlete.testTime)return null;const vamKmh=180/athlete.testTime;
    const rows=g.plan.reduce((acc,d,i)=>{
        if(!d.active)return acc;
        const phases = [];
        if (d.steps && d.steps.length > 0) {
            d.steps.forEach(s => {
                if (s.type === 'repetition') {
                    const inner = (s.steps || []).map(is => {
                        const dur = is.duration ? (is.duration.type === 'time' ? is.duration.value + 'min' : is.duration.value + 'km') : '--';
                        const int = is.intensity && is.intensity.value > 0 ? ` @ ${is.intensity.value}% VAM` : '';
                        return `${is.label || phaseLabels[is.type] || is.type}: ${dur}${int}`;
                    }).join(' + ');
                    
                    // Calcular a distância estimada das etapas internas da repetição
                    let repKm = 0;
                    if (s.steps) {
                        s.steps.forEach(is => {
                            if (is.duration && is.duration.value) {
                                if (is.duration.type === 'distance') {
                                    repKm += parseFloat(is.duration.value) || 0;
                                } else if (is.duration.type === 'time' && is.intensity && is.intensity.type === 'vam' && is.intensity.value > 0) {
                                    const speed = vamKmh * ((parseFloat(is.intensity.value) || 0) / 100);
                                    repKm += speed * ((parseFloat(is.duration.value) || 0) / 60);
                                }
                            }
                        });
                    }
                    const totalRepKm = repKm * (parseInt(s.count) || 1);
                    phases.push({ type: s.type, title: `Repetição (${s.count}x)`, km: totalRepKm > 0 ? totalRepKm.toFixed(2) : '', pace: '', desc: inner });
                } else {
                    let km = ''; let pace = 'Livre'; let desc = s.notes || s.desc || '';
                    if (s.duration) {
                        if (s.duration.type === 'time') { 
                            desc = `${s.duration.value}min ` + desc; 
                            // Calcular distância estimada para etapas baseadas em tempo usando a VAM
                            if (s.intensity && s.intensity.type === 'vam' && s.intensity.value > 0) {
                                const speed = vamKmh * ((parseFloat(s.intensity.value) || 0) / 100);
                                km = (speed * ((parseFloat(s.duration.value) || 0) / 60)).toFixed(2);
                            }
                        } 
                        else { 
                            km = s.duration.value; 
                        }
                    }
                    if (s.intensity && s.intensity.type === 'vam' && s.intensity.value > 0) {
                        pace = vamToPace(vamKmh * (s.intensity.value / 100));
                    }
                    phases.push({ type: s.type, title: s.label || phaseLabels[s.type] || s.type, km, pace, desc: desc.trim() });
                }
            });
        } else if (d.phases) {
            d.phases.filter(ph=>ph.volPct>0).forEach(ph => {
                phases.push({ type:ph.type, title:phaseLabels[ph.type], km:((ph.volPct/100)*g.volume).toFixed(1), pace:vamToPace(vamKmh*(ph.vamPct/100)), desc:ph.desc });
            });
        }
        if(phases.length)acc.push({dayName:daysNames[i],phases});return acc;
    },[]);
    // HR zones if data available
    let hrInfo=null;
    const fcMax=athlete.testHr||null;
    if(fcMax){hrInfo={z1:`${Math.round(fcMax*0.6)}-${Math.round(fcMax*0.7)}`,z2:`${Math.round(fcMax*0.7)}-${Math.round(fcMax*0.8)}`,z3:`${Math.round(fcMax*0.8)}-${Math.round(fcMax*0.9)}`,z4:`${Math.round(fcMax*0.9)}-${Math.round(fcMax*0.95)}`,z5:`${Math.round(fcMax*0.95)}-fcMax`};}
    return{athleteName:athlete.name,volume:g.volume,groupName:g.name,categoryName:g.category,rows,hrInfo,vamKmh:vamKmh.toFixed(1)};
}

let currentExportCanvas=null,currentExportPhone='',currentExportHistId=null;

async function clearAthleteWorkouts() {
    const id = $('modal-athlete').dataset.editing;
    if (!id) return;
    const a = athletes.find(x => x.id == id);
    if (!a || !a.supabaseId) return showToast('Aluno sem conta vinculada no App.', 'default');

    if (!confirm(`Tem certeza que deseja apagar TODOS os treinos de "${a.name}" no aplicativo? Esta ação não pode ser desfeita.`)) return;

    try {
        const { error } = await dbClient.from('workouts').delete().eq('athlete_id', a.supabaseId);
        if (error) throw error;
        showToast('Todos os treinos foram removidos do App!', 'success');
        closeModals();
    } catch (err) {
        console.error('Clear Workouts Error:', err);
        showToast('Erro ao limpar treinos.', 'error');
    }
}

function showWeekSelectorModal() {
    return new Promise((resolve) => {
        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        overlay.style.background = 'rgba(15, 23, 42, 0.6)';
        overlay.style.backdropFilter = 'blur(8px)';
        overlay.style.zIndex = '99999';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.25s ease';

        // Modal container
        const container = document.createElement('div');
        container.style.background = '#ffffff';
        container.style.padding = '2rem';
        container.style.borderRadius = '24px';
        container.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.25)';
        container.style.width = '420px';
        container.style.maxWidth = '90vw';
        container.style.textAlign = 'center';
        container.style.transform = 'scale(0.9)';
        container.style.transition = 'transform 0.25s ease';
        container.style.border = '1px solid rgba(226, 232, 240, 0.8)';

        // Title
        const title = document.createElement('h3');
        title.innerText = 'Escolha a Semana de Envio';
        title.style.margin = '0 0 10px 0';
        title.style.fontSize = '1.3rem';
        title.style.fontWeight = '800';
        title.style.color = '#1e293b';
        title.style.fontFamily = '"Outfit", sans-serif';

        // Description
        const desc = document.createElement('p');
        desc.innerText = 'Para qual semana você deseja programar e enviar esta planilha de treinos?';
        desc.style.margin = '0 0 24px 0';
        desc.style.fontSize = '0.95rem';
        desc.style.color = '#64748b';
        desc.style.lineHeight = '1.5';
        desc.style.fontFamily = '"Outfit", sans-serif';

        // Button container
        const btnContainer = document.createElement('div');
        btnContainer.style.display = 'flex';
        btnContainer.style.flexDirection = 'column';
        btnContainer.style.gap = '10px';

        // Button: This Week
        const btnThis = document.createElement('button');
        btnThis.innerText = 'Enviar para esta Semana';
        btnThis.style.padding = '12px';
        btnThis.style.borderRadius = '12px';
        btnThis.style.border = 'none';
        btnThis.style.background = '#FC5200';
        btnThis.style.color = '#ffffff';
        btnThis.style.fontWeight = '700';
        btnThis.style.cursor = 'pointer';
        btnThis.style.fontSize = '0.95rem';
        btnThis.style.transition = 'filter 0.2s';
        btnThis.style.fontFamily = '"Outfit", sans-serif';
        btnThis.onmouseover = () => btnThis.style.filter = 'brightness(1.1)';
        btnThis.onmouseout = () => btnThis.style.filter = 'brightness(1)';
        btnThis.onclick = () => {
            closeModal('current');
        };

        // Button: Next Week
        const btnNext = document.createElement('button');
        btnNext.innerText = 'Enviar para a Próxima Semana';
        btnNext.style.padding = '12px';
        btnNext.style.borderRadius = '12px';
        btnNext.style.border = '1px solid #FC5200';
        btnNext.style.background = 'transparent';
        btnNext.style.color = '#FC5200';
        btnNext.style.fontWeight = '700';
        btnNext.style.cursor = 'pointer';
        btnNext.style.fontSize = '0.95rem';
        btnNext.style.transition = 'background 0.2s, color 0.2s';
        btnNext.style.fontFamily = '"Outfit", sans-serif';
        btnNext.onmouseover = () => {
            btnNext.style.background = '#FC5200';
            btnNext.style.color = '#ffffff';
        };
        btnNext.onmouseout = () => {
            btnNext.style.background = 'transparent';
            btnNext.style.color = '#FC5200';
        };
        btnNext.onclick = () => {
            closeModal('next');
        };

        // Button: Cancel
        const btnCancel = document.createElement('button');
        btnCancel.innerText = 'Cancelar';
        btnCancel.style.padding = '10px';
        btnCancel.style.borderRadius = '12px';
        btnCancel.style.border = 'none';
        btnCancel.style.background = '#f1f5f9';
        btnCancel.style.color = '#64748b';
        btnCancel.style.fontWeight = '600';
        btnCancel.style.cursor = 'pointer';
        btnCancel.style.fontSize = '0.9rem';
        btnCancel.style.marginTop = '8px';
        btnCancel.style.transition = 'background 0.2s';
        btnCancel.style.fontFamily = '"Outfit", sans-serif';
        btnCancel.onmouseover = () => btnCancel.style.background = '#e2e8f0';
        btnCancel.onmouseout = () => btnCancel.style.background = '#f1f5f9';
        btnCancel.onclick = () => {
            closeModal(null);
        };

        btnContainer.appendChild(btnThis);
        btnContainer.appendChild(btnNext);
        btnContainer.appendChild(btnCancel);

        container.appendChild(title);
        container.appendChild(desc);
        container.appendChild(btnContainer);
        overlay.appendChild(container);
        document.body.appendChild(overlay);

        // Animate in
        setTimeout(() => {
            overlay.style.opacity = '1';
            container.style.transform = 'scale(1)';
        }, 10);

        function closeModal(choice) {
            overlay.style.opacity = '0';
            container.style.transform = 'scale(0.9)';
            setTimeout(() => {
                document.body.removeChild(overlay);
                resolve(choice);
            }, 250);
        }
    });
}

async function generateAndExport(aId){
    const a=athletes.find(x=>x.id==aId);if(!a.groupId||!a.testTime)return showToast('Preencha grupo e Teste VAM!','error');
    const calc=calculatePlan(a);if(!calc||!calc.rows.length)return showToast('Planilha sem dias ativos!','error');
    
    // Custom premium week selector
    const weekChoice = await showWeekSelectorModal();
    if (!weekChoice) return; // cancelled or closed
    
    const plan={id:generateId(),athleteId:a.id,volume:calc.volume,calcData:calc};
    
    // --- SYNC WITH SUPABASE ---
    const btn = document.activeElement;
    const oldHtml = btn ? btn.innerHTML : null;
    if (btn && btn.tagName === 'BUTTON') {
        btn.disabled = true;
        btn.innerHTML = '<i class="ri-loader-4-line animate-spin"></i> Enviando...';
    }

    showToast('Sincronizando com o App do Aluno...');
    try {
        let athleteId = a.supabaseId;
        
        if (!athleteId) {
            if (a.email) {
                const { data: pEmail } = await dbClient.from('profiles').select('id').eq('email', a.email).eq('role', 'athlete').maybeSingle();
                if (pEmail) athleteId = pEmail.id;
            }
            if (!athleteId) {
                const { data: profiles } = await dbClient.from('profiles').select('id').eq('role', 'athlete').ilike('name', `%${a.name}%`);
                if (profiles && profiles.length > 0) athleteId = profiles[0].id;
            }
        }
        
        if (athleteId) {
            if (!a.supabaseId) { a.supabaseId = athleteId; saveState(['athletes']); }

            const now = new Date();
            const currentDay = now.getDay();
            const diffToMonday = now.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
            const monday = new Date(now.setDate(diffToMonday));
            
            // Adjust monday if scheduled for next week
            if (weekChoice === 'next') {
                monday.setDate(monday.getDate() + 7);
            }
            
            monday.setHours(0, 0, 0, 0);
            
            const sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);
            sunday.setHours(23, 59, 59, 999);

            const mondayStr = monday.toISOString().split('T')[0];
            const sundayStr = sunday.toISOString().split('T')[0];

            // Limpar treinos existentes nesta semana para evitar duplicidade
            await dbClient.from('workouts')
                .delete()
                .eq('athlete_id', athleteId)
                .gte('date', mondayStr)
                .lte('date', sundayStr);

            const dayMap = { 'Segunda': 0, 'Terça': 1, 'Quarta': 2, 'Quinta': 3, 'Sexta': 4, 'Sábado': 5, 'Domingo': 6 };
            const gTemplate = groups.find(x => x.id == a.groupId);
            const groupPlan = gTemplate ? (gTemplate.plan || []) : [];
            const groupType = gTemplate ? (gTemplate.type || 'Corrida') : 'Corrida';
            const workoutsToInsert = calc.rows.map(row => {
                const workoutDate = new Date(monday);
                workoutDate.setDate(monday.getDate() + dayMap[row.dayName]);
                
                // Get structured steps for this day if they exist
                const dayPlan = groupPlan[dayMap[row.dayName]];
                
                let textDescription = "";
                if (dayPlan && dayPlan.steps) {
                    textDescription = dayPlan.steps.map(s => {
                        if (s.type === 'repetition') {
                            const inner = s.steps.map(is => {
                                const dur = is.duration.type === 'lap_button' ? 'Até Lap' : `${is.duration.value}${is.duration.type === 'time' ? 'min' : 'km'}`;
                                const intensity = is.intensity.value > 0 ? ` @ ${is.intensity.value}% VAM` : '';
                                return `   - ${is.label || phaseLabels[is.type] || is.type}: ${dur}${intensity}`;
                            }).join('\n');
                            return `${s.count}x Repetições de:\n${inner}`;
                        } else {
                            const dur = s.duration.type === 'lap_button' ? 'Até Lap' : `${s.duration.value}${s.duration.type === 'time' ? 'min' : 'km'}`;
                            const intensity = s.intensity.value > 0 ? ` @ ${s.intensity.value}% VAM` : '';
                            return `${s.label || phaseLabels[s.type] || s.type}: ${dur}${intensity}`;
                        }
                    }).join('\n\n');
                } else {
                    textDescription = row.phases.map(p => {
                        const paceStr = p.pace ? ` @ ${p.pace}` : '';
                        const descStr = p.desc ? ` - ${p.desc}` : '';
                        return `${phaseLabels[p.type]}: ${p.km}km${paceStr}${descStr}`;
                    }).join('\n');
                }
                
                return {
                    athlete_id: athleteId,
                    date: workoutDate.toISOString().split('T')[0],
                    type: groupType,
                    title: calc.groupName,
                    description: textDescription,
                    metrics: { 
                        distance: row.phases.reduce((sum, p) => sum + (parseFloat(p.km) || 0), 0).toFixed(1) + ' km',
                        duration: row.phases[0] ? row.phases[0].pace : '--',
                        structured_steps: dayPlan ? dayPlan.steps : null // Enviar steps estruturados se houver
                    },
                    status: 'pending'
                };
            });

            const { error } = await dbClient.from('workouts').insert(workoutsToInsert);
            if (error) throw error;

            // --- NOTIFICAÇÃO DE PLANILHA LIBERADA ---
            await dbClient.from('notifications').insert([{
                athlete_id: athleteId,
                title: 'Planilha liberada',
                text: `Sua planilha de ${calc.categoryName} (${calc.groupName}) já está disponível no app. Bons treinos!`,
                type: 'training_update',
                created_at: new Date().toISOString()
            }]);

            showToast('Planilha enviada para o App!', 'success');
            if (btn) {
                btn.innerHTML = 'Enviado';
                btn.style.background = '#34C759'; btn.style.color = 'white';
                setTimeout(() => { btn.disabled = false; btn.innerHTML = oldHtml; btn.style.background = ''; btn.style.color = ''; }, 3000);
            }
        } else {
            showToast('Aluno não cadastrado no App.', 'default');
            if (btn) { btn.disabled = false; btn.innerHTML = oldHtml; }
        }
    } catch (err) {
        console.error('Supabase Sync Error:', err);
        showToast('Erro ao enviar.', 'error');
        if (btn) { btn.disabled = false; btn.innerHTML = oldHtml; }
    }
    
    historyPlans.push(plan);
    saveState(['history']);
}

// Função para buscar atletas reais do Supabase e atualizar a lista local
async function syncAthletesFromSupabase(isManual = false) {
    if (isManual) showToast('Buscando atletas no banco...');
    try {
        const { data: profiles, error } = await dbClient
            .from('profiles')
            .select('*')
            .in('role', ['athlete', 'professor']); // Incluir professor para que ele veja seus próprios treinos no feed
        
        if (error) throw error;

        let addedCount = 0;
        let updatedCount = 0;

        profiles.forEach(p => {
            const index = athletes.findIndex(a => a.supabaseId === p.id || (a.name === p.name && !a.supabaseId));
            
            // Converter VAM (que pode ser pace "MM:SS" ou velocidade "13.5" no Supabase) para tempo de teste 3km
            let vamKmh = 0;
            if (p.vam && typeof p.vam === 'string') {
                const cleaned = p.vam.trim();
                if (cleaned.includes(':')) {
                    const parts = cleaned.split(':').map(Number);
                    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                        const minutes = parts[0] + (parts[1] / 60);
                        if (minutes > 0) {
                            vamKmh = 60 / minutes;
                        }
                    }
                } else {
                    vamKmh = parseFloat(cleaned) || 0;
                }
            } else if (typeof p.vam === 'number') {
                vamKmh = p.vam;
            }
            const supabaseVamTime = (vamKmh > 0) ? (180 / vamKmh) : null;

            if (index !== -1) {
                athletes[index].supabaseId = p.id;
                athletes[index].email = p.email;
                if (p.name && (!athletes[index].name || athletes[index].name.trim() === '')) {
                    athletes[index].name = p.name;
                }
                
                // Sincronizar FC Máxima (max_hr)
                if (p.max_hr && p.max_hr !== athletes[index].maxHr) {
                    athletes[index].maxHr = p.max_hr;
                }
                athletes[index].hrMethod = p.hr_method || 'max';
                athletes[index].restingHr = p.resting_hr || null;
                athletes[index].lthr = p.lthr || null;
                athletes[index].role = p.role; // Atualizar papel

                const oldVam = athletes[index].testTime;
                if (supabaseVamTime && supabaseVamTime !== oldVam) {
                    athletes[index].testTime = supabaseVamTime;
                    updatedCount++;
                }
                
                // Sync Avatar
                if (p.avatar_url) {
                    athletes[index].avatar_url = p.avatar_url;
                }
            } else {
                athletes.push({
                    id: generateId() + Math.random(),
                    supabaseId: p.id,
                    name: p.name || '',
                    email: p.email || '',
                    role: p.role, // Salvar o papel para filtrar na listagem
                    phone: '',
                    testHr: p.max_hr || null, // Importar FC Máx
                    maxHr: p.max_hr || null,
                    hrMethod: p.hr_method || 'max',
                    restingHr: p.resting_hr || null,
                    lthr: p.lthr || null,
                    testTime: supabaseVamTime,
                    groupId: null,
                    avatar_url: p.avatar_url || null,
                    notes: 'Importado do App'
                });
                addedCount++;
            }
        });

        // Limpeza automática DESATIVADA: ela apagava atletas locais cujo supabaseId
        // não existia no banco atual (ex.: após troca de projeto Supabase).
        // Nenhum atleta é removido automaticamente; remoção só manual.

        saveState(['athletes']);
        renderAthletes();
        renderDashboard();
        if (localStorage.getItem('vdot_lastView') === 'chat') renderChat();
        if (localStorage.getItem('vdot_lastView') === 'strava-feed') renderStravaFeed();
        if (localStorage.getItem('vdot_lastView') === 'garmin-feed') renderGarminFeed();

        if (isManual) {
            if (addedCount > 0) {
                showToast(`${addedCount} novo(s) aluno(s) sincronizado(s)!`, 'success');
            } else {
                showToast('Sincronização concluída. Nenhum atleta novo.', 'success');
            }
        }
    } catch (err) {
        console.error('Erro na sincronização:', err);
        if (isManual) showToast('Falha ao sincronizar: ' + err.message, 'error');
    }
}

async function viewExport(hId){
    closeModals();currentExportHistId=hId;$('modal-export').classList.add('show');$('export-loading').style.display='flex';$('export-img-preview').style.display='none';
    const hist=historyPlans.find(h=>h.id===hId);const calc=hist.calcData;const a=athletes.find(x=>x.id==hist.athleteId);currentExportPhone=a?(a.phone||''):'';
    // Show "send to another" button
    const btnAnother=$('btn-send-another');if(btnAnother)btnAnother.style.display='inline-flex';

    $('tpl-name').textContent=calc.athleteName;
    $('tpl-objective').innerHTML=`<span style="display:inline-flex;align-items:center;gap:5px;background:rgba(251,191,36,0.2);border:1px solid rgba(251,191,36,0.4);border-radius:20px;padding:3px 10px;font-size:12px;font-weight:700;color:#fcd34d;"><i class="ri-focus-2-line"></i> ${calc.categoryName}</span>`;
    $('tpl-vol').innerHTML=`<span style="display:inline-flex;align-items:center;gap:5px;background:rgba(99,179,237,0.2);border:1px solid rgba(99,179,237,0.4);border-radius:20px;padding:3px 10px;font-size:12px;font-weight:700;color:#93c5fd;"><i class="ri-route-line"></i> ${calc.volume} km/sem</span>`;
    const dtEl=$('tpl-date');if(dtEl)dtEl.innerHTML=`<span style="display:inline-flex;align-items:center;gap:5px;background:rgba(167,243,208,0.15);border:1px solid rgba(167,243,208,0.3);border-radius:20px;padding:3px 10px;font-size:12px;font-weight:700;color:#86efac;"><i class="ri-calendar-line"></i> ${new Date(hist.id).toLocaleDateString('pt-BR')}</span>`;

    $('tpl-days').innerHTML=calc.rows.map(r=>{const ph=r.phases.map(ph=>{
        const icon=ph.type==='warmup'?'ri-fire-line':ph.type==='main'?'ri-run-line':'ri-leaf-line';
        const stats=ph.type==='main'?`<div style="display:flex;align-items:baseline;gap:6px;"><span style="font-size:12px;font-weight:700;text-transform:uppercase;color:#6b7280;letter-spacing:1px;">Pace Alvo</span><span style="font-size:28px;font-weight:900;letter-spacing:-1.5px;color:#0f172a;">${ph.pace}</span></div><div style="display:inline-flex;align-items:center;gap:5px;margin-top:6px;background:#1e293b;border-radius:6px;padding:4px 10px;"><i class="ri-route-line" style="color:#94a3b8;font-size:13px;"></i><span style="font-size:13px;font-weight:700;color:#ffffff;">Distância: ${ph.km} km</span></div>`:`<div style="font-size:15px;font-weight:700;color:#475569;">${ph.km} km &nbsp;<span style="opacity:0.35;">|</span>&nbsp; ${ph.pace}</div>`;
        const instr=ph.desc?`<div class="vd-instruction">${ph.desc}</div>`:'';
        return`<div class="vd-phase phase-${ph.type}"><div class="phase-title"><i class="${icon}"></i> ${ph.title}</div><div class="phase-stats">${stats}</div>${instr}</div>`;}).join('');
        return`<div class="vdot-day-row"><div class="vd-day-name">${r.dayName}</div><div class="vd-phases">${ph}</div></div>`;}).join('');

    const wrapper=$('export-wrapper');wrapper.style.left='0';wrapper.style.opacity='0.01';
    const canvas=await html2canvas($('export-template'),{scale:1.5,backgroundColor:'#f1f5f9',useCORS:true});
    wrapper.style.left='-9999px';wrapper.style.opacity='1';
    currentExportCanvas=canvas;const img=$('export-img-preview');img.src=canvas.toDataURL('image/png');img.style.display='block';$('export-loading').style.display='none';
}

async function copyImageToClipboard(silent=false){if(!currentExportCanvas)return;return new Promise(r=>{currentExportCanvas.toBlob(async blob=>{try{await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]);if(!silent)showToast('Copiada!');r(true);}catch{if(!silent)showToast("Clique direito → 'Copiar Imagem'.",'error');r(false);}});});}
function downloadImage(){if(!currentExportCanvas)return;const l=document.createElement('a');l.download=`Treino_MeuVAM_${new Date().toLocaleDateString('pt-BR').replace(/\//g,'-')}.png`;l.href=currentExportCanvas.toDataURL('image/png');l.click();showToast('Download iniciado!');}
async function sendToWhatsApp(){await copyImageToClipboard(true);let pn=currentExportPhone?currentExportPhone.replace(/\D/g,''):'';if(pn&&pn.length<=11)pn='55'+pn;window.open(pn?`https://wa.me/${pn}`:'https://web.whatsapp.com','_blank');setTimeout(()=>showToast('Cole (Ctrl+V) na conversa!'),800);}
function shareImage(){if(!currentExportCanvas)return;currentExportCanvas.toBlob(async blob=>{const f=new File([blob],`Treino_${Date.now()}.png`,{type:'image/png'});if(navigator.share){try{await navigator.share({files:[f],title:'Treino MeuVAM'});}catch{}}else{downloadImage();}});}

function sendToAnotherAthlete(){
    const eligible=athletes.filter(a=>a.groupId&&a.testTime);
    if(!eligible.length)return showToast('Nenhum atleta com planilha e teste.','error');
    const names=eligible.map(a=>a.name);
    const pick=prompt('Enviar o treino deste modelo para qual atleta?\n\n'+names.map((n,i)=>`${i+1}. ${n}`).join('\n')+'\n\nDigite o número:');
    if(!pick)return;const idx=parseInt(pick)-1;if(idx<0||idx>=eligible.length)return showToast('Opção inválida.','error');
    const a=eligible[idx];generateAndExport(a.id);
}

// ═══════════════════════════════════════
//  IMPORT / EXPORT DATA
// ═══════════════════════════════════════
function exportAllData(){
    const data={version:'1.2',date:new Date().toISOString(),categories,groups,athletes,historyPlans};
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`MeuVAM_Backup_${new Date().toLocaleDateString('pt-BR').replace(/\//g,'-')}.json`;a.click();URL.revokeObjectURL(url);showToast('Dados exportados!');
}
function importAllData(e){
    const file=e.target.files[0];if(!file)return;
    const reader=new FileReader();reader.onload=ev=>{
        try{
            const data=JSON.parse(ev.target.result);
            if(!data.categories||!data.groups||!data.athletes){showToast('Arquivo inválido.','error');return;}
            if(!confirm(`Importar dados de ${data.date?new Date(data.date).toLocaleDateString('pt-BR'):'?'}?\n\nIsso substituirá TODOS os dados atuais.`))return;
            categories=data.categories;groups=data.groups;athletes=data.athletes;historyPlans=data.historyPlans||[];
            saveState(['cats','groups','athletes','history']);renderDashboard();showToast('Dados importados com sucesso!');navigate('dashboard');
        }catch{showToast('Erro ao ler o arquivo.','error');}
    };reader.readAsText(file);e.target.value='';
}

// ─── EXPORT CSV ───
function exportAthletesCSV() {
    const activeAthletes = athletes.filter(a => a.role !== 'professor');
    if (!activeAthletes.length) return showToast('Nenhum atleta para exportar', 'error');
    
    // Header
    let csv = 'Nome,Email,Telefone,Nascimento,VAM (min),VAM (km/h),Planilha Base,Notas\n';
    
    activeAthletes.forEach(a => {
        const g = groups.find(x => x.id == a.groupId);
        const plan = g ? `${g.category} - ${g.name}` : 'Sem planilha';
        const vam = a.testTime ? (180 / a.testTime).toFixed(2) : '';
        const notes = (a.notes || '').replace(/"/g, '""').replace(/\n/g, ' ');
        
        csv += `"${a.name}","${a.email || ''}","${a.phone || ''}","${a.dob || ''}","${a.testTime || ''}","${vam}","${plan}","${notes}"\n`;
    });
    
    const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Atletas_Superacao_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Planilha CSV gerada!');
}

// ═══════════════════════════════════════
//  CHAT / MESSAGES
// ═══════════════════════════════════════
let currentChatAthleteId = null;
let chatSubscription = null;
// ─── FLOATING CHAT ───
let _floatingChatSubscription = null;

function toggleFloatingChat() {
    const chat = $('floating-chat');
    const isVisible = chat.style.display === 'flex';
    chat.style.display = isVisible ? 'none' : 'flex';
    if (!isVisible) {
        $('chat-notif-count').style.display = 'none';
        $('chat-notif-count').textContent = '0';
        // Sempre busca do Supabase ao abrir para garantir lista atualizada
        loadChatAthletesDirectly();
    }
}

async function loadChatAthletesDirectly() {
    const list = $('floating-chat-users');
    if (!list) return;
    
    list.innerHTML = '<div style="padding:20px; text-align:center; font-size:11px; color:#666;"><div class="loader" style="width:20px;height:20px;margin:0 auto 8px;"></div>Carregando atletas...</div>';
    
    try {
        const ok = await ensureSession();
        if (!ok) return;

        const { data: profiles, error } = await dbClient
            .from('profiles')
            .select('id, name, email, role, avatar_url');
        
        if (error) throw error;
        
        if (!profiles || profiles.length === 0) {
            list.innerHTML = '<div style="padding:15px; text-align:center; font-size:11px; color:#666;">Nenhum perfil no banco.</div>';
            return;
        }

        // Mostra todos exceto professores
        const chatAthletes = profiles.filter(p => p.role !== 'professor');
        
        if (chatAthletes.length === 0) {
            list.innerHTML = '<div style="padding:15px; text-align:center; font-size:11px; color:#666;">Nenhum atleta encontrado.</div>';
            return;
        }
        
        list.innerHTML = chatAthletes.map(p => {
            const name = p.name || p.email || 'Atleta';
            const initial = name.charAt(0).toUpperCase();
            const isActive = currentChatAthleteId === p.id;
            const avatarHtml = p.avatar_url 
                ? `<img src="${p.avatar_url}" style="width:34px; height:34px; border-radius:50%; object-fit:cover;">`
                : `<div style="width:34px; height:34px; min-width:34px; background:#059669; color:white; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:14px;">${initial}</div>`;

            return `
                <div onclick="selectFloatingChatAthlete('${p.id}', '${name.replace(/'/g, "\\\'")}')" 
                     style="padding:10px 12px; border-bottom:1px solid #e2e8f0; cursor:pointer; display:flex; align-items:center; gap:10px; background:${isActive ? '#d1fae5' : 'white'}; transition:background 0.15s;"
                     onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='${isActive ? '#d1fae5' : 'white'}'">
                    <div style="width:34px; height:34px; min-width:34px; display:flex; align-items:center; justify-content:center;">
                        ${avatarHtml}
                    </div>
                    <span style="font-size:12px; font-weight:600; color:#1e293b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${name}</span>
                </div>
            `;
        }).join('');

    } catch (err) {
        console.error('Erro chat:', err);
        list.innerHTML = `<div style="padding:15px; text-align:center; font-size:11px; color:#dc2626;">Erro: ${err.message}</div>`;
    }
}

function expandChat() {
    const chat = $('floating-chat');
    chat.classList.toggle('expanded');
    
    const btn = $('btn-expand-chat');
    if (btn) {
        if (chat.classList.contains('expanded')) {
            btn.innerHTML = '<i class="ri-fullscreen-exit-line"></i> Minimizar';
        } else {
            btn.innerHTML = '<i class="ri-fullscreen-line"></i> Expandir';
        }
    }
    
    loadChatAthletesDirectly();
}

async function renderFloatingChatUsers() {
    loadChatAthletesDirectly();
}

async function selectFloatingChatAthlete(id, name) {
    currentChatAthleteId = id;
    $('floating-chat-header-name').textContent = `Conversando com ${name}`;
    
    // Marcar ativo na lista
    renderFloatingChatUsers();
    
    // Carregar mensagens
    loadFloatingMessages(id);
    
    // Iniciar realtime
    subscribeToFloatingChat(id);
}

async function loadFloatingMessages(athleteId) {
    const container = $('floating-chat-messages');
    if (!container) return;
    
    container.innerHTML = '<div style="display:flex;justify-content:center;padding:20px;"><div class="loader" style="width:24px;height:24px;"></div></div>';
    
    try {
        const ok = await ensureSession();
        if (!ok) return;

        console.log('Fetching messages for athlete:', athleteId);
        const { data, error } = await dbClient
            .from('messages')
            .select('*')
            .eq('athlete_id', athleteId)
            .order('created_at', { ascending: true });

        if (error) throw error;
        
        if (!data || data.length === 0) {
            container.innerHTML = '<div style="padding:20px; text-align:center; color:#666; font-size:12px;">Nenhuma mensagem encontrada. Comece a conversa!</div>';
            return;
        }

        renderFloatingMessages(data);
    } catch (err) {
        console.error('Erro ao carregar mensagens:', err);
        container.innerHTML = `<div style="padding:20px; text-align:center; color:#dc2626; font-size:12px;">Erro ao carregar mensagens: ${err.message}</div>`;
    }
}

function formatMessageDate(dateStr) {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return 'Hoje';
    if (d.toDateString() === yesterday.toDateString()) return 'Ontem';
    
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
}

function renderFloatingMessages(data) {
    const container = $('floating-chat-messages');
    if (!container) return;
    
    console.log('Renderizando mensagens:', data.length);
    
    const myId = window._profId || '';
    let lastDate = null;
    let html = '';

    data.forEach((m, idx) => {
        if (!m.created_at) return;
        
        const dateObj = new Date(m.created_at);
        const dateStr = dateObj.toLocaleDateString('pt-BR'); // Ex: 12/05/2026
        
        if (dateStr !== lastDate) {
            const label = formatMessageDate(m.created_at);
            html += `
                <div style="width:100%; display:flex; align-items:center; margin:20px 0 10px;">
                    <div style="flex:1; height:1px; background:#e2e8f0;"></div>
                    <span style="background:#e2e8f0; padding:4px 12px; border-radius:20px; font-size:11px; color:#475569; font-weight:800; margin:0 10px; white-space:nowrap;">
                        ${label}
                    </span>
                    <div style="flex:1; height:1px; background:#e2e8f0;"></div>
                </div>
            `;
            lastDate = dateStr;
        }
        
        const isMe = myId && m.sender_id === myId;
        const time = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        
        html += `
            <div style="padding:8px 12px; border-radius:12px; max-width:85%; font-size:13px; align-self:${isMe ? 'flex-end' : 'flex-start'}; background:${isMe ? '#10b981' : 'white'}; color:${isMe ? 'white' : '#1e293b'}; border:1px solid #e2e8f0; box-shadow:0 1px 2px rgba(0,0,0,0.05); margin-bottom:4px; display:flex; flex-direction:column;">
                <div style="word-break:break-word; line-height:1.4;">${m.content}</div>
                <div style="font-size:9px; opacity:0.7; text-align:right; margin-top:3px; font-weight:500;">${time}</div>
            </div>
        `;
    });

    container.innerHTML = html;
    container.scrollTop = container.scrollHeight;
}

function subscribeToFloatingChat(athleteId) {
    if (_floatingChatSubscription) dbClient.removeChannel(_floatingChatSubscription);

    _floatingChatSubscription = dbClient
        .channel(`chat:${athleteId}`)
        .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'messages',
            filter: `athlete_id=eq.${athleteId}`
        }, (payload) => {
            if (currentChatAthleteId === athleteId) {
                appendFloatingMessage(payload.new);
            }
        })
        .subscribe();
}

function appendFloatingMessage(msg) {
    const container = $('floating-chat-messages');
    if (!container) return;
    
    const dateObj = new Date(msg.created_at);
    const dateStr = dateObj.toDateString();
    
    // Verificar se o último elemento de data é diferente deste
    const dateLabels = container.querySelectorAll('span[style*="text-transform:uppercase"]');
    const lastDateLabel = dateLabels.length > 0 ? dateLabels[dateLabels.length - 1].textContent : '';
    const currentDayLabel = formatMessageDate(msg.created_at);
    
    if (currentDayLabel !== lastDateLabel) {
        const dateDiv = document.createElement('div');
        dateDiv.style.cssText = 'width:100%; display:flex; justify-content:center; margin:15px 0 10px; position:relative;';
        dateDiv.innerHTML = `<span style="background:#f1f5f9; padding:3px 12px; border-radius:12px; font-size:10px; color:#64748b; font-weight:700; text-transform:uppercase; border:1px solid #e2e8f0;">${currentDayLabel}</span>`;
        container.appendChild(dateDiv);
    }
    
    const myId = window._profId || '';
    const isMe = myId && msg.sender_id === myId;
    const time = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    const div = document.createElement('div');
    div.style.cssText = `padding:8px 12px; border-radius:12px; max-width:85%; font-size:13px; align-self:${isMe ? 'flex-end' : 'flex-start'}; background:${isMe ? '#10b981' : 'white'}; color:${isMe ? 'white' : '#1e293b'}; border:1px solid #e2e8f0; box-shadow:0 1px 2px rgba(0,0,0,0.05); margin-bottom:4px; display:flex; flex-direction:column;`;
    div.innerHTML = `<div style="word-break:break-word;">${msg.content}</div><div style="font-size:9px; opacity:0.6; text-align:right; margin-top:2px;">${time}</div>`;
    
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

async function sendFloatingMessage() {
    const input = $('floating-chat-input-text');
    const content = input.value.trim();
    if (!content || !currentChatAthleteId) return;

    // Garantir sessão válida antes de enviar
    const ok = await ensureSession();
    if (!ok) return;

    const myId = window._profId;
    if (!myId) return showToast('Sessão expirada. Recarregue a página.', 'error');

    // Limpar input imediatamente para UX responsiva
    input.value = '';

    const { error } = await dbClient
        .from('messages')
        .insert({
            athlete_id: currentChatAthleteId,
            sender_id: myId,
            content: content
        });

    if (error) {
        // Se ainda der JWT expired após refresh, redirecionar
        if (error.message && error.message.toLowerCase().includes('jwt expired')) {
            sessionStorage.removeItem('vdot_role');
            window.location.href = 'login.html?session_expired=true';
            return;
        }
        showToast('Erro ao enviar: ' + error.message, 'error');
    }
}

async function renderStaff() {
    const list = $('staff-list');
    list.innerHTML = '<tr><td colspan="3" style="text-align:center;padding:20px;"><div class="loader"></div></td></tr>';

    try {
        const { data, error } = await dbClient
            .from('profiles')
            .select('*')
            .eq('role', 'professor');

        if (error) throw error;

        if (!data || data.length === 0) {
            list.innerHTML = '<tr><td colspan="3" style="text-align:center;padding:20px;color:var(--text-muted);">Nenhum outro professor encontrado.</td></tr>';
            return;
        }

        list.innerHTML = data.map(p => `
            <tr>
                <td>
                    <div style="display:flex;align-items:center;gap:10px;">
                        <div class="user-avatar" style="width:32px;height:32px;font-size:12px;background:var(--primary);color:white;">${(p.name && p.name.trim() !== '') ? p.name.charAt(0).toUpperCase() : 'P'}</div>
                        <strong style="color:var(--text);">${p.name || 'Sem nome'}</strong>
                    </div>
                </td>
                <td style="color:var(--text-muted);">${p.email || 'Não informado'}</td>
                <td><span class="badge" style="background:#eff6ff;color:var(--primary);border:1px solid #bfdbfe;">Professor / Treinador</span></td>
            </tr>
        `).join('');
    } catch (err) {
        console.error('Erro ao carregar equipe:', err);
        list.innerHTML = '<tr><td colspan="3" style="text-align:center;padding:20px;color:var(--danger);">Erro ao carregar os dados da equipe.</td></tr>';
    }
}

function makeDraggable(el, handle) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    handle.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
        e = e || window.event;
        // Se clicar em um botão dentro do header, não arrasta
        if (e.target.tagName === 'BUTTON' || e.target.tagName === 'I') return;
        
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
        
        // Remove transform de centralização para permitir movimento livre
        el.style.transform = 'none';
        el.style.top = el.offsetTop + 'px';
        el.style.left = el.offsetLeft + 'px';
        el.style.margin = '0';
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        el.style.top = (el.offsetTop - pos2) + "px";
        el.style.left = (el.offsetLeft - pos1) + "px";
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const chat = $('floating-chat');
    const header = chat ? chat.querySelector('.floating-chat-header') : null;
    if (chat && header) makeDraggable(chat, header);
});

// ─── AUDIO RECORDING & TRANSCRIPTION LOGIC ───
let mediaRecorder;
let audioChunks = [];
let audioBlob;
let audioUrl;
let isRecording = false;
let recordTimer;
let recordSeconds = 0;
let recognition; // Speech recognition instance

async function toggleAudioRecording() {
    if (isRecording) {
        stopAudioRecording();
    } else {
        await startAudioRecording();
    }
}

async function startAudioRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        // Setup Speech Recognition
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            recognition = new SpeechRecognition();
            recognition.lang = 'pt-BR';
            recognition.interimResults = true;
            recognition.continuous = true;

            recognition.onresult = (event) => {
                let transcript = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    transcript += event.results[i][0].transcript;
                }
                const notesArea = $('group-notes');
                if (notesArea) {
                    const existing = notesArea.value.trim();
                    notesArea.value = existing ? existing + ' ' + transcript : transcript;
                    // Trigger character count if needed
                }
            };

            recognition.onerror = (err) => console.error('Speech Recognition Error:', err);
            recognition.start();
        }

        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = () => {
            audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
            audioUrl = URL.createObjectURL(audioBlob);
            $('audio-playback').style.display = 'flex';
            $('audio-mic-icon').style.color = '#388E3C';
            $('audio-record-status').textContent = 'Nota gravada com sucesso!';
            $('audio-record-btn').style.borderColor = '#388E3C';
        };

        mediaRecorder.start();
        isRecording = true;
        recordSeconds = 0;
        $('audio-record-status').textContent = 'Gravando...';
        $('audio-mic-icon').style.color = '#D32F2F';
        $('audio-record-btn').style.borderColor = '#D32F2F';
        $('audio-playback').style.display = 'none';

        recordTimer = setInterval(() => {
            recordSeconds++;
            $('audio-record-timer').textContent = `${recordSeconds}s / 15s`;
            if (recordSeconds >= 15) stopAudioRecording();
        }, 1000);

    } catch (err) {
        console.error('Erro ao acessar microfone:', err);
        showToast('Erro ao acessar microfone. Verifique as permissões.', 'error');
    }
}

function stopAudioRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        if (recognition) recognition.stop();
        isRecording = false;
        clearInterval(recordTimer);
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
}

function playRecordedAudio() {
    if (audioUrl) {
        const audio = new Audio(audioUrl);
        audio.play();
    }
}

function deleteRecordedAudio() {
    audioBlob = null;
    audioUrl = null;
    audioChunks = [];
    $('audio-playback').style.display = 'none';
    $('audio-record-status').textContent = 'Pressione para gravar uma nota.';
    $('audio-record-timer').textContent = 'Máx.: 15 segundos.';
    $('audio-mic-icon').style.color = '#666';
    $('audio-record-btn').style.borderColor = '#ccc';
}

async function renderStravaFeed(force = false) {
    const list = $('strava-global-list');
    const loading = $('strava-global-loading');
    
    if (!list || !loading) return;
    
    // Se não tivermos atletas carregados ainda, tenta carregar primeiro
    if (athletes.length === 0) {
        await syncAthletesFromSupabase();
    }
    
    // Se não for forçado e já tivermos dados, apenas renderiza o que temos
    if (!force && _currentStravaActivities.length > 0) {
        list.innerHTML = _currentStravaActivities.map(act => renderStravaActivityCard(act)).join('');
        // Re-inicializar mapas
        _currentStravaActivities.forEach(act => {
            if (act.polyline) initActivityMap(act.strava_id, act.polyline);
        });
        return;
    }

    list.innerHTML = '';
    loading.style.display = 'block';
    
    try {
        let myId = window._profId;
        
        // Se ainda não temos o ID do professor, tenta buscar da sessão ativamente
        if (!myId && typeof dbClient !== 'undefined') {
            const { data } = await dbClient.auth.getSession();
            if (data?.session?.user?.id) {
                myId = data.session.user.id;
                window._profId = myId;
            }
        }

        const response = await fetchWithTimeout(`/api/community/feed?userId=${myId || ''}&limit=50&_t=${Date.now()}`, { timeout: 15000 });
        
        if (!response.ok) throw new Error('Erro ao buscar feed da comunidade');
        
        const allActivities = await response.json();
        _currentStravaActivities = allActivities;
        
        loading.style.display = 'none';
        
        if (allActivities.length === 0) {
            list.innerHTML = `
                <div style="padding:60px; text-align:center; color:var(--text-muted); background:var(--panel); border:2px dashed var(--border); border-radius:16px;">
                    <i class="ri-pulse-line" style="font-size:48px; display:block; margin-bottom:12px; opacity:0.3;"></i>
                    <strong>Nenhuma atividade encontrada</strong>
                    <p style="font-size:13px; margin-top:4px;">Seus alunos ainda não sincronizaram treinos hoje.</p>
                </div>
            `;
            return;
        }
        
        list.innerHTML = allActivities.map(act => renderStravaActivityCard(act)).join('');

        // Inicializar os mapas após renderizar o HTML
        allActivities.forEach(act => {
            if (act.polyline) {
                initActivityMap(act.strava_id, act.polyline);
            }
        });
        
    } catch (err) {
        console.error('Erro no feed global:', err);
        loading.style.display = 'none';
        showToast('Erro ao sincronizar feed global', 'error');
    }
}

async function renderGarminFeed(force = false) {
    const list = $('garmin-global-list');
    const loading = $('garmin-global-loading');
    
    if (!list || !loading) return;
    
    if (athletes.length === 0) {
        await syncAthletesFromSupabase();
    }

    if (!force && _currentGarminActivities.length > 0) {
        list.innerHTML = _currentGarminActivities.map(act => renderGarminActivityCard(act)).join('');
        return;
    }

    list.innerHTML = '';
    loading.style.display = 'block';

    try {
        const athletesWithGarmin = athletes.filter(a => a.supabaseId);
        if (athletesWithGarmin.length === 0) {
            loading.style.display = 'none';
            list.innerHTML = `
                <div style="padding:48px; text-align:center; color:var(--text-muted); background: var(--panel); border-radius: 16px; border: 1px dashed var(--border);">
                    <i class="ri-group-line" style="font-size:48px; display:block; margin-bottom:12px; opacity:0.3;"></i>
                    <strong>Nenhum atleta vinculado</strong>
                    <p style="font-size:13px; margin-top:4px;">Seus alunos precisam acessar o app e vincular a conta Garmin.</p>
                </div>
            `;
            return;
        }

        let allActivities = [];
        let errorAthletes = [];
        let completed = 0;
        const total = athletesWithGarmin.length;

        const updateProgress = () => {
            loading.innerHTML = `
                <i class="ri-loader-4-line ri-spin" style="font-size:40px; display:block; margin-bottom:12px; color: #000;"></i>
                Sincronizando Garmin Connect (${completed}/${total} atletas)...
            `;
        };
        updateProgress();

        // Processar em lotes
        const batchSize = 4;
        for (let i = 0; i < athletesWithGarmin.length; i += batchSize) {
            const batch = athletesWithGarmin.slice(i, i + batchSize);
            const batchPromises = batch.map(async (athlete) => {
                try {
                    const res = await fetchWithTimeout(`/api/garmin/activities?userId=${athlete.supabaseId}&limit=10&_t=${Date.now()}`, { timeout: 15000 });
                    completed++;
                    updateProgress();
                    if (!res.ok) {
                        errorAthletes.push(athlete.name);
                        return [];
                    }
                    const acts = await res.json();
                    if (!Array.isArray(acts)) return [];
                    return acts.map(a => ({ ...a, athleteName: athlete.name, athleteId: athlete.supabaseId }));
                } catch (e) {
                    completed++;
                    updateProgress();
                    console.warn(`Erro/Timeout Garmin ${athlete.name}`);
                    return [];
                }
            });
            const results = await Promise.all(batchPromises);
            allActivities = allActivities.concat(results.flat());
        }

        allActivities.sort((a, b) => new Date(b.date) - new Date(a.date));
        _currentGarminActivities = allActivities;

        loading.style.display = 'none';
        loading.innerHTML = `
            <i class="ri-loader-4-line ri-spin" style="font-size:40px; display:block; margin-bottom:12px; color: #000;"></i>
            Sincronizando atividades do Garmin Connect...
        `;

        let errorHtml = '';
        if (errorAthletes.length > 0) {
            errorHtml = `
                <div style="padding: 12px; background: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; color: #92400e; font-size: 13px; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
                    <i class="ri-error-warning-line"></i>
                    <span>Atenção: Conexão expirada para: <strong>${errorAthletes.join(', ')}</strong>. Peça para eles reconectarem o Garmin no App.</span>
                </div>
            `;
        }

        if (allActivities.length === 0) {
            list.innerHTML = errorHtml + `
                <div style="padding:48px; text-align:center; color:var(--text-muted); background: var(--panel); border-radius: 16px; border: 1px dashed var(--border);">
                    <i class="ri-compass-discover-line" style="font-size:48px; display:block; margin-bottom:12px; opacity:0.3;"></i>
                    <strong>Nenhuma atividade encontrada</strong>
                    <p style="font-size:13px; margin-top:4px;">Seus alunos ainda não sincronizaram treinos Garmin hoje ou a conexão expirou.</p>
                </div>
            `;
            return;
        }
        
        list.innerHTML = errorHtml + allActivities.map(act => renderGarminActivityCard(act)).join('');
        
    } catch (err) {
        console.error('Erro no feed Garmin:', err);
        loading.style.display = 'none';
        showToast('Erro ao sincronizar feed Garmin', 'error');
    }
}

function formatFeedDate(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffInMs = now - date;
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    if (diffInDays === 0) {
        const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
        if (diffInHours === 0) return 'Agora mesmo';
        return `Hoje às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    }
    if (diffInDays === 1) return `Ontem às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
}

function renderStravaActivityCard(act) {
    const dateLabel = formatFeedDate(act.date);
    const athleteName = act.athlete_name || act.athleteName || (act.profiles && act.profiles.name) || 'Atleta';
    const avatarUrl = act.athlete_avatar || (act.profiles && act.profiles.avatar_url);
    const initial = athleteName.charAt(0).toUpperCase();
    
    const likesCount = act.likesCount || 0;
    const userLiked = act.userLiked || false;
    const comments = act.comments || [];
    
    return `
        <div class="stat-card" style="padding: 20px; background: var(--panel); border: 1px solid var(--border); border-radius: 16px; margin-bottom: 0; box-shadow: var(--shadow);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    ${avatarUrl ? 
                        `<img src="${avatarUrl}" style="width:40px; height:40px; border-radius:10px; object-fit:cover; border:1px solid var(--border);">` :
                        `<div style="width: 40px; height: 40px; border-radius: 10px; background: var(--primary)10; color: var(--primary); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 16px; border: 1px solid var(--primary)20;">
                            ${initial}
                        </div>`
                    }
                    <div>
                        <div style="font-size: 15px; font-weight: 800; color: var(--text);">${athleteName}</div>
                        <div style="font-size: 12px; color: var(--text-muted); font-weight: 500;">${dateLabel}</div>
                    </div>
                </div>

            </div>
            
            <h4 style="font-size: 18px; font-weight: 900; margin-bottom: 16px; color: var(--text); letter-spacing: -0.5px;">${act.title || 'Atividade'}</h4>
            
            ${act.polyline ? `
            <div style="position: relative; margin-bottom: 16px;">
                <div id="map-${act.strava_id}" style="height: 180px; width: 100%; border-radius: 12px; background: var(--bg); border: 1px solid var(--border); overflow: hidden; position: relative; z-index: 1;"></div>
                <button onclick="openActivityDetail('${act.strava_id}')" style="position: absolute; top: 10px; right: 10px; z-index: 2; background: white; border: none; width: 32px; height: 32px; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--text);">
                    <i class="ri-fullscreen-line"></i>
                </button>
            </div>
            ` : ''}

            <div class="strava-metrics-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 12px; padding: 16px; background: var(--bg); border-radius: 12px; border: 1px solid var(--border);">
                <div>
                    <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.5px;">Distância</div>
                    <div style="font-size: 18px; font-weight: 900; color: #fc4c02;">${act.metrics?.distance || '--'}</div>
                </div>
                <div>
                    <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.5px;">Pace</div>
                    <div style="font-size: 18px; font-weight: 900;">${act.metrics?.pace || '--'}</div>
                </div>
                <div>
                    <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.5px;">Tempo</div>
                    <div style="font-size: 18px; font-weight: 900;">${act.metrics?.duration || '--'}</div>
                </div>
            </div>

            <!-- Interações da Comunidade -->
            <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border); display: flex; flex-direction: column; gap: 12px;">
                <div style="display: flex; align-items: center; gap: 16px;">
                    <button id="like-btn-${act.strava_id}" onclick="toggleActivityLike('${act.strava_id}')" style="display: flex; align-items: center; gap: 6px; background: none; border: none; cursor: pointer; color: ${userLiked ? '#ef4444' : 'var(--text-muted)'}; transition: transform 0.2s; padding: 0;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
                        <i id="like-icon-${act.strava_id}" class="${userLiked ? 'ri-heart-fill' : 'ri-heart-line'}" style="font-size: 20px;"></i>
                        <span id="like-count-${act.strava_id}" style="font-size: 13px; font-weight: 700;">${likesCount}</span>
                    </button>
                    <button onclick="toggleActivityComments('${act.strava_id}')" style="display: flex; align-items: center; gap: 6px; background: none; border: none; cursor: pointer; color: var(--text-muted); padding: 0;">
                        <i class="ri-chat-3-line" style="font-size: 20px;"></i>
                        <span id="comment-count-${act.strava_id}" style="font-size: 13px; font-weight: 700;">${comments.length}</span>
                    </button>
                    
                    <div style="flex: 1;"></div>
                    
                    <button onclick="openActivityDetail('${act.strava_id}')" style="display: inline-flex; align-items: center; gap: 6px; background: #fc4c02; color: #fff; padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 700; border: none; cursor: pointer;">
                        <i class="ri-line-chart-line"></i> Analisar
                    </button>
                </div>

                <!-- Lista de Comentários (Oculta por padrão) -->
                <div id="comments-section-${act.strava_id}" style="display: none; flex-direction: column; gap: 10px; background: var(--bg); padding: 12px; border-radius: 12px;">
                    <div id="comments-list-${act.strava_id}" style="display: flex; flex-direction: column; gap: 8px; max-height: 200px; overflow-y: auto;">
                        ${comments.map(c => `
                            <div style="display: flex; gap: 8px; align-items: flex-start;">
                                <div style="width: 24px; height: 24px; min-width: 24px; border-radius: 6px; background: var(--primary); color: white; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 800;">
                                    ${c.user_name ? c.user_name.charAt(0).toUpperCase() : 'A'}
                                </div>
                                <div style="flex: 1; background: var(--panel); padding: 6px 10px; border-radius: 8px; font-size: 12px;">
                                    <div style="font-weight: 800; color: var(--text); margin-bottom: 2px;">${c.user_name}</div>
                                    <div style="color: var(--text-muted); line-height: 1.4;">${c.content}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div style="display: flex; gap: 8px; margin-top: 4px;">
                        <input type="text" id="comment-input-${act.strava_id}" placeholder="Escreva um comentário..." style="flex: 1; background: var(--panel); border: 1px solid var(--border); border-radius: 8px; padding: 8px 12px; font-size: 12px; outline: none;" onkeydown="if(event.key==='Enter') sendActivityComment('${act.strava_id}')">
                        <button onclick="sendActivityComment('${act.strava_id}')" style="background: var(--primary); color: white; border: none; width: 34px; height: 34px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                            <i class="ri-send-plane-fill"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

async function toggleActivityLike(activityId) {
    let myId = window._profId;
    
    if (!myId && typeof dbClient !== 'undefined') {
        const { data } = await dbClient.auth.getSession();
        myId = data?.session?.user?.id;
        if (myId) window._profId = myId;
    }

    if (!myId) return showToast('Sessão expirada. Recarregue.', 'error');
    
    const act = _currentStravaActivities.find(a => (a.strava_id || a.id) == activityId);
    if (!act) return;

    // Optimistic Update local state
    const prevLiked = act.userLiked;
    act.userLiked = !prevLiked;
    act.likesCount = prevLiked ? Math.max(0, act.likesCount - 1) : act.likesCount + 1;
    
    // Targeted DOM Update to prevent full rerender (and map flickering)
    updateActivitySocialUI(activityId, act);

    try {
        const res = await fetch('/api/community/likes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                activityId: String(activityId), 
                userId: myId, 
                userName: 'Professor'
            })
        });
        
        if (!res.ok) throw new Error();
    } catch (err) {
        // Rollback
        act.userLiked = prevLiked;
        act.likesCount = prevLiked ? act.likesCount : Math.max(0, act.likesCount - 1);
        updateActivitySocialUI(activityId, act);
        showToast('Erro ao processar like', 'error');
    }
}

function updateActivitySocialUI(activityId, act) {
    const likeBtn = $(`like-btn-${activityId}`);
    const likeIcon = $(`like-icon-${activityId}`);
    const likeCount = $(`like-count-${activityId}`);
    const commentCount = $(`comment-count-${activityId}`);

    if (likeBtn) likeBtn.style.color = act.userLiked ? '#ef4444' : 'var(--text-muted)';
    if (likeIcon) likeIcon.className = act.userLiked ? 'ri-heart-fill' : 'ri-heart-line';
    if (likeCount) likeCount.textContent = act.likesCount || 0;
    if (commentCount) commentCount.textContent = (act.comments || []).length;
}

function toggleActivityComments(activityId) {
    const el = $(`comments-section-${activityId}`);
    if (!el) return;
    el.style.display = el.style.display === 'none' ? 'flex' : 'none';
}

async function sendActivityComment(activityId) {
    const input = $(`comment-input-${activityId}`);
    const content = input.value.trim();
    if (!content) return;

    const myId = window._profId;
    if (!myId) return showToast('Sessão expirada. Recarregue.', 'error');

    input.value = '';
    input.disabled = true;

    try {
        const res = await fetch('/api/community/comments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                activityId: String(activityId),
                userId: myId,
                userName: 'Professor',
                content: content
            })
        });
        
        if (!res.ok) throw new Error();
        
        const newComment = await res.json();
        
        // Update local state
        const act = _currentStravaActivities.find(a => (a.strava_id || a.id) == activityId);
        if (act) {
            if (!act.comments) act.comments = [];
            act.comments.push(newComment);
            
            // Targeted DOM Update
            const list = $(`comments-list-${activityId}`);
            if (list) {
                const commentHtml = `
                    <div style="display: flex; gap: 8px; align-items: flex-start;">
                        <div style="width: 24px; height: 24px; min-width: 24px; border-radius: 6px; background: var(--primary); color: white; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 800;">
                            P
                        </div>
                        <div style="flex: 1; background: var(--panel); padding: 6px 10px; border-radius: 8px; font-size: 12px;">
                            <div style="font-weight: 800; color: var(--text); margin-bottom: 2px;">Professor</div>
                            <div style="color: var(--text-muted); line-height: 1.4;">${newComment.content}</div>
                        </div>
                    </div>
                `;
                list.insertAdjacentHTML('beforeend', commentHtml);
                list.scrollTop = list.scrollHeight;
            }
            updateActivitySocialUI(activityId, act);
        }
        
        input.disabled = false;
        $(`comments-section-${activityId}`).style.display = 'flex';
        
    } catch (err) {
        showToast('Erro ao enviar comentário', 'error');
        input.disabled = false;
        input.value = content;
    }
}

function renderGarminActivityCard(act) {
    const dateLabel = formatFeedDate(act.date);
    const athleteName = act.athlete_name || act.athleteName || 'Atleta';
    const avatarUrl = act.athlete_avatar;
    const initial = athleteName.charAt(0).toUpperCase();
    
    // As atividades do Garmin no feed global podem vir do cache (community) ou direto da API
    // Se vierem do community, terão strava_id (que é o ID da atividade no cache)
    const activityId = act.strava_id || act.id;
    const likesCount = act.likesCount || 0;
    const userLiked = act.userLiked || false;
    const comments = act.comments || [];

    return `
        <div class="stat-card" style="padding: 20px; background: var(--panel); border: 1px solid var(--border); border-radius: 16px; margin-bottom: 0; box-shadow: var(--shadow);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    ${avatarUrl ? 
                        `<img src="${avatarUrl}" style="width:40px; height:40px; border-radius:10px; object-fit:cover; border:1px solid var(--border);">` :
                        `<div style="width: 40px; height: 40px; border-radius: 10px; background: var(--primary)10; color: var(--primary); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 16px; border: 1px solid var(--primary)20;">
                            ${initial}
                        </div>`
                    }
                    <div>
                        <div style="font-size: 15px; font-weight: 800; color: var(--text);">${athleteName}</div>
                        <div style="font-size: 12px; color: var(--text-muted); font-weight: 500;">${dateLabel}</div>
                    </div>
                </div>

            </div>
            
            <h4 style="font-size: 18px; font-weight: 900; margin-bottom: 16px; color: var(--text); letter-spacing: -0.5px;">${act.name || act.title || 'Atividade Garmin'}</h4>
            
            <div class="strava-metrics-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 12px; padding: 16px; background: var(--bg); border-radius: 12px; border: 1px solid var(--border);">

                <div>
                    <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.5px;">Distância</div>
                    <div style="font-size: 18px; font-weight: 900; color: #000;">${act.distance || '--'} ${act.distance ? 'km' : ''}</div>
                </div>
                <div>
                    <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.5px;">Pace</div>
                    <div style="font-size: 18px; font-weight: 900;">${act.pace || '--'}</div>
                </div>
                <div>
                    <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.5px;">Tempo</div>
                    <div style="font-size: 18px; font-weight: 900;">${act.duration || '--'} ${act.duration ? 'min' : ''}</div>
                </div>
            </div>
            
            <!-- Interações da Comunidade -->
            <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border); display: flex; flex-direction: column; gap: 12px;">
                <div style="display: flex; align-items: center; gap: 16px;">
                    <button id="like-btn-${activityId}" onclick="toggleActivityLike('${activityId}')" style="display: flex; align-items: center; gap: 6px; background: none; border: none; cursor: pointer; color: ${userLiked ? '#ef4444' : 'var(--text-muted)'}; transition: transform 0.2s; padding: 0;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
                        <i id="like-icon-${activityId}" class="${userLiked ? 'ri-heart-fill' : 'ri-heart-line'}" style="font-size: 20px;"></i>
                        <span id="like-count-${activityId}" style="font-size: 13px; font-weight: 700;">${likesCount}</span>
                    </button>
                    <button onclick="toggleActivityComments('${activityId}')" style="display: flex; align-items: center; gap: 6px; background: none; border: none; cursor: pointer; color: var(--text-muted); padding: 0;">
                        <i class="ri-chat-3-line" style="font-size: 20px;"></i>
                        <span id="comment-count-${activityId}" style="font-size: 13px; font-weight: 700;">${comments.length}</span>
                    </button>
                    
                    <div style="flex: 1;"></div>
                    
                    <button onclick="openGarminDetails('${act.athlete_id || act.athleteId}', '${act.id}')" style="background: #000; color: #fff; border: none; padding: 6px 12px; border-radius: 8px; font-weight: 700; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 6px;">
                        <i class="ri-compass-discover-line"></i> Dinâmicas
                    </button>
                </div>

                <!-- Lista de Comentários -->
                <div id="comments-section-${activityId}" style="display: none; flex-direction: column; gap: 10px; background: var(--bg); padding: 12px; border-radius: 12px;">
                    <div id="comments-list-${activityId}" style="display: flex; flex-direction: column; gap: 8px; max-height: 200px; overflow-y: auto;">
                        ${comments.map(c => `
                            <div style="display: flex; gap: 8px; align-items: flex-start;">
                                <div style="width: 24px; height: 24px; min-width: 24px; border-radius: 6px; background: var(--primary); color: white; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 800;">
                                    ${c.user_name ? c.user_name.charAt(0).toUpperCase() : 'A'}
                                </div>
                                <div style="flex: 1; background: var(--panel); padding: 6px 10px; border-radius: 8px; font-size: 12px;">
                                    <div style="font-weight: 800; color: var(--text); margin-bottom: 2px;">${c.user_name}</div>
                                    <div style="color: var(--text-muted); line-height: 1.4;">${c.content}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div style="display: flex; gap: 8px; margin-top: 4px;">
                        <input type="text" id="comment-input-${activityId}" placeholder="Escreva um comentário..." style="flex: 1; background: var(--panel); border: 1px solid var(--border); border-radius: 8px; padding: 8px 12px; font-size: 12px; outline: none;" onkeydown="if(event.key==='Enter') sendActivityComment('${activityId}')">
                        <button onclick="sendActivityComment('${activityId}')" style="background: var(--primary); color: white; border: none; width: 34px; height: 34px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                            <i class="ri-send-plane-fill"></i>
                        </button>
                    </div>
                </div>
            </div>
            
            <div style="margin-top: 16px; text-align: right; display: flex; gap: 8px; justify-content: flex-end;">
                <a href="https://connect.garmin.com/modern/activity/${act.id}" target="_blank" style="display: inline-flex; align-items: center; gap: 6px; background: #00000015; color: #000; padding: 6px 12px; border-radius: 8px; text-decoration: none; font-size: 12px; font-weight: 700; border: 1px solid #00000030; transition: all 0.2s;">
                    <i class="ri-external-link-line"></i> Garmin
                </a>
            </div>
        </div>
    `;
}

function checkDOMIntegrity() {
    const main = document.querySelector('.main-content');
    if (!main) return console.error('Main content container NOT FOUND!');
    
    ['dashboard', 'groups', 'athletes', 'chat', 'staff', 'strava-feed', 'calculator'].forEach(view => {
        const el = document.getElementById(`view-${view}`);
        if (el) {
            const isInside = main.contains(el);
            console.log(`View [${view}]: ${isInside ? '✅ CORRETO (Dentro do main)' : '❌ ERRO (Fora do main!)'}`);
        } else {
            console.warn(`View [${view}]: Não encontrada no DOM.`);
        }
    });
}
window.addEventListener('load', checkDOMIntegrity);

let stravaChartInstances = [];

async function openStravaGraph(athleteId, stravaId) {
    if (!stravaId || stravaId === 'undefined') {
        showToast('Atividade não possui ID válido', 'error');
        return;
    }

    $('modal-strava-graph').classList.add('show');
    $('modal-strava-graph').style.display = ''; // Limpar estilo inline para que a classe .show funcione
    $('strava-graph-loading').style.display = 'block';
    $('strava-graph-error').style.display = 'none';
    $('strava-graph-container').style.display = 'none';

    try {
        const response = await fetch(`/api/strava/activity/${stravaId}/streams?userId=${athleteId}`);
        if (!response.ok) throw new Error('Não foi possível carregar os dados de telemetria do Strava.');
        
        const rawStreams = await response.json();
        
        // Strava returns an object if key_by_type=true, or an array otherwise.
        const streams = {};
        if (Array.isArray(rawStreams)) {
            rawStreams.forEach(s => { streams[s.type] = s.data; });
        } else if (rawStreams && typeof rawStreams === 'object') {
            for (const key in rawStreams) {
                if (rawStreams[key] && rawStreams[key].data) {
                    streams[key] = rawStreams[key].data;
                }
            }
        }

        if (!streams.distance || streams.distance.length === 0) {
            throw new Error('A atividade não possui dados de GPS suficientes.');
        }

        const distanceKm = streams.distance.map(d => (d / 1000).toFixed(2));
        
        const datasets = [];
        
        // 1. Altitude (Área preenchida no fundo)
        if (streams.altitude) {
            datasets.push({
                label: 'Elevação (m)',
                data: streams.altitude,
                borderColor: '#8e8e93',
                backgroundColor: 'rgba(142, 142, 147, 0.2)',
                fill: true,
                yAxisID: 'yElevation',
                pointRadius: 0,
                borderWidth: 1,
                tension: 0.4
            });
        }
        
        // 2. Heart Rate (Linha vermelha)
        if (streams.heartrate) {
            datasets.push({
                label: 'FC (bpm)',
                data: streams.heartrate,
                borderColor: '#ff2d55',
                backgroundColor: 'transparent',
                yAxisID: 'yHR',
                pointRadius: 0,
                pointHoverRadius: 5,
                borderWidth: 2.5,
                tension: 0.3
            });
        }

        // 3. Pace/Velocity (Linha azul)
        if (streams.velocity_smooth) {
            const paceData = streams.velocity_smooth.map(v => {
                if (v <= 0) return null;
                const pace = (1000 / v) / 60;
                return pace > 15 ? null : pace; // Ignorar picos irreais de lentidão
            });
            
            datasets.push({
                label: 'Ritmo (Pace min/km)',
                data: paceData,
                borderColor: '#007aff',
                backgroundColor: 'transparent',
                yAxisID: 'yPace',
                pointRadius: 0,
                pointHoverRadius: 5,
                borderWidth: 2.5,
                tension: 0.3
            });
        }
        
        // 4. Cadence (Linha verde)
        if (streams.cadence) {
            // Strava retorna cadência para uma perna, multiplicar por 2 para passo (spm) em corrida
            const spmData = streams.cadence.map(c => c * 2);
            datasets.push({
                label: 'Cadência (spm)',
                data: spmData,
                borderColor: '#34c759',
                backgroundColor: 'transparent',
                yAxisID: 'yCadence',
                pointRadius: 0,
                pointHoverRadius: 5,
                borderWidth: 2,
                tension: 0.3,
                hidden: false // Agora visível por padrão pois temos espaço empilhado
            });
        }

        $('strava-graph-loading').style.display = 'none';
        $('strava-graph-container').style.display = 'block';

        // Destruir instâncias anteriores
        stravaChartInstances.forEach(chart => chart.destroy());
        stravaChartInstances = [];

        // Plugin para Sincronização e Linha Vertical (Crosshair)
        const syncPlugin = {
            id: 'syncPlugin',
            afterDraw: (chart) => {
                if (chart.tooltip?._active?.length) {
                    const x = chart.tooltip._active[0].element.x;
                    const yAxis = chart.scales.y;
                    const ctx = chart.ctx;
                    ctx.save();
                    ctx.beginPath();
                    ctx.moveTo(x, chart.scales.y.top);
                    ctx.lineTo(x, chart.scales.y.bottom);
                    ctx.lineWidth = 1;
                    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
                    ctx.setLineDash([5, 5]);
                    ctx.stroke();
                    ctx.restore();
                }
            }
        };

        const commonOptions = {
            responsive: true,
            maintainAspectRatio: false,
            aspectRatio: 2, // Tenta manter uma proporção mais agradável
            interaction: { mode: 'index', intersect: false },
            onHover: (event, chartElement, chart) => {
                // Sincronizar hover entre todos os gráficos
                const charts = stravaChartInstances;
                if (!charts || charts.length <= 1) return;
                
                const activePoint = chart.getElementsAtEventForMode(event, 'index', { intersect: false }, true);
                if (activePoint.length > 0) {
                    const index = activePoint[0].index;
                    charts.forEach(c => {
                        if (c !== chart) {
                            c.setActiveElements([{ datasetIndex: 0, index: index }]);
                            c.tooltip.setActiveElements([{ datasetIndex: 0, index: index }], { x: 0, y: 0 });
                            c.render();
                        }
                    });
                }
            },
            plugins: {
                legend: { 
                    position: 'top', 
                    align: 'end',
                    labels: { 
                        boxWidth: 6, 
                        usePointStyle: true,
                        pointStyle: 'circle',
                        font: { size: 11, weight: '700', family: "'Inter', sans-serif" },
                        color: '#94a3b8'
                    } 
                },
                tooltip: {
                    enabled: true,
                    backgroundColor: 'rgba(255, 255, 255, 0.98)',
                    titleColor: '#1e293b',
                    bodyColor: '#475569',
                    borderColor: 'rgba(0,0,0,0.06)',
                    borderWidth: 1,
                    padding: 10,
                    cornerRadius: 8,
                    displayColors: false,
                    titleFont: { size: 13, weight: '800', family: "'Inter', sans-serif" },
                    bodyFont: { size: 12, weight: '600', family: "'Inter', sans-serif" },
                    shadowBlur: 10,
                    shadowColor: 'rgba(0,0,0,0.1)',
                    callbacks: {
                        title: (context) => `Km ${context[0].label}`,
                        label: (context) => {
                            const val = context.parsed.y;
                            const label = context.dataset.label;
                            if (label.includes('Ritmo')) {
                                const m = Math.floor(val);
                                const s = Math.round((val - m) * 60);
                                return `Ritmo: ${m}:${s.toString().padStart(2, '0')} min/km`;
                            }
                            if (label.includes('FC')) return `FC: ${Math.round(val)} bpm`;
                            if (label.includes('Cadência')) return `Cadência: ${Math.round(val)} spm`;
                            if (label.includes('Elevação')) return `Elevação: ${Math.round(val)}m`;
                            return `${label}: ${val}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: { display: false },
                    ticks: { 
                        maxTicksLimit: 10,
                        font: { size: 10, weight: '600' },
                        color: '#94a3b8'
                    },
                    grid: { display: false }
                },
                y: {
                    beginAtZero: false,
                    grid: { color: 'rgba(0,0,0,0.03)', drawBorder: false },
                    ticks: { 
                        font: { size: 10, weight: '700' },
                        color: '#64748b',
                        padding: 8
                    }
                }
            }
        };

        // 1. Gráfico de Pace
        if (streams.velocity_smooth) {
            const paceData = streams.velocity_smooth.map(v => {
                if (v <= 0) return null;
                const pace = (1000 / v) / 60;
                return pace > 15 ? null : pace;
            });
            
            const ctx = document.getElementById('chartPace').getContext('2d');
            const chart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: distanceKm,
                    datasets: [{
                        label: 'Ritmo (Pace min/km)',
                        data: paceData,
                        borderColor: '#007aff',
                        backgroundColor: 'rgba(0, 122, 255, 0.08)',
                        fill: true,
                        pointRadius: 0,
                        borderWidth: 2.5,
                        tension: 0.4,
                        segment: {
                            borderColor: ctx => {
                                const paceVal = ctx.p1.parsed.y;
                                const athlete = athletes.find(a => a.supabaseId === athleteId);
                                if (!athlete || !athlete.testTime || !paceVal) return '#007aff';
                                
                                const speedKmh = 60 / paceVal;
                                const vamKmh = 180 / athlete.testTime;
                                const pctVam = (speedKmh / vamKmh) * 100;
                                
                                if (pctVam < 65) return '#94a3b8'; // Z1
                                if (pctVam < 75) return '#3b82f6'; // Z2
                                if (pctVam < 85) return '#10b981'; // Z3
                                if (pctVam < 95) return '#f59e0b'; // Z4
                                return '#ef4444'; // Z5
                            }
                        }
                    }]
                },
                plugins: [syncPlugin],
                options: {
                    ...commonOptions,
                    scales: {
                        ...commonOptions.scales,
                        y: {
                            ...commonOptions.scales.y,
                            reverse: true,
                            suggestedMin: 3.5,
                            suggestedMax: 8,
                            ticks: {
                                ...commonOptions.scales.y.ticks,
                                callback: value => {
                                    if (value <= 0) return '';
                                    const m = Math.floor(value);
                                    const s = Math.round((value - m) * 60);
                                    return `${m}:${s.toString().padStart(2, '0')}`;
                                }
                            }
                        }
                    }
                }
            });
            stravaChartInstances.push(chart);
        }

        // 2. Gráfico de Frequência Cardíaca
        if (streams.heartrate) {
            const hrMax = Math.max(...streams.heartrate);
            const ctx = document.getElementById('chartHR').getContext('2d');
            const chart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: distanceKm,
                    datasets: [{
                        label: 'FC (bpm)',
                        data: streams.heartrate,
                        borderColor: '#ff2d55',
                        backgroundColor: 'rgba(255, 45, 85, 0.05)',
                        fill: true,
                        pointRadius: 0,
                        borderWidth: 2.5,
                        tension: 0.4,
                        segment: {
                            borderColor: ctx => {
                                const val = ctx.p1.parsed.y;
                                const athlete = athletes.find(a => a.supabaseId === athleteId);
                                if (!athlete) return '#ff2d55';
                                
                                const zones = calculateHRZones(athlete);
                                
                                if (val < zones.z1) return '#94a3b8'; // Z1 (Cinza)
                                if (val < zones.z2) return '#3b82f6'; // Z2 (Azul)
                                if (val < zones.z3) return '#10b981'; // Z3 (Verde)
                                if (val < zones.z4) return '#f59e0b'; // Z4 (Amarelo/Laranja)
                                return '#ef4444'; // Z5 (Vermelho)
                            }
                        }
                    }]
                },
                plugins: [syncPlugin],
                options: {
                    ...commonOptions,
                    scales: {
                        ...commonOptions.scales,
                        y: {
                            ...commonOptions.scales.y,
                            suggestedMin: 80,
                            suggestedMax: hrMax > 175 ? 200 : (hrMax > 155 ? 180 : 160)
                        }
                    }
                }
            });
            stravaChartInstances.push(chart);
        }

        // 3. Gráfico de Cadência
        if (streams.cadence) {
            const spmData = streams.cadence.map(c => c * 2);
            const ctx = document.getElementById('chartCadence').getContext('2d');
            const chart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: distanceKm,
                    datasets: [{
                        label: 'Cadência (spm)',
                        data: spmData,
                        borderColor: '#34c759',
                        backgroundColor: 'rgba(52, 199, 89, 0.08)',
                        fill: true,
                        pointRadius: 0,
                        borderWidth: 2.5,
                        tension: 0.4
                    }]
                },
                plugins: [syncPlugin],
                options: {
                    ...commonOptions,
                    scales: {
                        ...commonOptions.scales,
                        y: {
                            ...commonOptions.scales.y
                        }
                    }
                }
            });
            stravaChartInstances.push(chart);
        }

        // 4. Gráfico de Elevação
        if (streams.altitude) {
            const ctx = document.getElementById('chartElevation').getContext('2d');
            const chart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: distanceKm,
                    datasets: [{
                        label: 'Elevação (m)',
                        data: streams.altitude,
                        borderColor: '#64748b',
                        backgroundColor: 'rgba(100, 116, 139, 0.12)',
                        fill: true,
                        pointRadius: 0,
                        borderWidth: 1,
                        tension: 0.4
                    }]
                },
                plugins: [syncPlugin],
                options: {
                    ...commonOptions,
                    scales: {
                        ...commonOptions.scales,
                        x: {
                            ...commonOptions.scales.x,
                            display: true,
                            title: { display: true, text: 'Distância (km)', font: { weight: '700' } }
                        },
                        y: {
                            ...commonOptions.scales.y
                        }
                    }
                }
            });
            stravaChartInstances.push(chart);
        }

    } catch (err) {
        console.error(err);
        $('strava-graph-loading').style.display = 'none';
        const errDiv = $('strava-graph-error');
        errDiv.style.display = 'block';
        errDiv.innerText = err.message || 'Erro ao carregar gráficos.';
    }
}

async function openGarminDetails(athleteId, garminId) {
    if (!garminId || garminId === 'undefined') {
        showToast('ID Garmin inválido', 'error');
        return;
    }

    $('modal-garmin-details').classList.add('show');
    $('modal-garmin-details').style.display = '';
    $('garmin-loading').style.display = 'block';
    $('garmin-error').style.display = 'none';
    $('garmin-details-container').innerHTML = '';

    try {
        // Cache-busting para evitar erros repetidos do navegador
        const response = await fetch(`/api/garmin/activity/${garminId}?userId=${athleteId}&_t=${Date.now()}`);
        const data = await response.json().catch(() => ({}));
        
        if (!response.ok) {
            const msg = data.error || `Erro ${response.status}: Falha na comunicação com o servidor Garmin.`;
            throw new Error(msg);
        }
        
        const details = data;
        
        // Helper function to create metric cards
        const makeCard = (label, value, icon, color) => `
            <div style="background: var(--panel); border: 1px solid var(--border); border-radius: 12px; padding: 12px; display: flex; flex-direction: column; gap: 8px;">
                <div style="display: flex; align-items: center; gap: 6px; color: var(--text-muted); font-size: 11px; font-weight: 700; text-transform: uppercase;">
                    <i class="${icon}" style="color: ${color}; font-size: 14px;"></i> ${label}
                </div>
                <div style="font-size: 16px; font-weight: 900; color: var(--text);">${value !== null && value !== undefined ? value : '--'}</div>
            </div>
        `;

        const getVal = (key) => details[key] ?? details.summaryDTO?.[key] ?? details.summary?.[key];

        const vo2 = getVal('vO2MaxValue');
        const teAerobic = getVal('aerobicTrainingEffect');
        const teAnaerobic = getVal('anaerobicTrainingEffect');
        const avgCadence = getVal('averageRunningCadenceInStepsPerMinute');
        const maxCadence = getVal('maxRunningCadenceInStepsPerMinute');
        const strideLen = getVal('averageStrideLength');
        const gct = getVal('averageGroundContactTime');
        const gctBalance = getVal('averageGroundContactBalance');
        const vertOsc = getVal('averageVerticalOscillation');
        const vertRatio = getVal('averageVerticalRatio');
        const cals = getVal('calories');
        const avgPower = getVal('averagePower');
        const steps = getVal('steps');
        const avgHR = getVal('averageHR') || getVal('averageHeartRate');
        const maxHR = getVal('maxHR') || getVal('maxHeartRate');

        let html = '';
        
        if (vo2) html += makeCard('VO2 Max', Math.round(vo2), 'ri-lungs-line', '#ff2d55');
        if (teAerobic) html += makeCard('TE Aeróbico', teAerobic.toFixed(1), 'ri-heart-pulse-line', '#007aff');
        if (teAnaerobic) html += makeCard('TE Anaeróbico', teAnaerobic.toFixed(1), 'ri-flashlight-line', '#ff9500');
        if (avgCadence) html += makeCard('Cadência Média', `${Math.round(avgCadence)} spm`, 'ri-footprint-line', '#34c759');
        if (maxCadence) html += makeCard('Cadência Máx', `${Math.round(maxCadence)} spm`, 'ri-footprint-fill', '#34c759');
        if (strideLen) html += makeCard('Comp. Passada', `${(strideLen / 100).toFixed(2)} m`, 'ri-ruler-line', '#8e8e93');
        if (gct) html += makeCard('Tempo Contato Solo', `${Math.round(gct)} ms`, 'ri-timer-line', '#af52de');
        if (gctBalance) html += makeCard('Balanço Contato Solo', `${gctBalance.toFixed(1)}%`, 'ri-scales-3-line', '#af52de');
        if (vertOsc) html += makeCard('Osc. Vertical', `${(vertOsc).toFixed(1)} cm`, 'ri-arrow-up-down-line', '#5856d6');
        if (vertRatio) html += makeCard('Razão Vertical', `${(vertRatio).toFixed(1)} %`, 'ri-percent-line', '#5ac8fa');
        if (cals) html += makeCard('Calorias', `${Math.round(cals)} kcal`, 'ri-fire-line', '#ff3b30');
        if (avgPower) html += makeCard('Potência Média', `${Math.round(avgPower)} W`, 'ri-thunderstorms-line', '#ffcc00');
        if (steps) html += makeCard('Passos Totais', steps.toLocaleString('pt-BR'), 'ri-walk-line', '#64748b');
        if (avgHR) html += makeCard('FC Média', `${Math.round(avgHR)} bpm`, 'ri-heart-3-line', '#ef4444');
        if (maxHR) html += makeCard('FC Máxima', `${Math.round(maxHR)} bpm`, 'ri-heart-fill', '#ef4444');
        
        if (!html) {
            html = '<div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); font-size: 14px;">Poucas dinâmicas de corrida disponíveis para este treino ou os dados estão em um formato novo.</div>';
        }

        $('garmin-details-container').innerHTML = html;
        $('garmin-loading').style.display = 'none';
    } catch (err) {
        console.error(err);
        $('garmin-loading').style.display = 'none';
        const errDiv = $('garmin-error');
        errDiv.style.display = 'block';
        errDiv.innerText = err.message || 'Erro ao extrair dados da Garmin.';
    }
}

// ─── MAP UTILS ───
function decodePolyline(str, precision = 5) {
    let index = 0, lat = 0, lng = 0, coordinates = [], shift = 0, result = 0, byte = null, latitude_change, longitude_change, factor = Math.pow(10, precision);
    while (index < str.length) {
        byte = null; shift = 0; result = 0;
        do { byte = str.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
        latitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1)); lat += latitude_change;
        byte = null; shift = 0; result = 0;
        do { byte = str.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
        longitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1)); lng += longitude_change;
        coordinates.push([lat / factor, lng / factor]);
    }
    return coordinates;
}


let detailMapInstance = null;
let detailMapMarker = null;
let detailMapCoords = [];
let detailChartInstances = [];
let _currentStreams = null;
let _zoomChart = null;
let _currentZoomType = null;
let _currentAthleteId = null;
let _chartXAxisMode = 'distance';
let _currentActivityId = null;

function initActivityMap(id, polyline) {
    setTimeout(() => {
        const container = $(`map-${id}`);
        if (!container) {
            console.warn(`Container de mapa map-${id} não encontrado.`);
            return;
        }
        
        // Limpar mapa anterior se houver
        if (container._leaflet_id) {
            // Se já inicializado, não faz nada ou reconstrói
            return;
        }

        const map = L.map(container, { 
            zoomControl: false, 
            attributionControl: false, 
            dragging: false, 
            touchZoom: false, 
            scrollWheelZoom: false,
            doubleClickZoom: false
        });
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
        
        try {
            const coords = decodePolyline(polyline);
            const path = L.polyline(coords, { color: '#fc4c02', weight: 3, opacity: 0.8 }).addTo(map);
            map.fitBounds(path.getBounds(), { padding: [5, 5] });
        } catch (e) {
            console.error('Erro ao processar polilinha:', e);
        }
    }, 100);
}

function openActivityDetail(id, skipPush = false) {
    const act = _currentStravaActivities.find(a => (a.strava_id || a.id) == id);
    if (!act) {
        showToast('Atividade não encontrada localmente', 'warning');
        return;
    }

    if (!skipPush) {
        history.pushState({ viewId: 'activity', id }, '', '/professor/atividade/' + id);
    }

    // Unificar nomes de propriedades
    const athleteId = act.athlete_id || act.athleteId;
    const athleteName = act.athlete_name || act.athleteName || 'Atleta';
    
    // Resetar estado anterior
    if (detailMapInstance) { detailMapInstance.remove(); detailMapInstance = null; }
    detailMapMarker = null;
    detailMapCoords = [];
    detailChartInstances.forEach(c => c.destroy());
    detailChartInstances = [];
    _currentStreams = null;
    _currentAthleteId = athleteId;
    _currentActivityId = id;

    $('act-detail-title').textContent = act.title || 'Atividade';
    $('act-detail-athlete').textContent = athleteName;
    $('act-detail-date').textContent = formatFeedDate(act.date || act.activity_date);
    $('act-detail-type').style.display = 'none';
    $('act-detail-avatar').textContent = athleteName.charAt(0);
    
    // Renderizar métricas iniciais (mesmo que parciais)
    updateActivityDetailMetrics(act);

    $('modal-activity-detail').classList.add('show');
    $('act-detail-charts').style.display = 'none';

    // Se as métricas estiverem incompletas (comum no feed da comunidade), buscar detalhes completos
    const numericId = String(id).replace('strava_', '').replace('garmin_', '');
    if (!act.metrics || !act.metrics.elevation || act.metrics.elevation === '--') {
        fetchFullActivityDetails(athleteId, numericId);
    }

    // Renderizar Mapa e depois Gráficos
    setTimeout(() => renderActivityTelemetry(act), 300);
}

function updateActivityDetailMetrics(act) {
    const metrics = act.metrics || {};
    const metricsHtml = `
        <div class="stat-card" style="background: var(--bg);">
            <div style="font-size: 11px; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Distância</div>
            <div style="font-size: 24px; font-weight: 900; color: #fc4c02;">${metrics.distance || '--'}</div>
        </div>
        <div class="stat-card" style="background: var(--bg);">
            <div style="font-size: 11px; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Pace Médio</div>
            <div style="font-size: 24px; font-weight: 900;">${metrics.pace || '--'}</div>
        </div>
        <div class="stat-card" style="background: var(--bg);">
            <div style="font-size: 11px; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Tempo Total</div>
            <div style="font-size: 24px; font-weight: 900;">${metrics.duration || '--'}</div>
        </div>
        <div class="stat-card" style="background: var(--bg);">
            <div style="font-size: 11px; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Ganho de Elevação</div>
            <div style="font-size: 24px; font-weight: 900;">${metrics.elevation || '--'}</div>
        </div>
    `;
    $('act-detail-metrics').innerHTML = metricsHtml;

    const extraHtml = `
        <div>
            <div style="font-size: 12px; color: var(--text-muted); font-weight: 600; margin-bottom: 4px;">Frequência Cardíaca</div>
            <div style="font-size: 16px; font-weight: 800;">Média: ${metrics.avgHeartRate || '--'} bpm / Máx: ${metrics.maxHeartRate || '--'} bpm</div>
        </div>
        <div>
            <div style="font-size: 12px; color: var(--text-muted); font-weight: 600; margin-bottom: 4px;">Esforço (Suffer Score)</div>
            <div style="font-size: 16px; font-weight: 800;">${metrics.sufferScore || '--'}</div>
        </div>
        <div style="grid-column: 1 / -1; display: flex; gap: 12px; margin-top: 12px;">
            ${act.garmin_id ? `
            <button onclick="openGarminDetails('${act.athlete_id || act.athleteId}', '${act.garmin_id}')" class="btn btn-secondary" style="flex: 1; background: #000; color: #fff;">
                <i class="ri-compass-discover-line"></i> Dinâmicas Garmin
            </button>
            ` : ''}
            <a href="https://www.strava.com/activities/${act.strava_id || act.id}" target="_blank" class="btn btn-secondary" style="flex: 1;">
                <i class="ri-external-link-line"></i> Ver no Strava
            </a>
        </div>
    `;
    $('act-detail-extra').innerHTML = extraHtml;
}

async function fetchFullActivityDetails(athleteId, activityId) {
    // Garantir que temos apenas o número do ID
    const numericId = String(activityId).replace('strava_', '').replace('garmin_', '');
    try {
        const response = await fetch(`/api/strava/activity/${numericId}?userId=${athleteId}`);
        if (!response.ok) return;
        const fullAct = await response.json();
        
        // Atualizar no estado local (procurar por strava_ID ou ID puro)
        const index = _currentStravaActivities.findIndex(a => 
            (a.strava_id || a.id) == numericId || 
            (a.strava_id || a.id) == `strava_${numericId}`
        );

        if (index !== -1) {
            _currentStravaActivities[index].metrics = fullAct.metrics;
            // Se o modal ainda estiver aberto para esta atividade, atualizar UI
            if (_currentActivityId == numericId || _currentActivityId == `strava_${numericId}`) {
                updateActivityDetailMetrics(_currentStravaActivities[index]);
            }
        }
    } catch (e) { console.error('Erro ao buscar detalhes completos:', e); }
}

function setChartXAxis(mode) {
    if (_chartXAxisMode === mode) return;
    _chartXAxisMode = mode;
    
    // Atualizar botões
    $('btn-xaxis-distance').classList.toggle('active', mode === 'distance');
    $('btn-xaxis-time').classList.toggle('active', mode === 'time');
    
    // Recarregar gráficos
    const act = _currentStravaActivities.find(a => (a.strava_id || a.id) == _currentActivityId);
    if (act) renderActivityTelemetry(act);
}

async function renderActivityTelemetry(act) {
    // 1. Mapa (se ainda não renderizado ou precisa atualizar)
    if (act.polyline && !detailMapInstance) {
        detailMapCoords = decodePolyline(act.polyline);
        detailMapInstance = L.map('act-detail-map', { zoomControl: true, attributionControl: false });
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(detailMapInstance);
        const path = L.polyline(detailMapCoords, { color: '#fc4c02', weight: 5, opacity: 0.9 }).addTo(detailMapInstance);
        detailMapInstance.fitBounds(path.getBounds(), { padding: [30, 30] });
        
        detailMapMarker = L.circleMarker(detailMapCoords[0], {
            radius: 8, fillColor: '#fc4c02', color: '#fff', weight: 3, opacity: 1, fillOpacity: 1
        }).addTo(detailMapInstance);
    }

    // 2. Gráficos (Telemetria)
    try {
        if (!_currentStreams) {
            const numericId = String(act.strava_id || act.id).replace('strava_', '').replace('garmin_', '');
            const athleteId = act.athlete_id || act.athleteId;
            const response = await fetch(`/api/strava/activity/${numericId}/streams?userId=${athleteId}`);
            if (!response.ok) return;
            const rawStreams = await response.json();
            
            const streams = {};
            if (Array.isArray(rawStreams)) {
                rawStreams.forEach(s => { streams[s.type] = s.data; });
            } else if (rawStreams && typeof rawStreams === 'object') {
                for (const key in rawStreams) { if (rawStreams[key]?.data) streams[key] = rawStreams[key].data; }
            }
            _currentStreams = streams;
        }

        const streams = _currentStreams;
        if (!streams.distance) return;

        $('act-detail-charts').style.display = 'block';
        
        // Destruir instâncias anteriores
        detailChartInstances.forEach(c => c.destroy());
        detailChartInstances = [];

        // Definir Labels do Eixo X (Distância ou Tempo)
        let xLabels = [];
        if (_chartXAxisMode === 'time' && streams.time) {
            xLabels = streams.time.map(s => {
                const m = Math.floor(s / 60);
                const sec = s % 60;
                return `${m}:${sec.toString().padStart(2, '0')}`;
            });
        } else {
            xLabels = streams.distance.map(d => (d / 1000).toFixed(2));
        }
        
        const syncWithMap = (index) => {
            if (!detailMapMarker || !detailMapCoords.length) return;
            const ratio = index / (xLabels.length - 1);
            const coordIndex = Math.floor(ratio * (detailMapCoords.length - 1));
            const targetCoord = detailMapCoords[coordIndex];
            if (targetCoord) detailMapMarker.setLatLng(targetCoord);
        };

        // Plugin de Crosshair (Linha Vertical)
        const crosshairPlugin = {
            id: 'crosshair',
            afterDraw: (chart) => {
                if (chart.tooltip?._active?.length) {
                    const x = chart.tooltip._active[0].element.x;
                    const yAxis = chart.scales.y;
                    const ctx = chart.ctx;
                    ctx.save();
                    ctx.beginPath();
                    ctx.moveTo(x, yAxis.top);
                    ctx.lineTo(x, yAxis.bottom);
                    ctx.lineWidth = 1;
                    ctx.strokeStyle = 'rgba(252, 76, 2, 0.4)';
                    ctx.setLineDash([3, 3]);
                    ctx.stroke();
                    ctx.restore();
                }
            }
        };

        const commonOptions = {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            onHover: (event, chartElement, chart) => {
                const activePoint = chart.getElementsAtEventForMode(event, 'index', { intersect: false }, true);
                if (activePoint.length > 0) {
                    const index = activePoint[0].index;
                    syncWithMap(index);
                    detailChartInstances.forEach(c => {
                        if (c !== chart) {
                            c.setActiveElements([{ datasetIndex: 0, index: index }]);
                            c.tooltip.setActiveElements([{ datasetIndex: 0, index: index }], { x: 0, y: 0 });
                            c.render();
                        }
                    });
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    enabled: true,
                    backgroundColor: 'rgba(255, 255, 255, 0.98)',
                    titleColor: '#1e293b',
                    bodyColor: '#475569',
                    borderColor: 'rgba(0,0,0,0.06)',
                    borderWidth: 1,
                    padding: 10,
                    cornerRadius: 8,
                    displayColors: false,
                    titleFont: { size: 12, weight: '800' },
                    bodyFont: { size: 13, weight: '700' },
                    callbacks: {
                        title: (context) => _chartXAxisMode === 'time' ? `Tempo: ${context[0].label}` : `Km ${context[0].label}`,
                        label: (context) => {
                            const val = context.parsed.y;
                            const label = context.dataset.label;
                            if (label.includes('Ritmo')) {
                                const m = Math.floor(val); const s = Math.round((val - m) * 60);
                                return `Ritmo: ${m}:${s.toString().padStart(2, '0')} /km`;
                            }
                            if (label.includes('FC')) return `FC: ${Math.round(val)} bpm`;
                            return `${label}: ${Math.round(val)}m`;
                        }
                    }
                }
            },
            scales: {
                x: { 
                    display: false,
                    grid: { display: false }
                },
                y: { 
                    grid: { color: 'rgba(0,0,0,0.03)', drawBorder: false }, 
                    ticks: { 
                        font: { size: 10, weight: '700', family: "'Inter', sans-serif" }, 
                        color: '#94a3b8',
                        padding: 8
                    } 
                }
            }
        };

        // --- 1. PACE CHART ---
        if (streams.velocity_smooth) {
            const paceData = streams.velocity_smooth.map(v => {
                if (v <= 0) return null;
                const pace = (1000 / v) / 60;
                return pace > 20 ? null : pace;
            });
            
            // Média de ritmo
            const validPace = paceData.filter(p => p !== null);
            const avgPace = validPace.reduce((a, b) => a + b, 0) / validPace.length;
            const am = Math.floor(avgPace); const as = Math.round((avgPace - am) * 60);
            $('avg-pace-tag').textContent = `Média: ${am}:${as.toString().padStart(2, '0')} /km`;

            const ctx = $('detailChartPace').getContext('2d');
            const gradient = ctx.createLinearGradient(0, 0, 0, 180);
            gradient.addColorStop(0, 'rgba(0, 122, 255, 0.2)');
            gradient.addColorStop(1, 'rgba(0, 122, 255, 0.02)');

            const athlete = athletes.find(a => a.supabaseId === act.athleteId);

            // Calcular limites dinâmicos para o eixo Y do Ritmo
            const validPaces = paceData.filter(p => p !== null && p < 20);
            let dynamicMin = 4;
            let dynamicMax = 20;
            
            if (validPaces.length > 0) {
                const fastest = Math.min(...validPaces);
                const slowest = Math.max(...validPaces);
                dynamicMin = Math.max(0, fastest - 0.5); // 30 segundos abaixo (mais rápido)
                dynamicMax = slowest + 1.0;              // 1 minuto acima (mais lento)
                
                // Garantir um range mínimo de 2 minutos para não ficar muito "esticado"
                if (dynamicMax - dynamicMin < 2) dynamicMax = dynamicMin + 2;
            }

            detailChartInstances.push(new Chart(ctx, {
                type: 'line',
                data: { 
                    labels: xLabels, 
                    datasets: [{ 
                        label: 'Ritmo', 
                        data: paceData, 
                        borderColor: '#007aff', 
                        backgroundColor: gradient, 
                        fill: true, 
                        pointRadius: 0, 
                        borderWidth: 1, 
                        tension: 0.4,
                        spanGaps: true,
                        segment: {
                            borderColor: ctx => {
                                if (!athlete || !athlete.testTime) return '#007aff';
                                const paceVal = ctx.p1.parsed.y;
                                if (!paceVal) return '#007aff';
                                const speedKmh = 60 / paceVal;
                                const vamKmh = 180 / athlete.testTime;
                                const pct = (speedKmh / vamKmh) * 100;
                                if (pct < 65) return '#94a3b8';
                                if (pct < 75) return '#3b82f6';
                                if (pct < 85) return '#10b981';
                                if (pct < 95) return '#f59e0b';
                                return '#ef4444';
                            }
                        }
                    }] 
                },
                plugins: [crosshairPlugin],
                options: { 
                    ...commonOptions, 
                    scales: { 
                        ...commonOptions.scales, 
                        y: { 
                            ...commonOptions.scales.y, 
                            reverse: true, 
                            min: dynamicMin, 
                            max: dynamicMax,
                            ticks: {
                                ...commonOptions.scales.y.ticks,
                                callback: value => {
                                    if (value <= 0) return '';
                                    const m = Math.floor(value); const s = Math.round((value - m) * 60);
                                    return `${m}:${s.toString().padStart(2, '0')}`;
                                }
                            }
                        } 
                    } 
                }
            }));
        }

        // --- 2. HR CHART ---
        if (streams.heartrate) {
            const maxHR = Math.max(...streams.heartrate);
            const avgHR = streams.heartrate.reduce((a, b) => a + b, 0) / streams.heartrate.length;
            $('avg-hr-tag').textContent = `Média: ${Math.round(avgHR)} bpm`;

            const ctx = $('detailChartHR').getContext('2d');
            const gradient = ctx.createLinearGradient(0, 0, 0, 150);
            gradient.addColorStop(0, 'rgba(255, 45, 85, 0.15)');
            gradient.addColorStop(1, 'rgba(255, 45, 85, 0.01)');

            detailChartInstances.push(new Chart(ctx, {
                type: 'line',
                data: { 
                    labels: xLabels, 
                    datasets: [{ 
                        label: 'FC', 
                        data: streams.heartrate, 
                        borderColor: '#ff2d55', 
                        backgroundColor: gradient, 
                        fill: true, 
                        pointRadius: 0, 
                        borderWidth: 1, 
                        tension: 0.4,
                        segment: {
                            borderColor: context => {
                                const val = context.p1.parsed.y;
                                const athlete = athletes.find(a => a.supabaseId === act.athleteId);
                                if (!athlete) return '#ff2d55';
                                const zones = calculateHRZones(athlete);
                                if (val < zones.z1) return '#94a3b8';
                                if (val < zones.z2) return '#3b82f6';
                                if (val < zones.z3) return '#10b981';
                                if (val < zones.z4) return '#f59e0b';
                                return '#ef4444';
                            }
                        }
                    }] 
                },
                plugins: [crosshairPlugin],
                options: { ...commonOptions, scales: { ...commonOptions.scales, y: { ...commonOptions.scales.y, suggestedMin: 80, suggestedMax: maxHR > 175 ? 200 : (maxHR > 155 ? 180 : 160) } } }
            }));
        }

        // --- 3. ELEVATION CHART ---
        if (streams.altitude) {
            const minAlt = Math.min(...streams.altitude);
            const maxAlt = Math.max(...streams.altitude);
            const gain = maxAlt - minAlt;
            $('avg-elev-tag').textContent = `Ganho: ${Math.round(gain)} m`;

            const ctx = $('detailChartElevation').getContext('2d');
            const gradient = ctx.createLinearGradient(0, 0, 0, 120);
            gradient.addColorStop(0, 'rgba(100, 116, 139, 0.2)');
            gradient.addColorStop(1, 'rgba(100, 116, 139, 0.02)');

            detailChartInstances.push(new Chart(ctx, {
                type: 'line',
                data: { labels: xLabels, datasets: [{ label: 'Elevação', data: streams.altitude, borderColor: '#64748b', backgroundColor: gradient, fill: true, pointRadius: 0, borderWidth: 1, tension: 0.4 }] },
                plugins: [crosshairPlugin],
                options: { 
                    ...commonOptions, 
                    scales: { 
                        ...commonOptions.scales, 
                        x: { ...commonOptions.scales.x, display: true, ticks: { maxTicksLimit: 8, font: { weight: '600' }, color: '#94a3b8' } },
                        y: { ...commonOptions.scales.y, suggestedMin: minAlt - 5, suggestedMax: maxAlt + 5 }
                    } 
                }
            }));
        }
    } catch (e) { console.error('Erro ao renderizar telemetria:', e); }
}


// ─── ZOOM E OVERLAY ───

function openZoomModal(type) {
    _currentZoomType = type;
    $('modal-zoom-chart').classList.add('show');
    $('zoom-overlay-select').value = ''; // Reset overlay
    
    // Ajustar opções de visualização conforme o tipo
    const hrModeSelect = $('zoom-hr-mode');
    if (type === 'pace') {
        hrModeSelect.parentElement.style.display = 'flex';
        hrModeSelect.innerHTML = `
            <option value="zones">Zonas de Ritmo (VAM)</option>
            <option value="classic">Clássico (Azul)</option>
        `;
    } else if (type === 'heartrate') {
        hrModeSelect.parentElement.style.display = 'flex';
        hrModeSelect.innerHTML = `
            <option value="zones">Zonas de Intensidade (FC)</option>
            <option value="classic">Clássico (Vermelho)</option>
        `;
    } else {
        hrModeSelect.parentElement.style.display = 'none';
    }

    renderZoomChart(type);
}

function closeZoomModal() {
    $('modal-zoom-chart').classList.remove('show');
    if (_zoomChart) { _zoomChart.destroy(); _zoomChart = null; }
}

function renderZoomChart(primaryType, overlayType = null) {
    if (_zoomChart) _zoomChart.destroy();
    if (!_currentStreams) return;

    const xAxisType = $('zoom-xaxis-select').value;
    const canvas = $('zoomCanvas');
    
    let labels = [];
    if (xAxisType === 'time' && _currentStreams.time) {
        labels = _currentStreams.time.map(s => {
            const m = Math.floor(s / 60);
            const sec = s % 60;
            return `${m}:${sec.toString().padStart(2, '0')}`;
        });
    } else {
        labels = _currentStreams.distance.map(d => (d/1000).toFixed(2));
    }

    const datasets = [];
    const hasOverlay = overlayType && overlayType !== primaryType;
    
    // Garmin Style: Se houver Ritmo e FC (em qualquer ordem), o FC vai para a esquerda (y) e Ritmo para a direita (y1)
    let primaryAxis = 'y';
    let overlayAxis = 'y1';
    
    const isPaceAndHR = (primaryType === 'pace' && overlayType === 'heartrate') || 
                        (primaryType === 'heartrate' && overlayType === 'pace');

    if (hasOverlay && isPaceAndHR) {
        if (primaryType === 'pace') {
            primaryAxis = 'y1';
            overlayAxis = 'y';
        } else {
            primaryAxis = 'y';
            overlayAxis = 'y1';
        }
    }

    const yAxes = {
        y: {
            position: 'left',
            grid: { color: 'rgba(0,0,0,0.05)' },
            ticks: { font: { weight: '700' }, padding: 10 }
        }
    };

    if (hasOverlay) {
        yAxes.y1 = {
            position: 'right',
            grid: { display: false },
            ticks: { font: { weight: '600' }, padding: 10 }
        };
    }

    // Configuração dos Datasets
    const hrMode = $('zoom-hr-mode').value;
    const forceGarminStyle = isPaceAndHR;

    // Configuração dos Eixos (Setup helper)
    const setupAxis = (axisId, type, label, color) => {
        const axis = yAxes[axisId];
        if (!axis) return;
        axis.title = { display: true, text: label, color: color || '#666', font: { weight: '700', size: 12 } };
        
        if (type === 'heartrate') {
            const hr = _currentStreams.heartrate || [];
            const hrMax = hr.length ? Math.max(...hr) : 0;
            axis.suggestedMin = 80;
            axis.suggestedMax = hrMax > 175 ? 200 : (hrMax > 155 ? 180 : 160);
        } else if (type === 'pace') {
            const paceData = (_currentStreams.velocity_smooth || []).map(v => (v > 0 ? (1000 / v) / 60 : null)).filter(p => p !== null && p < 15);
            let dynamicMin = 4;
            let dynamicMax = 14;
            if (paceData.length > 0) {
                dynamicMin = Math.max(0, Math.min(...paceData) - 0.5);
                dynamicMax = Math.max(...paceData) + 1.0;
                if (dynamicMax - dynamicMin < 2) dynamicMax = dynamicMin + 2;
            }
            axis.reverse = true;
            axis.min = dynamicMin;
            axis.max = dynamicMax;
            axis.ticks.callback = value => {
                if (value <= 0) return '';
                const m = Math.floor(value);
                const s = Math.round((value - m) * 60);
                return `${m}:${s.toString().padStart(2, '0')}`;
            };
        } else if (type === 'altitude') {
            const alt = _currentStreams.altitude || [0];
            axis.suggestedMin = Math.min(...alt) - 5;
            axis.suggestedMax = Math.max(...alt) + 5;
        }
        if (color) axis.ticks.color = color;
    };

    // Dataset Primário
    let isPrimaryOverlayStyle = false;
    if (forceGarminStyle && primaryType === 'heartrate') isPrimaryOverlayStyle = true;
    
    const configPrimary = getDatasetConfig(primaryType, _currentStreams, hrMode, isPrimaryOverlayStyle);
    if (primaryType === 'pace') configPrimary.data = movingAverage(configPrimary.data, 7);

    datasets.push({
        ...configPrimary,
        yAxisID: primaryAxis,
        fill: configPrimary.fill,
        pointRadius: 0,
        borderWidth: 2,
        order: (forceGarminStyle && primaryType === 'heartrate') ? 2 : 1 
    });
    setupAxis(primaryAxis, primaryType, configPrimary.label, configPrimary.borderColor);

    // Dataset de Sobreposição
    if (hasOverlay) {
        let isOverlayOverlayStyle = true;
        if (forceGarminStyle && overlayType === 'pace') isOverlayOverlayStyle = false;

        const configOverlay = getDatasetConfig(overlayType, _currentStreams, hrMode, isOverlayOverlayStyle);
        if (overlayType === 'pace') configOverlay.data = movingAverage(configOverlay.data, 7);

        datasets.push({
            ...configOverlay,
            label: `[Sobreposto] ${configOverlay.label}`,
            yAxisID: overlayAxis,
            fill: configOverlay.fill,
            pointRadius: 0,
            borderWidth: isOverlayOverlayStyle ? 1.5 : 2,
            order: isOverlayOverlayStyle ? 2 : 1
        });
        setupAxis(overlayAxis, overlayType, configOverlay.label, configOverlay.borderColor);
    }

    _zoomChart = new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            aspectRatio: 2.2, // Proporção equilibrada para desktop
            animation: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { display: true, position: 'top', align: 'center', labels: { boxWidth: 12, usePointStyle: true, pointStyle: 'circle', font: { size: 12, weight: '600' } } },
                tooltip: {
                    enabled: true,
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    titleColor: '#000',
                    bodyColor: '#333',
                    borderColor: '#ddd',
                    borderWidth: 1,
                    padding: 10,
                    bodyFont: { weight: '600' },
                    callbacks: {
                        title: (c) => {
                            const label = c[0].label;
                            return xAxisType === 'time' ? `Tempo: ${label}` : `Distância: ${label} km`;
                        },
                        label: (context) => {
                            const val = context.parsed.y;
                            const label = context.dataset.label;
                            if (label.toLowerCase().includes('ritmo')) {
                                const m = Math.floor(val); const s = Math.round((val-m)*60);
                                return `Pace: ${m}:${s.toString().padStart(2,'0')} /km`;
                            }
                            return `${label}: ${Math.round(val)}`;
                        }
                    }
                }
            },
            scales: {
                x: { 
                    grid: { display: false },
                    ticks: { maxTicksLimit: 10, color: '#999', font: { size: 10 } },
                    title: { display: true, text: xAxisType === 'time' ? 'Tempo (mm:ss)' : 'Distância (km)', font: { size: 11, weight: '600' } }
                },
                ...yAxes
            },
            hover: { mode: 'index', intersect: false }
        },
        plugins: [{
            id: 'verticalLine',
            afterDraw: (chart) => {
                if (chart.tooltip?._active?.length) {
                    const x = chart.tooltip._active[0].element.x;
                    const yAxis = chart.scales.y;
                    const ctx = chart.ctx;
                    ctx.save();
                    ctx.beginPath();
                    ctx.moveTo(x, yAxis.top);
                    ctx.lineTo(x, yAxis.bottom);
                    ctx.lineWidth = 1;
                    ctx.strokeStyle = '#333';
                    ctx.setLineDash([5, 5]);
                    ctx.stroke();
                    ctx.restore();
                }
            }
        }]
    });
}

function getDatasetConfig(type, streams, mode = 'zones', isOverlay = false) {
    const athleteId = _currentAthleteId;
    const athlete = athletes.find(a => String(a.supabaseId) === String(athleteId));

    switch(type) {
        case 'pace':
            const paceConfig = {
                label: 'Ritmo',
                data: (streams.velocity_smooth || []).map(v => {
                    if (v <= 0) return null;
                    const pace = (1000 / v) / 60;
                    return pace > 20 ? null : pace;
                }),
                borderColor: '#007aff',
                backgroundColor: 'rgba(0, 122, 255, 0.05)',
                fill: false, // Ritmo nunca é área no Garmin
                spanGaps: true
            };

            if (!isOverlay && mode === 'zones' && athlete && athlete.testTime) {
                const vamKmh = 180 / athlete.testTime;
                paceConfig.segment = {
                    borderColor: ctx => {
                        const paceVal = ctx.p1.parsed.y;
                        if (!paceVal) return '#007aff';
                        const speedKmh = 60 / paceVal;
                        const pctVam = (speedKmh / vamKmh) * 100;
                        
                        if (pctVam < 65) return '#94a3b8';
                        if (pctVam < 75) return '#3b82f6';
                        if (pctVam < 85) return '#10b981';
                        if (pctVam < 95) return '#f59e0b';
                        return '#ef4444';
                    }
                };
            }
            
            if (isOverlay) {
                paceConfig.borderColor = 'rgba(0, 122, 255, 0.7)';
                paceConfig.borderWidth = 1.5;
            }
            
            return paceConfig;

        case 'heartrate':
            const hrConfig = {
                label: 'Frequência Cardíaca',
                data: streams.heartrate || [],
                borderColor: '#ff2d55',
                backgroundColor: 'rgba(255, 45, 85, 0.05)',
                fill: true
            };
            
            if (!isOverlay && mode === 'zones' && athlete) {
                const zones = calculateHRZones(athlete);
                hrConfig.segment = {
                    borderColor: ctx => {
                        const val = ctx.p1.parsed.y;
                        if (!val) return '#ff2d55';
                        if (val < zones.z1) return '#94a3b8';
                        if (val < zones.z2) return '#3b82f6';
                        if (val < zones.z3) return '#10b981';
                        if (val < zones.z4) return '#f59e0b';
                        return '#ef4444';
                    }
                };
            }

            if (isOverlay) {
                // Garmin style: HR como sobreposição fica cinza ao fundo
                hrConfig.borderColor = 'rgba(150, 150, 150, 0.5)';
                hrConfig.backgroundColor = 'rgba(200, 200, 200, 0.25)';
                delete hrConfig.segment;
            }

            return hrConfig;

        case 'altitude':
            const altConfig = {
                label: 'Elevação',
                data: streams.altitude || [],
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                fill: true
            };
            if (isOverlay) {
                altConfig.borderColor = '#10b981';
                altConfig.backgroundColor = 'transparent';
                altConfig.fill = false; // Elevação como sobreposição no Garmin é só uma linha verde
            }
            return altConfig;
        default:
            return { label: '', data: [] };
    }
}

function applyZoomOverlay() {
    const overlay = $('zoom-overlay-select').value;
    renderZoomChart(_currentZoomType, overlay);
}

function applyZoomXAxis() {
    const overlay = $('zoom-overlay-select').value;
    renderZoomChart(_currentZoomType, overlay);
}

// ─── SUGGESTION 1: CHAT NOTIFICATIONS ───
async function checkUnreadMessages() {
    if (!window._profId) return;
    try {
        const { data, error } = await dbClient
            .from('messages')
            .select('athlete_id, created_at, sender_id')
            .neq('sender_id', window._profId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        
        const unreadAthletes = new Set();
        data.forEach(m => {
            const lastSeen = localStorage.getItem(`chat_seen_${m.athlete_id}`) || 0;
            if (new Date(m.created_at).getTime() > parseInt(lastSeen)) {
                unreadAthletes.add(m.athlete_id);
            }
        });

        const badge = $('chat-badge');
        if (badge) {
            if (unreadAthletes.size > 0) {
                badge.textContent = unreadAthletes.size;
                badge.style.display = 'flex';
                // Também mostrar na nav-item do mobile
                document.querySelector('[data-view="chat"] .badge-new')?.style.setProperty('display', 'flex');
            } else {
                badge.style.display = 'none';
            }
        }
    } catch (e) { console.error('Error checking unreads:', e); }
}
setInterval(checkUnreadMessages, 30000); // Check every 30s
setTimeout(checkUnreadMessages, 2000); // Initial check

// Mark as read when selecting athlete
const originalSelectAthlete = selectFloatingChatAthlete;
selectFloatingChatAthlete = async function(id, name) {
    localStorage.setItem(`chat_seen_${id}`, Date.now());
    checkUnreadMessages();
    return originalSelectAthlete(id, name);
};

// ─── SUGGESTION 2: PLANNED VS REALIZED CHART ───
let _dashboardChart = null;
async function renderPlannedVsRealizedChart() {
    const canvas = $('chart-planned-vs-realized');
    if (!canvas) return;

    // Calcular Planejado (Volume das pastas vinculadas aos atletas)
    let plannedTotal = 0;
    athletes.forEach(a => {
        if (a.groupId) {
            const g = groups.find(x => x.id == a.groupId);
            if (g) plannedTotal += (g.volume || 0);
        }
    });

    // Calcular Realizado (Últimos 7 dias de todos os atletas)
    let realizedTotal = 0;
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const { data, error } = await dbClient
            .from('activities')
            .select('distance')
            .gte('start_time', sevenDaysAgo.toISOString());
            
        if (!error && data) {
            realizedTotal = data.reduce((acc, act) => acc + (parseFloat(act.distance) || 0), 0);
        }
    } catch (e) { console.error('Error fetching realized volume:', e); }

    if (_dashboardChart) _dashboardChart.destroy();
    
    _dashboardChart = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: ['Volume da Equipe (Semanal)'],
            datasets: [
                {
                    label: 'Planejado (km)',
                    data: [plannedTotal],
                    backgroundColor: 'rgba(37, 99, 235, 0.2)',
                    borderColor: '#2563eb',
                    borderWidth: 2,
                    borderRadius: 8
                },
                {
                    label: 'Realizado (km)',
                    data: [realizedTotal.toFixed(1)],
                    backgroundColor: 'rgba(16, 185, 129, 0.2)',
                    borderColor: '#10b981',
                    borderWidth: 2,
                    borderRadius: 8
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top', labels: { font: { weight: 'bold' } } }
            },
            scales: {
                y: { beginAtZero: true, title: { display: true, text: 'Quilômetros (km)' } }
            }
        }
    });
}

// ─── OFFLINE / ONLINE DETECTION ───
window.addEventListener('online', () => {
    showToast('Você está online novamente! Conexão restabelecida.', 'success');
});
window.addEventListener('offline', () => {
    showToast('Sem conexão com a internet. Suas alterações serão salvas localmente no navegador.', 'error');
});

// ─── INTERACTIVE TUTORIAL DASHBOARD ───
const TUTORIAL_CHAPTERS = [
    {
        id: 'intro',
        module: 'Módulo 1',
        title: 'Introdução e Painel Geral',
        duration: '4 min',
        icon: 'ri-dashboard-line',
        videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        description: 'Visão geral do Painel do Professor, atalhos rápidos e conceitos fundamentais do MeuVAM.',
        doc: `
            <h3>1. Visão Geral da Plataforma</h3>
            <p>O <strong>MeuVAM</strong> é uma plataforma de ponta desenhada especificamente para simplificar e automatizar a prescrição e o controle de treinos esportivos. Toda a lógica da assessoria é centrada na <strong>Velocidade Aeróbica Máxima (VAM)</strong> de cada atleta.</p>
            <div class="tutorial-alert tutorial-alert-info">
                <i class="ri-information-line"></i>
                <div>
                    <strong>Dica de Navegação:</strong> O menu lateral do Coach Portal é o seu centro de comando. Use-o para navegar de forma instantânea entre a Visão Geral, Pastas de Treino (Templates), Atletas, Feed Strava, Calculadoras de Ritmo e este Guia de Treinamento.
                </div>
            </div>
            <h4>Como Utilizar o Painel Central:</h4>
            <ul>
                <li><strong>Visão Geral (Dashboard):</strong> Apresenta estatísticas consolidadas da assessoria (número de atletas ativos, planilhas geradas e histórico de treinos salvos).</li>
                <li><strong>Central de Sincronizações:</strong> Acompanhe no topo da tela os alertas de treinos recém-sincronizados da Garmin ou do Strava dos seus atletas.</li>
                <li><strong>Menu Responsivo:</strong> O menu lateral se recolhe automaticamente em telas menores ou pode ser fechado manualmente clicando na seta superior.</li>
            </ul>
        `
    },
    {
        id: 'vam',
        module: 'Módulo 2',
        title: 'Configurando VAM e Zonas',
        duration: '6 min',
        icon: 'ri-heart-pulse-line',
        videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        description: 'Como calcular e configurar a Velocidade Aeróbica Máxima (VAM) e as 7 zonas de treino automáticas.',
        doc: `
            <h3>2. VAM (Velocidade Aeróbica Máxima) e Zonas</h3>
            <p>A precisão dos paces propostos nas planilhas depende da correta calibração da <strong>VAM</strong> de cada atleta. Ela representa a velocidade no limite do consumo máximo de oxigênio (VO2 máx).</p>
            <h4>Passo a Passo para Configurar:</h4>
            <ol>
                <li>Acesse a aba <strong>Atletas</strong> no painel principal.</li>
                <li>Selecione o atleta desejado e clique em <strong>Editar</strong> (ou crie um novo atleta clicando em "+ Novo Atleta").</li>
                <li>Insira o resultado do teste de 3km (em minutos e segundos) ou defina a VAM diretamente.</li>
                <li>O MeuVAM recalcula instantaneamente as <strong>7 Zonas de Ritmo</strong> do atleta:
                    <ul>
                        <li><strong>Z1 (Regenerativo):</strong> Ritmo extremamente leve para aquecimento ou pós-tiros.</li>
                        <li><strong>Z2 (Endurance):</strong> Ritmo clássico de rodagem, confortável e de longa duração.</li>
                        <li><strong>Z3 (Ritmo Ativo):</strong> Intensidade moderada, simulando ritmo de maratona.</li>
                        <li><strong>Z4 (Limiar de Lactato):</strong> Ritmo de limiar aeróbico-anaeróbico.</li>
                        <li><strong>Z5 (VO2 Máx):</strong> Tiros intensos para ganho de potência aeróbica.</li>
                        <li><strong>Z6 (Capacidade Anaeróbica):</strong> Tiros de curtíssima duração em esforço máximo.</li>
                        <li><strong>Z7 (Sprints):</strong> Acelerações máximas e explosivas.</li>
                    </ul>
                </li>
            </ol>
            <div class="tutorial-alert tutorial-alert-warning">
                <i class="ri-alert-line"></i>
                <div>
                    <strong>Frequência de Testes:</strong> É recomendável reavaliar a VAM do atleta a cada 6 ou 8 semanas. Quando você atualiza a VAM no cadastro do atleta, todos os treinos futuros do calendário se readequam automaticamente aos novos paces!
                </div>
            </div>
        `
    },
    {
        id: 'templates',
        module: 'Módulo 3',
        title: 'Pastas e Templates de Aula',
        duration: '6 min',
        icon: 'ri-folder-add-line',
        videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        description: 'Crie uma biblioteca organizada de treinos reutilizáveis e economize horas de planejamento.',
        doc: `
            <h3>3. Estruturação de Pastas e Biblioteca de Templates</h3>
            <p>Em vez de prescrever treinos do zero para cada atleta todas as semanas, você pode criar uma **Biblioteca Global de Templates** organizada em pastas temáticas.</p>
            <h4>Como Funciona a Criação:</h4>
            <ol>
                <li>Vá na aba <strong>Pastas de Treino</strong>.</li>
                <li>Clique em <strong>"+ Nova Pasta"</strong> e crie uma categoria (ex: "Tiros de 1000m", "Endurance Z2", "Subidas e Força").</li>
                <li>Entre na pasta recém-criada e adicione um **Template de Treino**.</li>
                <li>Dê um nome ao treino, escolha a modalidade (Corrida, Natação, Ciclismo, Fortalecimento ou Outros) e defina os passos estruturados (aquecimento, blocos de tiros e desaquecimento).</li>
            </ol>
            <div class="tutorial-alert tutorial-alert-success">
                <i class="ri-checkbox-circle-line"></i>
                <div>
                    <strong>Vantagem Tecnológica:</strong> Nossos templates são "inteligentes". Se você prescrever <em>"5x 1000m em Z5"</em>, o MeuVAM calcula o tempo e a distância dinamicamente para cada atleta individual com base na VAM respectiva no momento da aplicação do treino!
                </div>
            </div>
        `
    },
    {
        id: 'distribution',
        module: 'Módulo 4',
        title: 'Prescrição e Distribuição',
        duration: '7 min',
        icon: 'ri-calendar-todo-line',
        videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        description: 'Monte e gerencie a planilha semanal dos atletas de forma ágil com suporte a múltiplas modalidades.',
        doc: `
            <h3>4. Prescrição Semanal e Atividades Múltiplas</h3>
            <p>O MeuVAM possui um calendário interativo e inteligente onde você gerencia o microciclo do atleta com extrema agilidade.</p>
            <h4>Principais Recursos do Calendário:</h4>
            <ul>
                <li><strong>Múltiplas Modalidades:</strong> Prescreva facilmente treinos de <strong>Corrida</strong> (com foco em zonas de VAM), <strong>Natação</strong> (com o novo ícone ampliado), <strong>Ciclismo</strong>, <strong>Fortalecimento</strong> (com o novo ícone exclusivo de halter de academia) e <strong>Outros</strong>.</li>
                <li><strong>Copiar e Colar Semanas:</strong> Ganhe tempo duplicando a estrutura de treinamento de uma semana inteira para o mesmo atleta ou para outros atletas do mesmo nível.</li>
                <li><strong>Aplicativo do Atleta:</strong> Assim que você salva um treino no portal, ele é compilado e disponibilizado instantaneamente no aplicativo celular do atleta, com cores e zonas visualmente separadas.</li>
            </ul>
        `
    },
    {
        id: 'telemetry',
        module: 'Módulo 5',
        title: 'Telemetria e Feedback do Strava',
        duration: '5 min',
        icon: 'ri-pulse-line',
        videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        description: 'Entenda a sincronização automática de dados via Strava/Garmin e análise de splits reais.',
        doc: `
            <h3>5. Telemetria Ativa e Análise Comparativa</h3>
            <p>Esqueça planilhas manuais ou digitação de treinos pelos atletas. O MeuVAM faz a telemetria passiva integrando diretamente com as contas de <strong>Strava ou Garmin Connect</strong> de cada atleta.</p>
            <h4>Fluxo de Análise e Auditoria:</h4>
            <ul>
                <li><strong>Sincronização Passiva:</strong> Assim que o atleta salva a corrida no relógio GPS e ela sobe para o Strava, o MeuVAM faz o emparelhamento automático com o treino agendado.</li>
                <li><strong>Match Score:</strong> O sistema calcula a taxa de conformidade (em %) avaliando a precisão da distância, duração e ritmo médio realizados contra o que foi prescrito.</li>
                <li><strong>Gráfico Proposto vs. Real:</strong> Um gráfico de linhas interativo sobrepõe perfeitamente o pace prescrito contra o pace executado em cada km (com a escala de pace invertida no eixo Y para facilitar a leitura).</li>
                <li><strong>Visualização Direta:</strong> Cada treino concluído exibe um link do Strava no Feed do atleta, permitindo abrir a atividade original com um único clique.</li>
            </ul>
            <div class="tutorial-alert tutorial-alert-success">
                <i class="ri-checkbox-circle-line"></i>
                <div>
                    <strong>Sinalizadores de Ritmo:</strong> A tabela de splits por km (Split Matcher) exibe bolinhas de referência coloridas no ritmo proposto e real, indicando se o atleta manteve o passo correto, correu rápido demais ou entrou em fadiga extrema.
                </div>
            </div>
        `
    }
];


// Funções de compatibilidade com código legado
function toggleTutorialSection() { openTutorialModal(); }
// initTutorialView() removida — substituída por openTutorialModal()
function renderTutorialPlaylist() {}
function selectTutorialChapter() {}

// ─── TOUR GUIDADO DE POPUPS INTERATIVOS ───
const THEMATIC_TOURS = {

    // ── Tour 1: Visão Geral & Painel ──
    'dashboard': [
        {
            view: 'dashboard',
            target: 'sidebar',
            title: '🧭 Menu Lateral — Centro de Comando',
            desc: 'Esta barra lateral é o ponto de partida para navegar por todo o portal. Use-a para alternar entre Painel, Pastas de Treino, Atletas, Feed Strava, Calculadoras e o Guia de Tours. Ela se recolhe automaticamente em telas menores.',
            align: 'right'
        },
        {
            view: 'dashboard',
            target: 'collapse-btn',
            title: '📐 Maximizar Espaço de Trabalho',
            desc: 'Clique neste botão para recolher o menu lateral e ganhar mais espaço de tela ao trabalhar com calendários extensos ou listas de atletas. Clique novamente para reexpandi-lo.',
            align: 'right'
        },
        {
            view: 'dashboard',
            target: 'dashboard-greeting',
            title: '👋 Painel de Boas-Vindas',
            desc: 'A seção de boas-vindas exibe notificações recentes da assessoria, como treinos pendentes de feedback, novos atletas cadastrados e sincronizações do Strava aguardando revisão.',
            align: 'bottom'
        },
        {
            view: 'dashboard',
            target: 'dashboard-stats',
            title: '📊 Métricas Consolidadas da Assessoria',
            desc: 'Aqui você vê em tempo real: total de atletas ativos, número de templates organizados nas pastas e o volume de treinos prescritos no mês. Esses indicadores ajudam a medir o crescimento da sua assessoria.',
            align: 'bottom'
        },
        {
            view: 'dashboard',
            target: 'theme-icon',
            title: '🌙 Modo Claro / Escuro',
            desc: 'Alterne entre o tema claro e escuro com este botão. A preferência é salva automaticamente no navegador, então você não precisa redefinir a cada acesso.',
            align: 'bottom'
        }
    ],

    // ── Tour 2: Pastas & Templates ──
    'templates': [
        {
            view: 'groups',
            target: 'groups-page-header',
            title: '📁 Biblioteca Global de Templates',
            desc: 'Esta é a sua base de treinos reutilizáveis. Organizamos as sessões em pastas temáticas. Vamos entrar em uma pasta para ver como funciona!',
            align: 'bottom',
            actionBefore: () => {
                viewCategory(null);
            }
        },
        {
            view: 'groups',
            target: '#groups-list .btn-primary',
            title: '➕ Criar Novo Treino',
            desc: 'Ao entrar na pasta, você visualiza os treinos dela. Clicando em "Novo Treino", você abre o construtor para criar uma nova sessão para a biblioteca.',
            align: 'left',
            actionBefore: () => {
                if (!categories.length) {
                    categories.push('Exemplo');
                    saveState(['cats']);
                }
                viewCategory(categories[0]);
            }
        },
        {
            view: 'groups',
            target: 'group-type-pills',
            title: '🏊 Escolha da Modalidade',
            desc: 'Dentro do construtor, você escolhe se o treino é Corrida, Natação, Ciclismo ou Fortalecimento. As métricas e unidades mudam automaticamente de acordo com o esporte.',
            align: 'bottom',
            actionBefore: () => {
                if (categories.length > 0) {
                    openGroupModal(categories[0]);
                }
            }
        },
        {
            view: 'groups',
            target: '#editor-steps-container',
            title: '⚡ Configuração de Blocos e Zonas',
            desc: 'Aqui você define a duração (distância ou tempo) e a intensidade (pelo % da VAM). O MeuVAM calculará o pace exato para cada atleta automaticamente na hora de aplicar.',
            align: 'right'
        },
        {
            view: 'groups',
            target: 'editor-actions-sidebar',
            title: '➕ Adicionar Etapas',
            desc: 'Use esta barra lateral para adicionar novas etapas simples (como aquecimento e desaquecimento) ou blocos complexos de repetição (como tiros intervalados).',
            align: 'left'
        },
        {
            view: 'groups',
            target: '.btn-icon-danger',
            title: '🗑️ Editar e Excluir',
            desc: 'Você pode editar, duplicar ou excluir permanentemente qualquer treino diretamente pelos botões no cartão dele, dentro da pasta.',
            align: 'top',
            actionBefore: () => {
                closeModals();
            }
        },
        {
            view: 'groups',
            target: '.ri-arrow-left-line',
            title: '🔙 Pronto para Usar',
            desc: 'Depois de criar, eles ficam salvos. Qualquer template desta biblioteca poderá ser inserido rapidamente no calendário dos seus atletas!',
            align: 'bottom',
            actionAfter: () => {
                viewCategory(null);
            }
        }
    ],

    // ── Tour 3: Gestão de Atletas ──
    'athletes': [
        {
            view: 'athletes',
            target: 'view-athletes',
            title: '👥 Gestão de Atletas',
            desc: 'Esta é a central de alunos. Cada linha exibe os dados do atleta, sua planilha atual, e-mail e status de pagamento. Vamos ver o que você pode fazer por aqui!',
            align: 'bottom'
        },
        {
            view: 'athletes',
            target: 'athlete-search',
            title: '🔍 Busca Rápida',
            desc: 'Tem muitos atletas? Digite o nome aqui e a tabela é filtrada em tempo real para facilitar o acesso rápido.',
            align: 'bottom'
        },
        {
            view: 'athletes',
            target: '#athlete-name',
            title: '⚙️ Configurar Atleta e VAM',
            desc: 'Ao clicar no botão de Configurações, o painel do atleta é aberto. Aqui você pode preencher o nome, contato e data de nascimento.',
            align: 'bottom',
            actionBefore: () => {
                const ensureAndOpen = async () => {
                    if (!athletes || athletes.length === 0) {
                        await syncAthletesFromSupabase();
                    }
                    if (athletes.length > 0) {
                        editAthlete(athletes[0].id);
                    }
                };
                ensureAndOpen();
            }
        },
        {
            view: 'athletes',
            target: 'athlete-test',
            title: '⚡ Cálculo Automático da VAM',
            desc: 'Ao informar o tempo no teste de 3km, o sistema gera as 7 zonas de ritmo automaticamente. Você também pode mudar o método de Frequência Cardíaca (Máxima, Karvonen ou Limiar).',
            align: 'bottom'
        },
        {
            view: 'athletes',
            target: '.btn-tertiary[title="Calendário de Treinos"]',
            title: '📅 Abrir Calendário de Treinos',
            desc: 'Clicando neste ícone (Calendário), você abre a tela de prescrição onde puxará os templates criados na Biblioteca para a semana do atleta.',
            align: 'left',
            actionBefore: () => {
                closeModals();
            }
        },
        {
            view: 'athletes',
            target: '#athletes-list .btn-primary',
            title: '🚀 Enviar Treinos',
            desc: 'Após prescrever a semana no calendário, clique em Enviar. O treino vai na mesma hora para o aplicativo do atleta e direto para o relógio Garmin/Coros dele!',
            align: 'left'
        }
    ],

    // ── Tour 4: Prescrição de Treinos ──
    'calendar': [
        {
            view: 'athletes',
            target: '#hist-athlete-name',
            title: '📅 Acessar o Calendário do Atleta',
            desc: 'O calendário pessoal do atleta será aberto imediatamente. Vamos abrir a tela de prescrição para gerenciar os treinos de forma ágil!',
            align: 'bottom',
            actionBefore: () => {
                const ensureAndOpen = async () => {
                    if (!athletes || athletes.length === 0) {
                        await syncAthletesFromSupabase();
                    }
                    if (athletes && athletes.length > 0) {
                        const rinaldo = athletes.find(a => a.name && a.name.toLowerCase().includes('rinaldo'));
                        const targetAthlete = rinaldo || athletes[0];
                        openHistory(targetAthlete.id);
                    } else {
                        showToast('Cadastre pelo menos um atleta para visualizar o calendário de prescrição.', 'info');
                    }
                };
                ensureAndOpen();
            }
        },
        {
            view: 'athletes',
            target: '#history-calendar-container',
            title: '📆 Visão Semanal do Calendário',
            desc: 'O calendário exibe a semana atual com os dias da semana. Cada célula de dia mostra os treinos já agendados com ícone colorido da modalidade. Navegue para frente e trás nas semanas usando as setas superiores.',
            align: 'right'
        },
        {
            view: 'athletes',
            target: '#edit-workout-title',
            title: '➕ Criar Novo Treino',
            desc: 'Ao clicar em um dia no calendário, o Construtor de Treinos Inteligente é aberto. Dê um nome para a sua nova sessão de treinamento.',
            align: 'bottom',
            actionBefore: () => {
                const dayBox = document.querySelector('.calendar-day-box');
                if (dayBox) {
                    dayBox.click(); // This calls handleCalendarDayClick and opens the edit workout modal
                } else {
                    const todayStr = new Date().toISOString().split('T')[0];
                    openEditWorkoutModal(null, todayStr);
                }
            }
        },
        {
            view: 'athletes',
            target: '#workout-type-pills',
            title: '🏊 Escolha a Modalidade do Treino',
            desc: 'No construtor de treinos, selecione a modalidade: Corrida, Natação, Ciclismo, Fortalecimento ou Outros. Cada modalidade tem métricas exclusivas de distância, tempo ou repetições.',
            align: 'bottom'
        },
        {
            view: 'athletes',
            target: '#toggle-vam-btn',
            title: '📊 Tabela VAM do Atleta',
            desc: 'Clicando em "Tabelas VAM" no topo, você visualiza instantaneamente os paces exatos desse atleta para cada zona, baseados no teste dele.',
            align: 'bottom'
        },
        {
            view: 'athletes',
            target: '#calendar-workout-steps-container',
            title: '📋 Montar os Blocos do Treino',
            desc: 'Monte o aquecimento, as séries e o desaquecimento usando a barra lateral direita. Ou, se preferir, carregue um template pronto da sua biblioteca na barra esquerda.',
            align: 'right'
        },
        {
            view: 'athletes',
            target: '.garmin-header .btn-primary',
            title: '💾 Salvar Treino no Calendário',
            desc: 'Após ajustar os blocos, clique em "Salvar Treino". Ele aparecerá no dia que você escolheu no calendário e o app do aluno será notificado.',
            align: 'bottom',
            actionAfter: () => {
                closeEditWorkoutModal(); // Close the inner modal
            }
        },
        {
            view: 'athletes',
            target: '#history-calendar-container',
            title: '📋 Visão Completa da Semana',
            desc: 'De volta ao calendário, você pode copiar semanas inteiras, editar dias e acompanhar o volume planejado na barra inferior (se houver treinos previstos).',
            align: 'right',
            actionAfter: () => {
                closeModals(); // Close the history modal
            }
        }
    ],

    // ── Tour 5: Telemetria & Strava ──
    'telemetry': [
        {
            view: 'strava-feed',
            target: 'view-strava-feed',
            title: '🔄 Feed de Telemetria GPS Ativo',
            desc: 'Toda corrida, pedalada ou natação concluída pelo atleta no relógio GPS e sincronizada ao Strava aparece automaticamente neste feed. Não é necessário nenhuma ação manual do atleta ou do professor.',
            align: 'bottom'
        },
        {
            view: 'strava-feed',
            target: 'view-strava-feed',
            title: '🎯 Cálculo Automático do Match Score',
            desc: 'Para cada atividade, o MeuVAM emparelha com o treino prescrito no calendário e calcula o Match Score (0–100%). O algoritmo avalia: distância percorrida vs proposta, duração real vs estimada e ritmo médio vs prescrito.',
            align: 'bottom'
        },
        {
            view: 'strava-feed',
            target: 'view-strava-feed',
            title: '📈 Gráfico Proposto vs. Executado',
            desc: 'Abra o detalhe de qualquer treino para ver o gráfico de linhas com o pace prescrito (linha tracejada) vs o pace real do GPS (linha sólida). O eixo Y é invertido pois paces menores significam maior velocidade — o padrão da indústria.',
            align: 'bottom'
        },
        {
            view: 'strava-feed',
            target: 'view-strava-feed',
            title: '⚡ Tabela de Splits km a km',
            desc: 'A tabela Split Matcher detalha cada quilômetro da corrida: pace proposto, pace real e um indicador colorido (bolinha verde = no alvo, amarela = ligeiramente fora, vermelha = muito distante do prescrito).',
            align: 'bottom'
        },
        {
            view: 'strava-feed',
            target: 'view-strava-feed',
            title: '🔗 Link Direto para o Strava',
            desc: 'Cada treino concluído exibe o link para abrir a atividade original no Strava com um único clique. Você pode ver o mapa da rota, frequência cardíaca e todas as métricas originais da plataforma.',
            align: 'bottom'
        },
        {
            view: 'strava-feed',
            target: 'view-strava-feed',
            title: '📊 Filtrar por Atleta ou Período',
            desc: 'Use os filtros no topo do feed para visualizar as atividades de um atleta específico ou de um período determinado. Ideal para revisar a semana de treino antes de uma conversa de feedback com o aluno.',
            align: 'bottom'
        }
    ],

    // ── Tour 6: Calculadoras de Ritmo ──
    'calculator': [
        {
            view: 'calculator',
            target: 'view-calculator',
            title: '🧮 Calculadoras Integradas de Pace',
            desc: 'Esta seção reúne duas calculadoras essenciais para o professor: a calculadora de pace (converte VAM ↔ ritmo min/km) e a calculadora de esteira (converte pace ↔ km/h). Tudo sem precisar de planilha externa.',
            align: 'bottom'
        },
        {
            view: 'calculator',
            target: 'view-calculator',
            title: '⚡ Calculadora VAM ↔ Pace',
            desc: 'Insira a VAM do atleta (ex: 16.5 km/h) para obter instantaneamente os paces de cada uma das 7 zonas de treinamento (Z1 a Z7). Ou insira um pace (ex: 5:30 /km) para descobrir a % da VAM correspondente.',
            align: 'bottom'
        },
        {
            view: 'calculator',
            target: 'view-calculator',
            title: '🏃 Calculadora de Esteira',
            desc: 'A calculadora de esteira converte a velocidade do painel da máquina (km/h) para o pace equivalente em corrida de rua (min/km) e vice-versa. Útil para orientar atletas que treinam em academia.',
            align: 'bottom'
        },
        {
            view: 'calculator',
            target: 'view-calculator',
            title: '📋 Tabela Rápida de Referência',
            desc: 'Abaixo das calculadoras, há uma tabela de referência rápida com as conversões mais comuns de km/h → pace min/km, cobrindo velocidades de 8 km/h a 20 km/h. Perfeita para usar durante consultas com atletas.',
            align: 'bottom'
        }
    ]
};

let currentTourTheme = 'dashboard';
let currentTourStep = 0;

function startThematicTour(themeName) {
    if (!THEMATIC_TOURS[themeName]) return;
    
    // Fechar o modal do guia antes de iniciar o tour para que as dicas fiquem visíveis
    closeTutorialModal();

    currentTourTheme = themeName;
    currentTourStep = 0;
    
    const overlay = $('tour-overlay') || createTourOverlay();
    const card = $('tour-card') || createTourCard();
    
    overlay.style.display = 'block';
    card.style.display = 'flex';
    
    showThematicTourStep(0);
}

function createTourOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'tour-overlay';
    overlay.className = 'tour-overlay';
    document.body.appendChild(overlay);
    return overlay;
}

function createTourCard() {
    const card = document.createElement('div');
    card.id = 'tour-card';
    card.className = 'tour-card';
    card.innerHTML = `
        <div class="tour-card-progress-bar-track">
            <div class="tour-card-progress-bar-fill" id="tour-progress-fill" style="width: 0%;"></div>
        </div>
        <div class="tour-card-inner">
            <div class="tour-card-header">
                <span id="tour-step-badge">Passo 1/1</span>
                <button class="tour-close-btn" onclick="endTour()">&#215;</button>
            </div>
            <div class="tour-card-body">
                <h4 id="tour-step-title">Título</h4>
                <p id="tour-step-desc">Descrição</p>
            </div>
            <div class="tour-card-footer">
                <button class="btn btn-secondary btn-sm" id="tour-prev-btn" onclick="prevTourStep()" style="font-size:12px;padding:6px 14px;border-radius:10px;cursor:pointer;border:none;">Anterior</button>
                <button class="btn btn-primary btn-sm" id="tour-next-btn" onclick="nextTourStep()" style="font-size:12px;padding:6px 14px;border-radius:10px;cursor:pointer;border:none;">Próximo</button>
            </div>
        </div>
    `;
    document.body.appendChild(card);
    return card;
}

function endTour() {
    const overlay = $('tour-overlay');
    const card = $('tour-card');
    if (overlay) overlay.style.display = 'none';
    if (card) card.style.display = 'none';
    
    document.querySelectorAll('.tour-highlight').forEach(el => {
        el.classList.remove('tour-highlight');
    });
    
    // Execute clean up action if any
    const steps = THEMATIC_TOURS[currentTourTheme];
    if (steps && steps[currentTourStep] && steps[currentTourStep].actionAfter) {
        steps[currentTourStep].actionAfter();
    }
}

function nextTourStep() {
    const steps = THEMATIC_TOURS[currentTourTheme];
    if (!steps) return;
    
    // Clean up current step action
    if (steps[currentTourStep] && steps[currentTourStep].actionAfter) {
        steps[currentTourStep].actionAfter();
    }
    
    if (currentTourStep < steps.length - 1) {
        showThematicTourStep(currentTourStep + 1);
    } else {
        endTour();
        showToast('Parabéns! Você concluiu o Tour Guiado do MeuVAM. 🎉', 'success');
        openTutorialModal(); // Reabrir a Central de Ajuda ao concluir o tour
    }
}

function prevTourStep() {
    const steps = THEMATIC_TOURS[currentTourTheme];
    if (!steps) return;
    
    // Clean up current step action
    if (steps[currentTourStep] && steps[currentTourStep].actionAfter) {
        steps[currentTourStep].actionAfter();
    }
    
    if (currentTourStep > 0) {
        showThematicTourStep(currentTourStep - 1);
    }
}

function showThematicTourStep(stepIndex) {
    currentTourStep = stepIndex;
    const steps = THEMATIC_TOURS[currentTourTheme];
    if (!steps || !steps[stepIndex]) return;
    
    const step = steps[stepIndex];
    
    // Clear previous highlight
    document.querySelectorAll('.tour-highlight').forEach(el => {
        el.classList.remove('tour-highlight');
    });
    
    // Navigate if needed FIRST, so that any modals opened by actionBefore are not closed by navigate
    const lastView = localStorage.getItem('vdot_lastView') || 'dashboard';
    if (step.view && lastView !== step.view) {
        navigate(step.view);
    }
    
    // Execute action before step if configured
    if (step.actionBefore) {
        step.actionBefore();
    }
    
    // Wait for view render with a retry mechanism for async elements
    let attempts = 0;
    const findAndHighlight = () => {
        let el = document.getElementById(step.target) || document.querySelector(step.target);
        
        // Se ainda não encontrou e tentou menos de 10 vezes (2 segundos max)
        if (!el && attempts < 10) {
            attempts++;
            setTimeout(findAndHighlight, 200);
            return;
        }
        
        const card = $('tour-card');
        const badge = $('tour-step-badge');
        const title = $('tour-step-title');
        const desc = $('tour-step-desc');
        const prevBtn = $('tour-prev-btn');
        const nextBtn = $('tour-next-btn');
        const progressFill = $('tour-progress-fill');
        
        if (!card) return;
        
        badge.textContent = `Passo ${stepIndex + 1}/${steps.length}`;
        title.textContent = step.title;
        desc.textContent = step.desc;
        
        prevBtn.style.visibility = stepIndex === 0 ? 'hidden' : 'visible';
        nextBtn.textContent = stepIndex === steps.length - 1 ? 'Concluir ✓' : 'Próximo →';
        
        // Update progress bar
        if (progressFill) {
            const pct = ((stepIndex + 1) / steps.length) * 100;
            progressFill.style.width = `${pct}%`;
        }
        
        if (el) {
            el.classList.add('tour-highlight');
            el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            
            // Wait for smooth scroll to finish to compute coordinates
            setTimeout(() => {
                const rect = el.getBoundingClientRect();
                const vw = window.innerWidth;
                const vh = window.innerHeight;
                const GAP = 20;
                
                // Force card to render to get real dimensions
                card.style.visibility = 'hidden';
                card.style.left = '0px';
                card.style.top = '0px';
                const cw = card.offsetWidth || 320;
                const ch = card.offsetHeight || 200;
                card.style.visibility = '';
                
                // Helper: does a candidate position overlap the target element?
                function overlaps(cl, ct) {
                    const cr = cl + cw;
                    const cb = ct + ch;
                    // Check if card rect overlaps element rect with a small buffer
                    const buf = 8;
                    return !(cr < rect.left - buf || cl > rect.right + buf || cb < rect.top - buf || ct > rect.bottom + buf);
                }
                
                // Helper: is candidate position inside the viewport?
                function fitsInViewport(cl, ct) {
                    return cl >= 8 && ct >= 8 && cl + cw <= vw - 8 && ct + ch <= vh - 8;
                }
                
                // Candidate positions: right, left, bottom, top (prefer the requested align first)
                function candidatePositions(preferAlign) {
                    const positions = {
                        right: {
                            left: rect.right + GAP,
                            top: Math.max(8, Math.min(rect.top + rect.height / 2 - ch / 2, vh - ch - 8))
                        },
                        left: {
                            left: rect.left - cw - GAP,
                            top: Math.max(8, Math.min(rect.top + rect.height / 2 - ch / 2, vh - ch - 8))
                        },
                        bottom: {
                            left: Math.max(8, Math.min(rect.left + rect.width / 2 - cw / 2, vw - cw - 8)),
                            top: rect.bottom + GAP
                        },
                        top: {
                            left: Math.max(8, Math.min(rect.left + rect.width / 2 - cw / 2, vw - cw - 8)),
                            top: rect.top - ch - GAP
                        }
                    };
                    
                    // Build priority order starting with preferred
                    const order = [preferAlign, 'right', 'left', 'bottom', 'top']
                        .filter((v, i, a) => a.indexOf(v) === i); // dedupe
                    
                    return order.map(k => ({ align: k, ...positions[k] }));
                }
                
                const candidates = candidatePositions(step.align || 'bottom');
                
                // Find first candidate that fits in viewport AND doesn't overlap the element
                let chosen = candidates.find(c => fitsInViewport(c.left, c.top) && !overlaps(c.left, c.top));
                
                // If nothing works, just pick the one that fits in viewport (allow slight overlap)
                if (!chosen) {
                    chosen = candidates.find(c => fitsInViewport(c.left, c.top));
                }
                
                // Last resort: clamp to viewport
                if (!chosen) {
                    chosen = {
                        left: Math.max(8, Math.min(candidates[0].left, vw - cw - 8)),
                        top: Math.max(8, Math.min(candidates[0].top, vh - ch - 8))
                    };
                }
                
                card.style.left = `${chosen.left}px`;
                card.style.top = `${chosen.top}px`;
            }, 150);
        } else {
            // Target not found — place card in bottom-right corner, out of the way
            card.style.right = '24px';
            card.style.bottom = '24px';
            card.style.left = 'auto';
            card.style.top = 'auto';
        }
    };
    findAndHighlight();
}

// ==========================================
//  BIBLIOTECA DE TREINOS ESTILO TRAININGPEAKS
// ==========================================

let historyLibraryVisible = true;
let libraryExpandedFolders = {
    recentes: true,
    minha: false,
    bike: true,
    run: true,
    swim: true,
    other: false
};

const preseededTemplates = [
    {
        id: 't-bike-1',
        title: 'Giro Regenerativo Ativo',
        type: 'bike',
        category: 'bike',
        description: '45 min giro leve na zona 1/2 para recuperação ativa. Cadência livre (> 90 rpm). Foco em relaxamento.',
        metrics: { distance: '20 km', duration: '45 min' },
        structured_steps: [
            { id: 101, type: 'warmup', label: 'Aquecimento', duration: { type: 'time', value: '10' }, intensity: { type: 'vam', value: 55 }, notes: 'Giro bem leve' },
            { id: 102, type: 'run', label: 'Rodagem Principal', duration: { type: 'time', value: '30' }, intensity: { type: 'vam', value: 65 }, notes: 'Z1/Z2 Cadência alta' },
            { id: 103, type: 'cooldown', label: 'Desaquecimento', duration: { type: 'time', value: '5' }, intensity: { type: 'vam', value: 50 }, notes: 'Soltar pernas' }
        ]
    },
    {
        id: 't-bike-2',
        title: 'Intervalado de VAM (5x3 min)',
        type: 'bike',
        category: 'bike',
        description: 'Aquecimento: 15 min Z2. Principal: 5 séries de [3 min em 100% VAM + 3 min recuperação Z1]. Desaquecimento: 10 min Z1.',
        metrics: { distance: '32 km', duration: '1h 15m' },
        structured_steps: [
            { id: 201, type: 'warmup', label: 'Aquecimento', duration: { type: 'time', value: '15' }, intensity: { type: 'vam', value: 60 }, notes: 'Progressivo' },
            { 
                id: 202, 
                type: 'repetition', 
                label: 'Séries de Tiros', 
                repeats: 5, 
                count: 5,
                steps: [
                    { id: 203, type: 'run', label: 'Tiro de VAM', duration: { type: 'time', value: '3' }, intensity: { type: 'vam', value: 100 }, notes: 'Ritmo forte' },
                    { id: 204, type: 'recovery', label: 'Recuperação', duration: { type: 'time', value: '3' }, intensity: { type: 'vam', value: 50 }, notes: 'Giro leve' }
                ]
            },
            { id: 205, type: 'cooldown', label: 'Desaquecimento', duration: { type: 'time', value: '10' }, intensity: { type: 'vam', value: 55 }, notes: 'Soltura' }
        ]
    },
    {
        id: 't-run-1',
        title: 'Rodagem Leve Z2',
        type: 'run',
        category: 'run',
        description: 'Corrida contínua na Zona 2 (Aeróbica Leve). Foco na consistência de ritmo, respiração e postura.',
        metrics: { distance: '8 km', duration: '50 min' },
        structured_steps: [
            { id: 301, type: 'warmup', label: 'Aquecimento', duration: { type: 'time', value: '10' }, intensity: { type: 'vam', value: 65 }, notes: 'Trote confortável' },
            { id: 302, type: 'run', label: 'Rodagem Z2', duration: { type: 'time', value: '35' }, intensity: { type: 'vam', value: 75 }, notes: 'Manter ritmo' },
            { id: 303, type: 'cooldown', label: 'Desaquecimento', duration: { type: 'time', value: '5' }, intensity: { type: 'vam', value: 60 }, notes: 'Caminhada solta' }
        ]
    },
    {
        id: 't-run-2',
        title: 'Intervalado Z5 - Tiros de 400m',
        type: 'run',
        category: 'run',
        description: 'Aquecimento: 2 km Z1/Z2 + alongamentos. Principal: 10 tiros de 400m em Z5 (VAM) com 1:30 de descanso caminhando. Desaquecimento: 1.5 km Z1.',
        metrics: { distance: '10 km', duration: '1h 05m' },
        structured_steps: [
            { id: 401, type: 'warmup', label: 'Aquecimento', duration: { type: 'time', value: '15' }, intensity: { type: 'vam', value: 65 }, notes: 'Trote + Mobilidade' },
            { 
                id: 402, 
                type: 'repetition', 
                label: 'Tiros de VAM', 
                repeats: 10, 
                count: 10,
                steps: [
                    { id: 403, type: 'run', label: 'Tiro 400m', duration: { type: 'distance', value: '0.4' }, intensity: { type: 'vam', value: 98 }, notes: 'Z5 VAM Máximo' },
                    { id: 404, type: 'recovery', label: 'Recuperação', duration: { type: 'time', value: '1.5' }, intensity: { type: 'vam', value: 50 }, notes: 'Caminhar/Trotar leve' }
                ]
            },
            { id: 405, type: 'cooldown', label: 'Desaquecimento', duration: { type: 'time', value: '10' }, intensity: { type: 'vam', value: 60 }, notes: 'Soltura' }
        ]
    },
    {
        id: 't-run-3',
        title: 'Longão de Domingo Z2/Z3',
        type: 'run',
        category: 'run',
        description: 'Longão focado em resistência. Ritmo confortável Z2, acelerando nos últimos 2 km para Z3 se as pernas permitirem.',
        metrics: { distance: '16 km', duration: '1h 40m' }
    },
    {
        id: 't-swim-1',
        title: 'Técnica e Sensibilidade na Água',
        type: 'swim',
        category: 'swim',
        description: '200m Aquecimento. 4x50m Educativos (cotovelo alto). 6x100m Ritmo Z2 confortável (20s descanso). 100m Soltura.',
        metrics: { distance: '1000 m', duration: '40 min' }
    },
    {
        id: 't-swim-2',
        title: 'Séries de Resistência Aeróbica',
        type: 'swim',
        category: 'swim',
        description: '400m Aquecimento. 3x400m Z3 com 45s de descanso entre as séries. 4x100m perna com prancha. 200m Soltura.',
        metrics: { distance: '2000 m', duration: '1h 10m' }
    },
    {
        id: 't-other-1',
        title: 'Fortalecimento Core & Mobilidade',
        type: 'other',
        category: 'other',
        description: 'Treino funcional. Pranchas, pontes e abdominais. Alongamento completo de quadril e pernas.',
        metrics: { distance: 'N/A', duration: '30 min' }
    }
];

function getCustomLibraryTemplates() {
    return JSON.parse(localStorage.getItem('custom_library_templates')) || [];
}

function saveCustomLibraryTemplate(template) {
    const custom = getCustomLibraryTemplates();
    custom.unshift(template);
    localStorage.setItem('custom_library_templates', JSON.stringify(custom));
}

function getAllLibraryTemplates() {
    return [...getCustomLibraryTemplates(), ...preseededTemplates];
}

function initHistoryLibrary() {
    const container = $('history-library-container');
    if (!container) return;
    
    // Set default visibility state
    if (historyLibraryVisible) {
        container.style.display = 'flex';
        $('library-toggle-text').textContent = 'Ocultar Biblioteca';
    } else {
        container.style.display = 'none';
        $('library-toggle-text').textContent = 'Mostrar Biblioteca';
    }
    
    renderLibraryTemplates();
}

function toggleHistoryLibrary() {
    historyLibraryVisible = !historyLibraryVisible;
    initHistoryLibrary();
}

function renderLibraryTemplates() {
    const container = $('library-folders-container');
    if (!container) return;
    
    const searchVal = ($('library-search')?.value || '').toLowerCase();
    const all = getAllLibraryTemplates();
    
    const filtered = all.filter(t => 
        t.title.toLowerCase().includes(searchVal) ||
        t.description.toLowerCase().includes(searchVal)
    );
    
    let html = '';
    
    const standardCategories = ['bike', 'run', 'swim', 'other'];
    const uniqueCustomCategories = [...new Set(all.map(t => t.category))].filter(cat => cat && !standardCategories.includes(cat));
    
    const folders = [
        { key: 'recentes', label: 'Recentes', cat: 'run', limit: 2 },
        { key: 'minha', label: 'A Minha Biblioteca', customOnly: true },
        { key: 'bike', label: 'Bike (TrainingPeaks)', cat: 'bike' },
        { key: 'run', label: 'Run (TrainingPeaks)', cat: 'run' },
        { key: 'swim', label: 'Swim (TrainingPeaks)', cat: 'swim' },
        ...uniqueCustomCategories.map(cat => ({
            key: cat.toLowerCase().replace(/[^a-z0-9]/g, ''),
            label: cat,
            cat: cat
        })),
        { key: 'other', label: 'Outros', cat: 'other' }
    ];
    
    folders.forEach(f => {
        let items = [];
        if (f.customOnly) {
            items = filtered.filter(t => t.id.startsWith('t-custom-'));
        } else if (f.limit) {
            items = filtered.filter(t => t.category === f.cat).slice(0, f.limit);
        } else {
            items = filtered.filter(t => t.category === f.cat);
        }
        
        const count = items.length;
        const expanded = libraryExpandedFolders[f.key];
        const arrow = expanded ? '▼' : '▶';
        
        html += `
            <div style="margin-bottom: 4px;">
                <button onclick="toggleLibraryFolder('${f.key}')" style="width: 100%; display: flex; align-items: center; justify-content: space-between; padding: 6px 8px; background: rgba(0,0,0,0.03); border: none; border-radius: 6px; cursor: pointer; text-align: left; font-weight: 700; font-size: 12px; color: var(--text);">
                    <span>${arrow} ${f.label} (${count})</span>
                </button>
                <div id="folder-list-${f.key}" style="display: ${expanded ? 'flex' : 'none'}; flex-direction: column; gap: 6px; padding: 6px 0 6px 12px; border-left: 1px dashed var(--border-strong); margin-top: 4px; margin-left: 6px;">
        `;
        
        if (count === 0) {
            html += `<span style="font-size: 11px; color: var(--text-muted); padding: 4px 6px;">Nenhum treino.</span>`;
        } else {
            items.forEach(item => {
                let borderLeftColor = 'var(--border-strong)';
                let icon = 'ri-clipboard-line';
                let iconColor = 'var(--text-muted)';
                
                if (item.type === 'bike') {
                    borderLeftColor = '#007AFF';
                    icon = 'ri-riding-line';
                    iconColor = '#007AFF';
                } else if (item.type === 'run') {
                    borderLeftColor = '#FF9500';
                    icon = 'ri-run-line';
                    iconColor = '#FF9500';
                } else if (item.type === 'swim') {
                    borderLeftColor = '#34C759';
                    icon = 'ri-water-flash-line';
                    iconColor = '#34C759';
                }
                
                html += `
                    <div draggable="true" ondragstart="handleTemplateDragStart(event, '${item.id}')" style="padding: 10px; background: var(--panel); border-radius: 8px; border: 1px solid var(--border-strong); border-left: 4px solid ${borderLeftColor}; cursor: grab; display: flex; flex-direction: column; gap: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); transition: all 0.2s;" onmouseover="this.style.boxShadow='0 3px 6px rgba(0,0,0,0.05)'; this.style.transform='translateY(-1px)';" onmouseout="this.style.boxShadow='0 1px 3px rgba(0,0,0,0.02)'; this.style.transform='none';">
                        <div style="display: flex; justify-content: space-between; align-items: center; font-weight: 700; font-size: 12px; color: var(--text);">
                            <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 220px;">${item.title}</span>
                            <i class="${icon}" style="color: ${iconColor}; font-size: 14px;"></i>
                        </div>
                        <div style="font-size: 11px; color: var(--text-muted); display: flex; gap: 8px;">
                            ${item.metrics?.duration ? `<span>⏱ ${item.metrics.duration}</span>` : ''}
                            ${item.metrics?.distance && item.metrics.distance !== 'N/A' ? `<span>🏃 ${item.metrics.distance}</span>` : ''}
                        </div>
                    </div>
                `;
            });
        }
        
        html += `
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function toggleLibraryFolder(folderKey) {
    libraryExpandedFolders[folderKey] = !libraryExpandedFolders[folderKey];
    renderLibraryTemplates();
}

function handleTemplateDragStart(e, templateId) {
    const all = getAllLibraryTemplates();
    const template = all.find(x => x.id === templateId);
    if (template) {
        e.dataTransfer.setData('text/workout-template', JSON.stringify(template));
        e.dataTransfer.effectAllowed = 'copy';
    }
}

function toggleLibraryAddDropdown(e) {
    if (e) {
        e.stopPropagation();
        e.preventDefault();
    }
    const dd = $('library-add-dropdown');
    if (!dd) return;
    const isVisible = dd.style.display === 'block';
    dd.style.display = isVisible ? 'none' : 'block';
}

// Fechar o dropdown ao clicar fora
document.addEventListener('click', () => {
    const dd = $('library-add-dropdown');
    if (dd) dd.style.display = 'none';
});

function openCreateLibraryWorkout(e) {
    if (e) e.stopPropagation();
    
    // Habilitar modo edição de template da biblioteca
    window._editingLibraryTemplateMode = true;
    window._editingLibraryTemplateId = null;
    
    // Abrir o modal profissional do Garmin reutilizando o método existente
    openEditWorkoutModal(null, '2026-05-30');
    
    // Atualizar labels no modal para ficar amigável para modelos
    const saveBtn = $('save-workout-btn') || document.querySelector('#modal-edit-workout .btn-primary');
    if (saveBtn) {
        saveBtn.textContent = 'Salvar Modelo';
    }
    
    // Esconder/desabilitar campos que não fazem sentido para templates (data, status, telemetria)
    const dateRow = $('edit-workout-date')?.closest('.form-row') || $('edit-workout-date');
    if (dateRow) dateRow.style.display = 'none';
    const statusRow = $('edit-workout-status')?.closest('.form-row') || $('edit-workout-status');
    if (statusRow) statusRow.style.display = 'none';
}

function closeLibraryCreateModal() {
    const modal = $('modal-library-create');
    if (modal) modal.style.display = 'none';
}

function showLibraryCreateModal(title, labelTitle, showDesc, callback) {
    const modal = $('modal-library-create');
    if (!modal) return;
    
    $('library-modal-title').textContent = title;
    $('library-modal-label-title').textContent = labelTitle;
    $('library-modal-input-title').value = '';
    
    const descGroup = $('library-modal-input-group-desc');
    if (descGroup) {
        descGroup.style.display = showDesc ? 'block' : 'none';
        $('library-modal-input-desc').value = '';
    }
    
    const confirmBtn = $('library-modal-confirm-btn');
    confirmBtn.onclick = () => {
        const titleVal = $('library-modal-input-title').value.trim();
        const descVal = showDesc ? $('library-modal-input-desc').value.trim() : '';
        
        if (!titleVal) {
            showToast('Por favor, preencha o campo!', 'error');
            return;
        }
        
        callback(titleVal, descVal);
        closeLibraryCreateModal();
    };
    
    modal.style.display = 'flex';
}

function createLibraryNote(e) {
    if (e) e.stopPropagation();
    
    showLibraryCreateModal('Criar Nota de Treino', 'Título da Nota', true, (title, description) => {
        const newTemplate = {
            id: 't-custom-' + Date.now(),
            title: title || 'Nota de Treino',
            type: 'other',
            category: 'other',
            description: description || '',
            metrics: { distance: 'N/A', duration: 'N/A' }
        };
        saveCustomLibraryTemplate(newTemplate);
        renderLibraryTemplates();
        showToast('Nota de Treino adicionada à biblioteca!', 'success');
    });
}

function createLibraryFolder(e) {
    if (e) e.stopPropagation();
    
    showLibraryCreateModal('Criar Nova Pasta', 'Nome da Pasta', false, (folderName) => {
        if (!folderName) return;
        
        const key = folderName.toLowerCase().replace(/[^a-z0-9]/g, '');
        libraryExpandedFolders[key] = true;
        
        const dummy = {
            id: 't-custom-' + Date.now(),
            title: 'Modelo Inicial de ' + folderName,
            type: 'other',
            category: folderName,
            description: 'Primeiro modelo da pasta ' + folderName,
            metrics: { distance: '--', duration: '--' }
        };
        saveCustomLibraryTemplate(dummy);
        
        renderLibraryTemplates();
        showToast('Pasta "' + folderName + '" criada com sucesso!', 'success');
    });
}

async function createWorkoutFromTemplate(template, targetDateStr) {
    const a = athletes.find(x => x.id == currentHistoryAthleteId);
    if (!a || !a.supabaseId) {
        showToast('Atleta manual não possui ID de conta vinculada.', 'error');
        return;
    }
    
    showToast('Adicionando treino no calendário...', 'default');
    
    const { data, error } = await dbClient
        .from('workouts')
        .insert([{
            athlete_id: a.supabaseId,
            date: targetDateStr,
            title: template.title,
            type: template.type,
            description: template.description,
            metrics: template.metrics || { distance: '--', duration: '--' },
            status: 'planned'
        }]);
        
    if (error) {
        console.error(error);
        showToast('Erro ao criar treino.', 'error');
    } else {
        showToast('Treino adicionado ao calendário!', 'success');
        loadCalendarWorkouts();
    }
}

function buildWorkoutVisualGraphHtml(steps) {
    if (!steps || steps.length === 0) return '';
    
    // Calcular a duração total e criar a lista de etapas contínuas desmembradas
    let totalDuration = 0;
    const flatSteps = []; // Desmembrar repetições para ficarem lado a lado sem caixas limitadoras, igual no TrainingPeaks
    
    steps.forEach(s => {
        if (s.type === 'repetition') {
            const count = parseInt(s.repeats) || 2;
            if (Array.isArray(s.steps)) {
                for (let r = 0; r < count; r++) {
                    s.steps.forEach(sub => {
                        const val = parseFloat(sub.duration?.value) || 5;
                        totalDuration += val;
                        
                        let intensityVal = 85;
                        if (sub.intensity && sub.intensity.value !== undefined && sub.intensity.value !== '') {
                            intensityVal = parseFloat(sub.intensity.value) || 85;
                        }
                        
                        flatSteps.push({
                            type: sub.type || 'run',
                            label: `${r + 1}x ${sub.label || 'Intervalo'}`,
                            duration: val,
                            intensity: intensityVal,
                            isRepetition: true,
                            repIndex: r + 1
                        });
                    });
                }
            }
        } else {
            const val = parseFloat(s.duration?.value) || 10;
            totalDuration += val;
            
            let intensityVal = 70;
            if (s.intensity && s.intensity.value !== undefined && s.intensity.value !== '') {
                intensityVal = parseFloat(s.intensity.value) || 70;
            } else if (s.type === 'warmup') {
                intensityVal = 60;
            } else if (s.type === 'cooldown') {
                intensityVal = 55;
            }
            
            flatSteps.push({
                type: s.type,
                label: s.label || phaseLabels[s.type] || s.type,
                duration: val,
                intensity: intensityVal,
                isRepetition: false
            });
        }
    });
    
    if (totalDuration <= 0) totalDuration = 1;
    
    // Calcular tempos cumulativos para o eixo X
    let currentCumulative = 0;
    const timelineTicks = [{ pct: 0, time: '0m' }];
    flatSteps.forEach(s => {
        currentCumulative += s.duration;
        const pct = (currentCumulative / totalDuration) * 100;
        timelineTicks.push({
            pct: pct,
            time: `${Math.round(currentCumulative)}m`
        });
    });
    
    // HTML do visualizador remodelado (Visual idêntico ao TrainingPeaks)
    let labelColsHtml = '';
    let barColsHtml = '';
    
    flatSteps.forEach((s, idx) => {
        // Altura baseada na intensidade (limite de 120% VAM)
        const barHeight = Math.max(15, Math.min(100, (s.intensity / 120) * 100));
        
        // Cores e Destaques idênticos ao TrainingPeaks (Azul/Ciano clássico do TP ou cores por esforço)
        let mainColor = '#0f63e6'; // Corpo da Barra
        let accentColor = '#60a5fa'; // Linha de Topo (Highlight)
        
        const workoutType = $('edit-workout-type')?.value?.toLowerCase() || '';
        
        if (workoutType.includes('corrida') || workoutType.includes('run')) {
            if (s.intensity >= 90) {
                mainColor = '#b91c1c'; // Vermelho Escuro
                accentColor = '#ef4444'; // Vermelho Vivo
            } else if (s.intensity >= 80) {
                mainColor = '#c2410c'; // Laranja Escuro
                accentColor = '#f97316'; // Laranja Vivo
            } else if (s.intensity >= 70) {
                mainColor = '#a16207'; // Amarelo Escuro
                accentColor = '#eab308'; // Amarelo Vivo
            } else {
                mainColor = '#1d4ed8'; // Azul Escuro
                accentColor = '#3b82f6'; // Azul Vivo
            }
        } else if (workoutType.includes('natação') || workoutType.includes('swim')) {
            mainColor = '#047857'; // Verde Escuro
            accentColor = '#10b981'; // Verde Vivo
        }
        
        if (s.type === 'warmup') {
            mainColor = '#475569'; // Cinza Escuro
            accentColor = '#94a3b8'; // Cinza Vivo
        } else if (s.type === 'cooldown') {
            mainColor = '#334155'; // Cinza Mais Escuro
            accentColor = '#64748b'; // Slate
        }
        
        // Label acima das barras sincronizado por flex
        // Exibimos a legenda apenas em blocos principais ou se tiver espaço suficiente
        const cleanLabel = s.duration >= 3 ? `${s.label} (${s.duration} min)` : '';
        
        labelColsHtml += `
            <div style="flex: ${s.duration}; text-align: left; font-size: 8px; font-weight: 700; color: #475569; padding: 0 4px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; border-left: 1px solid transparent; user-select: none;" title="${s.label} - ${s.duration} min">
                ${cleanLabel}
            </div>
        `;
        
        // Coluna do gráfico
        barColsHtml += `
            <div style="flex: ${s.duration}; height: ${barHeight}%; background: ${mainColor}; border-top: 3px solid ${accentColor}; border-right: 1px solid rgba(255, 255, 255, 0.15); transition: all 0.15s; position: relative; cursor: pointer;" 
                 onmouseover="this.style.filter='brightness(1.15)';" 
                 onmouseout="this.style.filter='none';" 
                 title="${s.label}: ${s.duration} min @ ${s.intensity}% VAM">
            </div>
        `;
    });
    
    // Construir ticks do Eixo X no rodapé
    let xAxisHtml = '';
    timelineTicks.forEach((tick, i) => {
        // Evitar renderizar ticks muito colados
        if (i > 0 && i < timelineTicks.length - 1 && tick.pct - timelineTicks[i-1].pct < 8) return;
        
        xAxisHtml += `
            <div style="position: absolute; left: ${tick.pct}%; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; gap: 2px;">
                <div style="width: 1px; height: 5px; background: #cbd5e1;"></div>
                <span style="font-size: 8px; font-weight: 700; color: #94a3b8;">${tick.time}</span>
            </div>
        `;
    });
    
    let html = `
        <div class="workout-visual-graph" style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 12px; padding: 16px; margin-bottom: 24px; display: flex; flex-direction: column; gap: 0px; width: 100%; flex-shrink: 0; font-family: system-ui, -apple-system, sans-serif; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            
            <!-- Barra Superior de Info -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">
                <span style="font-size: 10px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.5px;">
                    ESTRUTURA DE BLOCOS (ESTILO TRAININGPEAKS)
                </span>
                <span style="font-size: 10px; font-weight: 800; color: #0f63e6; background: #eff6ff; padding: 2px 8px; border-radius: 4px; border: 1px solid rgba(15, 99, 230, 0.1);">${totalDuration.toFixed(0)} min total</span>
            </div>
            
            <!-- Linha 1: Legendas Acima das Barras (Sincronizado) -->
            <div style="display: flex; width: 100%; height: 18px; align-items: center; padding-left: 50px; padding-right: 10px; margin-bottom: 4px;">
                ${labelColsHtml}
            </div>
            
            <!-- Linha 2: Área de Gráfico Principal com Eixo Y e Colunas Coladas -->
            <div style="display: flex; position: relative; height: 130px; width: 100%; background: #ffffff; border-bottom: 2px solid #64748b; overflow: hidden; padding-right: 10px;">
                
                <!-- Eixo Y (Frequência / % VAM) -->
                <div style="width: 50px; height: 100%; display: flex; flex-direction: column; justify-content: space-between; align-items: flex-end; padding-right: 10px; border-right: 1px solid #e2e8f0; font-size: 8px; font-weight: 700; color: #94a3b8; user-select: none;">
                    <span>120%</span>
                    <span>90%</span>
                    <span>60%</span>
                    <span>30%</span>
                </div>

                <!-- Grid de Fundo e Barras sem gap (Igual no TrainingPeaks) -->
                <div style="flex: 1; height: 100%; display: flex; align-items: flex-end; position: relative; border-bottom: 1px solid #cbd5e1;">
                    
                    <!-- Linhas de Grade Tracejadas Horizontais -->
                    <div style="position: absolute; left: 0; right: 0; top: 0%; border-top: 1px dashed #e2e8f0; pointer-events: none; z-index: 1;"></div>
                    <div style="position: absolute; left: 0; right: 0; top: 25%; border-top: 1px dashed #f1f5f9; pointer-events: none; z-index: 1;"></div>
                    <div style="position: absolute; left: 0; right: 0; top: 50%; border-top: 1px dashed #f1f5f9; pointer-events: none; z-index: 1;"></div>
                    <div style="position: absolute; left: 0; right: 0; top: 75%; border-top: 1px dashed #f1f5f9; pointer-events: none; z-index: 1;"></div>
                    
                    <!-- Barras de Bloco de Treino -->
                    ${barColsHtml}
                </div>
            </div>
            
            <!-- Linha 3: Eixo X / Linha do Tempo Cumulativa -->
            <div style="position: relative; width: 100%; height: 20px; margin-top: 2px; padding-left: 50px; padding-right: 10px;">
                ${xAxisHtml}
            </div>
        </div>
    `;
    
    return html;
}



