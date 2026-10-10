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
