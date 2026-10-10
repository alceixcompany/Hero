import test from 'node:test';
import assert from 'node:assert/strict';
import {CameraRig,cameraGoal} from '../dist/camera-rig.mjs';
import {advanceExchange,retimeExchange} from '../dist/arena-motion.mjs';
import {createBattle,newGame,upcomingTurns} from '../dist/engine.mjs';
const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
test('rapidly alternating shots have bounded camera and look movement, with no per-attack zoom',()=>{
 const rig=new CameraRig(),dt=1/60;let previous=rig.update(cameraGoal('follow',1.8),dt);
 for(let frame=0;frame<600;frame++){
  const focus=frame%2?[9,1.2,5]:[-9,1.2,-5],goal=cameraGoal('follow',1.8,focus),next=rig.update(goal,dt);
  assert.equal(goal.position[2],18.2);assert.equal(goal.position[1],10);
  assert.ok(distance(next.position,previous.position)<=6*dt+1e-10);
  assert.ok(distance(next.look,previous.look)<=1.2*dt+1e-10);
  previous={position:[...next.position],look:[...next.look]};
 }
});
test('camera smoothing gives the same shot across frame rates and transitions between view modes without cuts',()=>{
 const run=fps=>{const rig=new CameraRig();rig.update(cameraGoal('follow',1.8),0);for(let i=0;i<fps*3;i++)rig.update(cameraGoal('follow',1.8,[5,1.2,4]),1/fps);return rig;};
 const a=run(30),b=run(120);assert.ok(distance(a.position,b.position)<.001);assert.ok(distance(a.look,b.look)<.001);
 const before=[...a.position];a.update(cameraGoal('close',.6),1/60);assert.ok(distance(before,a.position)<=.1+1e-9);
 for(const aspect of [.35,.6,.99,1.25,1.8,2.4])for(const mode of ['follow','wide','close']){
  const shot=cameraGoal(mode,aspect,[100,1,-100]);assert.ok([...shot.position,...shot.look].every(Number.isFinite));assert.ok(Math.abs(shot.look[0])<=.6&&Math.abs(shot.look[2]+.4)<=.6);
 }
});
test('pause freezes the attack, manual steps finish, and speed changes preserve attack phase',()=>{
 const action={elapsed:.6,duration:1.65,finishWhilePaused:false};const p=advanceExchange(action,.016,false);for(let i=0;i<120;i++)assert.equal(advanceExchange(action,.016,false),p);
 retimeExchange(action,4);assert.equal(action.duration,1.65/4);assert.ok(Math.abs(action.elapsed/action.duration-p)<1e-9);
 assert.ok(advanceExchange(action,.016,true)>p);
 const manual={elapsed:0,duration:1.65,finishWhilePaused:true};for(let i=0;i<120;i++)advanceExchange(manual,1/60,false);assert.equal(advanceExchange(manual,0,false),1);
 const resumed={elapsed:0,duration:1.65,finishWhilePaused:false};assert.ok(advanceExchange(resumed,300,true)<.04);
});
test('upcoming actions use only the actual living queue and do not consume randomness or reorder combat',()=>{
 const g=newGame();g.players[0].team=['ironman','thor'];g.players[1].team=['wanda'];const b=createBattle(g,()=>{throw Error('preview must not draw randomness');});
 const [ironman,thor,wanda]=b.fighters.flat();thor.hp=0;ironman.actions=2;b.queue=[thor,ironman,wanda];
 assert.deepEqual(upcomingTurns(b),[{id:'ironman',side:0,special:true},{id:'wanda',side:1,special:false}]);assert.deepEqual(b.queue,[thor,ironman,wanda]);b.done=true;assert.deepEqual(upcomingTurns(b),[]);
});

test('cinematic orbit remains on the same side and has continuous targets without per-hit zoom',()=>{
 for(const aspect of [.55,1,1.8])for(const mode of ['follow','orbit']){
  const rig=new CameraRig();let before;
  for(let i=0;i<2400;i++){
   const goal=cameraGoal(mode,aspect,i%120<60?[6,2,3]:[-6,2,-3],{time:i/60});
   assert.ok(goal.position[2]>0,'camera must not cross the fighting axis');
   const next=rig.update(goal,1/60);if(before){assert.ok(distance(next.position,before.position)<=.100001);assert.ok(distance(next.look,before.look)<=.020001);}
   before={position:[...next.position],look:[...next.look]};
  }
  assert.deepEqual(cameraGoal(mode,aspect,null,{time:4,reduced:true}),cameraGoal(mode,aspect,null,{time:40,reduced:true}));
 }
});
