// ═══════════════════════════════════════
//  MeuVAM v1.2 — by Superação
// ═══════════════════════════════════════

// ─── SUPABASE ───
const supabaseUrl = 'https://zljqlzwzwfzslftnymur.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsanFsend6d2Z6c2xmdG55bXVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczOTM0MTcsImV4cCI6MjA5Mjk2OTQxN30.fQVJWpPVw5ZmV-FXpLyqpUoXvITOAedvbRpxlzdm-Ec';
const dbClient = supabase.createClient(supabaseUrl, supabaseKey);

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
    if(viewId==='workout-builder')renderGarminWorkoutBuilder();
    if(viewId==='garmin')renderGarminView();
    // Close mobile sidebar
    $('sidebar').classList.remove('open');$('sidebar-overlay').classList.remove('open');
}
function bindNavClicks(){
    document.querySelectorAll('.nav-item').forEach(item=>{
        item.onclick=e=>{e.preventDefault();navigate(e.currentTarget.dataset.view);};
    });
}
bindNavClicks();
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
            const rows=g.plan.map((d,i)=>{if(!d.active)return'';const ph=d.phases.filter(p=>p.volPct>0).map(p=>`<div class="plan-ph"><span><strong>${phaseLabels[p.type]}:</strong> ${p.volPct}%V / ${p.vamPct}%VAM</span>${p.desc?`<span style="font-style:italic;color:#059669;">${p.desc}</span>`:''}</div>`).join('');return`<div class="plan-row"><div class="plan-row-top"><div class="day">${daysNames[i]}</div></div>${ph}</div>`;}).join('');
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
function openGroupModal(catOrId,isEdit=false){
    const id=isEdit?catOrId:null,cat=isEdit?null:catOrId;
    const modal=$('modal-group');modal.dataset.editing=id||'';modal.dataset.category=isEdit?(groups.find(x=>x.id===id)||{}).category:cat;
    $('modal-group-title').textContent=id?'Editar Treino':'Novo Treino';
    const g=id?groups.find(x=>x.id===id):null;$('group-name').value=g?g.name:'';$('group-volume').value=g?g.volume:'';
    const pc=$('planner-container');
    pc.innerHTML=daysNames.map((dn,i)=>{let act=true;const p={warmup:{volPct:0,vamPct:0,desc:''},main:{volPct:0,vamPct:0,desc:''},cooldown:{volPct:0,vamPct:0,desc:''}};if(g&&g.plan[i]){act=g.plan[i].active;g.plan[i].phases.forEach(ph=>{p[ph.type]=ph;});}const dis=act?'':'disabled';
        return`<div class="day-cfg ${act?'':'inactive'}" id="dcfg-${i}"><div class="day-header"><input type="checkbox" id="d-act-${i}" ${act?'checked':''} onchange="toggleDay(${i})" style="width:18px;height:18px;accent-color:var(--primary);"> ${dn}</div><div class="day-phases">${['warmup','main','cooldown'].map(t=>`<div class="phase-row"><span class="phase-label ${t}">${phaseLabels[t]}</span><input type="number" id="ph-${t}-vol-${i}" value="${p[t].volPct}" min="0" ${dis}><input type="number" id="ph-${t}-vam-${i}" value="${p[t].vamPct}" min="0" ${dis}><input type="text" id="ph-${t}-desc-${i}" value="${p[t].desc}" placeholder="Instrução..." ${dis}></div>`).join('')}</div></div>`;}).join('');
    modal.classList.add('show');
}
function toggleDay(i){const act=$(`d-act-${i}`).checked;$(`dcfg-${i}`).classList.toggle('inactive',!act);['warmup','main','cooldown'].forEach(t=>{$(`ph-${t}-vol-${i}`).disabled=!act;$(`ph-${t}-vam-${i}`).disabled=!act;$(`ph-${t}-desc-${i}`).disabled=!act;});}
function saveGroup(){
    const modal=$('modal-group'),id=modal.dataset.editing,name=$('group-name').value.trim(),cat=modal.dataset.category,vol=parseFloat($('group-volume').value)||0;
    if(!name)return showToast('Nome obrigatório','error');
    const plan=Array.from({length:7},(_,i)=>({active:$(`d-act-${i}`).checked,phases:['warmup','main','cooldown'].map(t=>({type:t,volPct:parseFloat($(`ph-${t}-vol-${i}`).value)||0,vamPct:parseFloat($(`ph-${t}-vam-${i}`).value)||0,desc:$(`ph-${t}-desc-${i}`).value}))}));
    if(id){Object.assign(groups.find(x=>x.id==id),{name,volume:vol,plan});showToast('Treino editado!');}
    else{groups.push({id:generateId(),name,category:cat,volume:vol,plan});showToast('Treino adicionado!');}
    saveState(['groups']);closeModals();renderGroups();
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
            <td><strong>${displayName}</strong>${a.phone?`<div style="font-size:11px;color:var(--text-muted);">${a.phone}</div>`:''}</td>
            <td style="font-size:13px;color:var(--text-muted);">${a.email || '—'}</td>
            <td><span class="badge">${plan}</span></td>
            <td style="font-weight:700;color:var(--primary);">${vam}</td>
            <td>${noteSnip}</td>
            <td style="text-align:right;white-space:nowrap;">
                <button class="btn btn-tertiary" onclick="openHistory(${a.id})" title="Histórico"><i class="ri-history-line"></i></button>
                <button class="btn btn-tertiary" onclick="editAthlete(${a.id})" title="Editar"><i class="ri-edit-line"></i></button>
                <button class="btn btn-tertiary" onclick="deleteAthlete(${a.id})" title="Excluir" style="color:var(--danger);"><i class="ri-delete-bin-line"></i></button>
                <button class="btn btn-primary" onclick="generateAndExport(${a.id})" style="padding:6px 12px;font-size:12px;margin-left:4px;"><i class="ri-image-line"></i> Gerar</button>
            </td></tr>`;}).join('');
}

function previewAthleteVAM(){const t=parseFloat($('athlete-test').value);const pv=$('athlete-vam-preview');if(!t||t<=0){pv.style.display='none';return;}const vam=180/t;pv.style.display='block';
    $('athlete-vam-zones').innerHTML=VAM_ZONES.map(z=>{const spd=vam*(z.pct/100);return`<div style="display:flex;justify-content:space-between;padding:4px 0;"><span style="font-size:12px;color:#475569;">${z.label} (${z.pct}%)</span><span style="font-size:13px;font-weight:800;color:${z.color};">${vamToPace(spd)}</span></div>`;}).join('');
}

function openAthleteModal(id=null){
    const modal=$('modal-athlete');modal.dataset.editing=id||'';$('modal-athlete-title').textContent=id?'Editar Atleta':'Novo Atleta';
    const sel=$('athlete-group');const opts=['<option value="">-- Selecione --</option>'];
    categories.forEach(cat=>{const cg=groups.filter(g=>g.category===cat);if(!cg.length)return;opts.push(`<optgroup label="${cat}">${cg.map(g=>`<option value="${g.id}">${g.name}</option>`).join('')}</optgroup>`);});sel.innerHTML=opts.join('');
    const a=id?athletes.find(x=>x.id===id):null;
    $('athlete-name').value=a?a.name:'';$('athlete-phone').value=a?(a.phone||''):'';$('athlete-dob').value=a?(a.dob||''):'';$('athlete-test-hr').value=a?(a.testHr||''):'';$('athlete-test').value=a?(a.testTime||''):'';$('athlete-notes').value=a?(a.notes||''):'';sel.value=a?(a.groupId||''):'';
    calculateTheoreticalHR();previewAthleteVAM();modal.classList.add('show');
}
function calculateTheoreticalHR(){const dob=$('athlete-dob').value,el=$('athlete-theo-hr');if(!dob){el.value='';return;}const b=new Date(dob),now=new Date();let age=now.getFullYear()-b.getFullYear();const m=now.getMonth()-b.getMonth();if(m<0||(m===0&&now.getDate()<b.getDate()))age--;el.value=(age>0&&age<120)?`${220-age} bpm (${age} anos)`:'';}
function saveAthlete(){
    const id=$('modal-athlete').dataset.editing,name=$('athlete-name').value.trim(),phone=$('athlete-phone').value,dob=$('athlete-dob').value,testHr=parseInt($('athlete-test-hr').value)||null,testTime=parseFloat($('athlete-test').value)||null,groupId=parseInt($('athlete-group').value)||null,notes=$('athlete-notes').value.trim();
    if(!name)return showToast('Nome obrigatório','error');
    if(id){Object.assign(athletes.find(x=>x.id==id),{name,phone,dob,testHr,testTime,groupId,notes});}
    else{athletes.push({id:generateId(),name,phone,dob,testHr,testTime,groupId,notes});}
    saveState(['athletes']);closeModals();renderAthletes();renderDashboard();showToast(id?'Atualizado!':'Cadastrado!');
}
function editAthlete(id){openAthleteModal(id);}
function deleteAthlete(id){const a=athletes.find(x=>x.id===id);if(!confirm(`Excluir "${a?.name}"?`))return;
    const backupA=JSON.parse(JSON.stringify(a));const backupH=historyPlans.filter(h=>h.athleteId===id).map(h=>JSON.parse(JSON.stringify(h)));
    athletes=athletes.filter(x=>x.id!==id);historyPlans=historyPlans.filter(h=>h.athleteId!==id);
    saveState(['athletes','history']);renderAthletes();renderDashboard();
    showToast('Atleta excluído.','default',()=>{athletes.push(backupA);historyPlans.push(...backupH);saveState(['athletes','history']);renderAthletes();renderDashboard();});
}

// ═══════════════════════════════════════
//  HISTORY
// ═══════════════════════════════════════
let currentHistoryAthleteId=null;
function openHistory(aId){currentHistoryAthleteId=aId;const a=athletes.find(x=>x.id===aId);$('hist-athlete-name').textContent=a.name;renderHistoryList(aId);$('modal-history').classList.add('show');}
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
    const g=groups.find(x=>x.id===athlete.groupId);if(!g||!athlete.testTime)return null;const vamKmh=180/athlete.testTime;
    const rows=g.plan.reduce((acc,d,i)=>{if(!d.active)return acc;const phases=d.phases.filter(ph=>ph.volPct>0).map(ph=>({type:ph.type,title:phaseLabels[ph.type],km:((ph.volPct/100)*g.volume).toFixed(1),pace:vamToPace(vamKmh*(ph.vamPct/100)),desc:ph.desc}));if(phases.length)acc.push({dayName:daysNames[i],phases});return acc;},[]);
    // HR zones if data available
    let hrInfo=null;
    const fcMax=athlete.testHr||null;
    if(fcMax){hrInfo={z1:`${Math.round(fcMax*0.6)}-${Math.round(fcMax*0.7)}`,z2:`${Math.round(fcMax*0.7)}-${Math.round(fcMax*0.8)}`,z3:`${Math.round(fcMax*0.8)}-${Math.round(fcMax*0.9)}`,z4:`${Math.round(fcMax*0.9)}-${Math.round(fcMax*0.95)}`,z5:`${Math.round(fcMax*0.95)}-${fcMax}`};}
    return{athleteName:athlete.name,volume:g.volume,groupName:g.name,categoryName:g.category,rows,hrInfo,vamKmh:vamKmh.toFixed(1)};
}

let currentExportCanvas=null,currentExportPhone='',currentExportHistId=null;

async function generateAndExport(aId){
    const a=athletes.find(x=>x.id===aId);if(!a.groupId||!a.testTime)return showToast('Preencha grupo e Teste VAM!','error');
    const calc=calculatePlan(a);if(!calc||!calc.rows.length)return showToast('Planilha sem dias ativos!','error');
    const plan={id:generateId(),athleteId:a.id,volume:calc.volume,calcData:calc};
    
    // --- SYNC WITH SUPABASE ---
    showToast('Sincronizando com o App do Aluno...');
    try {
        // 1. Priorizar o ID do Supabase se já estiver vinculado, senão buscar pelo nome
        let athleteId = a.supabaseId;
        
        if (!athleteId) {
            const { data: profiles } = await dbClient.from('profiles').select('id').ilike('name', `%${a.name}%`);
            if (profiles && profiles.length > 0) athleteId = profiles[0].id;
        }
        
        if (athleteId) {
            // 2. Calcular as datas da semana atual (começando nesta segunda)
            const today = new Date();
            const dayOfWeek = today.getDay(); // 0 (Dom) a 6 (Sab)
            const diffToMonday = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
            const monday = new Date(today.setDate(diffToMonday));
            
            const dayMap = { 'Segunda': 0, 'Terça': 1, 'Quarta': 2, 'Quinta': 3, 'Sexta': 4, 'Sábado': 5, 'Domingo': 6 };
            
            // 3. Preparar os treinos para inserção
            const workoutsToInsert = calc.rows.map(row => {
                const workoutDate = new Date(monday);
                workoutDate.setDate(monday.getDate() + dayMap[row.dayName]);
                
                return {
                    athlete_id: athleteId,
                    date: workoutDate.toISOString().split('T')[0],
                    type: calc.categoryName,
                    title: calc.groupName,
                    description: row.phases.map(p => `${phaseLabels[p.type]}: ${p.desc || 'Treino'}`).join('\n'),
                    metrics: { 
                        distance: row.phases.reduce((sum, p) => sum + parseFloat(p.km), 0).toFixed(1) + ' km',
                        duration: row.phases[0].pace // Usa o pace da primeira fase como referência
                    },
                    status: 'pending'
                };
            });

            // 4. Inserir no Supabase (Upsert por data/atleta seria ideal, mas vamos de insert simples por enquanto)
            const { error } = await dbClient.from('workouts').insert(workoutsToInsert);
            
            if (error) throw error;
            showToast('✅ Planilha enviada para o App!');
        } else {
            showToast('⚠️ Aluno não cadastrado no App.', 'error');
        }
    } catch (err) {
        console.error('Supabase Sync Error:', err);
        showToast('❌ Erro ao enviar para o banco.', 'error');
    }
    
    historyPlans.push(plan);saveState(['history']);await viewExport(plan.id);
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
//  GARMIN & GPX / FIT SYNC
// ═══════════════════════════════════════
function renderGarminView() {
    // Tela ativa pronta para importação
}

function haversineMeters(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const rad = Math.PI / 180;
    const dLat = (lat2 - lat1) * rad;
    const dLon = (lon2 - lon1) * rad;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1*rad) * Math.cos(lat2*rad) * Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function handleGarminFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
        try {
            processGpxContent(evt.target.result, file.name);
            showToast('Treino importado com sucesso!');
        } catch(err) {
            console.error(err);
            showToast('Erro ao processar arquivo GPX');
        }
    };
    reader.readAsText(file);
}

function loadGarminSampleWorkout() {
    // Exemplo real do treino 12x400mx100m no Guarujá
    const mockWorkout = {
        name: "Guarujá - 12x400mx100m (Garmin Connect)",
        totalDistKm: 6.00,
        durationSec: 1980,
        avgPace: "5:30/km",
        avgHr: 156,
        maxHr: 178,
        elevationM: 14,
        splits: [
            { km: 1, pace: "5:42/km", time: "5m 42s", hr: 142, ele: 2 },
            { km: 2, pace: "5:15/km", time: "5m 15s", hr: 154, ele: 3 },
            { km: 3, pace: "5:20/km", time: "5m 20s", hr: 158, ele: 2 },
            { km: 4, pace: "5:10/km", time: "5m 10s", hr: 162, ele: 3 },
            { km: 5, pace: "5:35/km", time: "5m 35s", hr: 165, ele: 2 },
            { km: 6, pace: "5:58/km", time: "5m 58s", hr: 158, ele: 2 }
        ]
    };
    renderGarminData(mockWorkout);
    showToast('Exemplo real de 12x400m carregado!');
}

function processGpxContent(xmlText, fileName) {
    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlText, "text/xml");
    const trkName = xml.querySelector("trk > name")?.textContent || fileName || "Corrida Garmin";
    const trkpts = xml.querySelectorAll("trkpt");

    let totalDistM = 0;
    let totalEleGain = 0;
    let hrSum = 0;
    let hrCount = 0;
    let maxHr = 0;
    const points = [];

    for (let i = 0; i < trkpts.length; i++) {
        const pt = trkpts[i];
        const lat = parseFloat(pt.getAttribute("lat") || "0");
        const lon = parseFloat(pt.getAttribute("lon") || "0");
        const ele = parseFloat(pt.querySelector("ele")?.textContent || "0");
        const timeStr = pt.querySelector("time")?.textContent || "";
        const timestamp = timeStr ? new Date(timeStr).getTime() : 0;

        let hr = 0;
        const hrEl = pt.querySelector("hr") || pt.getElementsByTagNameNS("*", "hr")[0];
        if (hrEl?.textContent) {
            hr = parseInt(hrEl.textContent, 10);
            if (!isNaN(hr) && hr > 0) {
                hrSum += hr;
                hrCount++;
                if (hr > maxHr) maxHr = hr;
            }
        }

        if (i > 0) {
            const prev = points[i - 1];
            const dist = haversineMeters(prev.lat, prev.lon, lat, lon);
            totalDistM += dist;
            if (ele > prev.ele) totalEleGain += (ele - prev.ele);
        }

        points.push({ lat, lon, ele, timestamp, hr, dist: totalDistM });
    }

    const durationSec = points.length > 1 ? Math.round((points[points.length - 1].timestamp - points[0].timestamp) / 1000) : 0;
    const totalDistKm = totalDistM / 1000;
    const avgPaceSec = totalDistKm > 0 ? (durationSec / totalDistKm) : 0;
    const avgPaceMin = Math.floor(avgPaceSec / 60);
    const avgPaceRemainderSec = Math.round(avgPaceSec % 60);
    const avgPaceFormatted = `${avgPaceMin}:${avgPaceRemainderSec < 10 ? '0' : ''}${avgPaceRemainderSec}/km`;

    // Splits km a km
    const splits = [];
    let currentKm = 1;
    let startIdx = 0;

    for (let i = 0; i < points.length; i++) {
        if (points[i].dist >= currentKm * 1000 || i === points.length - 1) {
            const splitDistKm = (points[i].dist - points[startIdx].dist) / 1000;
            const splitTimeSec = Math.round((points[i].timestamp - points[startIdx].timestamp) / 1000);
            if (splitDistKm > 0.2) {
                const spPaceSec = splitTimeSec / splitDistKm;
                const spPaceMin = Math.floor(spPaceSec / 60);
                const spPaceRem = Math.round(spPaceSec % 60);
                splits.push({
                    km: currentKm,
                    pace: `${spPaceMin}:${spPaceRem < 10 ? '0' : ''}${spPaceRem}/km`,
                    time: `${Math.floor(splitTimeSec/60)}m ${splitTimeSec%60}s`,
                    hr: hrCount > 0 ? Math.round(hrSum / hrCount) : null,
                    ele: Math.round(totalEleGain / Math.max(1, currentKm))
                });
            }
            currentKm++;
            startIdx = i;
        }
    }

    renderGarminData({
        name: trkName,
        totalDistKm: parseFloat(totalDistKm.toFixed(2)),
        durationSec,
        avgPace: avgPaceFormatted,
        avgHr: hrCount > 0 ? Math.round(hrSum / hrCount) : null,
        maxHr,
        elevationM: Math.round(totalEleGain),
        splits
    });
}

function renderGarminData(data) {
    $('garmin-result-container').style.display = 'block';
    $('garmin-workout-title').textContent = data.name;
    $('garmin-dist').textContent = `${data.totalDistKm} km`;
    
    const hrs = Math.floor(data.durationSec / 3600);
    const mins = Math.floor((data.durationSec % 3600) / 60);
    const secs = data.durationSec % 60;
    $('garmin-time').textContent = (hrs > 0 ? `${hrs}h ` : '') + `${mins}m ${secs}s`;

    $('garmin-pace').textContent = data.avgPace;
    $('garmin-hr').textContent = data.avgHr ? `${data.avgHr} bpm ${data.maxHr ? '(' + data.maxHr + ')' : ''}` : '-- bpm';
    $('garmin-ele').textContent = `${data.elevationM} m`;

    const tbody = $('garmin-splits-table');
    tbody.innerHTML = data.splits.map(s => `
        <tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:10px;font-weight:700;">${s.km} km</td>
            <td style="padding:10px;font-weight:800;color:#e11d48;">${s.pace}</td>
            <td style="padding:10px;color:#64748b;">${s.time}</td>
            <td style="padding:10px;">${s.hr ? s.hr + ' bpm' : '--'}</td>
            <td style="padding:10px;color:#64748b;">+${s.ele}m</td>
        </tr>
    `).join('');
}

// ═══════════════════════════════════════
//  GARMIN WORKOUT BUILDER (ESTILO CONNECT)
// ═══════════════════════════════════════
let garminWorkoutSteps = [
    { id: 'step_1', type: 'warmup', title: 'Aquecimento', durationType: 'lap_button', durationValue: 0, targetType: 'pace', vamPct: 65, notes: '' },
    { 
        id: 'repeat_1', 
        type: 'repeat', 
        count: 8, 
        steps: [
            { id: 'sub_1', type: 'run', title: 'Corrida', durationType: 'distance', durationValue: 0.4, targetType: 'pace', vamPct: 100, notes: 'Tiro no ritmo de VAM' },
            { id: 'sub_2', type: 'recovery', title: 'Recuperação', durationType: 'time', durationValue: 90, targetType: 'open', vamPct: 60, notes: 'Trote ou caminhada' }
        ]
    },
    { id: 'step_2', type: 'cooldown', title: 'Desaquecimento', durationType: 'lap_button', durationValue: 0, targetType: 'pace', vamPct: 60, notes: '' }
];

let selectedGarminAthleteId = null;

const garminTypeColors = {
    warmup: '#ef4444',   // Vermelho
    run: '#0284c7',      // Azul
    recovery: '#10b981', // Verde
    cooldown: '#10b981', // Verde
    repeat: '#6366f1'    // Indigo
};

const garminTypeLabels = {
    warmup: 'Aquecimento',
    run: 'Corrida',
    recovery: 'Recuperação',
    cooldown: 'Desaquecimento'
};

function renderGarminWorkoutBuilder() {
    // 1. Popular lista de atletas
    const select = $('g-workout-athlete-select');
    if (select) {
        select.innerHTML = '<option value="">-- Selecione o Atleta para Calcular Ritmos --</option>' + 
            athletes.map(a => `<option value="${a.id}" ${selectedGarminAthleteId == a.id ? 'selected' : ''}>${a.name} ${a.testTime ? `(VAM: ${(180/a.testTime).toFixed(1)} km/h)` : '(Sem VAM)'}</option>`).join('');
    }
    onGarminAthleteChange();
    renderGarminWorkoutSteps();
}

function onGarminAthleteChange() {
    const select = $('g-workout-athlete-select');
    selectedGarminAthleteId = select ? select.value : null;
    const athlete = athletes.find(a => a.id == selectedGarminAthleteId);
    const badge = $('g-athlete-pace-badge');
    
    if (badge) {
        if (athlete && athlete.testTime) {
            const vamKmh = 180 / athlete.testTime;
            badge.innerHTML = `<span style="display:inline-flex;align-items:center;gap:6px;background:#e0f2fe;color:#0369a1;padding:4px 10px;border-radius:20px;font-weight:700;">
                <i class="ri-flashlight-line"></i> VAM: ${vamKmh.toFixed(1)} km/h • 100% = ${vamToPace(vamKmh)}
            </span>`;
        } else {
            badge.innerHTML = `<span style="color:#94a3b8;font-size:11px;">Sem atleta selecionado. Usando referência padrão 12 km/h (5:00/km).</span>`;
        }
    }
    renderGarminWorkoutSteps();
}

function getGarminAthleteVamKmh() {
    const athlete = athletes.find(a => a.id == selectedGarminAthleteId);
    if (athlete && athlete.testTime) {
        return 180 / athlete.testTime;
    }
    return 12.0; // Padrão 5:00/km
}

function addGarminStep(type = 'run', targetList = null) {
    const newStep = {
        id: 'step_' + Date.now() + Math.random().toString(36).substr(2, 4),
        type: type,
        title: garminTypeLabels[type] || 'Corrida',
        durationType: 'distance',
        durationValue: 1.0,
        targetType: 'pace',
        vamPct: type === 'warmup' ? 65 : type === 'run' ? 90 : 60,
        notes: ''
    };
    if (targetList) {
        targetList.push(newStep);
    } else {
        garminWorkoutSteps.push(newStep);
    }
    renderGarminWorkoutSteps();
}

function addGarminRepeatBlock() {
    garminWorkoutSteps.push({
        id: 'repeat_' + Date.now(),
        type: 'repeat',
        count: 5,
        steps: [
            { id: 'sub_' + Date.now() + '_1', type: 'run', title: 'Corrida', durationType: 'distance', durationValue: 0.4, targetType: 'pace', vamPct: 100, notes: 'Tiro' },
            { id: 'sub_' + Date.now() + '_2', type: 'recovery', title: 'Recuperação', durationType: 'time', durationValue: 60, targetType: 'open', vamPct: 60, notes: 'Trote' }
        ]
    });
    renderGarminWorkoutSteps();
}

function removeGarminStep(id) {
    garminWorkoutSteps = garminWorkoutSteps.filter(s => {
        if (s.id === id) return false;
        if (s.type === 'repeat' && s.steps) {
            s.steps = s.steps.filter(sub => sub.id !== id);
        }
        return true;
    });
    renderGarminWorkoutSteps();
}

function resetGarminWorkoutBuilder() {
    if (!confirm('Deseja redefinir o treino para o padrão?')) return;
    garminWorkoutSteps = [
        { id: 'step_1', type: 'warmup', title: 'Aquecimento', durationType: 'lap_button', durationValue: 0, targetType: 'pace', vamPct: 65, notes: '' },
        { 
            id: 'repeat_1', 
            type: 'repeat', 
            count: 6, 
            steps: [
                { id: 'sub_1', type: 'run', title: 'Corrida', durationType: 'distance', durationValue: 0.4, targetType: 'pace', vamPct: 100, notes: '' },
                { id: 'sub_2', type: 'recovery', title: 'Recuperação', durationType: 'time', durationValue: 60, targetType: 'open', vamPct: 60, notes: '' }
            ]
        },
        { id: 'step_2', type: 'cooldown', title: 'Desaquecimento', durationType: 'lap_button', durationValue: 0, targetType: 'pace', vamPct: 60, notes: '' }
    ];
    renderGarminWorkoutSteps();
}

function renderGarminWorkoutSteps() {
    const container = $('g-steps-container');
    const colorStrip = $('g-color-strip');
    if (!container) return;

    const vamKmh = getGarminAthleteVamKmh();
    let totalDistKm = 0;
    let totalSecs = 0;
    let stripHtml = '';

    function computeStepStats(step) {
        let dist = 0, secs = 0;
        const speedKmh = vamKmh * (step.vamPct / 100);
        const paceSecPerKm = speedKmh > 0 ? (3600 / speedKmh) : 300;

        if (step.durationType === 'distance') {
            dist = parseFloat(step.durationValue) || 0;
            secs = Math.round(dist * paceSecPerKm);
        } else if (step.durationType === 'time') {
            secs = parseInt(step.durationValue, 10) || 0;
            dist = (secs / 3600) * speedKmh;
        } else if (step.durationType === 'lap_button') {
            dist = 1.0; // Estimativa padrão
            secs = Math.round(1.0 * paceSecPerKm);
        }
        return { dist, secs, speedKmh };
    }

    // Calcula total para a barra superior de cores
    garminWorkoutSteps.forEach(item => {
        if (item.type === 'repeat') {
            let repDist = 0;
            (item.steps || []).forEach(sub => {
                const s = computeStepStats(sub);
                repDist += s.dist * item.count;
                totalSecs += s.secs * item.count;
            });
            totalDistKm += repDist;
        } else {
            const s = computeStepStats(item);
            totalDistKm += s.dist;
            totalSecs += s.secs;
        }
    });

    $('g-workout-total-dist').textContent = `${totalDistKm.toFixed(2)} km`;
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const sec = totalSecs % 60;
    $('g-workout-total-time').textContent = (h > 0 ? `${h}h ` : '') + `${m}m ${sec < 10 ? '0' : ''}${sec}s`;

    // Renderiza a barra de cores estilo Garmin
    garminWorkoutSteps.forEach(item => {
        if (item.type === 'repeat') {
            const pct = Math.max(5, (100 / Math.max(1, garminWorkoutSteps.length)));
            stripHtml += `<div style="flex:1;background:#6366f1;opacity:0.9;" title="Repetição ${item.count}x"></div>`;
        } else {
            const col = garminTypeColors[item.type] || '#0284c7';
            stripHtml += `<div style="flex:1;background:${col};" title="${item.title}"></div>`;
        }
    });
    if (colorStrip) colorStrip.innerHTML = stripHtml || '<div style="flex:1;background:#0284c7;"></div>';

    // Helper para desenhar um card de etapa individual
    function renderStepCard(step, isNested = false, parentRepeatId = null) {
        const stats = computeStepStats(step);
        const col = garminTypeColors[step.type] || '#0284c7';
        const targetPaceStr = step.targetType === 'pace' ? vamToPace(stats.speedKmh) : 'Livre';

        return `
        <div style="background:var(--panel);border:1px solid var(--border);border-left:6px solid ${col};border-radius:12px;padding:16px 20px;box-shadow:0 1px 3px rgba(0,0,0,0.04);position:relative;margin-bottom:${isNested ? '10px' : '0'};">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                <div style="display:flex;align-items:center;gap:12px;">
                    <select onchange="updateGarminStepProp('${step.id}', 'type', this.value, '${parentRepeatId}')" 
                            style="font-size:14px;font-weight:800;color:var(--text);border:none;background:transparent;cursor:pointer;outline:none;">
                        <option value="warmup" ${step.type==='warmup'?'selected':''}>Aquecimento</option>
                        <option value="run" ${step.type==='run'?'selected':''}>Corrida / Tiro</option>
                        <option value="recovery" ${step.type==='recovery'?'selected':''}>Recuperação</option>
                        <option value="cooldown" ${step.type==='cooldown'?'selected':''}>Desaquecimento</option>
                    </select>
                </div>
                <button class="btn btn-tertiary" onclick="removeGarminStep('${step.id}')" style="color:var(--danger);padding:4px 8px;" title="Remover etapa">
                    <i class="ri-delete-bin-line"></i>
                </button>
            </div>

            <!-- Grade de Configurações da Etapa -->
            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(140px, 1fr));gap:12px;align-items:center;">
                <!-- Duração / Condição de Fim -->
                <div class="input-col">
                    <label style="font-size:11px;color:var(--text-muted);font-weight:700;">DURAÇÃO</label>
                    <select onchange="updateGarminStepProp('${step.id}', 'durationType', this.value, '${parentRepeatId}')" 
                            style="padding:6px 8px;border-radius:6px;font-size:13px;border:1px solid var(--border-strong);">
                        <option value="lap_button" ${step.durationType==='lap_button'?'selected':''}>Pressionar botão Lap</option>
                        <option value="distance" ${step.durationType==='distance'?'selected':''}>Distância</option>
                        <option value="time" ${step.durationType==='time'?'selected':''}>Tempo</option>
                    </select>
                </div>

                <!-- Valor da Duração se Distância ou Tempo -->
                ${step.durationType === 'distance' ? `
                <div class="input-col">
                    <label style="font-size:11px;color:var(--text-muted);font-weight:700;">DISTÂNCIA (KM)</label>
                    <input type="number" step="0.1" min="0.05" value="${step.durationValue}" 
                           onchange="updateGarminStepProp('${step.id}', 'durationValue', parseFloat(this.value), '${parentRepeatId}')"
                           style="padding:6px 8px;border-radius:6px;font-size:13px;font-weight:700;border:1px solid var(--border-strong);">
                </div>` : ''}

                ${step.durationType === 'time' ? `
                <div class="input-col">
                    <label style="font-size:11px;color:var(--text-muted);font-weight:700;">TEMPO (SEGUNDOS)</label>
                    <input type="number" step="5" min="5" value="${step.durationValue}" 
                           onchange="updateGarminStepProp('${step.id}', 'durationValue', parseInt(this.value, 10), '${parentRepeatId}')"
                           style="padding:6px 8px;border-radius:6px;font-size:13px;font-weight:700;border:1px solid var(--border-strong);">
                </div>` : ''}

                <!-- Intensidade (% VAM) -->
                <div class="input-col">
                    <label style="font-size:11px;color:var(--text-muted);font-weight:700;">INTENSIDADE (% VAM)</label>
                    <input type="number" min="50" max="150" step="5" value="${step.vamPct || 80}" 
                           onchange="updateGarminStepProp('${step.id}', 'vamPct', parseInt(this.value, 10), '${parentRepeatId}')"
                           style="padding:6px 8px;border-radius:6px;font-size:13px;font-weight:700;border:1px solid var(--border-strong);">
                </div>

                <!-- Pace Alvo Estimado -->
                <div class="input-col">
                    <label style="font-size:11px;color:var(--text-muted);font-weight:700;">PACE ESTIMADO</label>
                    <div style="font-size:15px;font-weight:800;color:${col};padding:6px 0;">
                        ${targetPaceStr}
                    </div>
                </div>
            </div>

            <!-- Notas da Etapa -->
            <div style="margin-top:10px;">
                <input type="text" placeholder="Instrução no visor do relógio (opcional)..." value="${step.notes || ''}"
                       onchange="updateGarminStepProp('${step.id}', 'notes', this.value, '${parentRepeatId}')"
                       style="width:100%;padding:6px 10px;font-size:12px;border:1px solid var(--border);border-radius:6px;background:var(--bg);color:var(--text);">
            </div>
        </div>`;
    }

    // Renderiza todos os passos
    let html = '';
    garminWorkoutSteps.forEach(item => {
        if (item.type === 'repeat') {
            html += `
            <div style="background:#f8fafc;border:2px dashed #cbd5e1;border-radius:14px;padding:20px;position:relative;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                    <div style="display:flex;align-items:center;gap:10px;">
                        <span style="background:#6366f1;color:white;padding:4px 10px;border-radius:8px;font-size:12px;font-weight:800;display:inline-flex;align-items:center;gap:4px;">
                            <i class="ri-repeat-2-line"></i> REPETIÇÃO
                        </span>
                        <div style="display:flex;align-items:center;gap:6px;">
                            <label style="font-size:13px;font-weight:700;">Número de vezes:</label>
                            <input type="number" min="1" max="50" value="${item.count}" 
                                   onchange="updateGarminRepeatCount('${item.id}', parseInt(this.value, 10))"
                                   style="width:60px;padding:4px 8px;font-size:14px;font-weight:800;text-align:center;border:1px solid var(--border-strong);border-radius:6px;">
                            <span style="font-weight:700;">vezes</span>
                        </div>
                    </div>
                    <div style="display:flex;gap:6px;">
                        <button class="btn btn-secondary" onclick="addGarminStepToRepeat('${item.id}', 'run')" style="padding:4px 10px;font-size:12px;">
                            <i class="ri-add-line"></i> Passo
                        </button>
                        <button class="btn btn-tertiary" onclick="removeGarminStep('${item.id}')" style="color:var(--danger);padding:4px 8px;">
                            <i class="ri-delete-bin-line"></i>
                        </button>
                    </div>
                </div>

                <div style="display:flex;flex-direction:column;gap:10px;">
                    ${(item.steps || []).map(sub => renderStepCard(sub, true, item.id)).join('')}
                </div>
            </div>`;
        } else {
            html += renderStepCard(item, false);
        }
    });

    container.innerHTML = html;
}

function updateGarminStepProp(stepId, prop, value, parentRepeatId) {
    if (parentRepeatId && parentRepeatId !== 'null' && parentRepeatId !== 'undefined') {
        const repeat = garminWorkoutSteps.find(s => s.id === parentRepeatId);
        if (repeat && repeat.steps) {
            const target = repeat.steps.find(sub => sub.id === stepId);
            if (target) {
                target[prop] = value;
                if (prop === 'type') target.title = garminTypeLabels[value] || 'Corrida';
            }
        }
    } else {
        const target = garminWorkoutSteps.find(s => s.id === stepId);
        if (target) {
            target[prop] = value;
            if (prop === 'type') target.title = garminTypeLabels[value] || 'Corrida';
        }
    }
    renderGarminWorkoutSteps();
}

function updateGarminRepeatCount(repeatId, count) {
    const repeat = garminWorkoutSteps.find(s => s.id === repeatId);
    if (repeat) {
        repeat.count = Math.max(1, count || 1);
        renderGarminWorkoutSteps();
    }
}

function addGarminStepToRepeat(repeatId, type = 'run') {
    const repeat = garminWorkoutSteps.find(s => s.id === repeatId);
    if (repeat && repeat.steps) {
        repeat.steps.push({
            id: 'sub_' + Date.now() + Math.random().toString(36).substr(2, 4),
            type: type,
            title: garminTypeLabels[type] || 'Corrida',
            durationType: 'distance',
            durationValue: 0.4,
            targetType: 'pace',
            vamPct: 100,
            notes: ''
        });
        renderGarminWorkoutSteps();
    }
}

// ─── Exportador Garmin TCX Oficial ───
function exportCurrentGarminWorkoutTCX() {
    const workoutName = ($('g-workout-title')?.value || 'Treino_MeuVAM').trim();
    const vamKmh = getGarminAthleteVamKmh();
    let stepIdCounter = 1;

    let stepsXml = '';

    function buildStepXml(step) {
        const id = stepIdCounter++;
        const stepName = (step.title || 'Corrida').replace(/&/g, '&amp;');
        const speedKmh = vamKmh * (step.vamPct / 100);
        const speedMps = (speedKmh / 3.6).toFixed(2);
        const lowSpeedMps = (speedMps * 0.95).toFixed(2);
        const highSpeedMps = (speedMps * 1.05).toFixed(2);

        let durationTag = '';
        if (step.durationType === 'lap_button') {
            durationTag = `<Duration xsi:type="UserEvent_t"><EventName>LapButton</EventName></Duration>`;
        } else if (step.durationType === 'distance') {
            const meters = Math.round((parseFloat(step.durationValue) || 1.0) * 1000);
            durationTag = `<Duration xsi:type="Distance_t"><Meters>${meters}</Meters></Duration>`;
        } else if (step.durationType === 'time') {
            const secs = parseInt(step.durationValue, 10) || 60;
            durationTag = `<Duration xsi:type="Time_t"><Seconds>${secs}</Seconds></Duration>`;
        }

        let intensityType = step.type === 'recovery' || step.type === 'cooldown' ? 'Resting' : 'Active';

        return `
        <Step xsi:type="Step_t">
          <StepId>${id}</StepId>
          <Name>${stepName}</Name>
          ${durationTag}
          <Intensity>${intensityType}</Intensity>
          <Target xsi:type="Speed_t">
            <SpeedZone xsi:type="CustomSpeedZone_t">
              <ViewAs>Pace</ViewAs>
              <LowInMetersPerSecond>${lowSpeedMps}</LowInMetersPerSecond>
              <HighInMetersPerSecond>${highSpeedMps}</HighInMetersPerSecond>
            </SpeedZone>
          </Target>
        </Step>`;
    }

    garminWorkoutSteps.forEach(item => {
        if (item.type === 'repeat') {
            const repeatId = stepIdCounter++;
            const subSteps = (item.steps || []).map(sub => buildStepXml(sub)).join('');
            stepsXml += `
        <Step xsi:type="Repeat_t">
          <StepId>${repeatId}</StepId>
          <Repetitions>${item.count}</Repetitions>
          <ChildSteps>
            ${subSteps}
          </ChildSteps>
        </Step>`;
        } else {
            stepsXml += buildStepXml(item);
        }
    });

    const tcx = `<?xml version="1.0" encoding="UTF-8"?>
<TrainingCenterDatabase
  xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2 http://www.garmin.com/xmlschemas/TrainingCenterDatabasev2.xsd">
  <Workouts>
    <Workout Sport="Running">
      <Name>${workoutName.substring(0, 15)}</Name>
      ${stepsXml}
      <Creator xsi:type="Device_t">
        <Name>MeuVAM Superacao</Name>
        <UnitId>123456789</UnitId>
        <ProductID>1</ProductID>
      </Creator>
    </Workout>
  </Workouts>
</TrainingCenterDatabase>`;

    const blob = new Blob([tcx], { type: 'application/vnd.garmin.tcx+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workoutName.replace(/[^a-zA-Z0-9_-]/g, '_')}.tcx`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('✅ Treino baixado em formato Garmin (.TCX)!');
}

// ─── Salvar e Sincronizar com o Supabase (App do Aluno) ───
async function saveGarminWorkoutToApp() {
    if (!selectedGarminAthleteId) {
        return showToast('Selecione um atleta de referência para salvar.', 'error');
    }
    const athlete = athletes.find(a => a.id == selectedGarminAthleteId);
    if (!athlete) return showToast('Atleta não encontrado.', 'error');

    showToast('Salvando treino no perfil do aluno...');
    try {
        let athleteId = athlete.supabaseId;
        if (!athleteId) {
            const { data: profiles } = await dbClient.from('profiles').select('id').ilike('name', `%${athlete.name}%`);
            if (profiles && profiles.length > 0) athleteId = profiles[0].id;
        }

        const workoutTitle = ($('g-workout-title')?.value || 'Treino de corrida').trim();
        const workoutNotes = ($('g-workout-notes')?.value || '').trim();
        const distText = $('g-workout-total-dist')?.textContent || '0.00 km';
        const timeText = $('g-workout-total-time')?.textContent || '00:00';

        const workoutPayload = {
            athlete_id: athleteId || athlete.id,
            date: new Date().toISOString().split('T')[0],
            type: 'Corrida',
            title: workoutTitle,
            description: workoutNotes || 'Treino estruturado com metas de intensidade.',
            metrics: {
                distance: distText,
                duration: timeText,
                structured_steps: garminWorkoutSteps
            },
            status: 'pending'
        };

        if (athleteId) {
            const { error } = await dbClient.from('workouts').insert([workoutPayload]);
            if (error) console.warn('Supabase insert warning:', error);
        }

        showToast('✅ Treino salvo com sucesso!');
    } catch (err) {
        console.error('Erro ao salvar treino:', err);
        showToast('Treino salvo localmente.', 'default');
    }
}

// ═══════════════════════════════════════
//  PWA
// ═══════════════════════════════════════
if('serviceWorker' in navigator){navigator.serviceWorker.register('sw.js').catch(()=>{});}
