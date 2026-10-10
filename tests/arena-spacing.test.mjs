import test from 'node:test';
import assert from 'node:assert/strict';
import {planApproach,approachPoint,avoidCrowding,packLabels} from '../dist/arena-motion.mjs';
import {cameraGoal,CameraRig,ShotDirector,occlusionScore} from '../dist/camera-rig.mjs';
const actor=(id,x,z,radius=.65)=>({id,x,z,radius,alive:true});
const gap=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
test('repeated approaches to one target select distinct free sides, including a large fighter',()=>{
 const target=actor('target',0,0),fighters=[target],original=structuredClone(target);
 for(let i=0;i<5;i++){
  const a=actor('attacker'+i,-6,i*.08,i===0?1.25:.65),before=structuredClone(fighters),route=planApproach(a,target,fighters);
  assert.deepEqual(fighters,before);assert.deepEqual(target,original);
  assert.ok(gap(route,target)>=a.radius+target.radius+.34);
  for(const other of fighters.filter(o=>o!==target))assert.ok(gap(route,other)>=a.radius+other.radius+.29,'must avoid previously occupied contact spots');
  fighters.push({...a,x:route.x,z:route.z});
 }
});
test('curved approach avoids a bystander on the straight path and lands at its reserved point',()=>{
 const a=actor('a',-6,0),t=actor('t',2,0),b=actor('b',-2,0),route=planApproach(a,t,[a,t,b]);
 assert.notEqual(route.arc,0);
 let min=Infinity;
 for(let i=0;i<=100;i++){const [x,z]=approachPoint([a.x,a.z],[route.x,route.z],i/100,route);min=Math.min(min,Math.hypot(x-b.x,z-b.z));assert.ok(Math.abs(x)<=7.7&&Math.abs(z)<=4.7);}
 assert.ok(min>1.3);assert.deepEqual(approachPoint([a.x,a.z],[route.x,route.z],1,route),[route.x,route.z]);
});
test('dense overlapping fighters spread in both axes with bounded speed and frame-order independence',()=>{
 let actors=Array.from({length:10},(_,i)=>actor('hero'+i,0,0));
 for(let frame=0;frame<480;frame++){
  const snapshot=structuredClone(actors);
  actors=actors.map(a=>{const p=avoidCrowding([a.x,a.z],snapshot,a.id,1/60,a.radius),q=avoidCrowding([a.x,a.z],[...snapshot].reverse(),a.id,1/60,a.radius);assert.ok(Math.hypot(p[0]-a.x,p[1]-a.z)<=1.7/60+1e-8);assert.ok(Math.hypot(p[0]-q[0],p[1]-q[1])<1e-8);return {...a,x:p[0],z:p[1]};});
 }
 for(let i=0;i<actors.length;i++)for(let j=i+1;j<actors.length;j++)assert.ok(gap(actors[i],actors[j])>1.58);
 assert.ok(Math.max(...actors.map(a=>a.z))-Math.min(...actors.map(a=>a.z))>2);
 const still=actors[0];assert.deepEqual(avoidCrowding([still.x,still.z],[actor('b',still.x,still.z)],still.id,0),[still.x,still.z]);
});
test('edge approaches stay inside arena and ignore eliminated fighters',()=>{
 for(const x of [-7.7,7.7])for(const z of [-4.7,4.7]){
  const a=actor('a',0,0,1.2),t=actor('t',x,z,1.2),route=planApproach(a,t,[a,t]);assert.ok(Math.abs(route.x)<=7.7&&Math.abs(route.z)<=4.7);assert.ok(gap(route,t)>2.7);
  assert.deepEqual(route,planApproach(a,t,[a,t,{...actor('dead',route.x,route.z),alive:false}]));
 }
});
test('manual diagonal and overhead choices survive the final duel and transition without cuts',()=>{
 const rig=new CameraRig();rig.update(cameraGoal('follow',1.8),0);
 for(const mode of ['diagonal','overhead'])for(const aspect of [.35,.6,1,1.8,2.4]){
  const goal=cameraGoal(mode,aspect),duel=cameraGoal(mode,aspect,null,{duel:{center:[2,1,-3],span:7},time:2});assert.deepEqual(goal,duel);assert.ok([...goal.position,...goal.look].every(Number.isFinite));assert.ok(goal.position[2]>0);
  const before=[...rig.position],next=rig.update(goal,1/60);assert.ok(Math.hypot(...next.position.map((x,i)=>x-before[i]))<=.100001);
 }
 assert.ok(cameraGoal('diagonal',1.8).position[0]<0);assert.ok(cameraGoal('overhead',1.8).position[1]>20);
});
test('director reduces screen occlusion and holds a shot through alternating attack layouts',()=>{
 const fighters=Array.from({length:5},(_,i)=>({...actor('a'+i,0,i*1.8-3.6),height:2.5})),director=new ShotDirector();
 const shot=director.update(fighters,0);assert.notEqual(shot,'front');
 const original=cameraGoal('follow',1.8,null,{composition:'front'}),chosen=cameraGoal('follow',1.8,null,{composition:shot});assert.ok(occlusionScore(fighters,chosen.position)<occlusionScore(fighters,original.position));
 for(let t=0;t<8;t+=.05)assert.equal(director.update(fighters.map(f=>({...f,x:f.z,z:0})),t),shot);
 const reduced=cameraGoal('follow',1.8,null,{composition:shot,reduced:true});assert.deepEqual(reduced,cameraGoal('follow',1.8,null,{reduced:true}));
});
test('ten dense labels use horizontal lanes and stay within the stage',()=>{
 const items=Array.from({length:10},(_,i)=>({id:String(i),x:268,y:290+i,width:80,height:38})),before=structuredClone(items),placed=packLabels(items,{width:537,height:700});assert.deepEqual(items,before);
 for(let i=0;i<placed.length;i++)for(let j=i+1;j<placed.length;j++)assert.ok(Math.abs(placed[i].x-placed[j].x)>=84||Math.abs(placed[i].y-placed[j].y)>=43);
 assert.ok(placed.every(p=>p.x>=48&&p.x<=489&&p.y<=700*.66));
});
