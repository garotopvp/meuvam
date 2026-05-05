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

// ─── SAVE ───
function saveState(k=['cats','groups','athletes','history']){
    if(k.includes('cats'))localStorage.setItem('vdot_cats',JSON.stringify(categories));
    if(k.includes('groups'))localStorage.setItem('vdot_groups',JSON.stringify(groups));
    if(k.includes('athletes'))localStorage.setItem('vdot_athletes',JSON.stringify(athletes));
    if(k.includes('history'))localStorage.setItem('vdot_history',JSON.stringify(historyPlans));
}

// ─── DOM ───
const $=id=>document.getElementById(id);
const allModals=['modal-group','modal-athlete','modal-history','modal-export','modal-assign','modal-duplicate'].map(id=>$(id)).filter(Boolean);
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
    if(viewId!=='groups')activeCategory=null;
    if(viewId==='groups'&&cat!==undefined)activeCategory=cat;
    document.querySelectorAll('.view-section').forEach(s=>s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
    $(`view-${viewId}`).classList.add('active');
    document.querySelector(`[data-view="${viewId}"]`)?.classList.add('active');
    localStorage.setItem('vdot_lastView',viewId);
    localStorage.setItem('vdot_lastCat',activeCategory||'');
    if(viewId==='dashboard')renderDashboard();
    if(viewId==='groups')renderGroups();
    if(viewId==='athletes') {
        renderAthletes();
        setTimeout(() => syncAthletesFromSupabase(), 100); 
    }
    if(viewId==='chat') {
        renderChat();
        setTimeout(() => syncAthletesFromSupabase(), 100);
    }
    if(viewId==='staff') {
        renderStaff();
    }
    if(viewId==='calculator')renderCalculator();
    // Close mobile sidebar
    $('sidebar').classList.remove('open');$('sidebar-overlay').classList.remove('open');
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

    // Add Import Button if not enough groups
    if (groups.length < 20) {
        const importBtn = document.createElement('div');
        importBtn.style.cssText = "margin-top:20px; padding:20px; background:var(--primary); border-radius:var(--radius); color:white; text-align:center; cursor:pointer; font-weight:800;";
        importBtn.innerHTML = '<i class="ri-download-cloud-2-line"></i> IMPORTAR PLANILHAS BASE (1 A 4)';
        importBtn.onclick = importBasePlans;
        rec.appendChild(importBtn);
    }
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
                type: s.t,
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
                const ph=phases.filter(p=>p.volPct>0).map(p=>`<div class="plan-ph"><span><strong>${phaseLabels[p.type] || p.type}:</strong> ${p.volPct}%V / ${p.vamPct}%VAM</span>${p.desc?`<span style="font-style:italic;color:#059669;">${p.desc}</span>`:''}</div>`).join('');
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
                <strong onclick="editAthlete('${a.id}')" style="cursor:pointer;color:var(--primary-color);text-decoration:underline;text-underline-offset:3px;">${displayName}</strong>
                ${a.phone?`<div style="font-size:11px;color:var(--text-muted);">${a.phone}</div>`:''}
            </td>
            <td style="font-size:13px;color:var(--text-muted);">${a.email || '—'}</td>
            <td><span class="badge">${plan}</span></td>
            <td style="font-weight:700;color:var(--primary);">${vam}</td>
            <td>${noteSnip}</td>
            <td style="text-align:right;white-space:nowrap;">
                <button class="btn btn-tertiary" onclick="openHistory('${a.id}')" title="Histórico"><i class="ri-history-line"></i></button>
                <button class="btn btn-tertiary" onclick="editAthlete('${a.id}')" title="Editar"><i class="ri-edit-line"></i></button>
                <button class="btn btn-tertiary" onclick="deleteAthlete('${a.id}')" title="Excluir" style="color:var(--danger);"><i class="ri-delete-bin-line"></i></button>
                <button class="btn btn-primary" onclick="generateAndExport('${a.id}')" style="padding:6px 12px;font-size:12px;margin-left:4px;"><i class="ri-send-plane-2-line"></i> Enviar</button>
            </td></tr>`;}).join('');
}

function previewAthleteVAM(){const t=parseFloat($('athlete-test').value);const pv=$('athlete-vam-preview');if(!t||t<=0){pv.style.display='none';return;}const vam=180/t;pv.style.display='block';
    $('athlete-vam-zones').innerHTML=VAM_ZONES.map(z=>{const spd=vam*(z.pct/100);return`<div style="display:flex;justify-content:space-between;padding:4px 0;"><span style="font-size:12px;color:#475569;">${z.label} (${z.pct}%)</span><span style="font-size:13px;font-weight:800;color:${z.color};">${vamToPace(spd)}</span></div>`;}).join('');
}

function openAthleteModal(id=null){
    const modal=$('modal-athlete');modal.dataset.editing=id||'';$('modal-athlete-title').textContent=id?'Editar Atleta':'Novo Atleta';
    const sel=$('athlete-group');const opts=['<option value="">-- Selecione --</option>'];
    categories.forEach(cat=>{const cg=groups.filter(g=>g.category===cat);if(!cg.length)return;opts.push(`<optgroup label="${cat}">${cg.map(g=>`<option value="${g.id}">${g.name}</option>`).join('')}</optgroup>`);});sel.innerHTML=opts.join('');
    const a=id?athletes.find(x=>x.id==id):null;
    const clearBtn = $('btn-clear-workouts');
    if (clearBtn) clearBtn.style.display = id ? 'flex' : 'none';
    
    $('athlete-name').value=a?a.name:'';$('athlete-phone').value=a?(a.phone||''):'';$('athlete-dob').value=a?(a.dob||''):'';$('athlete-test-hr').value=a?(a.testHr||''):'';$('athlete-test').value=a?(a.testTime||''):'';$('athlete-notes').value=a?(a.notes||''):'';sel.value=a?(a.groupId||''):'';
    calculateTheoreticalHR();previewAthleteVAM();modal.classList.add('show');
}
function calculateTheoreticalHR(){const dob=$('athlete-dob').value,el=$('athlete-theo-hr');if(!dob){el.value='';return;}const b=new Date(dob),now=new Date();let age=now.getFullYear()-b.getFullYear();const m=now.getMonth()-b.getMonth();if(m<0||(m===0&&now.getDate()<b.getDate()))age--;el.value=(age>0&&age<120)?`${220-age} bpm (${age} anos)`:'';}
function saveAthlete(){
    const id=$('modal-athlete').dataset.editing,
          name=$('athlete-name').value.trim(),
          phone=$('athlete-phone').value,
          dob=$('athlete-dob').value,
          testHr=parseInt($('athlete-test-hr').value)||null,
          // Corrigir parsing de vírgula para ponto (padrão brasileiro)
          testTime=parseFloat($('athlete-test').value.replace(',', '.'))||null,
          groupId=parseInt($('athlete-group').value)||null,
          notes=$('athlete-notes').value.trim();
    
    if(!name)return showToast('Nome obrigatório','error');
    if(id){
        const idx = athletes.findIndex(x=>x.id==id);
        if(idx !== -1) Object.assign(athletes[idx],{name,phone,dob,testHr,testTime,groupId,notes});
    }
    else{athletes.push({id:generateId(),name,phone,dob,testHr,testTime,groupId,notes});}
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
            .eq('role', 'athlete'); // Filtrar apenas alunos
        
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

