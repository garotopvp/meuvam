// ═══════════════════════════════════════
//  MeuVAM v1.2 — by Superação
// ═══════════════════════════════════════

// ─── SUPABASE ───
const supabaseUrl = 'https://zljqlzwzwfzslftnymur.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsanFsend6d2Z6c2xmdG55bXVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczOTM0MTcsImV4cCI6MjA5Mjk2OTQxN30.fQVJWpPVw5ZmV-FXpLyqpUoXvITOAedvbRpxlzdm-Ec';

// Usar o cliente do auth.js se disponível para manter a sessão
let dbClient = (typeof supabaseClient !== 'undefined' && supabaseClient) ? supabaseClient : supabase.createClient(supabaseUrl, supabaseKey);

// ─── STATE ───
let rawCats   = JSON.parse(localStorage.getItem('vdot_cats'));
let rawGroups = JSON.parse(localStorage.getItem('vdot_groups')) || [];
if (!rawCats) {
    rawCats = [...new Set(rawGroups.map(g => g.category || 'Geral'))];
    if (!rawCats.length) rawCats = ['5km','10km','Maratona'];
}
rawGroups = rawGroups.map(g => ({...g, category:g.category||'Geral',
    plan: g.plan.map(p => p.phases ? p : {active:p.active,phases:[
        {type:'warmup',volPct:0,vamPct:0,desc:''},{type:'main',volPct:p.volPct||0,vamPct:p.vamPct||0,desc:p.desc||''},{type:'cooldown',volPct:0,vamPct:0,desc:''}]})
}));
if(!rawGroups.length){
    if(!rawCats.includes('5km')) rawCats.push('5km');
    rawGroups=[{id:1,name:"Base 1 (Início)",category:"5km",volume:30,plan:[
        {active:true,phases:[{type:'warmup',volPct:10,vamPct:65,desc:"Trote"},{type:'main',volPct:15,vamPct:85,desc:"Tiros curtos"},{type:'cooldown',volPct:5,vamPct:60,desc:"Caminhada"}]},
        {active:false,phases:[{type:'warmup',volPct:0,vamPct:0,desc:''},{type:'main',volPct:0,vamPct:0,desc:''},{type:'cooldown',volPct:0,vamPct:0,desc:''}]},
        {active:true,phases:[{type:'warmup',volPct:0,vamPct:0,desc:''},{type:'main',volPct:20,vamPct:75,desc:"Rodagem leve"},{type:'cooldown',volPct:0,vamPct:0,desc:''}]},
        {active:false,phases:[{type:'warmup',volPct:0,vamPct:0,desc:''},{type:'main',volPct:0,vamPct:0,desc:''},{type:'cooldown',volPct:0,vamPct:0,desc:''}]},
        {active:true,phases:[{type:'warmup',volPct:5,vamPct:65,desc:''},{type:'main',volPct:15,vamPct:80,desc:"Fartlek"},{type:'cooldown',volPct:5,vamPct:65,desc:''}]},
        {active:false,phases:[{type:'warmup',volPct:0,vamPct:0,desc:''},{type:'main',volPct:0,vamPct:0,desc:''},{type:'cooldown',volPct:0,vamPct:0,desc:''}]},
        {active:true,phases:[{type:'warmup',volPct:0,vamPct:0,desc:''},{type:'main',volPct:30,vamPct:65,desc:"Longo"},{type:'cooldown',volPct:0,vamPct:0,desc:''}]}
    ]}];
}
let categories=rawCats, groups=rawGroups;
let athletes=JSON.parse(localStorage.getItem('vdot_athletes'))||[];
let historyPlans=JSON.parse(localStorage.getItem('vdot_history'))||[];
let activeCategory=null, athleteSort={key:'name',asc:true};
let _currentStravaActivities = [];
let _currentGarminActivities = [];

// ─── SAVE ───
function saveState(k=['cats','groups','athletes','history']){
    if(k.includes('cats'))localStorage.setItem('vdot_cats',JSON.stringify(categories));
    if(k.includes('groups'))localStorage.setItem('vdot_groups',JSON.stringify(groups));
    if(k.includes('athletes'))localStorage.setItem('vdot_athletes',JSON.stringify(athletes));
    if(k.includes('history'))localStorage.setItem('vdot_history',JSON.stringify(historyPlans));
}

// ─── DOM ───
const $=id=>document.getElementById(id);
const allModals=['modal-group','modal-athlete','modal-history','modal-export','modal-assign','modal-duplicate','modal-strava','modal-strava-graph','modal-garmin-details','modal-activity-detail'].map(id=>$(id)).filter(Boolean);
const daysNames=['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'];
const phaseLabels={warmup:'Aquecimento',main:'Principal',cooldown:'Desaquec.'};
const VAM_ZONES=[{label:'Recuperação',pct:60,color:'#94a3b8'},{label:'Aeróbico Leve',pct:70,color:'#3b82f6'},{label:'Aeróbico',pct:80,color:'#10b981'},{label:'Limiar',pct:90,color:'#f59e0b'},{label:'VAM (Máximo)',pct:100,color:'#ef4444'}];

// ─── UTILS ───
function generateId(){return Date.now();}
function formatPace(p){let m=Math.floor(p),s=Math.round((p-m)*60);if(s===60){m++;s=0;}return`${m}:${s.toString().padStart(2,'0')}`;}
function vamToPace(k){if(!k||k<=0)return'Livre';return formatPace(60/k)+'/km';}
function closeModals(){allModals.forEach(m=>m.classList.remove('show'));}
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModals();});

let _toastTimer=null,_undoFn=null;
function showToast(msg,type='default',undoFn=null){
    const t=$('toast');$('toast-msg').textContent=msg;
    t.style.background=type==='error'?'#ef4444':'#111827';
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
}
(function initTheme(){
    const t=localStorage.getItem('vdot_theme');
    if(t)document.documentElement.setAttribute('data-theme',t);
    updateThemeUI();
})();

// ─── MOBILE SIDEBAR ───
function toggleSidebar(){
    $('sidebar').classList.toggle('open');
    $('sidebar-overlay').classList.toggle('open');
}

// ─── NAVIGATION ───
function navigate(viewId,cat){
    console.log('Navegando para:', viewId);
    try {
        if(viewId!=='groups')activeCategory=null;
        if(viewId==='groups'&&cat!==undefined)activeCategory=cat;
        
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
        if(viewId==='strava-feed') renderStravaFeed();
        if(viewId==='garmin-feed') {
            renderGarminFeed();
            setTimeout(() => syncAthletesFromSupabase(), 100);
        }
        if(viewId==='calculator') renderCalculator();
        
        // Close mobile sidebar
        $('sidebar')?.classList.remove('open');
        $('sidebar-overlay')?.classList.remove('open');
    } catch (err) {
        console.error('Falha na navegação:', err);
    }
}
document.querySelectorAll('.nav-item').forEach(item=>{item.addEventListener('click',e=>{e.preventDefault();navigate(e.currentTarget.dataset.view);});});
(function restoreNav(){const v=localStorage.getItem('vdot_lastView')||'dashboard';const c=localStorage.getItem('vdot_lastCat')||'';if(c&&v==='groups')activeCategory=c;navigate(v);})();

// ═══════════════════════════════════════
//  DASHBOARD
// ═══════════════════════════════════════
function renderDashboard(){
    const h=new Date().getHours();
    $('dashboard-greeting').textContent=`${h<12?'Bom dia':h<18?'Boa tarde':'Boa noite'}! Resumo da assessoria.`;
    $('stat-athletes').textContent=athletes.length;
    $('stat-athletes-sub').textContent=athletes.length===0?'Nenhum cadastrado':`${athletes.filter(a=>a.groupId).length} com planilha`;
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
    const noGroup=athletes.filter(a=>!a.groupId);
    if(noGroup.length)notifs.push({icon:'ri-user-unfollow-line',color:'#f59e0b',msg:`${noGroup.length} atleta(s) sem planilha associada`,action:`navigate('athletes')`});
    const noTest=athletes.filter(a=>!a.testTime);
    if(noTest.length)notifs.push({icon:'ri-flask-line',color:'#ef4444',msg:`${noTest.length} atleta(s) sem teste VAM registrado`,action:`navigate('athletes')`});
    $('dashboard-notifs').innerHTML=notifs.map(n=>`<div style="display:flex;align-items:center;gap:12px;padding:12px 16px;background:${n.color}10;border:1px solid ${n.color}30;border-radius:var(--radius);cursor:pointer;" onclick="${n.action}">
        <i class="${n.icon}" style="font-size:18px;color:${n.color};"></i>
        <span style="font-size:13px;font-weight:600;color:${n.color};">${n.msg}</span>
        <i class="ri-arrow-right-s-line" style="margin-left:auto;color:${n.color};opacity:0.5;"></i>
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
    zones.innerHTML=VAM_ZONES.map(z=>{const spd=vam*(z.pct/100);return`<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;border-radius:6px;background:var(--bg);border-left:4px solid ${z.color};"><span style="font-size:13px;font-weight:600;">${z.label} (${z.pct}%)</span><span style="font-size:14px;font-weight:800;color:${z.color};">${vamToPace(spd)}</span></div>`;}).join('');
    if($('calc-distance-table'))$('calc-distance-table').style.display='block';
    const thR=`<tr style="background:var(--bg);"><th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text-muted);">Dist.</th><th style="padding:10px 16px;text-align:center;font-size:11px;font-weight:700;color:var(--text-muted);">% VAM</th><th style="padding:10px 16px;text-align:right;font-size:11px;font-weight:700;color:var(--text-muted);">Pace</th></tr>`;
    if($('tbl-short'))$('tbl-short').innerHTML=thR+DIST_SHORT.map((d,i)=>`<tr style="${i%2===0?'background:var(--bg);':''}"><td style="padding:10px 16px;font-weight:600;">${d.label}</td><td style="padding:10px 16px;text-align:center;color:#ef4444;font-weight:700;">${d.pct}%</td><td style="padding:10px 16px;text-align:right;font-weight:800;">${vamToPace(vam*(d.pct/100))}</td></tr>`).join('');
    if($('tbl-long'))$('tbl-long').innerHTML=thR+DIST_LONG.map((d,i)=>`<tr style="${i%2===0?'background:var(--bg);':''}"><td style="padding:10px 16px;font-weight:600;">${d.label}</td><td style="padding:10px 16px;text-align:center;color:#2563eb;font-weight:700;">${d.pct}%</td><td style="padding:10px 16px;text-align:right;font-weight:800;">${vamToPace(vam*(d.pct/100))}</td></tr>`).join('');
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
    const rows=splits.map((k,i)=>{const el=psk*k;const eH=Math.floor(el/3600),eM=Math.floor((el%3600)/60),eS=Math.round(el%60);const ts=eH>0?`${eH}h ${eM.toString().padStart(2,'0')}:${eS.toString().padStart(2,'0')}`:`${eM.toString().padStart(2,'0')}:${eS.toString().padStart(2,'0')}`;const fin=i===splits.length-1;const bg=fin?'background:linear-gradient(135deg,#0f172a,#1e3a5f);':(i%2===0?'background:var(--bg);':'');const fg=fin?'color:#fff;':'';const lb=fin&&k!==Math.round(k)?`${k.toFixed(3)} km 🏁`:`${k%1===0?k:k.toFixed(3)} km`;
        return`<tr style="${bg}"><td style="padding:11px 20px;font-weight:700;${fg}">${lb}</td><td style="padding:11px 20px;font-weight:600;${fg}">${ps}</td><td style="padding:11px 20px;font-weight:800;text-align:right;${fg}">${ts}</td></tr>`;}).join('');
    $('race-splits-body').innerHTML=`<table style="width:100%;border-collapse:collapse;font-size:13px;"><thead><tr style="background:var(--bg);"><th style="padding:10px 20px;text-align:left;font-size:11px;color:var(--text-muted);">Split</th><th style="padding:10px 20px;text-align:left;font-size:11px;color:var(--text-muted);">Pace</th><th style="padding:10px 20px;text-align:right;font-size:11px;color:var(--text-muted);">Acumulado</th></tr></thead><tbody>${rows}</tbody></table>`;
}
function calcTreadmill(mode){
    if(mode==='speed'){const s=parseFloat($('tread-speed').value),el=$('tread-speed-result');if(!s||s<=0){el.style.display='none';return;}el.style.display='block';$('tread-pace-out').textContent=formatPace(60/s)+'/km';}
    else{const mm=Math.max(0,parseInt($('tread-pace-m').value)||0),ss=Math.max(0,parseInt($('tread-pace-s').value)||0),el=$('tread-pace-result'),p=mm+ss/60;if(p<=0){el.style.display='none';return;}el.style.display='block';$('tread-speed-out').textContent=(60/p).toFixed(1)+' km/h';}
}
function buildTreadmillQuickTable(){
    const speeds=[{kmh:8,level:'Caminhada rápida',color:'#94a3b8'},{kmh:9,level:'Trote suave',color:'#64748b'},{kmh:10,level:'Regenerativo',color:'#10b981'},{kmh:11,level:'Aeróbico leve',color:'#3b82f6'},{kmh:12,level:'Aeróbico',color:'#2563eb'},{kmh:13,level:'Aeróbico forte',color:'#6366f1'},{kmh:14,level:'Limiar inferior',color:'#f59e0b'},{kmh:15,level:'Limiar',color:'#f97316'},{kmh:16,level:'Limiar superior',color:'#ef4444'},{kmh:17,level:'VAM 5km',color:'#dc2626'},{kmh:18,level:'VAM 3km',color:'#b91c1c'},{kmh:20,level:'VAM máximo',color:'#7f1d1d'}];
    const tb=$('tread-quick-table');if(!tb)return;
    tb.innerHTML=speeds.map((s,i)=>`<tr style="${i%2===0?'background:var(--bg);':''}"><td style="padding:10px 16px;font-weight:800;color:${s.color};">${s.kmh} km/h</td><td style="padding:10px 16px;font-weight:700;">${formatPace(60/s.kmh)}/km</td><td style="padding:10px 16px;"><span style="background:${s.color}22;color:${s.color};padding:2px 10px;border-radius:12px;font-size:12px;font-weight:600;">${s.level}</span></td></tr>`).join('');
}

// ═══════════════════════════════════════
//  CATEGORIES
// ═══════════════════════════════════════
function openCategoryModal(){const n=prompt('Nome da nova pasta? (Ex: 21km)');if(!n||!n.trim())return;if(categories.includes(n.trim())){showToast('Já existe!','error');return;}categories.push(n.trim());saveState(['cats']);renderGroups();showToast('Pasta criada!');}
function viewCategory(cat){activeCategory=cat;localStorage.setItem('vdot_lastCat',cat||'');renderGroups();}
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
                        <button class="btn btn-tertiary" onclick="deleteCategory('${cat}')" style="color:var(--danger);"><i class="ri-delete-bin-line"></i></button>
                    </div>
                </div>
            </div>`;}).join('')}</div>`;
    } else {
        header.style.display='none';
        const cg=groups.filter(g=>g.category===activeCategory);
        const cards=cg.map(g=>{
            const rows=g.plan.map((d,i)=>{
                if(!d.active)return'';
                const phases = d.phases || [];
                const ph=phases.filter(p=>p.volPct>0 || p.km).map(p=>{
                    const label = phaseLabels[p.type] || p.title || p.type;
                    const detail = p.km ? `${p.km}km @ ${p.pace || 'Livre'}` : `${p.volPct}%V / ${p.vamPct}%VAM`;
                    return `<div class="plan-ph"><span><strong>${label}:</strong> ${detail}</span>${p.desc?`<span style="font-style:italic;color:#059669;">${p.desc}</span>`:''}</div>`;
                }).join('');
                return`<div class="plan-row"><div class="plan-row-top"><div class="day">${daysNames[i]}</div></div>${ph}</div>`;
            }).join('');
            return`<div class="plan-card"><div class="plan-header"><div><h3>${g.name}</h3><span style="font-size:11px;color:var(--text-muted);">Vol: ${g.volume}km/sem</span></div><div style="display:flex;gap:2px;">
                <button class="btn btn-tertiary" onclick="openAssignModal(${g.id})" title="Vincular Alunos"><i class="ri-user-add-line"></i></button>
                <button class="btn btn-tertiary" onclick="openDuplicateModal(${g.id})" title="Duplicar p/ outra pasta"><i class="ri-folders-line"></i></button>
                <button class="btn btn-tertiary" onclick="cloneGroup(${g.id})" title="Clonar"><i class="ri-file-copy-line"></i></button>
                <button class="btn btn-tertiary" onclick="editGroup(${g.id})" title="Editar"><i class="ri-edit-line"></i></button>
                <button class="btn btn-tertiary" onclick="deleteGroup(${g.id})" style="color:var(--danger);" title="Excluir"><i class="ri-delete-bin-line"></i></button>
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
    modal.dataset.editing = id || '';
    modal.dataset.category = isEdit ? (groups.find(x => x.id === id) || {}).category : cat;
    
    const g = id ? groups.find(x => x.id === id) : null;
    const title = g ? g.name : 'Treino de corrida';
    $('group-name').value = title;
    $('display-group-name').textContent = title;
    
    // Initialize or Clone Plan
    if (g && g.plan) {
        _editingPlan = JSON.parse(JSON.stringify(g.plan));
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

    const stepsHtml = day.steps.map((step, idx) => {
        if (step.type === 'repetition') {
            return renderRepetitionStep(step, idx);
        }
        return renderNormalStep(step, idx);
    }).join('');

    container.innerHTML = `
        <div class="steps-list" id="main-steps-list">
            ${stepsHtml || '<div style="padding:40px; text-align:center; color:var(--text-muted); border:2px dashed #eee; border-radius:8px;">Arraste as etapas para cá ou use os botões ao lado.</div>'}
        </div>
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

function renderNormalStep(step, idx, parentIdx = null) {
    const isExpanded = _expandedStepIdx === idx && _expandedParentIdx === parentIdx;
    const typeLabels = { 
        warmup: 'Aquecimento', 
        run: 'Corrida', 
        walk: 'Caminhada', 
        recovery: 'Recuperação', 
        rest: 'Descanso', 
        cooldown: 'Desaquecimento', 
        other: 'Outros' 
    };
    
    // Duration display string
    let durStr = "";
    if (step.duration.type === 'distance') durStr = `${step.duration.value} km`;
    else durStr = `${step.duration.value} min`;

    // Intensity display string
    let intStr = step.intensity.value > 0 ? `${step.intensity.value}% VAM` : "Sem meta";

    if (isExpanded) {
        return `
            <div class="step-card expanded" style="flex-direction: column; min-height: auto; border-bottom: 2px solid var(--primary);">
                <div style="display: flex; align-items: stretch;">
                    <div class="step-indicator ${step.type}"></div>
                    <div class="step-drag-handle"><i class="ri-more-2-fill" style="transform: rotate(90deg);"></i></div>
                    <div class="step-content">
                        <select onchange="updateStepField(${idx}, 'type', this.value, ${parentIdx}); renderEditorSteps();" style="border:none; font-size:16px; padding:0; font-weight:400;">
                            <option value="warmup" ${step.type === 'warmup' ? 'selected' : ''}>Aquecimento</option>
                            <option value="run" ${step.type === 'run' ? 'selected' : ''}>Corrida</option>
                            <option value="walk" ${step.type === 'walk' ? 'selected' : ''}>Caminhada</option>
                            <option value="recovery" ${step.type === 'recovery' ? 'selected' : ''}>Recuperação</option>
                            <option value="rest" ${step.type === 'rest' ? 'selected' : ''}>Descanso</option>
                            <option value="cooldown" ${step.type === 'cooldown' ? 'selected' : ''}>Desaquecimento</option>
                            <option value="other" ${step.type === 'other' ? 'selected' : ''}>Outros</option>
                        </select>
                    </div>
                    <div class="step-action-links" style="padding-right: 16px;">
                        <button class="btn-text-link" onclick="toggleExpandStep(${idx}, ${parentIdx})">Concluir</button>
                        <i class="ri-delete-bin-line" style="color:#999; cursor:pointer;" onclick="removeEditorStep(${idx}, ${parentIdx})"></i>
                    </div>
                </div>
                
                <div style="padding: 20px 40px; background: #fafafa; border-top: 1px solid #eee;">
                    <div style="display: flex; gap: 40px; margin-bottom: 20px;">
                        <div style="flex: 1;">
                            <label class="small-label" style="font-size: 11px; margin-bottom: 10px;">Tipo de duração</label>
                            <select onchange="updateStepNestedField(${idx}, 'duration', 'type', this.value, ${parentIdx}); renderEditorSteps();" style="width: 100%;">
                                <option value="time" ${step.duration.type === 'time' ? 'selected' : ''}>Tempo</option>
                                <option value="distance" ${step.duration.type === 'distance' ? 'selected' : ''}>Distância</option>
                            </select>
                            ${step.duration.type !== 'lap_button' ? `
                                <div style="margin-top: 10px;">
                                    <label class="small-label" style="font-size: 11px; margin-bottom: 5px;">${step.duration.type === 'time' ? 'Tempo' : 'Distância'}</label>
                                    <input type="text" value="${step.duration.value}" onchange="updateStepNestedField(${idx}, 'duration', 'value', this.value, ${parentIdx})" style="width: 100%;">
                                </div>
                            ` : ''}
                        </div>
                        <div style="flex: 1;">
                            <label class="small-label" style="font-size: 11px; margin-bottom: 10px;">Meta de intensidade</label>
                            <select onchange="updateStepNestedField(${idx}, 'intensity', 'type', this.value, ${parentIdx}); renderEditorSteps();" style="width: 100%;">
                                <option value="none" ${step.intensity.type === 'none' ? 'selected' : ''}>Sem objetivo</option>
                                <option value="vam" ${step.intensity.type === 'vam' ? 'selected' : ''}>% VAM (Recomendado)</option>
                                <option value="pace" ${step.intensity.type === 'pace' ? 'selected' : ''}>Ritmo</option>
                                <option value="hr_zone" ${step.intensity.type === 'hr_zone' ? 'selected' : ''}>Zona de frequência cardíaca</option>
                                <option value="cadence" ${step.intensity.type === 'cadence' ? 'selected' : ''}>Cadência</option>
                            </select>
                            ${step.intensity.type === 'vam' ? `
                                <div style="margin-top: 10px;">
                                    <label class="small-label" style="font-size: 11px; margin-bottom: 5px;">Objetivo de % VAM</label>
                                    <div style="display: flex; align-items: center; gap: 8px;">
                                        <input type="number" value="${step.intensity.value}" onchange="updateStepNestedField(${idx}, 'intensity', 'value', this.value, ${parentIdx})" style="width: 80px;">
                                        <span style="font-weight: 700; color: #666;">%</span>
                                    </div>
                                </div>
                            ` : ''}
                            ${step.intensity.type === 'pace' ? `
                                <div style="margin-top: 10px;">
                                    <label class="small-label" style="font-size: 11px; margin-bottom: 5px;">Ritmo alvo</label>
                                    <input type="text" placeholder="5:30" value="${step.intensity.value || ''}" onchange="updateStepNestedField(${idx}, 'intensity', 'value', this.value, ${parentIdx})" style="width: 100%;">
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    return `
        <div class="step-card">
            <div class="step-indicator ${step.type}"></div>
            <div class="step-drag-handle"><i class="ri-more-2-fill" style="transform: rotate(90deg);"></i></div>
            <div class="step-content">
                <div class="step-header">
                    <span class="step-type-label">${step.label || typeLabels[step.type]}</span>
                    <div class="step-action-links">
                        <button class="btn-text-link" onclick="toggleExpandStep(${idx}, ${parentIdx})">Editar etapa</button>
                        <i class="ri-delete-bin-line" style="color:#999; cursor:pointer;" onclick="removeEditorStep(${idx}, ${parentIdx})"></i>
                    </div>
                </div>
                <div style="display: flex; gap: 40px; margin-top: 10px;">
                    <div>
                        <div style="font-size: 15px; font-weight: 500;">${durStr}</div>
                        <div style="font-size: 11px; color: #888;">Duração</div>
                    </div>
                    <div>
                        <div style="font-size: 15px; font-weight: 500;">${intStr}</div>
                        <div style="font-size: 11px; color: #888;">Meta de intensidade</div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function toggleExpandStep(idx, parentIdx = null) {
    if (_expandedStepIdx === idx && _expandedParentIdx === parentIdx) {
        _expandedStepIdx = null;
        _expandedParentIdx = null;
    } else {
        _expandedStepIdx = idx;
        _expandedParentIdx = parentIdx;
    }
    renderEditorSteps();
}

function renderRepetitionStep(step, idx) {
    const innerStepsHtml = step.steps.map((s, sIdx) => renderNormalStep(s, sIdx, idx)).join('');
    return `
        <div class="step-card repetition-card" data-index="${idx}" style="flex-direction: column; min-height: auto;">
            <div class="repetition-header">
                <div class="step-drag-handle" style="padding-left: 0;"><i class="ri-more-2-fill" style="transform: rotate(90deg);"></i></div>
                <i class="ri-repeat-line" style="color:var(--primary); font-size:18px;"></i>
                <div style="flex: 1; display: flex; align-items: center; gap: 8px;">
                    <input type="number" value="${step.count}" style="width:50px; text-align:center; border: 1px solid #ccc;" onchange="updateStepField(${idx}, 'count', this.value)">
                    <span style="font-size: 16px;">Vezes</span>
                </div>
                <i class="ri-delete-bin-line" style="color:#999; cursor:pointer;" onclick="removeEditorStep(${idx})"></i>
            </div>
            <div class="repetition-inner">
                ${innerStepsHtml}
                <button class="btn-text-link" style="margin-top: 10px; font-weight: 700;" onclick="addEditorStep('run', ${idx})">+ Adicionar uma etapa à repetição</button>
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
          vol = parseFloat($('group-volume').value) || 0;

    if (!name) return showToast('Nome do treino é obrigatório', 'error');

    const groupData = {
        id: id ? parseInt(id) : generateId(),
        name,
        category: cat,
        volume: vol,
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
function editGroup(id){openGroupModal(id,true);}
function cloneGroup(id){const c=JSON.parse(JSON.stringify(groups.find(g=>g.id===id)));c.id=generateId();c.name+=' (Cópia)';groups.push(c);saveState(['groups']);renderGroups();showToast('Clonado!');}
function deleteGroup(id){if(!confirm('Excluir este treino?'))return;const backup=JSON.parse(JSON.stringify(groups.find(g=>g.id===id)));groups=groups.filter(g=>g.id!==id);athletes.forEach(a=>{if(a.groupId===id)a.groupId=null;});saveState(['groups','athletes']);renderGroups();showToast('Treino apagado.','default',()=>{groups.push(backup);saveState(['groups']);renderGroups();});}

// ─── DUPLICATE TO FOLDER ───
let _dupGroupId=null;
function openDuplicateModal(gId){_dupGroupId=gId;const g=groups.find(x=>x.id===gId);const others=categories.filter(c=>c!==g.category);
    $('dup-folder-list').innerHTML=others.length?others.map(c=>`<button class="btn btn-secondary" style="width:100%;justify-content:center;" onclick="doDuplicate('${c}')"><i class="ri-folder-open-line"></i> ${c}</button>`).join(''):'<div style="color:var(--text-muted);text-align:center;padding:16px;">Crie outra pasta primeiro.</div>';
    $('modal-duplicate').classList.add('show');
}
function doDuplicate(targetCat){const c=JSON.parse(JSON.stringify(groups.find(g=>g.id===_dupGroupId)));c.id=generateId();c.category=targetCat;c.name+=' (Cópia)';groups.push(c);saveState(['groups']);closeModals();showToast(`Duplicado para ${targetCat}!`);}

// ─── ASSIGN ───
let currentAssignGroupId=null;
function openAssignModal(gId){currentAssignGroupId=gId;const g=groups.find(x=>x.id===gId);$('modal-assign-title').textContent=`Vincular: ${g.name}`;const list=$('assign-athlete-list');
    if(!athletes.length){list.innerHTML='<div style="color:var(--text-muted);font-size:13px;text-align:center;padding:16px;">Nenhum aluno.</div>';}
    else{list.innerHTML=athletes.map(a=>{const chk=a.groupId===gId?'checked':'';return`<label style="display:flex;align-items:center;gap:8px;padding:12px;background:var(--panel);border:1px solid ${chk?'var(--primary)':'var(--border)'};border-radius:4px;cursor:pointer;"><input type="checkbox" class="assign-chk" value="${a.id}" ${chk} style="width:16px;height:16px;accent-color:var(--primary);"><span style="font-weight:500;">${a.name}</span></label>`;}).join('');}
    $('modal-assign').classList.add('show');
}
function saveAssign(){if(!currentAssignGroupId)return;const assigned=new Set([...document.querySelectorAll('.assign-chk:checked')].map(c=>parseInt(c.value)));
    athletes.forEach(a=>{if(assigned.has(a.id))a.groupId=currentAssignGroupId;else if(a.groupId===currentAssignGroupId)a.groupId=null;});
    saveState(['athletes']);closeModals();renderAthletes();renderDashboard();showToast('Vinculado!');}

// ═══════════════════════════════════════
//  ATHLETES
// ═══════════════════════════════════════
function sortAthletes(key){if(athleteSort.key===key)athleteSort.asc=!athleteSort.asc;else{athleteSort.key=key;athleteSort.asc=true;}renderAthletes();}

function renderAthletes(){
    const q=($('athlete-search')?.value||'').toLowerCase();
    let filtered=athletes.filter(a=>a.name.toLowerCase().includes(q));
    // Sort
    filtered.sort((a,b)=>{
        let va,vb;
        if(athleteSort.key==='name'){va=a.name.toLowerCase();vb=b.name.toLowerCase();}
        else if(athleteSort.key==='vam'){va=a.testTime?(180/a.testTime):0;vb=b.testTime?(180/b.testTime):0;}
        else{va=a.name;vb=b.name;}
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
                    <strong onclick="editAthlete('${a.id}')" style="cursor:pointer;color:var(--primary-color);text-decoration:underline;text-underline-offset:3px;">${displayName}</strong>
                    ${a.supabaseId ? `<span class="badge" style="background:#f0fdf4; color:#16a34a; border:1px solid #bbf7d0; font-size:10px; padding:2px 6px;"><i class="ri-checkbox-circle-line"></i> Vinculado</span>` : ''}
                </div>
                ${a.phone?`<div style="font-size:11px;color:var(--text-muted);">${a.phone}</div>`:''}
            </td>
            <td style="font-size:13px;color:var(--text-muted);">${a.email || '—'}</td>
            <td><span class="badge">${plan}</span></td>
            <td style="font-weight:700;color:var(--primary);">${vam}</td>
            <td>${noteSnip}</td>
            <td style="text-align:right;white-space:nowrap;">
                <button class="btn btn-tertiary" onclick="openStravaActivities('${a.id}')" title="Atividades Strava" style="color:#fc4c02;"><i class="ri-strava-line"></i></button>
                <button class="btn btn-tertiary" onclick="openHistory('${a.id}')" title="Histórico"><i class="ri-history-line"></i></button>
                <button class="btn btn-tertiary" onclick="editAthlete('${a.id}')" title="Editar"><i class="ri-edit-line"></i></button>
                <button class="btn btn-tertiary" onclick="deleteAthlete('${a.id}')" title="Excluir" style="color:var(--danger);"><i class="ri-delete-bin-line"></i></button>
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
    const t=parseFloat($('athlete-test').value);
    const pv=$('athlete-vam-preview');
    if(!t||t<=0){pv.style.display='none';} else {
        const vam=180/t;pv.style.display='block';
        $('athlete-vam-zones').innerHTML=VAM_ZONES.map(z=>{const spd=vam*(z.pct/100);return`<div style="display:flex;justify-content:space-between;padding:4px 0;"><span style="font-size:12px;color:#475569;">${z.label} (${z.pct}%)</span><span style="font-size:13px;font-weight:800;color:${z.color};">${vamToPace(spd)}</span></div>`;}).join('');
    }

    // Preview de Zonas de FC
    const tempAthlete = {
        testHr: parseInt($('athlete-test-hr').value),
        hrMethod: $('athlete-hr-method').value,
        restingHr: parseInt($('athlete-resting-hr').value),
        lthr: parseInt($('athlete-lthr').value)
    };
    const hrZones = calculateHRZones(tempAthlete);
    const hrHtml = `
        <div style="margin-top:12px; padding-top:12px; border-top:1px dashed #bfdbfe;">
            <div style="font-size:11px; font-weight:700; color:#2563eb; text-transform:uppercase; margin-bottom:8px;">Zonas de Frequência Cardíaca</div>
            <div style="display:grid; grid-template-columns: repeat(5, 1fr); gap:4px; text-align:center;">
                <div style="font-size:10px;"><div style="background:#94a3b8; height:4px; border-radius:2px; margin-bottom:2px;"></div>Z1<br><b><${Math.round(hrZones.z1)}</b></div>
                <div style="font-size:10px;"><div style="background:#3b82f6; height:4px; border-radius:2px; margin-bottom:2px;"></div>Z2<br><b><${Math.round(hrZones.z2)}</b></div>
                <div style="font-size:10px;"><div style="background:#10b981; height:4px; border-radius:2px; margin-bottom:2px;"></div>Z3<br><b><${Math.round(hrZones.z3)}</b></div>
                <div style="font-size:10px;"><div style="background:#f59e0b; height:4px; border-radius:2px; margin-bottom:2px;"></div>Z4<br><b><${Math.round(hrZones.z4)}</b></div>
                <div style="font-size:10px;"><div style="background:#ef4444; height:4px; border-radius:2px; margin-bottom:2px;"></div>Z5<br><b>>${Math.round(hrZones.z4)}</b></div>
            </div>
        </div>
    `;
    $('athlete-vam-zones').innerHTML += hrHtml;
}

function openAthleteModal(id=null){
    const modal=$('modal-athlete');modal.dataset.editing=id||'';$('modal-athlete-title').textContent=id?'Editar Atleta':'Novo Atleta';
    const sel=$('athlete-group');const opts=['<option value="">-- Selecione --</option>'];
    categories.forEach(cat=>{const cg=groups.filter(g=>g.category===cat);if(!cg.length)return;opts.push(`<optgroup label="${cat}">${cg.map(g=>`<option value="${g.id}">${g.name}</option>`).join('')}</optgroup>`);});sel.innerHTML=opts.join('');
    const a=id?athletes.find(x=>x.id==id):null;
    const clearBtn = $('btn-clear-workouts');
    if (clearBtn) clearBtn.style.display = id ? 'flex' : 'none';
    
    $('athlete-name').value=a?a.name:'';$('athlete-phone').value=a?(a.phone||''):'';$('athlete-dob').value=a?(a.dob||''):'';$('athlete-test-hr').value=a?(a.maxHr||''):'';$('athlete-test').value=a?(a.testTime||''):'';$('athlete-notes').value=a?(a.notes||''):'';sel.value=a?(a.groupId||''):'';
    
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
function editAthlete(id){openAthleteModal(id);}
function deleteAthlete(id){const a=athletes.find(x=>x.id==id);if(!confirm(`Excluir "${a?.name}"?`))return;
    const backupA=JSON.parse(JSON.stringify(a));const backupH=historyPlans.filter(h=>h.athleteId===id).map(h=>JSON.parse(JSON.stringify(h)));
    athletes=athletes.filter(x=>x.id!=id);historyPlans=historyPlans.filter(h=>h.athleteId!=id);
    saveState(['athletes','history']);renderAthletes();renderDashboard();
    showToast('Atleta excluído.','default',()=>{athletes.push(backupA);historyPlans.push(...backupH);saveState(['athletes','history']);renderAthletes();renderDashboard();});
}

// ═══════════════════════════════════════
//  HISTORY
// ═══════════════════════════════════════
let currentHistoryAthleteId=null;
function openHistory(aId){currentHistoryAthleteId=aId;const a=athletes.find(x=>x.id==aId);$('hist-athlete-name').textContent=a.name;renderHistoryList(aId);$('modal-history').classList.add('show');}
function renderHistoryList(aId){
    const plans=historyPlans.filter(p=>p.athleteId===aId).sort((a,b)=>b.id-a.id);const list=$('history-list');
    if(!plans.length){list.innerHTML='<div style="padding:32px;color:var(--text-muted);text-align:center;"><i class="ri-calendar-line" style="font-size:36px;display:block;margin-bottom:8px;opacity:0.3;"></i>Nenhum treino.</div>';return;}
    const toolbar=`<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 20px;background:var(--bg);border-bottom:1px solid var(--border);position:sticky;top:0;z-index:1;"><label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;font-weight:600;color:var(--text-muted);"><input type="checkbox" id="hist-select-all" onchange="toggleSelectAllHistory()" style="width:15px;height:15px;accent-color:var(--primary);">Selecionar todos (${plans.length})</label><button class="btn" id="hist-delete-selected" onclick="deleteSelectedHistory()" style="background:var(--danger);color:white;padding:6px 12px;font-size:12px;display:none;"><i class="ri-delete-bin-line"></i> Excluir</button></div>`;
    const rows=plans.map(p=>{const d=new Date(p.id).toLocaleDateString('pt-BR');return`<div class="history-item"><div style="display:flex;align-items:center;gap:12px;"><input type="checkbox" class="hist-chk" value="${p.id}" onchange="updateHistoryToolbar()" style="width:16px;height:16px;accent-color:var(--primary);cursor:pointer;"><div><div class="hist-date">${d}</div><div class="hist-vol">${p.calcData.categoryName} / ${p.calcData.groupName} · ${p.calcData.volume}km</div></div></div><div style="display:flex;gap:6px;"><button class="btn btn-secondary" onclick="viewExport(${p.id})" style="padding:5px 10px;font-size:12px;"><i class="ri-image-line"></i> Ver</button><button class="btn btn-tertiary" onclick="deleteHistory(${p.id})" style="padding:5px 8px;color:var(--danger);font-size:12px;"><i class="ri-delete-bin-line"></i></button></div></div>`;}).join('');
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
        // Usar a URL absoluta se estiver no painel do professor (que está em /paineldoprofessor/)
        const response = await fetch(`/api/strava/activities?userId=${athleteId}`);
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
    const rows=g.plan.reduce((acc,d,i)=>{if(!d.active)return acc;const phases=d.phases.filter(ph=>ph.volPct>0).map(ph=>({type:ph.type,title:phaseLabels[ph.type],km:((ph.volPct/100)*g.volume).toFixed(1),pace:vamToPace(vamKmh*(ph.vamPct/100)),desc:ph.desc}));if(phases.length)acc.push({dayName:daysNames[i],phases});return acc;},[]);
    // HR zones if data available
    let hrInfo=null;
    const fcMax=athlete.testHr||null;
    if(fcMax){hrInfo={z1:`${Math.round(fcMax*0.6)}-${Math.round(fcMax*0.7)}`,z2:`${Math.round(fcMax*0.7)}-${Math.round(fcMax*0.8)}`,z3:`${Math.round(fcMax*0.8)}-${Math.round(fcMax*0.9)}`,z4:`${Math.round(fcMax*0.9)}-${Math.round(fcMax*0.95)}`,z5:`${Math.round(fcMax*0.95)}-${fcMax}`};}
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
        showToast('✅ Todos os treinos foram removidos do App!');
        closeModals();
    } catch (err) {
        console.error('Clear Workouts Error:', err);
        showToast('❌ Erro ao limpar treinos.', 'error');
    }
}

async function generateAndExport(aId){
    const a=athletes.find(x=>x.id==aId);if(!a.groupId||!a.testTime)return showToast('Preencha grupo e Teste VAM!','error');
    const calc=calculatePlan(a);if(!calc||!calc.rows.length)return showToast('Planilha sem dias ativos!','error');
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
                const { data: pEmail } = await dbClient.from('profiles').select('id').eq('email', a.email).maybeSingle();
                if (pEmail) athleteId = pEmail.id;
            }
            if (!athleteId) {
                const { data: profiles } = await dbClient.from('profiles').select('id').ilike('name', `%${a.name}%`);
                if (profiles && profiles.length > 0) athleteId = profiles[0].id;
            }
        }
        
        if (athleteId) {
            if (!a.supabaseId) { a.supabaseId = athleteId; saveState(['athletes']); }

            const now = new Date();
            const currentDay = now.getDay();
            const diffToMonday = now.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
            const monday = new Date(now.setDate(diffToMonday));
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
            const workoutsToInsert = calc.rows.map(row => {
                const workoutDate = new Date(monday);
                workoutDate.setDate(monday.getDate() + dayMap[row.dayName]);
                
                // Get structured steps for this day if they exist
                const dayPlan = _editingPlan[dayMap[row.dayName]];
                
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
                    type: calc.categoryName,
                    title: calc.groupName,
                    description: textDescription,
                    structured_steps: dayPlan ? dayPlan.steps : null, // Enviar steps estruturados se houver
                    metrics: { 
                        distance: row.phases.reduce((sum, p) => sum + parseFloat(p.km), 0).toFixed(1) + ' km',
                        duration: row.phases[0] ? row.phases[0].pace : '--'
                    },
                    status: 'pending'
                };
            });

            const { error } = await dbClient.from('workouts').insert(workoutsToInsert);
            if (error) throw error;

            // --- NOTIFICAÇÃO DE PLANILHA LIBERADA ---
            await dbClient.from('notifications').insert([{
                athlete_id: athleteId,
                title: 'Planilha Liberada! 🏃‍♂️',
                text: `Sua planilha de ${calc.categoryName} (${calc.groupName}) já está disponível no app. Bons treinos!`,
                type: 'training_update',
                created_at: new Date().toISOString()
            }]);

            showToast('✅ Planilha enviada para o App!');
            if (btn) {
                btn.innerHTML = '✅ Enviado';
                btn.style.background = '#34C759'; btn.style.color = 'white';
                setTimeout(() => { btn.disabled = false; btn.innerHTML = oldHtml; btn.style.background = ''; btn.style.color = ''; }, 3000);
            }
        } else {
            showToast('⚠️ Aluno não cadastrado no App.', 'default');
            if (btn) { btn.disabled = false; btn.innerHTML = oldHtml; }
        }
    } catch (err) {
        console.error('Supabase Sync Error:', err);
        showToast('❌ Erro ao enviar.', 'error');
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
            const supabaseVamTime = p.vam ? 180/p.vam : null;

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

                const oldVam = athletes[index].testTime;
                if (supabaseVamTime && supabaseVamTime !== oldVam) {
                    athletes[index].testTime = supabaseVamTime;
                    updatedCount++;
                }
            } else {
                athletes.push({
                    id: generateId() + Math.random(),
                    supabaseId: p.id,
                    name: p.name || '',
                    email: p.email || '',
                    phone: '',
                    testHr: p.max_hr || null, // Importar FC Máx
                    maxHr: p.max_hr || null,
                    hrMethod: p.hr_method || 'max',
                    restingHr: p.resting_hr || null,
                    lthr: p.lthr || null,
                    testTime: supabaseVamTime,
                    groupId: null,
                    notes: 'Importado do App'
                });
                addedCount++;
            }
        });

        // Limpeza: Remover da lista local quem não é mais um atleta (como o professor)
        const remoteIds = new Set(profiles.map(p => p.id));
        athletes = athletes.filter(a => {
            // Se o atleta não tem supabaseId, é um cadastro manual, mantemos.
            if (!a.supabaseId) return true;
            // Se tem supabaseId, só mantemos se ele estiver no retorno atual do banco (que só traz role='athlete')
            return remoteIds.has(a.supabaseId);
        });

        saveState(['athletes']);
        renderAthletes();
        renderDashboard();
        if (localStorage.getItem('vdot_lastView') === 'chat') renderChat();
        if (localStorage.getItem('vdot_lastView') === 'strava-feed') renderStravaFeed();
        if (localStorage.getItem('vdot_lastView') === 'garmin-feed') renderGarminFeed();

        if (isManual) {
            if (addedCount > 0) {
                showToast(`✅ ${addedCount} novo(s) aluno(s) sincronizado(s)!`);
            } else {
                showToast('✅ Sincronização concluída. Nenhum atleta novo.');
            }
        }
    } catch (err) {
        console.error('Erro na sincronização:', err);
        if (isManual) showToast('❌ Falha ao sincronizar: ' + err.message, 'error');
    }
}

async function viewExport(hId){
    closeModals();currentExportHistId=hId;$('modal-export').classList.add('show');$('export-loading').style.display='flex';$('export-img-preview').style.display='none';
    const hist=historyPlans.find(h=>h.id===hId);const calc=hist.calcData;const a=athletes.find(x=>x.id===hist.athleteId);currentExportPhone=a?(a.phone||''):'';
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
    if (!athletes.length) return showToast('Nenhum atleta para exportar', 'error');
    
    // Header
    let csv = 'Nome,Email,Telefone,Nascimento,VAM (min),VAM (km/h),Planilha Base,Notas\n';
    
    athletes.forEach(a => {
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
let currentUserId = null;
let onlineUsers = new Set();

// Iniciar monitoramento de presença
function initPresence() {
    const channel = dbClient.channel('online-users');
    
    channel
        .on('presence', { event: 'sync' }, () => {
            const newState = channel.presenceState();
            onlineUsers = new Set(Object.keys(newState));
            updateOnlineUI();
        })
        .subscribe();
}
initPresence();

function updateOnlineUI() {
    // Atualizar bolinhas verdes na lista lateral
    document.querySelectorAll('.chat-user-item').forEach(el => {
        const id = el.dataset.id;
        const statusEl = el.querySelector('.chat-user-status-dot');
        if (statusEl) {
            const isOnline = onlineUsers.has(id);
            statusEl.style.background = isOnline ? '#10b981' : '#cbd5e1';
        }
    });

    // Atualizar status no cabeçalho do chat aberto
    const headerStatus = $('chat-header-status');
    if (headerStatus && currentChatAthleteId) {
        const isOnline = onlineUsers.has(currentChatAthleteId);
        headerStatus.textContent = isOnline ? 'Online' : 'Offline';
        headerStatus.style.color = isOnline ? '#10b981' : '#94a3b8';
    }
}

async function getMyId() {
    if (currentUserId) return currentUserId;
    const { data } = await dbClient.auth.getSession();
    if (data.session) {
        currentUserId = data.session.user.id;
        return currentUserId;
    }
    return null;
}

async function renderChat() {
    const list = $('chat-users-list');
    const athletesWithSupabase = athletes.filter(a => a.supabaseId);
    
    if (!athletesWithSupabase.length) {
        list.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:13px;">Nenhum aluno com conta no App encontrado.</div>';
        return;
    }

    list.innerHTML = athletesWithSupabase.map(a => {
        const isOnline = onlineUsers.has(a.supabaseId);
        return `
            <div class="chat-user-item ${currentChatAthleteId === a.supabaseId ? 'active' : ''}" data-id="${a.supabaseId}" onclick="selectChatAthlete('${a.supabaseId}', '${a.name}')">
                <div class="user-avatar" style="position:relative;">
                    ${a.name.charAt(0).toUpperCase()}
                    <div class="chat-user-status-dot" style="position:absolute;bottom:0;right:0;width:10px;height:10px;border-radius:50%;background:${isOnline ? '#10b981' : '#cbd5e1'};border:2px solid white;"></div>
                </div>
                <div class="chat-user-info">
                    <div class="chat-user-name">${a.name}</div>
                    <div class="chat-user-last">Clique para conversar</div>
                </div>
            </div>
        `;
    }).join('');

    // Restaurar chat se houver um salvo
    const lastId = localStorage.getItem('vdot_lastChatId');
    const lastName = localStorage.getItem('vdot_lastChatName');
    if (lastId && !currentChatAthleteId) {
        selectChatAthlete(lastId, lastName);
    }
}

async function selectChatAthlete(supabaseId, name) {
    currentChatAthleteId = supabaseId;
    localStorage.setItem('vdot_lastChatId', supabaseId);
    localStorage.setItem('vdot_lastChatName', name);
    
    $('chat-current-user-name').textContent = name;
    
    // Garantir que o status do cabeçalho existe e atualizar
    let statusEl = $('chat-header-status');
    if (!statusEl) {
        statusEl = document.createElement('span');
        statusEl.id = 'chat-header-status';
        statusEl.style.fontSize = '12px';
        statusEl.style.fontWeight = '600';
        $('chat-current-user-name').parentNode.appendChild(statusEl);
    }
    
    const isOnline = onlineUsers.has(supabaseId);
    statusEl.textContent = isOnline ? 'Online' : 'Offline';
    statusEl.style.color = isOnline ? '#10b981' : '#94a3b8';

    $('chat-welcome').style.display = 'none';
    $('chat-window').style.display = 'flex';
    
    // Marcar como ativo na lista
    document.querySelectorAll('.chat-user-item').forEach(el => {
        el.classList.toggle('active', el.dataset.id === supabaseId);
    });

    loadChatMessages(supabaseId);
    subscribeToChat(supabaseId);
}

async function loadChatMessages(athleteId) {
    const chatMsgs = $('chat-messages');
    chatMsgs.innerHTML = '<div style="display:flex;justify-content:center;padding:20px;"><div class="loader"></div></div>';
    
    const { data, error } = await dbClient
        .from('messages')
        .select('*')
        .eq('athlete_id', athleteId)
        .order('created_at', { ascending: true });

    if (error) {
        chatMsgs.innerHTML = '<div style="padding:20px;color:var(--danger);">Erro ao carregar mensagens.</div>';
        return;
    }

    renderMessages(data);
}

async function renderMessages(data) {
    const chatMsgs = $('chat-messages');
    const myId = await getMyId();
    
    chatMsgs.innerHTML = data.map(msg => {
        const isMe = msg.sender_id === myId;
        const time = new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        return `
            <div class="message ${isMe ? 'sent' : 'received'}" data-id="${msg.id || msg.uuid}">
                ${msg.content}
                <span class="message-time">${time}</span>
            </div>
        `;
    }).join('');
    chatMsgs.scrollTop = chatMsgs.scrollHeight;
}

async function subscribeToChat(athleteId) {
    if (chatSubscription) dbClient.removeChannel(chatSubscription);

    chatSubscription = dbClient
        .channel(`chat:${athleteId}`)
        .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'messages',
            filter: `athlete_id=eq.${athleteId}`
        }, (payload) => {
            // Adicionar mensagem na tela se for o chat atual
            if (currentChatAthleteId === athleteId) {
                appendMessage(payload.new);
            }
        })
        .subscribe();
}

async function appendMessage(msg) {
    const chatMsgs = $('chat-messages');
    const myId = await getMyId();
    const isMe = msg.sender_id === myId;
    const time = new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const div = document.createElement('div');
    div.className = `message ${isMe ? 'sent' : 'received'}`;
    div.innerHTML = `${msg.content}<span class="message-time">${time}</span>`;
    chatMsgs.appendChild(div);
    chatMsgs.scrollTop = chatMsgs.scrollHeight;
}

async function sendProfessorMessage() {
    const input = $('chat-input');
    const content = input.value.trim();
    if (!content || !currentChatAthleteId) return;

    const { data: sessionData } = await dbClient.auth.getSession();
    if (!sessionData.session) return showToast('Você precisa estar logado para enviar mensagens.', 'error');

    const newMessage = {
        athlete_id: currentChatAthleteId,
        sender_id: sessionData.session.user.id,
        content: content
    };

    const { error } = await dbClient.from('messages').insert([newMessage]);

    if (error) {
        showToast('Erro ao enviar mensagem.', 'error');
    } else {
        input.value = '';
    }
}

// Escutar Enter no input de chat
document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && document.activeElement.id === 'chat-input') {
        sendProfessorMessage();
    }
});

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
                        <div class="user-avatar" style="width:32px;height:32px;font-size:12px;background:var(--primary);color:white;">${p.name.charAt(0).toUpperCase()}</div>
                        <strong style="color:var(--text);">${p.name}</strong>
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

// ═══════════════════════════════════════
//  PWA
// ═══════════════════════════════════════
if('serviceWorker' in navigator){navigator.serviceWorker.register('sw.js').catch(()=>{});}

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

async function renderStravaFeed() {
    const list = $('strava-global-list');
    const loading = $('strava-global-loading');
    
    if (!list || !loading) return;
    
    list.innerHTML = '';
    loading.style.display = 'block';
    
    try {
        // ✅ CORRIGIDO: Filtrar apenas atletas com supabaseId (conta real no app)
        const athletesWithAccount = athletes.filter(a => a.supabaseId);
        
        if (athletesWithAccount.length === 0) {
            loading.style.display = 'none';
            list.innerHTML = `
                <div style="padding:60px; text-align:center; color:var(--text-muted); background:var(--panel); border:2px dashed var(--border); border-radius:16px;">
                    <i class="ri-information-line" style="font-size:48px; display:block; margin-bottom:12px; opacity:0.3;"></i>
                    <strong>Nenhum aluno com conta conectada</strong>
                    <p style="font-size:13px; margin-top:4px;">Sincronize os alunos primeiro clicando em "Sincronizar Alunos" na seção Atletas.</p>
                </div>
            `;
            return;
        }
        
        // ✅ CORRIGIDO: Usar supabaseId (UUID do banco) na chamada à API
        const activityPromises = athletesWithAccount.map(async (athlete) => {
            try {
                const response = await fetch(`/api/strava/activities?userId=${athlete.supabaseId}&_t=${Date.now()}`);
                if (!response.ok) return [];
                const data = await response.json();
                if (!Array.isArray(data)) return [];
                return data.map(act => ({ ...act, athleteName: athlete.name, athleteId: athlete.supabaseId }));
            } catch (err) {
                return [];
            }
        });
        
        const results = await Promise.all(activityPromises);
        const allActivities = results.flat().sort((a, b) => new Date(b.date) - new Date(a.date));
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
        
        list.innerHTML = allActivities.map(act => {
            const date = new Date(act.date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
            return `
                <div class="stat-card" style="padding: 20px; background: var(--panel); border: 1px solid var(--border); border-radius: 16px; margin-bottom: 0; box-shadow: var(--shadow);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="width: 40px; height: 40px; border-radius: 10px; background: var(--primary)10; color: var(--primary); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 16px; border: 1px solid var(--primary)20;">
                                ${act.athleteName.charAt(0)}
                            </div>
                            <div>
                                <div style="font-size: 15px; font-weight: 800; color: var(--text);">${act.athleteName}</div>
                                <div style="font-size: 12px; color: var(--text-muted); font-weight: 500;">${date}</div>
                            </div>
                        </div>
                        <div style="background: #fc4c0215; color: #fc4c02; padding: 6px 12px; border-radius: 100px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid #fc4c0220;">
                            ${act.type}
                        </div>
                    </div>
                    
                    <h4 style="font-size: 18px; font-weight: 900; margin-bottom: 16px; color: var(--text); letter-spacing: -0.5px;">${act.title}</h4>
                    
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
                            <div style="font-size: 18px; font-weight: 900; color: #fc4c02;">${act.metrics.distance}</div>
                        </div>
                        <div>
                            <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.5px;">Pace</div>
                            <div style="font-size: 18px; font-weight: 900;">${act.metrics.pace}</div>
                        </div>
                        <div>
                            <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.5px;">Tempo</div>
                            <div style="font-size: 18px; font-weight: 900;">${act.metrics.duration}</div>
                        </div>
                    </div>
                    
                    <div style="margin-top: 16px; text-align: right; display: flex; gap: 8px; justify-content: flex-end;">
                        <button onclick="openActivityDetail('${act.strava_id}')" style="display: inline-flex; align-items: center; gap: 6px; background: #fc4c02; color: #fff; padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 700; border: none; cursor: pointer; transition: all 0.2s;">
                            <i class="ri-line-chart-line"></i> Abrir Análise
                        </button>
                    </div>
                </div>
            `;
        }).join('');

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

async function renderGarminFeed() {
    const list = $('garmin-global-list');
    const loading = $('garmin-global-loading');
    
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

        // Buscar atividades de todos os atletas em paralelo de forma segura
        const results = await Promise.allSettled(athletesWithGarmin.map(async (athlete) => {
            try {
                // Anti-cache para garantir que a lista de atividades seja atualizada
                const res = await fetch(`/api/garmin/activities?userId=${athlete.supabaseId}&limit=10&_t=${Date.now()}`);
                if (!res.ok) {
                    errorAthletes.push(athlete.name);
                    return [];
                }
                const acts = await res.json();
                if (!Array.isArray(acts)) return [];
                
                return acts.map(a => ({
                    ...a,
                    athleteName: athlete.name,
                    athleteId: athlete.supabaseId
                }));
            } catch (e) {
                console.warn(`Erro ao buscar Garmin do atleta ${athlete.name}:`, e);
                return [];
            }
        }));

        // Unir todos os resultados em uma única lista
        allActivities = results
            .filter(r => r.status === 'fulfilled')
            .flatMap(r => r.value);

        allActivities.sort((a, b) => new Date(b.date) - new Date(a.date));

        loading.style.display = 'none';

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
        
        list.innerHTML = errorHtml + allActivities.map(act => {
            const date = new Date(act.date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
            return `
                <div class="stat-card" style="padding: 20px; background: var(--panel); border: 1px solid var(--border); border-radius: 16px; margin-bottom: 0; box-shadow: var(--shadow);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="width: 40px; height: 40px; border-radius: 10px; background: var(--primary)10; color: var(--primary); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 16px; border: 1px solid var(--primary)20;">
                                ${act.athleteName.charAt(0)}
                            </div>
                            <div>
                                <div style="font-size: 15px; font-weight: 800; color: var(--text);">${act.athleteName}</div>
                                <div style="font-size: 12px; color: var(--text-muted); font-weight: 500;">${date}</div>
                            </div>
                        </div>
                        <div style="background: #00000015; color: #000; padding: 6px 12px; border-radius: 100px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid #00000020;">
                            ${act.type === 'running' ? 'Corrida' : act.type}
                        </div>
                    </div>
                    
                    <h4 style="font-size: 18px; font-weight: 900; margin-bottom: 16px; color: var(--text); letter-spacing: -0.5px;">${act.name}</h4>
                    
                    <div class="strava-metrics-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 12px; padding: 16px; background: var(--bg); border-radius: 12px; border: 1px solid var(--border);">

                        <div>
                            <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.5px;">Distância</div>
                            <div style="font-size: 18px; font-weight: 900; color: #000;">${act.distance} km</div>
                        </div>
                        <div>
                            <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.5px;">Pace</div>
                            <div style="font-size: 18px; font-weight: 900;">${act.pace || '--'}</div>
                        </div>
                        <div>
                            <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.5px;">Tempo</div>
                            <div style="font-size: 18px; font-weight: 900;">${act.duration} min</div>
                        </div>
                    </div>
                    
                    <div style="padding: 16px 0 0 0; text-align: center; display: flex; flex-direction: column; gap: 8px;">
                        <button onclick="openGarminDetails('${act.athleteId}', '${act.id}')" style="background: #000; color: #fff; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 800; font-size: 13px; cursor: pointer; width: 100%; display: flex; justify-content: center; align-items: center; gap: 8px;">
                            <i class="ri-compass-discover-line"></i> Dinâmicas Avançadas Garmin
                        </button>
                    </div>
                    
                    <div style="margin-top: 16px; text-align: right; display: flex; gap: 8px; justify-content: flex-end;">
                        <a href="https://connect.garmin.com/modern/activity/${act.id}" target="_blank" style="display: inline-flex; align-items: center; gap: 6px; background: #00000015; color: #000; padding: 8px 16px; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: 700; border: 1px solid #00000030; transition: all 0.2s;">
                            <i class="ri-external-link-line"></i> Ver no site do Garmin
                        </a>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (err) {
        console.error('Erro no feed Garmin:', err);
        loading.style.display = 'none';
        showToast('Erro ao sincronizar feed Garmin', 'error');
    }
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
                        tension: 0.4
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
                            suggestedMax: 190
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

function openActivityDetail(id) {
    const act = _currentStravaActivities.find(a => a.strava_id == id);
    if (!act) return;

    // Resetar estado anterior
    if (detailMapInstance) { detailMapInstance.remove(); detailMapInstance = null; }
    detailMapMarker = null;
    detailMapCoords = [];
    detailChartInstances.forEach(c => c.destroy());
    detailChartInstances = [];
    _currentStreams = null;
    _currentAthleteId = act.athleteId;
    _currentActivityId = act.strava_id; // Guardar ID atual

    $('act-detail-title').textContent = act.title;
    $('act-detail-athlete').textContent = act.athleteName;
    $('act-detail-date').textContent = new Date(act.date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
    $('act-detail-type').textContent = act.type;
    $('act-detail-avatar').textContent = act.athleteName.charAt(0);
    
    // Metrics Grid
    const metricsHtml = `
        <div class="stat-card" style="background: var(--bg);">
            <div style="font-size: 11px; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Distância</div>
            <div style="font-size: 24px; font-weight: 900; color: #fc4c02;">${act.metrics.distance}</div>
        </div>
        <div class="stat-card" style="background: var(--bg);">
            <div style="font-size: 11px; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Pace Médio</div>
            <div style="font-size: 24px; font-weight: 900;">${act.metrics.pace}</div>
        </div>
        <div class="stat-card" style="background: var(--bg);">
            <div style="font-size: 11px; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Tempo Total</div>
            <div style="font-size: 24px; font-weight: 900;">${act.metrics.duration}</div>
        </div>
        <div class="stat-card" style="background: var(--bg);">
            <div style="font-size: 11px; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Ganho de Elevação</div>
            <div style="font-size: 24px; font-weight: 900;">${act.metrics.elevation}</div>
        </div>
    `;
    $('act-detail-metrics').innerHTML = metricsHtml;

    // Extra Info / Footer
    const extraHtml = `
        <div>
            <div style="font-size: 12px; color: var(--text-muted); font-weight: 600; margin-bottom: 4px;">Frequência Cardíaca</div>
            <div style="font-size: 16px; font-weight: 800;">Média: ${act.metrics.avgHeartRate} bpm / Máx: ${act.metrics.maxHeartRate} bpm</div>
        </div>
        <div>
            <div style="font-size: 12px; color: var(--text-muted); font-weight: 600; margin-bottom: 4px;">Esforço (Suffer Score)</div>
            <div style="font-size: 16px; font-weight: 800;">${act.metrics.sufferScore}</div>
        </div>
        <div style="grid-column: 1 / -1; display: flex; gap: 12px; margin-top: 12px;">
            ${act.garmin_id ? `
            <button onclick="openGarminDetails('${act.athleteId}', '${act.garmin_id}')" class="btn btn-secondary" style="flex: 1; background: #000; color: #fff;">
                <i class="ri-compass-discover-line"></i> Dinâmicas Garmin
            </button>
            ` : ''}
            <a href="https://www.strava.com/activities/${act.strava_id}" target="_blank" class="btn btn-secondary" style="flex: 1;">
                <i class="ri-external-link-line"></i> Ver no Strava
            </a>
        </div>
    `;
    $('act-detail-extra').innerHTML = extraHtml;

    $('modal-activity-detail').classList.add('show');
    $('act-detail-charts').style.display = 'none';

    // Renderizar Mapa e depois Gráficos
    setTimeout(() => renderActivityTelemetry(act), 300);
}

function setChartXAxis(mode) {
    if (_chartXAxisMode === mode) return;
    _chartXAxisMode = mode;
    
    // Atualizar botões
    $('btn-xaxis-distance').classList.toggle('active', mode === 'distance');
    $('btn-xaxis-time').classList.toggle('active', mode === 'time');
    
    // Recarregar gráficos
    const act = _currentStravaActivities.find(a => a.strava_id == _currentActivityId);
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
            const response = await fetch(`/api/strava/activity/${act.strava_id}/streams?userId=${act.athleteId}`);
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
                return pace > 14 ? null : pace;
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
                            min: 4, 
                            max: 14,
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
                options: { ...commonOptions, scales: { ...commonOptions.scales, y: { ...commonOptions.scales.y, suggestedMin: 80, suggestedMax: 190 } } }
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
    const yAxes = {
        y: {
            position: 'left',
            grid: { color: 'rgba(0,0,0,0.05)' },
            ticks: { font: { weight: '700' }, padding: 10 }
        }
    };

    // Ajustar escala primária conforme o tipo
    if (primaryType === 'heartrate') {
        yAxes.y.suggestedMin = 80;
        yAxes.y.suggestedMax = 190;
    } else if (primaryType === 'pace') {
        yAxes.y.min = 4;
        yAxes.y.max = 14;
    } else if (primaryType === 'altitude') {
        const alt = _currentStreams.altitude || [0];
        const minA = Math.min(...alt);
        const maxA = Math.max(...alt);
        yAxes.y.suggestedMin = minA - 5;
        yAxes.y.suggestedMax = maxA + 5;
    }

    // Configuração do Dataset Primário
    const hrMode = $('zoom-hr-mode').value;
    const configPrimary = getDatasetConfig(primaryType, _currentStreams, hrMode);
    datasets.push({
        ...configPrimary,
        yAxisID: 'y',
        fill: false,
        pointRadius: 0,
        borderWidth: 1.2,
        order: 1 // Sempre por cima
    });
    
    if (primaryType === 'pace') {
        yAxes.y.reverse = true;
        yAxes.y.ticks.callback = value => {
            if (value <= 0) return '';
            const m = Math.floor(value);
            const s = Math.round((value - m) * 60);
            return `${m}:${s.toString().padStart(2, '0')}`;
        };
    }

    // Configuração do Dataset de Sobreposição (Overlay)
    if (overlayType && overlayType !== primaryType) {
        const hrMode = $('zoom-hr-mode').value;
        const configOverlay = getDatasetConfig(overlayType, _currentStreams, hrMode);
        
        const hexToRgba = (hex, alpha) => {
            let r = 0, g = 0, b = 0;
            if (hex.length === 4) {
                r = parseInt(hex[1] + hex[1], 16);
                g = parseInt(hex[2] + hex[2], 16);
                b = parseInt(hex[3] + hex[3], 16);
            } else if (hex.length === 7) {
                r = parseInt(hex.substring(1, 3), 16);
                g = parseInt(hex.substring(3, 5), 16);
                b = parseInt(hex.substring(5, 7), 16);
            }
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        };

        datasets.push({
            ...configOverlay,
            label: `[Sobreposto] ${configOverlay.label}`,
            borderColor: hexToRgba(configOverlay.borderColor, 0.3), // 30% de opacidade
            backgroundColor: 'transparent',
            yAxisID: 'y1',
            fill: false,
            pointRadius: 0,
            borderWidth: 1,
            borderDash: [4, 4],
            order: 2 // Por baixo
        });

        yAxes.y1 = {
            position: 'right',
            grid: { display: false },
            ticks: { 
                font: { weight: '600' }, 
                color: configOverlay.borderColor,
                callback: (value) => {
                    if (overlayType === 'pace') {
                        if (value <= 0) return '';
                        const m = Math.floor(value);
                        const s = Math.round((value - m) * 60);
                        return `${m}:${s.toString().padStart(2, '0')}`;
                    }
                    return value;
                }
            },
            title: { display: true, text: configOverlay.label, color: configOverlay.borderColor }
        };

        // Ajustar escala da sobreposição
        if (overlayType === 'pace') {
            yAxes.y1.reverse = true;
            yAxes.y1.min = 4;
            yAxes.y1.max = 14;
        } else if (overlayType === 'heartrate') {
            yAxes.y1.suggestedMin = 80;
            yAxes.y1.suggestedMax = 190;
        } else if (overlayType === 'altitude') {
            const alt = _currentStreams.altitude || [0];
            yAxes.y1.suggestedMin = Math.min(...alt) - 5;
            yAxes.y1.suggestedMax = Math.max(...alt) + 5;
        }
    }

    const isPace = primaryType === 'pace';
    
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
                legend: { display: true, position: 'top', align: 'start', labels: { boxWidth: 12, usePointStyle: true, pointStyle: 'circle', font: { size: 12, weight: '600' } } },
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

function getDatasetConfig(type, streams, mode = 'zones') {
    switch(type) {
        case 'pace':
            const paceConfig = {
                label: 'Ritmo',
                data: streams.velocity_smooth.map(v => {
                    if (v <= 0) return null;
                    const pace = (1000 / v) / 60;
                    return pace > 14 ? null : pace;
                }),
                borderColor: '#00aaff',
                backgroundColor: 'rgba(0, 170, 255, 0.05)',
                fill: true
            };

            if (mode === 'zones' && _currentAthleteId) {
                const athlete = athletes.find(a => a.supabaseId === _currentAthleteId);
                if (athlete && athlete.testTime) {
                    const vamKmh = 180 / athlete.testTime;
                    paceConfig.segment = {
                        borderColor: ctx => {
                            const paceVal = ctx.p1.parsed.y;
                            if (!paceVal) return '#00aaff';
                            const speedKmh = 60 / paceVal;
                            const pctVam = (speedKmh / vamKmh) * 100;
                            
                            if (pctVam < 65) return '#94a3b8'; // Z1
                            if (pctVam < 75) return '#3b82f6'; // Z2
                            if (pctVam < 85) return '#10b981'; // Z3
                            if (pctVam < 95) return '#f59e0b'; // Z4
                            return '#ef4444'; // Z5
                        }
                    };
                }
            }
            return paceConfig;
        case 'heartrate':
            const config = {
                label: 'Frequência Cardíaca',
                data: streams.heartrate,
                borderColor: '#ff4d4d',
                backgroundColor: 'rgba(255, 77, 77, 0.05)',
                fill: true
            };
            
            if (mode === 'zones' && _currentAthleteId) {
                const athlete = athletes.find(a => a.supabaseId === _currentAthleteId);
                if (athlete) {
                    const zones = calculateHRZones(athlete);
                    config.segment = {
                        borderColor: ctx => {
                            const val = ctx.p1.parsed.y;
                            if (val < zones.z1) return '#94a3b8'; // Z1
                            if (val < zones.z2) return '#3b82f6'; // Z2
                            if (val < zones.z3) return '#10b981'; // Z3
                            if (val < zones.z4) return '#f59e0b'; // Z4
                            return '#ef4444'; // Z5
                        }
                    };
                }
            }
            return config;
        case 'altitude':
            return {
                label: 'Elevação',
                data: streams.altitude,
                borderColor: '#808080',
                backgroundColor: 'rgba(128, 128, 128, 0.1)',
                fill: true
            };
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
