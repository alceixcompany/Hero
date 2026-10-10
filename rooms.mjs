import {randomBytes,createHash,randomInt} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync,renameSync,chmodSync} from 'node:fs';
import {dirname} from 'node:path';
import {newGame,bid,pass,canBid,hero,ARENAS,createBattle,battleStep,battleCommand,setTactic,focusTarget} from './dist/engine.mjs';

export const TURN_MS=20000, RECONNECT_MS=120000, ROOM_TTL=60*60*1000;
const hash=s=>createHash('sha256').update(s).digest('hex');
const validToken=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
const fail=(message,code='invalid')=>{throw Object.assign(new Error(message),{code});};
const cleanName=s=>typeof s==='string'?s.replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,20):'';
const clone=x=>JSON.parse(JSON.stringify(x));
const random=r=>{r.rngState=(Math.imul(r.rngState,1664525)+1013904223)>>>0;return r.rngState/4294967296;};
export function reviveBattle(room){
 if(!room.battle)return;
 room.battle.rng=()=>random(room);
 room.battle.queue=room.battle.queue.map(f=>room.battle.fighters[f.side].find(x=>x.id===f.id)).filter(Boolean);
}

// One process owns all mutations. Persist before acknowledging, so retries cannot buy twice.
export class RoomStore{
 constructor({file=null,now=Date.now,maxRooms=300,onChange=()=>{}}={}){
  this.file=file;this.now=now;this.maxRooms=maxRooms;this.onChange=onChange;this.rooms=new Map();
  if(file){
   try{
    const saved=JSON.parse(readFileSync(file,'utf8'));
    if(saved.version!==1||!Array.isArray(saved.rooms))throw Error('Oda dosyası uyumsuz.');
    for(const r of saved.rooms){
     if(r.updated+ROOM_TTL<this.now())continue;
     if(!/^[A-Z2-9]{6}$/.test(r.code)||!Array.isArray(r.slots)||r.slots.length!==2||!r.game?.pool?.every(hero))throw Error('Oda dosyası bozuk.');
     r.slots.forEach(s=>{if(s){s.connected=false;s.lastSeen=this.now();}});
     r.remaining=Math.max(1000,r.deadline-r.updated);r.deadline=0;r.pauseUntil=0;
     reviveBattle(r);this.rooms.set(r.code,r);
    }
   }catch(e){if(e.code!=='ENOENT')throw e;}
  }
 }
 persist(){
  if(!this.file)return;
  mkdirSync(dirname(this.file),{recursive:true,mode:0o700});
  writeFileSync(this.file+'.tmp',JSON.stringify({version:1,rooms:[...this.rooms.values()]}),{mode:0o600});
  renameSync(this.file+'.tmp',this.file);chmodSync(this.file,0o600);
 }
 change(r){r.rev++;r.updated=this.now();this.persist();this.onChange(r);return r;}
 room(code){const r=this.rooms.get(String(code??'').toUpperCase());if(!r||!r.slots.some(s=>s?.connected)&&r.updated+ROOM_TTL<this.now())fail('Oda bulunamadı veya süresi doldu.','missing');return r;}
 create(name,token){
  if(!cleanName(name)||!validToken(token))fail('Bir oyuncu adı gir.');
  const prior=[...this.rooms.values()].find(r=>r.slots[0]?.hash===hash(token)&&r.status!=='closed');
  if(prior)return {room:prior,side:0};
  if(this.rooms.size>=this.maxRooms)fail('Sunucu dolu. Biraz sonra tekrar dene.','capacity');
  const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let code;
  do{code=Array.from({length:6},()=>alphabet[randomInt(alphabet.length)]).join('');}while(this.rooms.has(code));
  const r={code,rev:0,status:'lobby',created:this.now(),updated:this.now(),slots:[{name:cleanName(name),hash:hash(token),ready:false,connected:false,lastSeen:this.now()},null],rngState:randomInt(1,0xffffffff),game:null,battle:null,matchId:0,playing:false,speed:1,deadline:0,remaining:TURN_MS,pauseUntil:0,pauseUsed:[0,0],receipts:[[],[]],auctionBids:[],notice:'Arkadaşını davet et.'};
  r.game=newGame([cleanName(name),'Oyuncu 2'],'online',()=>random(r));this.rooms.set(code,r);this.change(r);return {room:r,side:0};
 }
 join(code,name,token){
  const r=this.room(code);if(!validToken(token))fail('Oturum geçersiz.');
  const side=r.slots.findIndex(s=>s?.hash===hash(token));
  if(side!==-1)return {room:r,side};
  if(r.status!=='lobby'||r.slots[1])fail('Oda dolu veya oyun başladı.','full');
  if(!cleanName(name))fail('Bir oyuncu adı gir.');
  r.slots[1]={name:cleanName(name),hash:hash(token),ready:false,connected:false,lastSeen:this.now()};r.receipts[1]=[];r.game.players[1].name=cleanName(name);r.notice='İki oyuncu da hazır olduğunda oda sahibi başlatabilir.';this.change(r);return {room:r,side:1};
 }
 resume(code,token){const r=this.room(code);if(!validToken(token))fail('Oturum geçersiz.','session');const side=r.slots.findIndex(s=>s?.hash===hash(token));if(side===-1)fail('Bu odada kayıtlı oyuncun yok.','session');return {room:r,side};}
 allConnected(r){return r.slots.every(s=>s?.connected);}
 connected(r,side,online){
  const before=this.allConnected(r),slot=r.slots[side];if(!slot)return;
  slot.connected=online;slot.lastSeen=this.now();
  if(before&&!this.allConnected(r)&&r.deadline){r.remaining=Math.max(1000,r.deadline-this.now());r.deadline=0;}
  if(!before&&this.allConnected(r)&&(r.status==='auction'||r.status==='battle'&&!r.battle?.done)){r.deadline=this.now()+Math.max(1000,r.remaining);r.notice='İki oyuncu da bağlı. Mücadele devam ediyor.';}
  this.change(r);
 }
 snapshot(r,side){
  const game=clone(r.game);
  game.pool=game.pool.map((id,i)=>r.status==='lobby'||i>game.round&&game.phase!=='ready'?null:id);
  game.camera='follow';
  return {type:'state',code:r.code,side,rev:r.rev,status:r.status,game,battle:r.battle?clone(r.battle):null,matchId:r.matchId,playing:r.playing&&this.allConnected(r)&&!r.pauseUntil,speed:r.speed,deadline:r.deadline,remaining:r.remaining,serverNow:this.now(),pauseUntil:r.pauseUntil,slots:r.slots.map(s=>s?{name:s.name,ready:s.ready,connected:s.connected,lastSeen:s.lastSeen}:null),auctionBids:clone(r.auctionBids.slice(-60)),notice:r.notice,closedWinner:r.closedWinner??null,resultAt:r.resultAt??0};
 }
 apply(r,side,{id,rev,action,data={}}={}){
  if(![0,1].includes(side)||!r.slots[side]||!data||typeof data!=='object'||Array.isArray(data))fail('İstek geçersiz.');
  if(typeof id!=='string'||!/^[a-zA-Z0-9-]{1,80}$/.test(id))fail('İstek geçersiz.');
  if(r.receipts[side].includes(id))return {duplicate:true};
  if(rev!==r.rev)fail('Oyun güncellendi. Güncel duruma göre tekrar dene.','stale');
  if(r.status==='closed'){if(action==='leave')return {left:true};fail(r.notice,'closed');}
  if(action==='leave'){
   if(r.status==='lobby'&&side===1){r.slots[1]=null;r.slots[0].ready=false;r.notice='Arkadaşın ayrıldı. Yeni bir oyuncu davet edebilirsin.';}
   else{r.closedWinner=r.status==='lobby'?null:r.battle?.done?r.battle.winner:1-side;r.status='closed';r.notice=side===0?'Oda sahibi odadan ayrıldı.':'Rakibin odadan ayrıldı.';r.deadline=0;r.playing=false;}
   this.change(r);return {left:true};
  }
  if(action==='ready'&&r.status==='lobby')r.slots[side].ready=!r.slots[side].ready;
  else if(action==='launch'){
   if(side!==0||r.status!=='lobby'||!this.allConnected(r)||!r.slots.every(s=>s.ready))fail('İki oyuncu da hazır olmalı.');
   r.status='auction';r.notice='İlk kahraman açıldı. Teklif sırası sende olabilir!';r.deadline=this.now()+TURN_MS+1500;
  }else{
   if(!this.allConnected(r))fail('Rakibinin yeniden bağlanması bekleniyor.','offline');
   if(action==='bid'||action==='pass'){
    if(r.status!=='auction'||r.game.turn!==side)fail('Teklif sırası rakibinde.');
    if(r.deadline&&this.now()>=r.deadline){this.auctionPass(r,true);this.change(r);fail('Teklif süresi doldu.','expired');}
    const round=r.game.round;
    if(action==='bid'){
     if(!canBid(r.game,side,data.amount))fail('Geçerli ve bütçene uygun bir teklif seç.');
     bid(r.game,data.amount);r.auctionBids.push({round,side,amount:data.amount,type:'bid',at:this.now()});
    }else this.auctionPass(r,false);
    this.afterAuction(r,round);
   }else if(action==='settings'){
    if(side!==0||r.status!=='ready')fail('Arena ayarlarını oda sahibi mücadele öncesinde seçer.');
    if(data.arena!==undefined&&!ARENAS.some(a=>a.id===data.arena))fail('Arena geçersiz.');
    if(data.luck!==undefined&&(!Number.isInteger(data.luck)||data.luck<0||data.luck>25))fail('Şans ayarı geçersiz.');
    if(data.arena!==undefined)r.game.arena=data.arena;
    if(data.luck!==undefined)r.game.luck=data.luck;
    r.slots.forEach(s=>s.ready=false);
   }else if(action==='battle-ready'){
    if(r.status!=='ready')fail('Önce açık artırmayı tamamla.');
    r.slots[side].ready=!r.slots[side].ready;
    if(r.slots.every(s=>s.ready))this.startBattle(r);
   }else if(action==='rematch'){
    if(!r.battle?.done||r.status!=='battle')fail('Mücadele henüz bitmedi.');
    r.slots[side].ready=true;if(r.slots.every(s=>s.ready))this.startBattle(r);
   }else if(['command','tactic','focus'].includes(action)){
    if(r.status!=='battle'||r.battle.done||r.pauseUntil)fail('Aktif mücadele bekleniyor.');
    const ok=action==='command'?battleCommand(r.battle,side,data.id):action==='tactic'?setTactic(r.battle,side,data.id):focusTarget(r.battle,side,data.id??null);
    if(!ok)fail('Bu hamle şu anda kullanılamıyor.');
   }else if(action==='pause'){
    if(r.status!=='battle'||r.battle.done)fail('Aktif mücadele bekleniyor.');
    if(r.pauseUntil){r.pauseUntil=0;r.deadline=this.now()+Math.max(1000,r.remaining);}
    else{if(r.pauseUsed[side]>=3)fail('Bu mücadelede üç taktik molanı kullandın.');r.pauseUsed[side]++;r.remaining=Math.max(1000,r.deadline-this.now());r.deadline=0;r.pauseUntil=this.now()+30000;r.notice=r.slots[side].name+' taktik molası aldı. 30 saniyede otomatik devam eder.';}
   }else if(action==='speed'){
    if(side!==0||r.status!=='battle'||![1,2,4].includes(data.speed))fail('Oynatma hızını oda sahibi seçer.');
    const old=r.speed;r.speed=data.speed;if(r.deadline)r.deadline=this.now()+Math.max(700,(r.deadline-this.now())*old/r.speed);r.remaining=Math.max(700,r.remaining*old/r.speed);
   }else fail('İşlem bu aşamada kullanılamıyor.');
  }
  r.receipts[side].push(id);r.receipts[side]=r.receipts[side].slice(-100);this.change(r);return {ok:true};
 }
 auctionPass(r,timed){
  const round=r.game.round,side=r.game.turn;r.auctionBids.push({round,side,type:timed?'timeout':'pass',at:this.now()});pass(r.game);this.afterAuction(r,round);
 }
 afterAuction(r,round){
  r.auctionBids=r.auctionBids.slice(-100);
  if(r.game.phase==='ready'){r.status='ready';r.deadline=0;r.slots.forEach(s=>s.ready=false);r.notice='Takımlar tamamlandı. Arenaya hazır olduğunu bildir.';}
  else{r.deadline=this.now()+TURN_MS+(round!==r.game.round?1500:0);r.remaining=TURN_MS;}
 }
 startBattle(r){r.status='battle';r.matchId++;r.battle=createBattle(r.game,()=>random(r));r.slots.forEach(s=>s.ready=false);r.playing=true;r.speed=1;r.pauseUntil=0;r.pauseUsed=[0,0];r.deadline=this.now()+3000;r.remaining=3000;r.resultAt=0;r.notice='Mücadele başladı. Komutlarını kendi takımına ver.';}
 tick(){
  const now=this.now();let removed=false;
  for(const [code,r] of this.rooms){
   if(!r.slots.some(s=>s?.connected)&&now-r.updated>ROOM_TTL){this.rooms.delete(code);removed=true;continue;}
   if(r.status==='closed')continue;
   if(r.status==='lobby'){
    if(r.slots[0]&&!r.slots[0].connected&&r.slots[1]?.connected&&now-r.slots[0].lastSeen>=RECONNECT_MS){r.status='closed';r.notice='Oda sahibi geri dönmedi. Oda kapandı.';this.change(r);}
    else if(r.slots[1]&&!r.slots[1].connected&&r.slots[0]?.connected&&now-r.slots[1].lastSeen>=RECONNECT_MS){r.slots[1]=null;r.receipts[1]=[];r.slots[0].ready=false;r.notice='Rakibin geri dönmedi. Yeni bir arkadaşını davet edebilirsin.';this.change(r);}
    continue;
   }
   if(r.battle?.done)continue;
   const disconnected=r.slots.findIndex(s=>s&&!s.connected&&now-s.lastSeen>=RECONNECT_MS);
   if(disconnected!==-1){r.status='closed';r.closedWinner=r.slots[1-disconnected]?.connected?1-disconnected:null;r.notice='Yeniden bağlanma için tanınan 2 dakika doldu.';r.playing=false;r.deadline=0;this.change(r);continue;}
   if(!this.allConnected(r))continue;
   if(r.pauseUntil){if(now>=r.pauseUntil){r.pauseUntil=0;r.deadline=now+Math.max(1000,r.remaining);r.notice='Taktik molası bitti.';this.change(r);}continue;}
   if(!r.deadline||now<r.deadline)continue;
   if(r.status==='auction'){this.auctionPass(r,true);this.change(r);}
   else if(r.status==='battle'&&!r.battle.done){battleStep(r.battle);r.deadline=r.battle.done?0:now+3600/r.speed;r.remaining=3600/r.speed;if(r.battle.done){r.playing=false;r.resultAt=now+1800/r.speed;r.notice='Mücadele tamamlandı. Rövanş için iki oyuncu da onay vermeli.';}this.change(r);}
  }
  if(removed)this.persist();
 }
}
