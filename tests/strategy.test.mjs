import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,hero,createBattle,battleStep,linkStatus,battleCommand} from '../dist/engine.mjs';
import {validPlan,defaultPlan,adjacent,positionFor} from '../dist/strategy.mjs';
import {RoomStore,reviveBattle} from '../rooms.mjs';
import {RoomService} from '../hosting/room-service.mjs';
import {MemoryRedis,token,connection} from './helpers/vercel-fixture.mjs';
function game(){const g=newGame();g.phase='ready';g.luck=0;g.players[0].team=['captain','winter','wanda'];g.players[1].team=['hulk','hawkeye','vision'];g.plans=[defaultPlan(g.players[0].team,hero),defaultPlan(g.players[1].team,hero)];return g;}
function fixture(g=game()){const b=createBattle(g,()=>.9);b.fighters.flat().forEach(f=>{f.hp=f.maxHp=900;});return b;}
const attack=(b,id)=>{b.queue=[b.fighters.flat().find(f=>f.id===id)];return battleStep(b);};
test('formation rejects missing/foreign/duplicate heroes, overlapping slots and invalid roles without coercion',()=>{
 const ids=['captain','winter'],p=defaultPlan(ids,hero);assert.ok(validPlan(ids,p));for(const invalid of [null,[],[p[0],p[0]],[p[0],{...p[1],slot:p[0].slot}],[p[0],{...p[1],id:'hulk'}],[p[0],{...p[1],slot:'3'}],[p[0],{...p[1],slot:6}],[p[0],{...p[1],role:'invincible'}]])assert.equal(validPlan(ids,invalid),false);
 for(let count=1;count<=5;count++)assert.ok(validPlan(['hulk','captain','winter','wanda','hawkeye'].slice(0,count),defaultPlan(['hulk','captain','winter','wanda','hawkeye'].slice(0,count),hero)));
 assert.equal(adjacent(0,1),true);assert.equal(adjacent(0,3),true);assert.equal(adjacent(2,3),false);assert.equal(adjacent(1,1),false);assert.deepEqual(positionFor(5,0),[-7,.65,4]);
});
test('front line intercepts melee focus; fast and flying hunters bypass it; hunters choose weakest reachable ratio',()=>{
 const b=fixture();const [hulk,hawkeye,vision]=b.fighters[1];hulk.slot=0;hawkeye.slot=4;vision.slot=5;hawkeye.hp=300;vision.hp=600;
 b.control[0].focus='hawkeye';const winter=b.fighters[0].find(f=>f.id==='winter');winter.role='assault';assert.equal(attack(b,'winter').target,'hulk');winter.role='hunt';winter.stats[2]=8;const e=attack(b,'winter');assert.equal(e.target,'hawkeye');assert.equal(e.flank,true);
 const wanda=b.fighters[0].find(f=>f.id==='wanda');wanda.role='hunt';b.control[0].focus=null;assert.equal(attack(b,'wanda').target,'hawkeye');
 winter.stats[2]=7;b.control[0].focus=null;assert.equal(attack(b,'winter').target,'hulk');hulk.hp=0;assert.equal(attack(b,'winter').target,'hawkeye');
});
test('cover reduces ranged hits, platform helps airborne ranged attackers, rear screening falls with frontline',()=>{
 const run=(slot,attackerSlot=0,front=true)=>{const b=fixture();b.fighters[0].find(f=>f.id==='wanda').slot=attackerSlot;const victim=b.fighters[1].find(f=>f.id==='hawkeye');victim.slot=slot;const hulk=b.fighters[1].find(f=>f.id==='hulk');hulk.slot=1;if(!front)hulk.hp=0;b.fighters[1].find(f=>f.id==='vision').slot=4;b.control[0].focus='hawkeye';return attack(b,'wanda').damage;};
 assert.ok(run(0)<run(1));assert.ok(run(0,2)>run(0,0));assert.ok(run(3,0,true)<run(3,0,false));
});
test('adjacent protector shares damage once per round; shield caps and eliminated guards do not revive',()=>{
 const b=fixture();const guard=b.fighters[1].find(f=>f.id==='hulk'),victim=b.fighters[1].find(f=>f.id==='hawkeye');guard.role='protect';guard.slot=0;victim.slot=3;guard.shield=5;b.control[0].focus=victim.id;
 const e=attack(b,'wanda');assert.equal(e.guard.id,guard.id);assert.equal(guard.shield,0);assert.equal(900-guard.hp,e.guard.damage);assert.equal(900-victim.hp,e.damage);assert.equal(attack(b,'wanda').guard,null);
 b.round++;guard.hp=1;const fatal=attack(b,'wanda');assert.equal(guard.hp,0);assert.ok(fatal.defeated.includes(guard.id));b.control[1].energy=100;battleCommand(b,1,'rally');assert.equal(guard.hp,0);b.round++;assert.equal(attack(b,'wanda').guard,null);
});
test('neighboring partners charge faster while area attacks punish adjacency and bypass cover',()=>{
 const b=fixture(),captain=b.fighters[0].find(f=>f.id==='captain'),winter=b.fighters[0].find(f=>f.id==='winter');captain.slot=0;winter.slot=1;attack(b,'captain');assert.equal(linkStatus(b,0)[0].charge,1);attack(b,'winter');assert.equal(linkStatus(b,0)[0].charge,3);assert.ok(attack(b,'captain').combo);
 const a=fixture();const [hulk,hawkeye,vision]=a.fighters[1];hulk.slot=1;hawkeye.slot=0;vision.slot=5;hulk.role='assault';a.control[0].focus='hulk';a.fighters[0].find(f=>f.id==='wanda').actions=2;const hp=hawkeye.hp;attack(a,'wanda');assert.equal(hawkeye.hp,hp-18);assert.equal(vision.hp,900);
});
test('seeded strategic battles terminate with legal health and restored queues preserve results',()=>{
 for(let seed=0;seed<80;seed++){let value=seed;const rng=()=>{value=(Math.imul(value,1664525)+1013904223)>>>0;return value/4294967296;};const g=game();g.plans=g.plans.map(p=>p.map((x,i)=>({...x,slot:(x.slot+seed)%6,role:['assault','hunt','protect'][(seed+i)%3]})));const b=createBattle(g,rng);let n=0;while(!b.done){battleStep(b);assert.ok(n++<450);assert.ok(b.fighters.flat().every(f=>f.hp>=0&&f.hp<=f.maxHp&&f.shield>=0&&f.shield<=60));}assert.ok([0,1,null].includes(b.winner));}
 const r={battle:fixture(),rngState:50};reviveBattle(r);battleStep(r.battle);const restored=JSON.parse(JSON.stringify(r));reviveBattle(restored);for(let i=0;i<6;i++){battleStep(r.battle);battleStep(restored.battle);}assert.deepEqual(r.battle.events,restored.battle.events);
});
test('native rooms keep opponent plan private until both commit, own plans survive resume and settings invalidate readiness',()=>{
 const store=new RoomStore(),a=token(),b=token(),r=store.create('A',a).room;store.connected(r,0,true);store.join(r.code,'B',b);store.connected(r,1,true);r.game=game();r.game.plans=[null,null];r.status='ready';let n=0;const act=(side,data,action='battle-ready')=>store.apply(r,side,{id:'plan-'+n++,rev:r.rev,action,data});
 const plan=defaultPlan(r.game.players[0].team,hero);act(0,{plan,side:1});assert.deepEqual(store.snapshot(r,0).game.plans[0],plan);assert.equal(store.snapshot(r,1).game.plans[0],null);assert.equal(r.battle,null);assert.deepEqual(store.snapshot(store.resume(r.code,a).room,0).game.plans[0],plan);
 const before=JSON.stringify(r);assert.throws(()=>act(1,{plan}));assert.equal(JSON.stringify(r),before);act(0,{arena:'asgard'},'settings');assert.equal(r.slots[0].ready,false);act(0,{plan});act(1,{plan:defaultPlan(r.game.players[1].team,hero)});assert.equal(r.status,'battle');assert.equal(r.battle.strategy,true);assert.deepEqual(store.snapshot(r,0).game.plans,store.snapshot(r,1).game.plans);assert.throws(()=>act(0,{plan}));
 r.battle.done=true;const revised=plan.map((p,i)=>({...p,slot:i===0?2:p.slot}));act(0,{plan:revised},'rematch');assert.equal(store.snapshot(r,1).game.plans[0],null);assert.deepEqual(store.snapshot(r,0).game.plans[0],revised);act(1,{},'rematch');assert.deepEqual(store.snapshot(r,1).game.plans[0],revised);
});
test('fresh Vercel functions commit private plans atomically and reveal matching formations',async()=>{
 const redis=new MemoryRedis(),a={auth:{type:'create',name:'A',token:token()},connection:connection()},b={auth:{type:'join',name:'B',token:token()},connection:connection()};let time=1000;const req=async(p,message)=>{const {messages}=await new RoomService({redis,key:'plans',now:()=>time++,wait:async()=>{}}).request({...p,message});const w=messages.find(m=>m.type==='welcome');if(w)p.auth={type:'resume',code:w.code,token:p.auth.token};const state=messages.find(m=>m.type==='state');if(state)p.state=state;return messages;};
 await req(a,{type:'hello'});b.auth.code=a.auth.code;await req(b,{type:'hello'});const data=JSON.parse(redis.raw);data.rooms[0].status='ready';data.rooms[0].game=game();data.rooms[0].game.plans=[null,null];redis.raw=JSON.stringify(data);
 await req(a,{type:'sync'});await req(b,{type:'sync'});const plan=defaultPlan(a.state.game.players[0].team,hero);await req(a,{type:'action',action:'battle-ready',id:'one',rev:a.state.rev,data:{plan}});await req(b,{type:'sync'});assert.equal(b.state.game.plans[0],null);
 const p2=defaultPlan(b.state.game.players[1].team,hero);await req(b,{type:'action',action:'battle-ready',id:'two',rev:b.state.rev,data:{plan:p2}});await req(a,{type:'sync'});assert.equal(a.state.battle.strategy,true);assert.deepEqual(a.state.battle,b.state.battle);assert.deepEqual(a.state.game.plans,[plan,p2]);
});
import {packLabels} from '../dist/arena-motion.mjs';
test('crowded mobile labels separate without moving fighters or consuming random draws',()=>{
 const labels=[{id:'a',x:200,y:260,width:75,height:36},{id:'b',x:210,y:262,width:75,height:36},{id:'c',x:207,y:270,width:75,height:36}],before=structuredClone(labels);
 const placed=packLabels(labels,{width:537,height:700});assert.deepEqual(labels,before);for(let i=0;i<placed.length;i++)for(let j=i+1;j<placed.length;j++)assert.ok(Math.abs(placed[i].y-placed[j].y)>=40||Math.abs(placed[i].x-placed[j].x)>=(placed[i].width+placed[j].width)/2+4);assert.ok(placed.every(p=>p.x>0&&p.x<537&&p.y>0&&p.y<700));
});

test('broken cover survives native room snapshots and persisted Vercel reconnects',async()=>{
 const native=new RoomStore(),a=token(),b=token(),r=native.create('A',a).room;native.join(r.code,'B',b);r.game=game();r.battle=fixture(r.game);r.status='battle';r.playing=false;
 const c=r.battle.terrain.cover.find(c=>c.side===1&&c.slot===0);c.hp=1;r.battle.fighters[1][0].slot=0;attack(r.battle,'wanda');assert.equal(c.hp,0);assert.deepEqual(native.snapshot(r,0).battle.terrain,native.snapshot(native.resume(r.code,b).room,1).battle.terrain);
 const redis=new MemoryRedis(),p={auth:{type:'create',name:'A',token:token()},connection:connection()};const request=async(message)=>new RoomService({redis,key:'broken-cover',now:()=>1000,wait:async()=>{}}).request({...p,message});
 const initial=await request({type:'hello'}),welcome=initial.messages.find(m=>m.type==='welcome');p.auth={...p.auth,type:'resume',code:welcome.code};const persisted=JSON.parse(redis.raw);persisted.rooms[0].battle=r.battle;persisted.rooms[0].game=r.game;persisted.rooms[0].status='battle';persisted.rooms[0].playing=false;redis.raw=JSON.stringify(persisted);
 p.connection=connection();const restored=await request({type:'hello'}),state=restored.messages.find(m=>m.type==='state');assert.deepEqual(state.battle.terrain,r.battle.terrain);assert.equal(state.battle.terrain.cover.find(c=>c.side===1&&c.slot===0).hp,0);assert.deepEqual(state.battle.events.at(-1).terrain,r.battle.events.at(-1).terrain);
});
