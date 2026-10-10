import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,createBattle,battleStep,battleCommand,canCommand,setTactic,upcomingTurns,botBattleCommand} from '../dist/engine.mjs';
import {climaxReady} from '../dist/battle-climax.mjs';
import {reviveBattle,RoomStore} from '../rooms.mjs';
import {battleDelay,exchangeDuration,cinematicProgress} from '../dist/combat-choreography.mjs';
import {healthBehaviour,combatSequence,sequenceMotion,sequenceClip,impactAt} from '../dist/battle-presentation.mjs';
import {advanceExchange,retimeExchange} from '../dist/arena-motion.mjs';
import {syncFighterLife,shouldFall} from '../dist/fighter-life.mjs';
import {hero} from '../dist/engine.mjs';
const fixture=(id='thor')=>{const g=newGame();g.luck=0;g.players[0].team=[id];g.players[1].team=['hulk','widow'];const b=createBattle(g,()=>.5),f=b.fighters[0][0];f.hp=Math.round(f.maxHp*.6);f.actions=2;b.round=3;b.queue=[f,...b.fighters[1]];return {g,b,f};};
test('all three climax abilities announce without damage, energy, personal attacks or terrain changes, then release once',()=>{
 for(const id of ['thor','ironman','wanda']){
  const {g,b,f}=fixture(id),before=JSON.stringify({fighters:b.fighters[1],terrain:b.terrain,controls:b.control});
  const charge=battleStep(b);assert.equal(charge.type,'charge');assert.equal(charge.damage,0);assert.equal(f.actions,2);assert.equal(JSON.stringify({fighters:b.fighters[1],terrain:b.terrain,controls:b.control}),before);assert.deepEqual(charge.hits,[]);assert.equal(upcomingTurns(b)[0].id,id);
  assert.equal(battleDelay(charge,4),4000);const e=battleStep(b);assert.equal(e.climax.phase,'release');assert.ok(!e.climax.cancelled&&e.special);assert.ok(e.damage>0);assert.equal(f.actions,3);assert.equal(b.pendingClimax,null);
  f.actions=9;f.hp=1;b.queue=[f];assert.ok(!climaxReady(f));assert.notEqual(battleStep(b)?.type,'charge');assert.equal(createBattle(g).fighters[0][0].climaxUsed,false);
 }
});
test('counter is defender-only, costs energy once, bypasses cooldown and replaces the climax with a weaker normal attack',()=>{
 const normal=fixture(),cut=fixture();battleStep(normal.b);battleStep(cut.b);const c=cut.b.control[1];c.commandAt=c.turns;
 assert.equal(canCommand(cut.b,0,'counter'),false);c.energy=34;assert.equal(battleCommand(cut.b,1,'counter'),null);c.energy=35;
 assert.ok(battleCommand(cut.b,1,'counter'));assert.equal(c.energy,0);assert.equal(battleCommand(cut.b,1,'counter'),null);assert.equal(c.commandAt,c.turns);
 const regular=battleStep(cut.b),ultimate=battleStep(normal.b);assert.equal(regular.climax.cancelled,true);assert.equal(regular.special,false);assert.ok(regular.damage<ultimate.damage);assert.equal(canCommand(cut.b,1,'counter'),false);
});
test('a shield absorbs real damage and guard stance remains available inside a recent stance cooldown',()=>{
 const base=fixture(),shield=fixture(),guard=fixture();for(const f of [base,shield,guard])battleStep(f.b);
 assert.ok(battleCommand(shield.b,1,'barrier'));guard.b.control[1].tactic='rush';guard.b.control[1].tacticAt=guard.b.control[1].turns;assert.ok(setTactic(guard.b,1,'guard'));
 const e=battleStep(base.b),s=battleStep(shield.b),g=battleStep(guard.b);assert.equal(s.absorbed,22);assert.equal(s.damage,e.damage-22);assert.ok(g.damage<e.damage);assert.equal(base.f.metrics.damage,e.hits.reduce((n,h)=>n+h.damage,0));
});
test('charge eligibility has a wounded trigger, full-health fallback and no dead hero activation',()=>{
 const {f}=fixture();f.hp=f.maxHp;assert.equal(climaxReady(f),false);f.actions=5;assert.equal(climaxReady(f),true);f.hp=0;assert.equal(climaxReady(f),false);f.hp=f.maxHp*.3;f.actions=1;assert.equal(climaxReady(f),false);
});
test('serialized pending abilities resume the same target, cancellation, queue and seeded damage without charging twice',()=>{
 const {b}=fixture('wanda');const room={battle:b,rngState:183491};reviveBattle(room);battleStep(b);battleCommand(b,1,'counter');const copy=JSON.parse(JSON.stringify(room));reviveBattle(copy);
 assert.deepEqual(battleStep(copy.battle),battleStep(b));assert.equal(copy.rngState,room.rngState);assert.equal(copy.battle.fighters[0][0].climaxUsed,true);assert.deepEqual(copy.battle.queue.map(f=>f.id),b.queue.map(f=>f.id));
});
test('a real room preserves response time through speed, pause and reconnect and rejects a late counter before a timer tick',()=>{
 let now=100000,n=0;const store=new RoomStore({now:()=>now}),r=store.create('A','a'.repeat(64)).room;store.connected(r,0,true);store.join(r.code,'B','b'.repeat(64));store.connected(r,1,true);
 const act=(side,action,data={})=>store.apply(r,side,{id:'climax-'+ ++n,rev:r.rev,action,data});const {b}=fixture();r.battle=b;r.status='battle';r.playing=true;r.deadline=now+1;now++;store.tick();assert.equal(b.events.at(-1).type,'charge');assert.equal(r.deadline-now,4000);
 now+=900;act(0,'speed',{speed:4});assert.equal(r.deadline-now,3100);act(1,'pause');const remain=r.remaining;now+=20000;store.tick();assert.ok(b.pendingClimax);assert.equal(r.remaining,remain);act(1,'pause');assert.equal(r.deadline-now,remain);
 now+=300;store.connected(r,1,false);const disconnectedRemain=r.remaining;now+=10000;store.connected(r,1,true);assert.equal(r.deadline-now,disconnectedRemain);assert.deepEqual(store.snapshot(r,0).battle.pendingClimax,store.snapshot(r,1).battle.pendingClimax);
 now=r.deadline;assert.throws(()=>act(1,'command',{id:'counter'}),/süresi doldu/);assert.equal(b.pendingClimax,null);assert.equal(b.commands.length,0);assert.equal(b.events.at(-1).climax.cancelled,false);
});
test('low health controls posture, armor wear, rage and recovery; corpses have no active behavior',()=>{
 assert.ok(healthBehaviour('hulk',.2).rage>healthBehaviour('hulk',.6).rage);assert.equal(healthBehaviour('ironman',1).wear,0);assert.equal(healthBehaviour('ironman',.2).label,'ZIRH KRİTİK');assert.ok(healthBehaviour('thor',.2).landing>healthBehaviour('thor',.8).landing);assert.ok(healthBehaviour('wanda',.7).fatigue<healthBehaviour('wanda',.2).fatigue);
 for(const id of ['hulk','ironman','wanda']){const s=healthBehaviour(id,0);assert.equal(s.fatigue+s.rage+s.wear+s.landing,0);assert.equal(s.critical,false);}
});
test('continuous melee uses one damage contact after blocks and counters, preserves fighting position and delays elimination correctly',()=>{
 const e={sequence:combatSequence(hero('hulk'),{})};assert.equal(e.sequence.beats.length,3);assert.equal(impactAt(e),.72);assert.equal(sequenceClip(.3,'target','hulk').block,true);assert.equal(sequenceClip(.45,'target','spiderman').name,'Punch_Jab');assert.ok(sequenceMotion(1,{id:'hulk'}).travel>.8);assert.equal(sequenceMotion(1,{id:'hulk',targetLift:1.5}).lift,0);assert.ok(sequenceMotion(.65,{id:'spiderman',targetLift:1.5}).lift>1);
 assert.equal(exchangeDuration(1,false,false,e),3.45);let prior=0;for(let i=0;i<=1000;i++){const p=cinematicProgress(i/1000,.72);assert.ok(p>=prior-1e-10&&p<=1);prior=p;}
 const actor={};syncFighterLife(actor,0,e);assert.equal(shouldFall(actor,{event:e},.7),false);assert.equal(shouldFall(actor,{event:e},.73),true);assert.equal(shouldFall(actor,{event:{}},.1),true);
 const action={event:{type:'charge'},elapsed:1.25,duration:4};retimeExchange(action,4);assert.equal(action.elapsed,1.25);assert.equal(action.duration,4);assert.equal(advanceExchange(action,.05,false),1.25/4);
});

test('an exhausted bot can defend a telegraphed climax without inventing energy or free commands',()=>{
 const {b}=fixture();battleStep(b);b.control[1].energy=0;b.control[1].tacticAt=b.control[1].turns;assert.equal(botBattleCommand(b),null);assert.equal(b.control[1].tactic,'guard');assert.equal(b.control[1].energy,0);assert.equal(b.commands.length,0);assert.equal(b.pendingClimax.interrupted,false);
});
