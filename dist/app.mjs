import {resolvedPlan,defaultPlan,validPlan,ROLES} from './strategy.mjs';
import {strategyMarkup,handoffMarkup} from './strategy-ui.mjs';
import {ROOM_SERVER_ORIGIN,ROOM_TRANSPORT} from './deployment.mjs';
import {HttpRoomSocket} from './http-room-socket.mjs';
import {HEROES,STAT_LABELS,ARENAS,hero,newGame,bid,pass,canBid,botDecision,synergy,createBattle,battleStep,battleCommand,botBattleCommand,setTactic,focusTarget} from './engine.mjs';
import {auctionShow} from './auction-ui.mjs';
import {auctionSelection} from './auction-selection.mjs';
import {RoomClient} from './room-client.mjs';
import {roomBar,roomLobby} from './room-ui.mjs';
import {arenaMarkup} from './arena-ui.mjs';
import {patchArenaPage} from './arena-dom.mjs';
import {Arena3D} from './arena-3d.mjs';
import {CharacterPreview} from './character-preview.mjs';
import {GameAudio} from './game-audio.mjs';
import {draftBonds,heroBonds,bondGuide} from './link-ui.mjs';
import {Soundtrack,MARVEL_TRACK} from './soundtrack.mjs';
let characterPreview=null;
let strategyDraft=null,strategySide=0,strategySelected=null,strategyWaiting=false,strategyRematch=false,strategyConnected=true,strategyPromptKey='',strategyHandoff=false;
const audio=new GameAudio({storage:localStorage,onState:()=>updateAudioStatus()});
const soundtrack=new Soundtrack({audio,onState:status=>{const el=document.querySelector('#soundtrack-status');if(el){el.textContent=status;el.toggleAttribute('data-error',status.includes('seçebilirsin'));}}});
const app=document.querySelector('#app'),modal=document.querySelector('#modal');
const icons={bolt:'<path d="m13 2-9 12h7l-1 8 10-12h-7z"/>',arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',coin:'<circle cx="12" cy="12" r="9"/><path d="M14.5 8.5h-3a2 2 0 0 0 0 4h1a2 2 0 0 1 0 4h-3M12 6v12"/>',shield:'<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z"/>',cross:'<path d="m6 6 12 12M18 6 6 18"/>',refresh:'<path d="M20 7v5h-5M4 17v-5h5"/><path d="M6 7a7 7 0 0 1 12-1l2 6M4 12l2 6a7 7 0 0 0 12-1"/>',book:'<path d="M12 5v15M3 4c4-1 6 0 9 1 3-1 5-2 9-1v15c-4-1-6 0-9 1-3-1-5-2-9-1z"/>',sound:'<path d="M4 9v6h4l5 4V5L8 9zM17 8c3 2 3 6 0 8m3-11c5 4 5 10 0 14"/>',play:'<path d="m8 5 12 7-12 7z"/>',pause:'<path d="M8 5v14M16 5v14"/>',check:'<path d="m5 12 4 4L19 6"/>',star:'<path d="m12 3 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z"/>'};
const icon=(name)=>`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]||icons.bolt}</svg>`;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let game;try{const saved=JSON.parse(localStorage.getItem('nexus-v1'));if(saved?.version===1&&saved.players?.length===2&&saved.pool?.length===10&&saved.pool.every(id=>hero(id))&&saved.players.every(p=>typeof p.name==='string'&&Number.isInteger(p.coins)&&p.coins>=0&&p.coins<=20&&p.team.every(id=>hero(id)))&&['auction','ready'].includes(saved.phase))game=saved;}catch{}
game??=newGame();let selectedBid=1,tab='auction',battle=null,playing=false,speed=1,battleTimer,botTimer,viewFilter='Tümü',search='',compare=[],lastEvent=null,resultVisible=false,resultTimer,arenaScene=null,immersive=false;
const save=()=>{if(room.session)return;try{localStorage.setItem('nexus-v1',JSON.stringify(game));}catch{}};
const portrait=(h,cls='')=>`<div class="portrait ${cls}" role="img" aria-label="${esc(h.name)} çizgi roman portresi" style="--portrait:url('/assets/${h.id}.jpg');--hero-color:${h.color}"></div>`;
let restoringBattleFrame=false,inspectedMatchId=null,announcedResultMatchId=null;
let auctionRenderKey='',auctionBidKey='',appliedRoomRev=-1,auctionRevealUntil=0,onlineBattleId=null,serverOffset=0,inviteBase=location.origin,networkInfo=null;
const room=new RoomClient({Socket:ROOM_TRANSPORT==='http'?HttpRoomSocket:WebSocket,onState:receiveRoomState,onStatus:()=>{if(room.status!=='connected')playing=false;if(room.session&&(room.status!=='connected'||room.snapshot?.rev===appliedRoomRev))render();},onError:message=>{toast(message);const el=document.querySelector('#room-form-error');if(el)el.textContent=message;},onLeft:restoreLocal});
function recordAuctionBid(round,side,type,amount){game.auctionBids??=[];game.auctionBids.push({round,side,type,amount,at:Date.now()});game.auctionBids=game.auctionBids.slice(-100);}
function receiveRoomState(s){
 clearTimeout(botTimer);clearTimeout(battleTimer);clearTimeout(resultTimer);serverOffset=s.serverNow-Date.now();
 const previousGame=game,oldBattle=battle,previous=s.status==='battle'&&onlineBattleId===s.matchId;
 game=s.game;game.camera=localStorage.getItem('nexus-camera')||'follow';
 if(s.status==='auction'){
  if(previousGame.mode==='online'&&previousGame.round!==game.round)audio.ui('sale');
  else if(previousGame.mode==='online'&&previousGame.bid!==game.bid&&game.bid)audio.ui('bid');
 }
 if(s.battle){
  const incoming=s.battle,oldCount=oldBattle?.events.length||0;incoming.queue=incoming.queue.map(f=>incoming.fighters[f.side].find(x=>x.id===f.id)).filter(Boolean);
  if(previous&&oldBattle){
   incoming.events=incoming.events.map((e,i)=>oldBattle.events[i]||e);incoming.commands=incoming.commands.map((e,i)=>oldBattle.commands[i]||e);
   Object.assign(oldBattle,incoming);battle=oldBattle;
   if(battle.events.length>oldCount)lastEvent=battle.events.at(-1)||null;
  }else{battle=incoming;lastEvent=battle.events.at(-1)||null;restoringBattleFrame=!!lastEvent;onlineBattleId=s.matchId;}
  playing=s.playing;speed=s.speed;
  const freshFinish=previous&&battle.events.length>oldCount&&lastEvent?.finisher,resultKey=s.code+':'+s.matchId,dismissed=inspectedMatchId===resultKey;
  resultVisible=battle.done&&!dismissed&&Date.now()+serverOffset>=s.resultAt&&!freshFinish&&!(tab==='arena'&&arenaScene?.isAnimating());
  if(resultVisible&&announcedResultMatchId!==resultKey){announcedResultMatchId=resultKey;audio.result(battle.winner===null);}
  if(battle.done&&!resultVisible&&!dismissed){const reveal=()=>{if(room.snapshot?.matchId!==s.matchId||!battle?.done)return;if(tab==='arena'&&arenaScene?.isAnimating()){resultTimer=setTimeout(reveal,60);return;}resultVisible=true;if(announcedResultMatchId!==resultKey){announcedResultMatchId=resultKey;audio.result(battle.winner===null);}render();};resultTimer=setTimeout(reveal,Math.max(0,s.resultAt-Date.now()-serverOffset));}
  if(s.status==='battle'&&tab!=='library')tab='arena';
 }else{battle=null;lastEvent=null;resultVisible=false;playing=false;onlineBattleId=null;if(s.status==='ready'&&tab!=='library')tab='arena';else if(tab!=='library')tab='auction';}
 if(document.querySelector('#room-form'))modal.close();appliedRoomRev=s.rev;render();
}
function applyOnlineOwnership(){
 document.body.classList.toggle('online-owned',!!room.session);
 if(!room.session||!room.snapshot)return;
 const s=room.snapshot,locked=room.status!=='connected'||!!room.pending||!s.slots.every(p=>p?.connected)||s.status==='closed';
 document.querySelectorAll('[data-action="command"],[data-action="tactic"],[data-action="arena-focus"]').forEach(b=>{if(locked||Number(b.dataset.side)!==s.side)b.disabled=true;});
 document.querySelectorAll('[data-focus-side]').forEach(b=>{if(locked||Number(b.dataset.focusSide)!==s.side)b.disabled=true;});
 document.querySelectorAll('.tactical-card').forEach((el,i)=>el.classList.toggle('is-remote',i!==s.side));
 document.querySelectorAll('[data-action="map"],#luck,[data-action="speed"]').forEach(b=>{if(locked||s.side!==0)b.disabled=true;});
 document.querySelectorAll('[data-action="start"]').forEach(b=>{b.textContent=s.slots[s.side].ready?'Plan kilitli · Rakip bekleniyor':'Dizilişimi ayarla →';b.disabled=locked;});
 document.querySelectorAll('[data-action="rematch"]').forEach(b=>{b.textContent=s.slots[s.side].ready?'Rakibinin rövanş onayı bekleniyor':'Rövanşa hazırım';b.disabled=locked||s.slots[s.side].ready;});
 document.querySelectorAll('[data-action="step"]').forEach(b=>b.disabled=true);
 document.querySelectorAll('[data-action="toggle-play"]').forEach(b=>{if(locked)b.disabled=true;});
}
function updateAuctionClock(){
 const clock=document.querySelector('.auction-clock.has-clock');if(!clock)return;
 const s=room.snapshot;if(!s)return;const running=room.status==='connected'&&s.slots.every(p=>p?.connected)&&s.deadline;
 const ms=running?Math.max(0,s.deadline-Date.now()-serverOffset):s.remaining;
 const seconds=document.querySelector('#auction-seconds');if(seconds)seconds.textContent=running?Math.min(20,Math.ceil(ms/1000)):'Ⅱ';
 clock.classList.toggle('urgent',running&&ms<=5000);
 const fill=document.querySelector('#auction-time-fill');if(fill)fill.style.width=Math.min(100,ms/200)+'%';
}
setInterval(updateAuctionClock,200);
async function networkDetails(){
 if(ROOM_TRANSPORT==='http'||ROOM_SERVER_ORIGIN!==undefined){networkInfo=null;inviteBase=location.origin;return;}
 try{const r=await fetch('/api/network');if(!r.ok)throw Error();networkInfo=await r.json();inviteBase=networkInfo.publicUrl||(['127.0.0.1','localhost'].includes(location.hostname)?networkInfo.lan[0]||location.origin:location.origin);}catch{networkInfo=null;}
}
function onlineForm(mode='create',code=''){
 showModal(`<div class="modal-inner"><div class="eyebrow">ARKADAŞINLA · İKİ CİHAZDAN</div><h2>Bir oda. İki rakip.</h2><p>Oda aç veya arkadaşının 6 karakterli koduyla katıl.</p><div class="room-join-tabs"><button data-action="room-form-mode" data-id="create" class="${mode==='create'?'active':''}">Oda oluştur</button><button data-action="room-form-mode" data-id="join" class="${mode==='join'?'active':''}">Kodla katıl</button></div><form id="room-form" data-mode="${mode}"><label class="form-label" for="room-name">Oyuncu adın<input id="room-name" name="name" maxlength="20" autocomplete="nickname" placeholder="Örn. Umid" value="${esc(game.players[0].name)}" required></label>${mode==='join'?`<label class="form-label" for="room-code">Oda kodu<input id="room-code" name="code" value="${esc(code)}" minlength="6" maxlength="6" pattern="[A-Za-z2-9]{6}" autocapitalize="characters" autocomplete="off" placeholder="ABC234" required></label>`:''}<button class="primary" type="submit" ${ROOM_SERVER_ORIGIN===null?'disabled':''}>${mode==='create'?'Oda oluştur →':'Odaya katıl →'}</button><p id="room-form-error" class="room-form-error" role="status"></p></form><p class="sound-note">${ROOM_SERVER_ORIGIN===null?'Bu yayında oda sunucusu henüz bağlanmadı. Şimdilik aynı cihazda veya bot ile oynayabilirsin.':ROOM_SERVER_ORIGIN||ROOM_TRANSPORT==='http'?'Davet bağlantısını arkadaşınla paylaş; farklı cihaz ve ağlardan katılabilirsiniz.':'Aynı Wi-Fi’de yerel adresle oynayabilirsiniz. Farklı ağlar için bu Node sunucusunun internette yayınlanması gerekir.'}</p></div>`);void networkDetails();if(ROOM_TRANSPORT==='http')void checkRoomService();
}
async function checkRoomService(){
 const form=document.querySelector('#room-form');if(!form)return;
 try{const response=await fetch('/api/room');const status=await response.json();if(document.querySelector('#room-form')!==form)return;
  if(!status.configured){form.querySelector('[type=submit]').disabled=true;form.querySelector('#room-form-error').textContent='Çevrimiçi odalar bu yayında henüz etkinleştirilmedi. Yayın sahibi Vercel Storage üzerinden Upstash Redis bağlantısını tamamlamalı.';}
 }catch{if(document.querySelector('#room-form')===form)form.querySelector('#room-form-error').textContent='Oda servisine şu anda ulaşılamıyor. Biraz sonra tekrar dene.';}
}
async function showInvite(){
 await networkDetails();const code=room.snapshot?.code||room.session?.code;if(!code)return;
 const url=new URL(inviteBase);url.searchParams.set('room',code);
 showModal(`<div class="modal-inner"><div class="eyebrow">RAKİBİNİ DAVET ET</div><h2>${esc(code)}</h2><p>Arkadaşın kodu girebilir veya bu bağlantıyı açabilir.</p><input class="invite-link" aria-label="Davet bağlantısı" readonly value="${esc(url.href)}"><button class="primary" data-action="room-copy">Bağlantıyı kopyala ↗</button><p class="sound-note">${['127.0.0.1','localhost'].includes(location.hostname)&&!networkInfo?.publicUrl?'Bu adres aynı Wi-Fi için. Bilgisayar ve oyun sunucusu açık kalmalı.':'Oyuncu adını girerek odaya katıl. Davette yalnızca oda kodu paylaşılır.'}</p></div>`);
}
function restoreLocal(){
 clearTimeout(battleTimer);clearTimeout(resultTimer);clearTimeout(botTimer);modal.close();room.clear();game=null;
 try{const saved=JSON.parse(localStorage.getItem('nexus-v1'));if(saved?.mode!=='online'&&saved?.pool?.every(hero)&&saved.players?.length===2)game=saved;}catch{}
 game??=newGame();battle=null;lastEvent=null;playing=false;tab='auction';immersive=false;onlineBattleId=null;auctionRenderKey='';selectedBid=1;
 const url=new URL(location.href);url.searchParams.delete('room');history.replaceState(null,'',url);render();
}
function handleRoomAction(btn,action,id){
 if(action==='online'){if(room.session)showInvite();else onlineForm();return true;}
 if(action==='room-form-mode'){onlineForm(id);return true;}
 if(action==='room-invite'){void showInvite();return true;}
 if(action==='room-copy'){const el=modal.querySelector('.invite-link');if(navigator.clipboard)void navigator.clipboard.writeText(el.value).then(()=>toast('Davet bağlantısı kopyalandı.')).catch(()=>{el.select();toast('Bağlantıyı seçtim; kopyalayabilirsin.');});else{el.select();toast('Bağlantıyı seçtim; kopyalayabilirsin.');}return true;}
 if(action==='room-local'){if(room.status==='connected'&&room.snapshot?.status!=='closed')room.action('leave');else restoreLocal();return true;}
 if(action==='room-leave'){if(room.status==='connected'&&room.snapshot?.status!=='closed')room.action('leave');else restoreLocal();return true;}
 if(action==='room-ready'){room.action('ready');return true;}
 if(action==='room-launch'){room.action('launch');return true;}
 if(!room.session)return false;
 switch(action){
  case'bid':room.action('bid',{amount:selectedBid});return true;
  case'quick-bid':room.action('bid',{amount:Number(id)});return true;
  case'pass':room.action('pass');return true;
  case'start':openStrategy();return true;
  case'rematch':openStrategy(true);return true;
  case'command':if(Number(btn.dataset.side)===room.snapshot.side)room.action('command',{id});return true;
  case'tactic':if(Number(btn.dataset.side)===room.snapshot.side)room.action('tactic',{id});return true;
  case'arena-focus':if(Number(btn.dataset.side)===room.snapshot.side)room.action('focus',{id});return true;
  case'map':room.action('settings',{arena:id});return true;
  case'toggle-play':room.action('pause');return true;
  case'speed':room.action('speed',{speed:Number(id)});return true;
  case'step':return true;
  case'camera':game.camera=id;localStorage.setItem('nexus-camera',id);render();return true;
 }
 return false;
}
document.addEventListener('submit',e=>{
 if(e.target.id!=='room-form')return;e.preventDefault();
 if(room.session&&['connecting','reconnecting'].includes(room.status))return;
 const f=e.target;clearTimeout(botTimer);clearTimeout(battleTimer);clearTimeout(resultTimer);playing=false;battle=null;lastEvent=null;tab='auction';immersive=false;
 room.begin(f.dataset.mode,f.elements.name.value,f.elements.code?.value);
});
document.addEventListener('change',e=>{if(room.session&&e.target.id==='luck')room.action('settings',{luck:Number(e.target.value)});});
function toast(msg){const t=document.querySelector('#toast');t.textContent=msg;t.classList.add('visible');clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.remove('visible'),3200);}
function updateAudioStatus(){
 soundtrack.sync();
 const status=document.querySelector('#audio-status');if(status)status.textContent=audio.status;
 document.querySelectorAll('[data-action="sound"]').forEach(b=>{b.classList.toggle('on',audio.settings.enabled);b.dataset.audio=audio.ctx?.state??'locked';});
}
function beep(){audio.ui('click');}
function playBattleSound(event){audio.impact(event);}
function soundSettings(){
 const s=audio.settings;
 showModal(`<div class="modal-inner sound-settings"><div class="eyebrow">ARENANIN SESİ</div><h2>Mücadeleyi duy.</h2><p>Karaktere özel vuruşlar, ikili hamleler ve hafif bir arena ritmi.</p><label class="sound-toggle"><input id="audio-enabled" type="checkbox" ${s.enabled?'checked':''}> Sesler açık</label><label class="form-label" for="audio-effects">Efektler <strong id="effects-value">%${Math.round(s.effects*100)}</strong></label><input id="audio-effects" type="range" min="0" max="100" step="1" value="${Math.round(s.effects*100)}"><label class="form-label" for="audio-music">Müzik <strong id="music-value">%${Math.round(s.music*100)}</strong></label><input id="audio-music" type="range" min="0" max="100" step="1" value="${Math.round(s.music*100)}"><div class="sound-preview"><button class="outline" data-action="test-sound">Efekti dene ↯</button><span id="audio-status" role="status">${audio.status}</span></div><div class="music-choice"><b>MARVEL SOUNDTRACK</b><p>The Avengers · Alan Silvestri. Alan Silvestri’nin resmî kaydı, küçük YouTube oynatıcısında çalar.</p><button class="primary small" data-action="marvel-music">Avengers temasını başlat ♫</button><label class="local-music">Müzik dosyası seç<input id="music-file" type="file" accept="audio/*,.mp3,.wav,.ogg,.m4a"></label><p>Dosyan bu cihazda çalar; sunucuya gönderilmez.</p></div><p class="sound-note">Ayarların bu cihazda hatırlanır. Ses ilk tıklamada başlar; mücadeleyi duraklatınca müzik susar.</p></div>`);
}
document.addEventListener('pointerdown',()=>void audio.unlock(),{capture:true});
document.addEventListener('keydown',()=>void audio.unlock(),{capture:true});

function musicDock(title){
 document.querySelector('#soundtrack-dock')?.remove();
 const dock=document.createElement('aside');dock.id='soundtrack-dock';dock.className='soundtrack-dock';dock.setAttribute('aria-label','Arka plan müziği');dock.innerHTML=`<div class="soundtrack-heading"><div><small>ARENA MÜZİĞİ</small><b>${esc(title)}</b></div><button data-action="stop-music" aria-label="Müziği kapat">×</button></div><div id="marvel-player"></div><p id="soundtrack-status" role="status">${esc(soundtrack.status)}</p><label class="dock-file">Dosyadan çal<input id="music-file" type="file" accept="audio/*,.mp3,.wav,.ogg,.m4a"></label><label>Arka plan sesi <input id="track-volume" aria-label="Arka plan sesi" type="range" min="0" max="100" value="${Math.round(audio.settings.music*100)}"></label>`;document.body.append(dock);return dock;
}
function header(){return `<header class="header"><a href="#" class="brand" aria-label="Nexus ana sayfa" data-action="auction"><span class="brand-symbol">${icon('bolt')}</span>NEXUS<span class="brand-tag">ARENA</span></a><nav aria-label="Ana gezinme"><button class="nav-item ${tab==='auction'?'active':''}" data-action="auction">Açık artırma</button><button class="nav-item ${tab==='arena'?'active':''}" data-action="arena">Arena${game.phase==='auction'?'<span class="nav-lock">•</span>':''}</button><button class="nav-item ${tab==='library'?'active':''}" data-action="library">Karakter arşivi</button></nav><div class="header-actions"><button class="outline small" data-action="online">${room.session?'Oda':'Çevrimiçi'}</button><button class="icon-button ${audio.settings.enabled?'on':''}" data-action="sound" aria-label="Ses ayarları" title="Ses ayarları">${icon('sound')}<span class="sound-label">SES</span></button><button class="outline small" data-action="rules">Nasıl oynanır? ${icon('book')}</button></div></header>`;}
function playerPanel(p,i){return `<section class="player-panel p${i} ${game.phase==='auction'&&game.turn===i?'has-turn':''}">${game.phase==='auction'?`<div class="player-turn-chip ${game.turn===i?'active':''}">${game.turn===i?'● TEKLİF SIRASI':game.leader===i?'TEKLİF LİDERİ':'SIRANI BEKLE'}${room.session&&room.snapshot?.side===i?' · SEN':''}</div>`:''}<div class="player-top"><div class="player-avatar">${i===0?'01':'02'}</div><div><div class="eyebrow">${game.mode==='bot'&&i===1?'BOT RAKİP':'OYUNCU '+(i+1)}</div><h3>${esc(p.name)}</h3></div><div class="budget">${icon('coin')}<strong>${p.coins}</strong><span>coin</span></div></div><div class="roster-title"><span>Takımın</span><span>${p.team.length} / 5</span></div><div class="roster">${Array.from({length:5},(_,n)=>p.team[n]?`<button class="roster-hero" data-action="detail" data-id="${p.team[n]}" aria-label="${hero(p.team[n]).name}">${portrait(hero(p.team[n]))}<span>${hero(p.team[n]).name}</span></button>`:`<div class="empty-slot"><span>+</span></div>`).join('')}</div><div class="team-bonus">${icon('shield')}<span>${p.team.length?`Grup uyumu <b>+%${synergy(p.team)}</b>`:'İlk kahramanını bekliyor'}</span></div>${draftBonds(p.team)}</section>`;}
function auction(){
 const selection=auctionSelection(game,{key:auctionBidKey,amount:selectedBid},{scope:room.session?.code||'local'});auctionBidKey=selection.key;selectedBid=selection.amount;
 const key=(room.session?.code||'local')+'|'+game.pool[game.round]+'|'+game.round;
 if(key!==auctionRenderKey)auctionRevealUntil=Date.now()+1000;const reveal=Date.now()<auctionRevealUntil;auctionRenderKey=key;
 return auctionShow(game,{portrait,esc,icon,playerPanel,ready,selectedBid,reveal,botTurn:game.mode==='bot'&&game.turn===1,room:room.session&&room.snapshot?{...room.snapshot,connected:room.status==='connected',pending:room.pending}:null});
}
function ready(){return `<section class="ready-banner"><span class="ready-mark">${icon('check')}</span><div><div class="eyebrow">AÇIK ARTIRMA TAMAMLANDI</div><h2>Takımlar hazır. Söz arenada.</h2><p>${game.history.some(h=>h.reinforcement)?'Karakter alamayan takıma ücretsiz bir yedek kahraman verildi.':'Kahramanlarını seçtin. Şimdi stratejini konuştur.'}</p></div><button class="primary" data-action="arena">Arenaya geç ${icon('arrow')}</button></section><div class="ready-teams">${game.players.map(playerPanel).join('')}</div>`;}
function arenaView(){const viewGame=!battle&&game.mode==='local'?{...game,plans:[null,null]}:game;return arenaMarkup(viewGame,battle,playing,speed,lastEvent,resultVisible,{icon,esc,portrait});}
function library(){const list=HEROES.filter(h=>(viewFilter==='Tümü'||h.type===viewFilter)&&(h.name+' '+h.alias).toLowerCase().includes(search.toLowerCase()));return `<main><section class="intro"><div><div class="eyebrow"><span class="tiny-square"></span> GÜÇ, DOĞRU BİLGİYLE BAŞLAR</div><h1>Kahraman <em>arşivi.</em></h1><p>Özellikleri keşfet. Yetenekleri karşılaştır. Takımını düşün.</p></div><span class="session-tag">${HEROES.length} KARAKTER</span></section><div class="library-toolbar"><div class="filter-list">${['Tümü',...new Set(HEROES.map(h=>h.type))].map(t=>`<button data-action="filter" data-id="${t}" class="${viewFilter===t?'active':''}">${t}</button>`).join('')}</div><input type="search" id="search" placeholder="Kahraman ara…" aria-label="Kahraman ara" value="${esc(search)}"></div>${compare.length?`<div class="compare-bar"><span>${compare.map(id=>hero(id).name).join(' & ')} <small>(${compare.length}/2)</small></span><button class="primary small" data-action="compare" ${compare.length!==2?'disabled':''}>Karşılaştır ${icon('arrow')}</button><button class="text-button" data-action="clear-compare">Temizle</button></div>`:''}${bondGuide()}<div class="library-grid">${list.map(h=>`<article class="library-card"><button class="library-art" data-action="detail" data-id="${h.id}" aria-label="${h.name} detayları">${portrait(h)}<span class="library-rating">${h.rating}</span><div class="library-name"><span>${h.type.toUpperCase()}</span><h2>${h.name}</h2><p>${h.alias}</p></div></button><div class="library-card-footer"><span>${h.group}</span><button class="compare-check ${compare.includes(h.id)?'checked':''}" data-action="select-compare" data-id="${h.id}">${compare.includes(h.id)?icon('check'):'+'} Karşılaştır</button></div></article>`).join('')||'<p class="no-results">Bu aramada kahraman bulunamadı.</p>'}</div><p class="archive-note">Puanlar bu oyunun denge değerleridir. Resmî Marvel güç sıralaması değildir.</p></main>`;}
function render(){
 if(tab!=='arena')immersive=false;
 const lobby=room.session&&(!room.snapshot||['lobby','closed'].includes(room.snapshot.status)||room.status==='replaced');
 const content=header()+roomBar(room,esc)+(lobby?roomLobby(room,esc):tab==='library'?library():tab==='arena'?arenaView():auction())+`<footer><a class="footer-brand" href="#" data-action="auction">NEXUS<span> / </span>ARENA</a><span>Strateji senin. Sonuç arenanın.</span><span>MARVEL EVRENİNDEN İLHAM ALAN FAN OYUNU</span></footer>`;
 const current=document.querySelector('.arena-page');
 if(tab==='arena'&&current&&!lobby){
  const template=document.createElement('template');template.innerHTML=content;
  patchArenaPage(current,template.content.querySelector('.arena-page'));
  document.querySelector('.header').replaceWith(template.content.querySelector('.header'));
  document.querySelector('footer').replaceWith(template.content.querySelector('footer'));
  document.querySelectorAll('.room-status-bar,.room-reconnect').forEach(el=>el.remove());
  const headerEl=document.querySelector('.header');for(const el of [...template.content.querySelectorAll('.room-status-bar,.room-reconnect')].reverse())headerEl.after(el);
 }else{arenaScene?.pause();app.innerHTML=content;}
 document.body.classList.toggle('arena-immersive',immersive);document.querySelector('.cinema-arena')?.classList.toggle('is-immersive',immersive);
 if(tab==='arena'&&!lobby){
  const host=document.querySelector('#arena-scene');
  try{arenaScene??=new Arena3D({onImpact:playBattleSound,onAttack:event=>audio.attack(event),onDuel:active=>audio.setTension(active)});arenaScene.mount(host,document.querySelector('#arena-actor-labels'),document.querySelector('#arena-hit-label'),!battle&&game.mode==='local'?{...game,plans:[null,null]}:game,battle,lastEvent,speed,playing,restoringBattleFrame);restoringBattleFrame=false;}
  catch(err){host.innerHTML='<div class="scene-error">3B sahne bu tarayıcıda açılamadı. Mücadeleyi aşağıdaki takım panelleri ve günlükten izleyebilirsin.</div>';console.warn('Arena renderer unavailable',err);}
 }
 if(tab!=='arena'||!battle)audio.setTension(false);
 audio.setScene(document.hidden?'silent':tab==='arena'?battle&&playing&&(!battle.done||arenaScene?.isAnimating())?'arena':battle?'silent':'lobby':'lobby');updateAudioStatus();scheduleBot();applyOnlineOwnership();updateAuctionClock();syncStrategy();
}

function showModal(content,cls=''){modal.removeAttribute('aria-label');characterPreview?.dispose();characterPreview=null;modal.className=cls;modal.innerHTML=`<button class="modal-close icon-button" data-action="close" aria-label="Kapat">${icon('cross')}</button>${content}`;if(!modal.open)modal.showModal();}
function openStrategy(rematch=false,side=room.session?room.snapshot.side:game.mode==='local'&&game.preparing===1?1:0){
 if(game.phase!=='ready')return;
 strategySide=side;strategyRematch=rematch;strategyHandoff=false;
 strategyDraft=resolvedPlan(game.players[side].team,game.plans?.[side],hero);strategySelected=strategyDraft[0].id;
 strategyWaiting=!!(room.session&&room.snapshot.slots[side].ready);paintStrategy();
}
function paintStrategy(){
 const connected=!room.session||(room.status==='connected'&&room.snapshot?.slots.every(s=>s?.connected));strategyConnected=connected;
 showModal(strategyHandoff?handoffMarkup(game.players[1].name,esc):strategyMarkup(game,strategySide,strategyDraft,strategySelected,{esc,waiting:strategyWaiting,connected,rematch:strategyRematch}),'strategy-modal');
 modal.setAttribute('aria-label','Arena öncesi gizli savaş planı');
}
function syncStrategy(){
 const ready=game.phase==='ready'&&!battle&&(!room.session||room.snapshot?.status==='ready');
 const key=(room.session?.code||'local')+'|'+game.pool.join(',')+'|'+game.players.flatMap(p=>p.team).join(',');
 if(ready&&strategyPromptKey!==key){strategyPromptKey=key;queueMicrotask(()=>{if(game.phase==='ready'&&!battle)openStrategy();});}
 if(room.session&&modal.open&&modal.classList.contains('strategy-modal')){
  if(room.snapshot?.status==='closed'||room.status==='replaced'){modal.close();strategyWaiting=false;return;}
  if(room.snapshot?.status==='battle'&&!battle?.done){modal.close();strategyWaiting=false;return;}
  if(!strategyHandoff){const waiting=!!room.snapshot.slots[strategySide]?.ready;const connected=room.status==='connected'&&room.snapshot.slots.every(s=>s?.connected);if(strategyWaiting!==waiting||strategyConnected!==connected){strategyWaiting=waiting;paintStrategy();}const unlock=modal.querySelector('[data-action="strategy-unlock"]');if(unlock)unlock.disabled=!connected||!!room.pending;const confirm=modal.querySelector('[data-action="strategy-confirm"]');if(confirm)confirm.disabled=waiting||room.status!=='connected'||!!room.pending||!room.snapshot.slots.every(s=>s?.connected);}
 }
}
function strategyAction(action,id){
 if(!action.startsWith('strategy-'))return false;
 if(action==='strategy-handoff'){openStrategy(strategyRematch,1);return true;}
 if(action==='strategy-unlock'&&room.session&&strategyWaiting&&!strategyRematch){room.action('battle-ready');return true;}
 if(strategyWaiting)return true;
 if(action==='strategy-hero'){strategySelected=id;paintStrategy();}
 if(action==='strategy-slot'){const chosen=strategyDraft.find(p=>p.id===strategySelected),other=strategyDraft.find(p=>p.slot===Number(id));if(other)other.slot=chosen.slot;chosen.slot=Number(id);paintStrategy();}
 if(action==='strategy-auto'){strategyDraft=defaultPlan(game.players[strategySide].team,hero);paintStrategy();}
 if(action==='strategy-confirm'){
  if(!validPlan(game.players[strategySide].team,strategyDraft))return true;
  if(room.session){room.action(strategyRematch?'rematch':'battle-ready',{plan:strategyDraft});}
  else{game.plans??=[null,null];game.plans[strategySide]=strategyDraft.map(p=>({...p}));save();
   if(game.mode==='bot'){game.plans[1]=defaultPlan(game.players[1].team,hero);save();modal.close();startBattle();}
   else if(strategySide===0){game.preparing=1;save();strategyHandoff=true;paintStrategy();}
   else{game.preparing=0;save();modal.close();startBattle();}
  }
 }
 return true;
}
document.addEventListener('change',e=>{if(e.target.id==='strategy-role'&&!strategyWaiting){const chosen=strategyDraft.find(p=>p.id===strategySelected);chosen.role=e.target.value;paintStrategy();modal.querySelector('#strategy-role').focus({preventScroll:true});}});
function detail(id){const h=hero(id);if(!h)return;showModal(`<div class="detail-art">${portrait(h)}<div class="art-shade"></div><div class="art-caption"><span>${h.group.toUpperCase()}</span><h2>${h.name}</h2><p>${h.alias}</p></div></div><div class="detail-content"><div class="eyebrow">${h.type.toUpperCase()} · ${h.rating} GENEL PUAN</div><h2>${h.skill}</h2><p>${h.desc}</p><div class="stats">${h.stats.map((v,i)=>`<div class="stat"><span>${STAT_LABELS[i]}</span><div class="stat-track"><i style="width:${v*10}%"></i></div><b>${v}<small>/10</small></b></div>`).join('')}</div><div class="detail-tip">Özel yetenek her 3. saldırıda devreye girer. Aynı gruptan her ek kahraman +%4 takım uyumu sağlar (en fazla %12).</div><button class="outline model-open" data-action="view-model" data-id="${h.id}">3B modeli incele ↗</button>${heroBonds(id)}</div>`,'detail-modal');}
function rules(){showModal(`<div class="modal-inner"><div class="eyebrow">NEXUS OYUN REHBERİ</div><h2>Tekliften zafere.</h2><div class="rule"><b>01</b><div><h3>20 coin ile başla.</h3><p>İki oyuncu aynı cihazdan sırayla oynar; istersen botu seç. 30 karakterden 10’u her oyunda rastgele gelir. Sıradaki karakterler gizlidir; yalnızca teklif sırası geldiğinde açılır.</p></div></div><div class="rule"><b>02</b><div><h3>En iyi teklif kahramanı alır.</h3><p>Teklif en az 1 coin artar. Rakip pas geçince liderin teklifi ödenir. Teklif yokken iki pas karakteri atlar. Takım sınırı 5; coinsiz veya dolu takım pas geçer. Hiç karakter alamayan oyuncuya, sonunda satılmamış bir karakter ücretsiz verilir.</p></div></div><div class="rule"><b>03</b><div><h3>Güç, tek başına yetmez.</h3><p>Güç, enerji, teknoloji ve zekâ saldırıyı; dayanıklılık canı ve savunmayı; hız hamle sırasını ve kaçışı etkiler. Aynı gruptan ek karakter +%4 saldırı uyumu sağlar (en fazla %12).</p></div></div><div class="rule"><b>04</b><div><h3>Arenada söz sahibi ol.</h3><p>Arena öncesi gizli planda kahramanlarını ön/arka safa ve siper, açık alan veya yüksek platforma yerleştir. Her kahramana hücum, avcı veya koruma görevi ver. Ön saf yakın dövüşü karşılar; hızlı ve uçan avcılar arka safa sızabilir. Koruyucu, tur başına bir kez komşusunun doğrudan hasarının %30’unu üstlenir. Komşu ikililer her ikinci ortak saldırıda +1 ek yük alır; kişisel alan saldırıları hedefin komşularına yayılır. Diziliş mücadele boyunca sabittir. Savaşta takım duruşunu ve hedefini seç; enerji biriktirerek güç patlaması, takım kalkanı veya ikinci nefes komutu ver. Komutlar arasında 3 takım hamlesi, duruş değişimleri arasında 2 takım hamlesi gerekir. Kişisel özel yetenekler her 3. saldırıda çalışır. Marvel bağları, aynı takımdaki iki yaşayan kahramanın toplam 4 saldırısıyla (komşularsa 3 saldırıyla) dolar; dolu yükte ortak saldırı isabet ederse otomatik ikili hamle olur. Kaçışta yük korunur, bir üye elenince bağ kapanır. Şans ayarı kritik vuruş ihtimalini ve ±hasar sapmasını belirler; kritik hasar ×1,5. Hızdan gelen kaçış %2–16 arasındadır; savunma duruşu buna 4 yüzde puan ekler. Arena bonusu %10. Son ayakta kalan takım kazanır; 40 turda sonuç yoksa kalan toplam can oranı karşılaştırılır.</p></div></div><button class="primary" data-action="close">Anladım, başlayalım ${icon('arrow')}</button></div>`);}
function setup(){showModal(`<form id="setup-form" class="modal-inner"><div class="eyebrow">YENİ BİR MÜCADELE</div><h2>Kimler arenaya çıkıyor?</h2><p>Her yeni oyunda kahramanlar yeniden karıştırılır.</p><div class="mode-options"><label><input type="radio" name="mode" value="local" ${game.mode==='local'?'checked':''}><span>Arkadaşınla oyna<small>Aynı cihazda 2 oyuncu</small></span></label><label><input type="radio" name="mode" value="bot" ${game.mode==='bot'?'checked':''}><span>Bota karşı oyna<small>Stratejini tek başına dene</small></span></label></div><label class="form-label">Oyuncu 1<input name="p1" maxlength="20" value="${esc(game.players[0].name)}" required></label><label class="form-label">Oyuncu 2<input name="p2" maxlength="20" value="${esc(game.players[1].name)}" required></label><button class="primary" type="submit">20 coin ile başla ${icon('arrow')}</button></form>`);modal.querySelectorAll('[name=mode]').forEach(el=>el.addEventListener('change',()=>{const bot=modal.querySelector('[name=mode]:checked').value==='bot';const p2=modal.querySelector('[name=p2]');p2.value=bot?'Nexus Bot':'Oyuncu 2';p2.readOnly=bot;}));}
function scheduleBot(){clearTimeout(botTimer);if(room.session)return;if(game.phase==='auction'&&game.mode==='bot'&&game.turn===1&&!modal.open){botTimer=setTimeout(()=>{const offer=botDecision(game);recordAuctionBid(game.round,1,offer===null?'pass':'bid',offer);if(offer===null)pass(game);else bid(game,offer);selectedBid=game.bid+1;save();render();},950);}}
function activateCommand(side,id){if(room.session){if(side===room.snapshot?.side)room.action('command',{id});return;}if(!battle||battle.done||game.mode==='bot'&&side===1)return;const cmd=battleCommand(battle,side,id);if(cmd){audio.command(id,side);render();toast(cmd.name+' etkinleştirildi.');}else toast('Komut için yeterli enerji veya bekleme süresi gerekiyor.');}
function step(){
 if(room.session)return;
 if(!battle||battle.done)return;
 if(tab==='arena'&&arenaScene?.isAnimating()){if(!playing)arenaScene.finishExchange();return;}
 lastEvent=battleStep(battle);if(game.mode==='bot'&&!battle.done)botBattleCommand(battle);if(lastEvent&&!arenaScene)playBattleSound(lastEvent);
 if(battle.done){
  playing=false;clearTimeout(battleTimer);clearTimeout(resultTimer);const finished=battle;
  const reveal=()=>{if(battle!==finished)return;if(tab==='arena'&&arenaScene?.isAnimating()){resultTimer=setTimeout(reveal,60);return;}resultVisible=true;audio.result(battle.winner===null);render();};
  resultTimer=setTimeout(reveal,1850/speed);
 }
 render();
}
function tick(delay=1900/speed){
 if(room.session)return;
 clearTimeout(battleTimer);
 if(playing&&!battle.done)battleTimer=setTimeout(()=>{
  if(tab==='arena'&&arenaScene?.isAnimating()){tick(60);return;}
  step();tick();
 },delay);
}
function startBattle(){if(room.session){openStrategy();return;}clearTimeout(battleTimer);clearTimeout(resultTimer);resultVisible=false;battle=createBattle(game);lastEvent=null;playing=true;tab='arena';render();tick();}
document.addEventListener('click',e=>{const btn=e.target.closest('[data-action]');if(!btn||btn.disabled)return;const action=btn.dataset.action,id=btn.dataset.id;if(btn.tagName==='A')e.preventDefault();if(strategyAction(action,id)||handleRoomAction(btn,action,id))return;switch(action){case'auction':tab='auction';render();break;case'library':tab='library';render();break;case'arena':if(game.phase!=='ready'){toast('Önce açık artırmayı tamamla.');break;}tab='arena';render();break;case'sound':soundSettings();break;case'marvel-music':{modal.close();audio.setSettings({enabled:true,music:.12});const dock=musicDock(MARVEL_TRACK.title);void soundtrack.marvel(dock.querySelector('#marvel-player'));break;}case'stop-music':soundtrack.stop();document.querySelector('#soundtrack-dock')?.remove();break;case'test-sound':audio.impact({attacker:'ironman',side:0,special:true});break;case'rules':rules();break;case'setup':if(room.session){toast('Yeni oyun için önce odadan ayrıl.');break;}setup();break;case'close':if(modal.classList.contains('strategy-modal')&&(strategyHandoff||game.mode==='local'&&game.preparing===1&&!battle)){toast('İkinci oyuncu planını kilitleyince mücadele başlayacak.');break;}modal.close();scheduleBot();break;case'detail':detail(id);break;case'plus':selectedBid++;render();break;case'minus':selectedBid--;render();break;case'quick-bid':selectedBid=Number(id);if(bid(game,selectedBid)){recordAuctionBid(game.round,game.leader,'bid',selectedBid);audio.ui('bid');save();selectedBid=game.bid+1;}render();break;case'bid':if(bid(game,selectedBid)){recordAuctionBid(game.round,game.leader,'bid',selectedBid);audio.ui('bid');save();selectedBid=game.bid+1;render();}break;case'pass':{const sold=game.leader!==null;recordAuctionBid(game.round,game.turn,'pass');pass(game);audio.ui(sold?'sale':'click');}selectedBid=game.bid+1;save();render();break;case'command':activateCommand(Number(btn.dataset.side),id);break;case'arena-focus':{const side=Number(btn.dataset.side);if(battle&&(game.mode!=='bot'||side===0)&&focusTarget(battle,side,id)){render();toast(game.players[side].name+': hedef '+hero(id).name);}break;}case'tactic':if(battle&&(game.mode!=='bot'||btn.dataset.side==='0')){if(setTactic(battle,Number(btn.dataset.side),id))render();}break;case'camera':game.camera=id;save();render();break;case'fullscreen':immersive=!immersive;render();break;case'map':game.arena=id;save();render();break;case'start':openStrategy();break;case'rematch':openStrategy(true);break;case'inspect-arena':inspectedMatchId=room.session?room.snapshot.code+':'+room.snapshot.matchId:null;resultVisible=false;render();break;case'match-summary':inspectedMatchId=null;resultVisible=true;render();break;case'toggle-play':playing=!playing;render();tick();break;case'step':step();break;case'speed':speed=Number(id);render();tick();break;case'filter':viewFilter=id;render();break;case'select-compare':if(compare.includes(id))compare=compare.filter(x=>x!==id);else if(compare.length<2)compare.push(id);else toast('Karşılaştırmak için en fazla 2 karakter seç.');render();break;case'clear-compare':compare=[];render();break;case'compare':if(compare.length===2){const hs=compare.map(hero);showModal(`<div class="modal-inner"><div class="eyebrow">KAHRAMAN KARŞILAŞTIRMASI</div><h2>Hangisi senin takımında?</h2><div class="compare-portraits">${hs.map(h=>`<div>${portrait(h)}<h3>${h.name}</h3><p>${h.group} · ${h.rating} puan</p></div>`).join('')}</div><table class="compare-table"><thead><tr><th>Özellik</th>${hs.map(h=>`<th>${h.name}</th>`).join('')}</tr></thead><tbody>${STAT_LABELS.map((s,i)=>`<tr><td>${s}</td>${hs.map(h=>`<td class="${h.stats[i]===Math.max(...hs.map(x=>x.stats[i]))?'best':''}">${h.stats[i]}/10</td>`).join('')}</tr>`).join('')}<tr><td>Yetenek</td>${hs.map(h=>`<td>${h.skill}</td>`).join('')}</tr></tbody></table></div>`,'compare-modal');}break;}});
document.addEventListener('input',e=>{if(e.target.id==='track-volume'){audio.setSettings({music:Number(e.target.value)/100});}if(e.target.id==='audio-effects'||e.target.id==='audio-music'){const key=e.target.id==='audio-effects'?'effects':'music';audio.setSettings({[key]:Number(e.target.value)/100});document.querySelector('#'+key+'-value').textContent='%'+e.target.value;}if(e.target.id==='luck'&&!room.session){game.luck=Number(e.target.value);document.querySelector('#luck-value').textContent='%'+game.luck;save();}if(e.target.id==='search'){search=e.target.value;const pos=e.target.selectionStart;render();const input=document.querySelector('#search');input.focus();try{input.setSelectionRange(pos,pos);}catch{}}});
document.addEventListener('submit',e=>{if(e.target.id==='setup-form'){e.preventDefault();const data=new FormData(e.target);clearTimeout(botTimer);clearTimeout(battleTimer);clearTimeout(resultTimer);resultVisible=false;playing=false;battle=null;lastEvent=null;strategyPromptKey='';game=newGame([data.get('p1'),data.get('mode')==='bot'?'Nexus Bot':data.get('p2')],data.get('mode'));selectedBid=1;tab='auction';modal.close();save();render();toast('Yeni oyun başladı. En iyi takım kazansın!');}});
modal.addEventListener('click',e=>{if(e.target===modal){if(modal.classList.contains('strategy-modal')&&(strategyHandoff||game.mode==='local'&&game.preparing===1&&!battle))return;const r=modal.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)modal.close();}});modal.addEventListener('close',scheduleBot);modal.addEventListener('cancel',e=>{if(modal.classList.contains('strategy-modal')&&(strategyHandoff||game.mode==='local'&&game.preparing===1&&!battle))e.preventDefault();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&playing&&!room.session){playing=false;clearTimeout(battleTimer);}render();});
save();render();if(!room.restore()){const invite=new URLSearchParams(location.search).get('room');if(invite)onlineForm('join',invite);}

document.addEventListener('change',e=>{if(e.target.id==='music-file'&&e.target.files?.[0]){const file=e.target.files[0];audio.setSettings({enabled:true,music:.12});modal.close();const dock=musicDock(file.name);dock.querySelector('#marvel-player').remove();soundtrack.local(file,{createAudio:()=>{const player=document.createElement('audio');player.controls=true;player.setAttribute('aria-label','Seçilen arka plan müziği');dock.append(player);return player;}});}if(e.target.id==='audio-enabled'){audio.setSettings({enabled:e.target.checked});updateAudioStatus();}if(e.target.matches('[data-focus-side]')&&battle){const side=Number(e.target.dataset.focusSide);if(game.mode==='bot'&&side===1)return;if(room.session){if(side===room.snapshot.side)room.action('focus',{id:e.target.value||null});}else if(focusTarget(battle,side,e.target.value||null))render();}});

document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement&&tab==='arena')render();else arenaScene?.resize();});

document.addEventListener('keydown',e=>{if(e.key==='Escape'&&immersive&&!modal.open){immersive=false;render();}});

document.addEventListener('keydown',e=>{
 if(tab!=='arena'||!battle||battle.done||modal.open||e.repeat||e.ctrlKey||e.metaKey||e.altKey||e.target.closest('input,select,textarea,[contenteditable="true"]'))return;
 if(e.code==='Space'){e.preventDefault();if(room.session)room.action('pause');else{playing=!playing;render();tick();}}
 else if(e.code==='ArrowRight'&&!playing&&!room.session){e.preventDefault();step();}
 else if(['1','2','3','7','8','9'].includes(e.key)){const side=room.session?room.snapshot.side:Number(e.key)>3?1:0,id=['overdrive','barrier','rally'][(Number(e.key)-1)%6];activateCommand(side,id);}
});

function openCharacterModel(id){
 detail(id);const h=hero(id),art=modal.querySelector('.detail-art');art.classList.add('showcase-art');
 art.innerHTML=`<div class="model-stage" aria-label="${h.name} model önizlemesi"><span class="model-loading">Kahraman hazırlanıyor…</span></div><div class="model-name"><span>KAHRAMAN VİTRİNİ</span><h2>${h.name}</h2><small>Sürükleyerek döndür</small></div><div class="model-controls" aria-label="Model animasyonu"><button data-action="model-mode" data-id="idle" class="active">Hazır</button><button data-action="model-mode" data-id="walk">Yürü</button><button data-action="model-mode" data-id="attack">Saldır</button><button data-action="model-portrait" data-id="${id}">Portre</button></div>`;
 modal.querySelector('.model-open').remove();characterPreview=new CharacterPreview(art.querySelector('.model-stage'),h);modal.scrollTop=0;modal.querySelector('.modal-close').focus({preventScroll:true});
}
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-action]');if(!b||b.disabled)return;
 if(b.dataset.action==='view-model')openCharacterModel(b.dataset.id);
 else if(b.dataset.action==='model-portrait')detail(b.dataset.id);
 else if(b.dataset.action==='model-mode'){
  characterPreview?.setMode(b.dataset.id);modal.querySelectorAll('[data-action="model-mode"]').forEach(el=>el.classList.toggle('active',el===b));modal.scrollTop=0;
 }
});
 modal.addEventListener('close',()=>{characterPreview?.dispose();characterPreview=null;});
