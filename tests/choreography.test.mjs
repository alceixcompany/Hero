import test from 'node:test';import assert from 'node:assert/strict';
import {exchangeMotion,avoidCrowding} from '../dist/arena-motion.mjs';
test('attackers approach, plant at contact, and return continuously without teleporting',()=>{
 for(const options of [{},{flight:true},{ranged:true,flight:true},{id:'spiderman'},{id:'hulk',special:true}]){
  assert.equal(exchangeMotion(0,options).travel,0);assert.equal(exchangeMotion(1,options).travel,0);
  let before=exchangeMotion(0,options);
  for(let i=1;i<=1000;i++){
   const motion=exchangeMotion(i/1000,options);assert.ok(Object.values(motion).every(Number.isFinite));assert.ok(motion.travel>=0&&motion.travel<=1);
   assert.ok(Math.abs(motion.travel-before.travel)<.006);assert.ok(Math.abs(motion.lift-before.lift)<.03);before=motion;
  }
  assert.equal(exchangeMotion(.48,options).travel,options.ranged?0:1);assert.equal(exchangeMotion(.3,options).recoil,0);
 }
 assert.equal(exchangeMotion(.3,{id:'spiderman',reduced:true}).lift,0);
});
test('idle separation ignores corpses, handles coincident fighters, and respects stage bounds',()=>{
 assert.deepEqual(avoidCrowding([1,1],[{id:'dead',x:1,z:1,alive:false}],'alive'),[1,1]);
 const p=avoidCrowding([1,1],[{id:'b',x:1,z:1,alive:true}],'a');assert.ok(p.every(Number.isFinite));assert.ok(Math.hypot(p[0]-1,p[1]-1)>0);
 const edge=avoidCrowding([8,5],[{id:'b',x:8,z:5,alive:true}],'a');assert.ok(Math.abs(edge[0])<=7.7&&Math.abs(edge[1])<=4.7);
});

import {cinematicProgress,exchangeDuration,encounterFor} from '../dist/combat-choreography.mjs';
import {advanceExchange,retimeExchange} from '../dist/arena-motion.mjs';
import {HEROES,hero} from '../dist/engine.mjs';
test('hero encounters stay distinct and aerial dives meet the target before returning continuously',()=>{
 assert.equal(encounterFor(hero('strange')),'magic');assert.equal(encounterFor(hero('ironman')),'aerial');assert.equal(encounterFor(hero('gamora')),'blade');assert.equal(encounterFor(hero('hulk')),'brawl');assert.equal(encounterFor(hero('rocket')),'ranged');
 for(const h of HEROES){const options={encounter:encounterFor(h),flight:h.flight,ranged:h.combat==='ranged',id:h.id};let before=exchangeMotion(0,options);for(let i=1;i<=1000;i++){const m=exchangeMotion(i/1000,options);assert.ok(Object.values(m).every(Number.isFinite));assert.ok(Math.abs(m.lift-before.lift)<.05);assert.ok(Math.abs(m.travel-before.travel)<.006);before=m;}
  assert.equal(exchangeMotion(1,options).travel,0);if(options.encounter==='aerial'){assert.equal(exchangeMotion(.48,options).travel,1);assert.ok(exchangeMotion(.3,options).lift>1);}
 }
});
test('finishing time is monotone and smooth, slows contact, preserves phase on speed changes and respects pause/reduced motion',()=>{
 let before=0;for(let i=0;i<=10000;i++){const p=cinematicProgress(i/10000);assert.ok(p>=before&&p<=1);assert.ok(p-before<.0003);before=p;}
 assert.equal(cinematicProgress(0),0);assert.equal(cinematicProgress(1),1);
 const slope=x=>(cinematicProgress(x+.00001)-cinematicProgress(x-.00001))/.00002;
 assert.ok(slope(.5)<slope(.1)*.5);for(const x of [.28,.68])assert.ok(Math.abs(slope(x-.0001)-slope(x+.0001))<.01);
 const action={event:{finisher:true},elapsed:1.5,duration:exchangeDuration(1,false,true),finishWhilePaused:false};
 const p=advanceExchange(action,0,false);assert.equal(advanceExchange(action,.05,false),p);retimeExchange(action,4);assert.equal(action.duration,1.65);assert.ok(Math.abs(advanceExchange(action,0,false)-p)<1e-10);
 action.finishWhilePaused=true;for(let i=0;i<150;i++)advanceExchange(action,.016,false);assert.equal(advanceExchange(action,0,false),1);
 assert.equal(exchangeDuration(4,true,true),.25);
});
test('a grounded melee fighter rises to an airborne target at contact and returns to the floor',()=>{
 for(const reduced of [false,true]){const options={encounter:'brawl',targetLift:1.8,reduced};assert.equal(exchangeMotion(0,options).lift,0);assert.equal(exchangeMotion(.48,options).lift,1.8);assert.equal(exchangeMotion(1,options).lift,0);let before=0;for(let i=0;i<=1000;i++){const lift=exchangeMotion(i/1000,options).lift;assert.ok(Math.abs(lift-before)<.04);before=lift;}}
});
