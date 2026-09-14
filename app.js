const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const cats = [['softs','Softs'],['bieres','Bières'],['alcools','Alcools'],['shots','Shots'],['vins','Vins']];
let products = structuredClone(window.DEFAULT_PRODUCTS), cat='softs', items=[], returns={glass:0,large:0}, pending=null, actions=[];
const tapBursts=new Map();
const mixerList=()=>{
 const available=new Set(products.filter(p=>p.cat==='softs').map(p=>p.name));
 const preferred=["Coca","Tonic","Jus d’orange","Thé froid pêche","Limonade","Grapefruit","Maté","Eau gazeuse","Eau plate"];
 return preferred.filter(x=>available.has(x)).concat('Sans soft');
};

function mixerIcon(name){
 const icons={
  "Coca":"🥤","Tonic":"🫧","Jus d’orange":"🍊","Thé froid pêche":"🍑",
  "Limonade":"🍋","Grapefruit":"🍊","Maté":"🧉","Eau gazeuse":"🫧",
  "Eau plate":"💧","Sans soft":"🚫"
 };
 return icons[name]||"🥤";
}

function money(n){const v=Math.round((Number(n)||0)*100)/100;return (Number.isInteger(v)?String(v):v.toFixed(2).replace(/0+$/,'').replace(/\.$/,''))+' CHF'}
function total(){return items.reduce((s,x)=>s+x.price+x.deposit,0)-returns.glass*2-returns.large*10}
function qty(id){return items.filter(x=>x.id===id).length}

function productsForCat(name){
 const list=products.filter(p=>p.cat===name).sort((a,b)=>a.name.localeCompare(b.name,'fr',{sensitivity:'base'}));
 if(name!=='alcools')return list;

 // Exceptions d'affichage demandées: Baby + Whisky sur la même ligne,
 // puis Verre de Kamikaze + Arrosoir Kamikaze côte à côte.
 const byId=id=>list.find(p=>p.id===id);
 const fixedTop=['baby','whisky'].map(byId).filter(Boolean);
 const kamikazePair=['kamikaze','arrosoir'].map(byId).filter(Boolean);
 const reserved=new Set([...fixedTop,...kamikazePair].map(p=>p.id));
 const rest=list.filter(p=>!reserved.has(p.id));

 if(kamikazePair.length!==2)return [...fixedTop,...rest,...kamikazePair];
 const insertAt=Math.min(8,rest.length-(rest.length%2));
 return [...fixedTop,...rest.slice(0,insertAt),...kamikazePair,...rest.slice(insertAt)];
}
function hapticTap(){
 try{if(navigator.vibrate)navigator.vibrate(8)}catch{}
}
function bumpQty(id){
 const q=document.querySelector(`[data-id="${id}"] .qty`);
 if(!q)return;
 q.classList.remove('qty-bump');void q.offsetWidth;q.classList.add('qty-bump');
}
function groupItems(){
 const g={};
 items.forEach(x=>{const k=x.id+'|'+(x.soft||'');if(!g[k])g[k]={...x,n:0};g[k].n++});
 const catOrder=Object.fromEntries(cats.map((c,i)=>[c[0],i]));
 return Object.entries(g).map(([key,val])=>({key,...val})).sort((a,b)=>{
   const ca=(catOrder[a.cat]??999)-(catOrder[b.cat]??999);if(ca)return ca;
   const na=a.name.localeCompare(b.name,'fr',{sensitivity:'base'});if(na)return na;
   return (a.soft||'').localeCompare(b.soft||'','fr',{sensitivity:'base'});
 });
}
function toastMsg(t,ms=900){const el=$('#toast');el.textContent=t;el.classList.add('show');clearTimeout(window.__toast);window.__toast=setTimeout(()=>el.classList.remove('show'),ms)}
function snapshot(){return {items:structuredClone(items),returns:{...returns}}}
function remember(){actions.push(snapshot());if(actions.length>30)actions.shift()}
function undo(){if(!actions.length){toastMsg('Rien à annuler');return}const s=actions.pop();items=s.items;returns=s.returns;render();toastMsg('Dernière action annulée ↩')}

function burstFeedback(p,soft=''){
 const key=p.id+'|'+(soft||''),now=Date.now(),prev=tapBursts.get(key);
 const state=prev&&now-prev.last<480?prev:{count:0,last:0,timer:null};
 state.count++;state.last=now;clearTimeout(state.timer);
 tapBursts.set(key,state);
 const b=document.querySelector(`[data-id="${p.id}"]`);
 if(b){
   const plus=b.querySelector('.tap-plus');
   if(plus)plus.textContent='+'+state.count;
   b.classList.remove('just-added');void b.offsetWidth;b.classList.add('just-added');
 }
 const label=p.name+(soft?' · '+soft:'');
 toastMsg('+'+state.count+' '+label,520);
 state.timer=setTimeout(()=>tapBursts.delete(key),500);
}
function updateSummary(){
 $('#count').textContent=`${items.length} article${items.length!==1?'s':''}`;
 $('#total').textContent=money(total());
 $('#retGlassQty').textContent=returns.glass?`×${returns.glass}`:'';
 $('#retLargeQty').textContent=returns.large?`×${returns.large}`:'';
}
function updateProductQty(id){
 const b=document.querySelector(`[data-id="${id}"]`);if(!b)return;
 let q=b.querySelector('.qty'),n=qty(id);
 if(n){
   if(!q){q=document.createElement('span');q.className='qty';b.appendChild(q)}
   q.textContent='×'+n;
   bumpQty(id);
 }else if(q)q.remove();
}

function render(){
 $('#tabs').innerHTML=cats.map(c=>`<button class="${c[0]===cat?'active':''}" data-cat="${c[0]}">${c[1]}</button>`).join('');
 $('#grid').innerHTML=productsForCat(cat).map(p=>`<button class="product" data-cat="${p.cat}" data-id="${p.id}"><b>${p.name}</b><div class="price-row"><span class="price">${money(p.price)}</span>${p.deposit?`<span class="deposit-badge">+${money(p.deposit)}</span>`:''}</div>${p.note?`<small>${p.note}</small>`:''}${qty(p.id)?`<span class="qty">×${qty(p.id)}</span>`:''}<span class="tap-plus">+1</span></button>`).join('');
 $('#count').textContent=`${items.length} article${items.length!==1?'s':''}`;$('#total').textContent=money(total());$('#retGlassQty').textContent=returns.glass?`×${returns.glass}`:'';$('#retLargeQty').textContent=returns.large?`×${returns.large}`:'';
}
function openProduct(p,b){
 hapticTap();
 if(p.soft){
   pending=p;
   $('#softTitle').textContent=p.name+' · quel soft ?';
   $('#softs').innerHTML=mixerList().map(s=>`<button data-soft="${s}" class="${s==='Sans soft'?'soft-none':''}"><span class="soft-icon">${mixerIcon(s)}</span><span class="soft-label">${s}</span></button>`).join('');
   $('#softDlg').showModal();
 }else addItem(p,b);
}
function changeCat(next,direction=0){
 if(next===cat)return;
 cat=next;render();
 const grid=$('#grid');
 grid.classList.remove('swipe-in-left','swipe-in-right');
 void grid.offsetWidth;
 if(direction<0)grid.classList.add('swipe-in-left');
 if(direction>0)grid.classList.add('swipe-in-right');
}
$('#tabs').onclick=e=>{
 const b=e.target.closest('button');
 if(b)changeCat(b.dataset.cat,0);
};

// Gestion tactile V3.5 : tap rapide, appui long −1, scroll vertical prioritaire et swipe visuel.
function setSwipePreview(dx){
 const limited=Math.max(-90,Math.min(90,dx*.42));
 ['#grid','.returns'].forEach(sel=>{const el=$(sel);if(el){el.style.transition='none';el.style.transform=`translateX(${limited}px)`;el.style.opacity=String(1-Math.min(.16,Math.abs(limited)/560))}});
}
function clearSwipePreview(animate=true){
 ['#grid','.returns'].forEach(sel=>{const el=$(sel);if(el){el.style.transition=animate?'transform .16s ease, opacity .16s ease':'none';el.style.transform='translateX(0)';el.style.opacity='1'}});
}
function removeOneProduct(id){
 const idx=items.findLastIndex(x=>x.id===id);
 if(idx<0){toastMsg('Aucun article à retirer',650);return false}
 const removed=items[idx];remember();items.splice(idx,1);updateSummary();updateProductQty(id);hapticTap();toastMsg(`−1 ${removed.name}${removed.soft?' · '+removed.soft:''}`,650);return true;
}
(()=>{
 const grid=$('#grid');
 let startX=0,startY=0,lastX=0,lastY=0,target=null,tracking=false,pointerId=null,longTimer=null,longDone=false;
 const TAP_MOVE=11,SWIPE_MIN=34,SWIPE_RATIO=1.05,LONG_MS=520;
 const cancelLong=()=>{clearTimeout(longTimer);longTimer=null};

 grid.addEventListener('pointerdown',e=>{
   if(e.pointerType==='mouse'&&e.button!==0)return;
   startX=lastX=e.clientX;startY=lastY=e.clientY;
   target=e.target.closest('.product');tracking=true;pointerId=e.pointerId;longDone=false;
   cancelLong();
   if(target){
     longTimer=setTimeout(()=>{
       if(!tracking||!target)return;
       longDone=removeOneProduct(target.dataset.id);
       if(longDone){target.classList.add('just-removed');setTimeout(()=>target?.classList.remove('just-removed'),260)}
     },LONG_MS);
   }
 },{passive:true});

 grid.addEventListener('pointermove',e=>{
   if(!tracking||e.pointerId!==pointerId)return;
   lastX=e.clientX;lastY=e.clientY;
   const dx=lastX-startX,dy=lastY-startY,adx=Math.abs(dx),ady=Math.abs(dy);
   if(adx>TAP_MOVE||ady>TAP_MOVE)cancelLong();
   if(adx>8&&adx>ady*1.02)setSwipePreview(dx);else if(ady>adx)clearSwipePreview(false);
 },{passive:true});

 grid.addEventListener('pointercancel',()=>{cancelLong();clearSwipePreview();tracking=false;target=null;pointerId=null;longDone=false},{passive:true});

 grid.addEventListener('pointerup',e=>{
   if(!tracking||e.pointerId!==pointerId)return;
   cancelLong();lastX=e.clientX;lastY=e.clientY;
   const dx=lastX-startX,dy=lastY-startY,adx=Math.abs(dx),ady=Math.abs(dy);
   tracking=false;pointerId=null;clearSwipePreview();

   if(longDone){longDone=false;target=null;return}
   if(adx>=SWIPE_MIN&&adx>ady*SWIPE_RATIO){
     const i=cats.findIndex(c=>c[0]===cat);
     const ni=dx<0?Math.min(cats.length-1,i+1):Math.max(0,i-1);
     if(ni!==i)changeCat(cats[ni][0],dx<0?-1:1);
     target=null;return;
   }
   if(adx>TAP_MOVE||ady>TAP_MOVE){target=null;return}
   if(!target)return;
   const p=products.find(x=>x.id===target.dataset.id);
   target=null;
   if(p)openProduct(p,null);
 },{passive:true});

 // Bloque systématiquement les clicks synthétiques tactiles Samsung/Android.
 grid.addEventListener('click',e=>{
   const b=e.target.closest('.product');if(!b)return;
   if(e.detail===0)return; // clavier géré séparément
   e.preventDefault();e.stopPropagation();
 },true);
})();
$('#softs').onclick=e=>{const b=e.target.closest('button');if(!b)return;hapticTap();addItem(pending,null,b.dataset.soft);$('#softDlg').close()};
function addItem(p,button=null,soft=''){if(p.soft&&!soft){openProduct(p,button);return}remember();items.push({...p,soft});updateSummary();updateProductQty(p.id);burstFeedback(p,soft)}

$('#undoBtn').onclick=undo;
function cartRender(){
 const groups=groupItems();let lastCat='';
 let html=groups.map(x=>{
   const catLabel=cats.find(c=>c[0]===x.cat)?.[1]||x.cat;
   const catHead=x.cat!==lastCat?`<div class="prep-cat-title">${catLabel.toUpperCase()}</div>`:'';
   lastCat=x.cat;
   const fullName=x.soft?`${x.name} <span class="prep-soft">→ ${x.soft}</span>`:x.name;
   return `${catHead}<div class="prep-line" data-key="${encodeURIComponent(x.key)}"><div class="prep-qty">×${x.n}</div><div class="prep-name"><b>${fullName}</b></div><div class="line-actions"><button data-act="minus">−</button><button data-act="plus">+</button><button class="trash" data-act="trash">×</button></div></div>`;
 }).join('');
 if(returns.glass||returns.large)html+=`<div class="prep-return-title">↩ RETOURS CONSIGNES</div>`;
 if(returns.glass)html+=returnLine('glass','Verres',returns.glass);if(returns.large)html+=returnLine('large','Plateau · arrosoir · pichet',returns.large);
 if(!groups.length&&!returns.glass&&!returns.large)html='<p class="muted">Commande vide.</p>';$('#lines').innerHTML=html;
}
function returnLine(type,label,n){return `<div class="prep-line prep-return" data-return="${type}"><div class="prep-qty">×${n}</div><div class="prep-name"><b>${label}</b></div><div class="line-actions"><button data-retact="minus">−</button><button data-retact="plus">+</button><button class="trash" data-retact="trash">×</button></div></div>`}
$('#cart').onclick=()=>{cartRender();$('#cartDlg').showModal()};
$('#lines').onclick=e=>{const rb=e.target.closest('button[data-retact]');if(rb){remember();const type=rb.closest('[data-return]').dataset.return;if(rb.dataset.retact==='plus')returns[type]++;if(rb.dataset.retact==='minus')returns[type]=Math.max(0,returns[type]-1);if(rb.dataset.retact==='trash')returns[type]=0;render();cartRender();return}const btn=e.target.closest('button[data-act]');if(!btn)return;const key=decodeURIComponent(btn.closest('[data-key]').dataset.key),g=groupItems().find(x=>x.key===key);if(!g)return;remember();if(btn.dataset.act==='plus'){const p=products.find(x=>x.id===g.id);items.push({...p,soft:g.soft||''})}if(btn.dataset.act==='minus'){const idx=items.findLastIndex(x=>x.id===g.id&&(x.soft||'')===(g.soft||''));if(idx>=0)items.splice(idx,1)}if(btn.dataset.act==='trash')items=items.filter(x=>!(x.id===g.id&&(x.soft||'')===(g.soft||'')));render();cartRender()};
$('#pay').onclick=()=>{setPaymentLocked(false);$('#payTotal').innerHTML=`<span>À ENCAISSER</span><b>${money(total())}</b>`;$('#cashBox').hidden=true;$('#twintBox').hidden=true;$('#given').value='';$('#change').textContent='';$('#payDlg').showModal()};
$('#cash').onclick=()=>{$('#cashBox').hidden=false;$('#twintBox').hidden=true;setTimeout(()=>$('#given').focus(),80)};
$('#twint').onclick=()=>{$('#cashBox').hidden=true;$('#twintBox').hidden=false};
$$('[data-given]').forEach(b=>b.onclick=()=>{const cur=parseFloat(($('#given').value||'').replace(',','.'))||0;$('#given').value=cur+Number(b.dataset.given);calcChange()});
function calcChange(){const g=parseFloat($('#given').value.replace(',','.'));$('#change').textContent=isNaN(g)?'':g>=total()?`À RENDRE : ${money(g-total())}`:`IL MANQUE : ${money(total()-g)}`}
$('#given').oninput=calcChange;
function orders(){return JSON.parse(localStorage.getItem('cg_orders_v3')||'[]')}
let paymentLocked=false;
function setPaymentLocked(v){paymentLocked=v;$('#confirmCash').disabled=v;$('#confirmTwint').disabled=v}
function finish(type){
 if(paymentLocked)return;
 setPaymentLocked(true);
 if(!items.length&&!returns.glass&&!returns.large){toastMsg('Commande vide');setPaymentLocked(false);return}
 const os=orders(),order={date:new Date().toISOString(),type,total:total(),items:items.map(x=>({id:x.id,name:x.name,cat:x.cat,soft:x.soft||'',price:x.price,deposit:x.deposit})),returns:{...returns}};
 os.push(order);localStorage.setItem('cg_orders_v3',JSON.stringify(os));
 items=[];returns={glass:0,large:0};actions=[];
 $('#payDlg').close();render();$('#successText').textContent=`${money(order.total)} · ${type}`;$('#successDlg').showModal();
 setTimeout(()=>{if($('#successDlg').open)$('#successDlg').close();setPaymentLocked(false)},1200)
}
$('#confirmCash').onclick=()=>finish('CASH');$('#confirmTwint').onclick=()=>finish('TWINT');
$$('[data-close]').forEach(b=>b.onclick=()=>$('#'+b.dataset.close).close());
function renderHistory(){const all=orders(),os=all.slice().reverse().slice(0,20);$('#historyList').innerHTML=os.length?os.map((o,i)=>{const d=new Date(o.date),time=d.toLocaleString('fr-CH',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});return `<button class="history-card" data-order-index="${all.length-1-i}"><span><b>${time}</b><small>${o.type} · ${o.items.length} article(s)</small></span><strong>${money(o.total)}</strong></button>`}).join(''):'<p class="muted">Aucune commande enregistrée.</p>'}
$('#historyBtn').onclick=()=>{renderHistory();$('#historyDlg').showModal()};
$('#historyList').onclick=e=>{const b=e.target.closest('[data-order-index]');if(!b)return;const o=orders()[Number(b.dataset.orderIndex)];if(!o)return;const lines={};o.items.forEach(i=>{const k=i.name+'|'+(i.soft||'');if(!lines[k])lines[k]={...i,n:0};lines[k].n++});let html=`<div class="order-meta"><b>${new Date(o.date).toLocaleString('fr-CH')}</b><span>${o.type} · ${money(o.total)}</span></div>`;html+=Object.values(lines).map(i=>`<div class="detail-row"><span>${i.n}× ${i.name}${i.soft?' → '+i.soft:''}</span><b>${money(i.n*(i.price+i.deposit))}</b></div>`).join('');if(o.returns?.glass)html+=`<div class="detail-row"><span>Retour verres ×${o.returns.glass}</span><b>−${money(o.returns.glass*2)}</b></div>`;if(o.returns?.large)html+=`<div class="detail-row"><span>Retour grands formats ×${o.returns.large}</span><b>−${money(o.returns.large*10)}</b></div>`;$('#orderDetail').innerHTML=html;$('#orderDetailDlg').showModal()};

$('#grid').addEventListener('keydown',e=>{
 const b=e.target.closest('.product');if(!b||!(e.key==='Enter'||e.key===' '))return;
 e.preventDefault();const p=products.find(x=>x.id===b.dataset.id);if(p)openProduct(p,b);
});






// V3.4.3 — retours consignes : même logique tactile sûre que les produits
(()=>{
 const zone=document.querySelector('.returns');
 if(!zone)return;

 let sx=0,sy=0,target=null,active=false,pid=null;
 const TAP_MOVE=11;

 zone.addEventListener('pointerdown',e=>{
   if(e.pointerType==='mouse'&&e.button!==0)return;
   const btn=e.target.closest('button[data-ret]');
   if(!btn)return;
   sx=e.clientX;sy=e.clientY;target=btn;active=true;pid=e.pointerId;
 },{passive:true});

 zone.addEventListener('pointercancel',()=>{
   active=false;target=null;pid=null;
 },{passive:true});

 zone.addEventListener('pointerup',e=>{
   if(!active||e.pointerId!==pid)return;
   const dx=Math.abs(e.clientX-sx),dy=Math.abs(e.clientY-sy);
   const btn=target;
   active=false;target=null;pid=null;

   // Si le doigt a bougé, c'était un scroll/swipe: aucune consigne ajoutée.
   if(dx>TAP_MOVE||dy>TAP_MOVE||!btn)return;

   remember();
   const type=btn.dataset.ret;
   returns[type]++;
   hapticTap();
   render();
   toastMsg(type==='glass'?'−2 CHF · verre rendu':'−10 CHF · consigne rendue',650);
 });

 // Évite le click synthétique tactile qui doublerait l'action.
 zone.addEventListener('click',e=>{
   const btn=e.target.closest('button[data-ret]');
   if(!btn)return;
   if(e.detail!==0)e.preventDefault();
 },true);
})();


// V3.5 — swipe horizontal dans toute la zone centrale, avec suivi du doigt.
(()=>{
 const zone=document.querySelector('.app');if(!zone)return;
 let sx=0,sy=0,active=false,pid=null;
 const SWIPE_MIN=34,SWIPE_RATIO=1.05;
 zone.addEventListener('pointerdown',e=>{
   if(e.target.closest('#grid'))return;
   if(e.target.closest('header,nav,footer,dialog'))return;
   if(e.pointerType==='mouse'&&e.button!==0)return;
   sx=e.clientX;sy=e.clientY;active=true;pid=e.pointerId;
 },{passive:true});
 zone.addEventListener('pointermove',e=>{
   if(!active||e.pointerId!==pid)return;
   const dx=e.clientX-sx,dy=e.clientY-sy,adx=Math.abs(dx),ady=Math.abs(dy);
   if(adx>8&&adx>ady*1.02)setSwipePreview(dx);else if(ady>adx)clearSwipePreview(false);
 },{passive:true});
 zone.addEventListener('pointercancel',()=>{active=false;pid=null;clearSwipePreview()},{passive:true});
 zone.addEventListener('pointerup',e=>{
   if(!active||e.pointerId!==pid)return;
   const dx=e.clientX-sx,dy=e.clientY-sy,adx=Math.abs(dx),ady=Math.abs(dy);
   active=false;pid=null;clearSwipePreview();
   if(adx<SWIPE_MIN||adx<=ady*SWIPE_RATIO)return;
   const i=cats.findIndex(c=>c[0]===cat);
   const ni=dx<0?Math.min(cats.length-1,i+1):Math.max(0,i-1);
   if(ni!==i)changeCat(cats[ni][0],dx<0?-1:1);
 });
})();

// Evite le zoom iOS lors des taps rapides.
let lastTouchEnd=0;document.addEventListener('touchend',e=>{if(!e.target.closest('button'))return;const now=Date.now();if(now-lastTouchEnd<=300)e.preventDefault();lastTouchEnd=now},{passive:false});
// Tutoriel V3.5 — affiché une seule fois par appareil, relançable avec le bouton ?.
const tutorialSteps=[
 {icon:'👆',title:'Ajouter une boisson',text:'Un tap sur une boisson l’ajoute. Sur un alcool avec accompagnement, le choix du soft s’ouvre toujours avant l’ajout.'},
 {icon:'↔️',title:'Changer de catégorie',text:'Utilise les onglets ou glisse horizontalement. La page suit ton doigt pendant le swipe.'},
 {icon:'↩️',title:'Retours consignes',text:'En bas des produits, utilise VERRE −2 CHF ou PLATEAU · ARROSOIR · PICHET −10 CHF. Le compteur indique combien de consignes sont rendues.'},
 {icon:'🧾',title:'Commande à préparer',text:'Appuie sur « Voir la commande ». Elle est affichée sans prix, regroupée par catégories. Tu peux ajouter, retirer ou supprimer une ligne avant le paiement.'},
 {icon:'➖',title:'Corriger rapidement',text:'Maintiens un bouton produit appuyé environ une demi-seconde pour retirer directement une unité. Un message −1 confirme le retrait.'},
 {icon:'💳',title:'Encaisser',text:'Appuie sur PAYER, puis Cash ou TWINT. Pour TWINT, affiche le QR, laisse le client scanner et saisis le montant indiqué à l’écran.'}
];
let tutorialStep=0;
function renderTutorial(){
 const s=tutorialSteps[tutorialStep];
 $('#tutorialStepLabel').textContent=`${tutorialStep+1} / ${tutorialSteps.length}`;
 $('#tutorialProgressBar').style.width=`${(tutorialStep+1)/tutorialSteps.length*100}%`;
 $('#tutorialContent').innerHTML=`<div class="tutorial-icon">${s.icon}</div><h3>${s.title}</h3><p>${s.text}</p>`;
 $('#tutorialPrev').hidden=tutorialStep===0;
 $('#tutorialNext').textContent=tutorialStep===tutorialSteps.length-1?'TERMINER ✓':'Suivant →';
}
function openTutorial(){tutorialStep=0;renderTutorial();$('#tutorialDlg').showModal()}
function closeTutorial(markSeen=true){if(markSeen)localStorage.setItem('cg_tutorial_v35_seen','1');if($('#tutorialDlg').open)$('#tutorialDlg').close()}
$('#helpBtn').onclick=openTutorial;
$('#tutorialNext').onclick=()=>{if(tutorialStep<tutorialSteps.length-1){tutorialStep++;renderTutorial()}else closeTutorial(true)};
$('#tutorialPrev').onclick=()=>{if(tutorialStep>0){tutorialStep--;renderTutorial()}};
$('#tutorialSkip').onclick=()=>closeTutorial(true);
$('#tutorialClose').onclick=()=>closeTutorial(true);
setTimeout(()=>{if(!localStorage.getItem('cg_tutorial_v35_seen'))openTutorial()},450);

// Mise à jour PWA contrôlée : jamais de recharge forcée en pleine commande.
let swReg=null;function offerUpdate(reg){swReg=reg;$('#updateBar').hidden=false}if('serviceWorker'in navigator){navigator.serviceWorker.register('sw.js').then(reg=>{swReg=reg;if(reg.waiting)offerUpdate(reg);reg.addEventListener('updatefound',()=>{const nw=reg.installing;nw?.addEventListener('statechange',()=>{if(nw.state==='installed'&&navigator.serviceWorker.controller)offerUpdate(reg)})});setInterval(()=>reg.update(),5*60*1000)});navigator.serviceWorker.addEventListener('controllerchange',()=>location.reload())}
$('#updateBtn').onclick=()=>{if(items.length||returns.glass||returns.large){toastMsg('Termine la commande avant la mise à jour',1800);return}if(swReg?.waiting){$('#updateBtn').textContent='MISE À JOUR…';swReg.waiting.postMessage({type:'SKIP_WAITING'})}else location.reload()};
render();
