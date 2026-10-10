import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {mkdtempSync,readFileSync,rmSync,statSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {RoomStore,TURN_MS,RECONNECT_MS,ROOM_TTL} from '../rooms.mjs';
const token=()=>randomBytes(32).toString('hex');
function fixture({file=null}={}){
 let time=1700000000000,n=0;const store=new RoomStore({file,now:()=>time});
 const a=token(),b=token();const {room:r}=store.create('A',a);store.connected(r,0,true);store.join(r.code,'B',b);store.connected(r,1,true);
 const act=(side,action,data={},id='request-'+(++n),rev=r.rev)=>store.apply(r,side,{id,rev,action,data});
 const launch=()=>{act(0,'ready');act(1,'ready');act(0,'launch');};
 const auction=()=>{launch();while(r.status==='auction'){act(r.game.turn,'bid',{amount:r.game.bid+1});act(r.game.turn,'pass');}};
 const advance=ms=>{time+=ms;store.tick();};
 return {store,r,a,b,act,launch,auction,advance,now:()=>time};
}
test('rooms require both players, private player tokens, and readiness; creation/join are retry safe',()=>{
 const f=fixture(),{store,r,a,act,launch}=f;
 assert.match(r.code,/^[A-Z2-9]{6}$/);assert.equal(store.create('A',a).room,r);assert.equal(store.join(r.code,'A',a).side,0);
 assert.throws(()=>store.join(r.code,'C',token()),/dolu/);assert.throws(()=>store.resume(r.code,token()),/kayıtlı/);assert.throws(()=>act(1,'launch'));assert.throws(()=>act(0,'launch'));
 launch();assert.equal(r.status,'auction');assert.equal(r.game.round,0);assert.equal(r.deadline,f.now()+TURN_MS+1500);
 const publicState=JSON.stringify(store.snapshot(r,0));for(const secret of [a,f.b,...r.slots.map(s=>s.hash),...r.game.pool.slice(1)])assert.ok(!publicState.includes(secret));
 assert.equal(store.snapshot(r,0).game.pool.filter(Boolean).length,1);assert.ok(store.snapshot(r,0).game.pool[0]);
});
test('turns, budgets, stale messages and duplicate requests cannot spend or acquire twice',()=>{
 const {r,store,act,launch}=fixture();launch();const before=JSON.stringify(r.game);
 assert.throws(()=>act(1,'bid',{amount:2}));for(const amount of [-1,0,21,1.5,'3',null])assert.throws(()=>act(0,'bid',{amount}));assert.equal(JSON.stringify(r.game),before);
 const rev=r.rev;act(0,'bid',{amount:3},'bid-once',rev);assert.throws(()=>act(1,'bid',{amount:4},'stale',rev));
 assert.deepEqual(act(0,'bid',{amount:3},'bid-once',rev),{duplicate:true});act(1,'pass',{},'sold-once');const after=JSON.stringify(r.game);
 assert.deepEqual(act(1,'pass',{},'sold-once',rev),{duplicate:true});assert.equal(JSON.stringify(r.game),after);assert.equal(r.game.players[0].coins,17);assert.equal(r.game.players[0].team.length,1);
 assert.equal(store.snapshot(r,0).game.pool.filter(Boolean).length,2);
});
test('deadline is enforced even before a timer tick, and inactivity passes only one turn',()=>{
 const f=fixture();f.launch();f.advance(TURN_MS+1500);assert.equal(f.r.game.turn,1);assert.equal(f.r.game.round,0);assert.equal(f.r.auctionBids.at(-1).type,'timeout');
 f.advance(TURN_MS);assert.equal(f.r.game.round,1);assert.equal(f.r.game.players[0].coins,20);
 f.act(1,'bid',{amount:5});f.advance(TURN_MS);assert.equal(f.r.game.players[1].coins,15);assert.equal(f.r.game.round,2);
});
test('disconnect pauses the clock, reconnect restores remaining time, expiry closes fairly',()=>{
 const f=fixture();f.launch();f.advance(3000);f.store.connected(f.r,1,false);const remaining=f.r.remaining;
 f.advance(60000);assert.equal(f.r.game.turn,0);assert.equal(f.r.deadline,0);assert.throws(()=>f.act(0,'bid',{amount:1}),/bağlanması/);
 assert.equal(f.store.resume(f.r.code,f.b).side,1);f.store.connected(f.r,1,true);assert.equal(f.r.deadline,f.now()+remaining);f.advance(remaining-1);assert.equal(f.r.game.turn,0);f.advance(1);assert.equal(f.r.game.turn,1);
 f.store.connected(f.r,1,false);f.advance(RECONNECT_MS);assert.equal(f.r.status,'closed');assert.equal(f.r.closedWinner,0);assert.throws(()=>f.act(0,'bid',{amount:1}),/2 dakika/);
});
test('arena settings are host only and atomic; a ready vote is invalidated by a settings change',()=>{
 const f=fixture();f.auction();assert.equal(f.r.status,'ready');assert.ok(f.r.game.players.every(p=>p.team.length===5));
 assert.throws(()=>f.act(1,'settings',{arena:'asgard'}));const before=JSON.stringify(f.r.game);assert.throws(()=>f.act(0,'settings',{arena:'asgard',luck:99}));assert.equal(JSON.stringify(f.r.game),before);
 f.act(1,'battle-ready');f.act(0,'settings',{arena:'asgard',luck:0});assert.equal(f.r.slots[1].ready,false);
 f.act(0,'battle-ready');assert.equal(f.r.battle,null);f.act(1,'battle-ready');assert.equal(f.r.status,'battle');assert.equal(f.r.matchId,1);assert.equal(f.r.battle.luck,0);
});
test('only the authenticated team is controlled; commands retain costs and cooldowns; pauses are limited',()=>{
 const f=fixture();f.auction();f.act(0,'battle-ready');f.act(1,'battle-ready');
 f.act(0,'command',{id:'barrier',side:1});assert.equal(f.r.battle.control[0].energy,0);assert.equal(f.r.battle.control[1].energy,35);assert.throws(()=>f.act(0,'command',{id:'barrier'}));
 assert.throws(()=>f.act(1,'speed',{speed:4}));f.act(0,'speed',{speed:2});assert.equal(f.r.speed,2);
 for(let i=0;i<3;i++){f.act(0,'pause');assert.equal(f.store.snapshot(f.r,0).playing,false);const events=f.r.battle.events.length;f.advance(29999);assert.equal(f.r.battle.events.length,events);f.advance(1);assert.equal(f.r.pauseUntil,0);}
 assert.throws(()=>f.act(0,'pause'),/üç/);f.advance(3000);assert.ok(f.r.battle.events.length>0);
});
test('server-driven battles terminate, both snapshots agree and rematches require two votes',()=>{
 const f=fixture();f.auction();f.act(0,'battle-ready');f.act(1,'battle-ready');let n=0;
 while(!f.r.battle.done){f.advance(3600);assert.ok(++n<450);}
 const a=f.store.snapshot(f.r,0),b=f.store.snapshot(f.r,1);assert.deepEqual(a.battle,b.battle);assert.ok(a.battle.fighters.flat().every(f=>f.hp>=0&&f.hp<=f.maxHp));assert.equal(a.playing,false);
 f.act(0,'rematch');assert.equal(f.r.matchId,1);f.act(1,'rematch');assert.equal(f.r.matchId,2);assert.ok(f.r.battle.fighters.flat().every(f=>f.hp===f.maxHp));
});
test('disk restart retains teams, budget, receipts, battle queue identity and random sequence',()=>{
 const dir=mkdtempSync(join(tmpdir(),'nexus-room-test-')),file=join(dir,'rooms.json');
 try{
  const f=fixture({file});f.auction();f.act(0,'battle-ready');f.act(1,'battle-ready');f.advance(3000);
  const persisted=readFileSync(file,'utf8');assert.ok(!persisted.includes(f.a));assert.equal(statSync(file).mode&0o777,0o600);
  const other=new RoomStore({file,now:f.now}),r=other.resume(f.r.code,f.a).room;assert.deepEqual(r.game,f.r.game);assert.ok(r.slots.every(s=>!s.connected));
  for(const fighter of r.battle.queue)assert.equal(fighter,r.battle.fighters[fighter.side].find(f=>f.id===fighter.id));
  other.connected(r,0,true);other.connected(r,1,true);f.advance(3600);other.now=()=>f.now();other.tick();assert.deepEqual(r.battle.events,f.r.battle.events);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('lobby departure frees the guest seat, old token cannot hijack it, empty rooms expire',()=>{
 const f=fixture();f.act(1,'leave');assert.equal(f.r.slots[1],null);assert.throws(()=>f.store.resume(f.r.code,f.b));f.store.join(f.r.code,'C',token());assert.equal(f.r.slots[1].name,'C');
 f.store.connected(f.r,0,false);f.advance(ROOM_TTL+1);assert.equal(f.store.rooms.size,0);
});
test('an abandoned lobby guest seat reopens after the reconnect grace, a missing host closes it',()=>{
 const f=fixture();f.store.connected(f.r,1,false);f.advance(RECONNECT_MS);assert.equal(f.r.slots[1],null);assert.equal(f.r.status,'lobby');assert.throws(()=>f.store.resume(f.r.code,f.b));
 const g=fixture();g.store.connected(g.r,0,false);g.advance(RECONNECT_MS);assert.equal(g.r.status,'closed');assert.equal(g.r.closedWinner,undefined);
});
test('disconnect or departure after a completed battle cannot change its winner',()=>{
 const f=fixture();f.auction();f.act(0,'battle-ready');f.act(1,'battle-ready');while(!f.r.battle.done)f.advance(3600);const winner=f.r.battle.winner;
 f.store.connected(f.r,0,false);f.advance(RECONNECT_MS);assert.equal(f.r.status,'battle');assert.equal(f.r.battle.winner,winner);
 f.store.connected(f.r,0,true);assert.equal(f.r.deadline,0);f.act(0,'leave');assert.equal(f.r.closedWinner,winner);
});
test('late bid is rejected and the expired turn is passed before accepting another action',()=>{
 let time=1700000000000;const store=new RoomStore({now:()=>time}),r=store.create('A',token()).room;store.connected(r,0,true);store.join(r.code,'B',token());store.connected(r,1,true);
 let n=0;const act=(side,action,data={})=>store.apply(r,side,{id:'late-'+(++n),rev:r.rev,action,data});act(0,'ready');act(1,'ready');act(0,'launch');time=r.deadline;
 assert.throws(()=>act(0,'bid',{amount:1}),/süresi doldu/);assert.equal(r.game.bid,0);assert.equal(r.game.turn,1);assert.ok(r.game.players.every(p=>p.coins===20));act(1,'bid',{amount:1});assert.equal(r.game.bid,1);
});
