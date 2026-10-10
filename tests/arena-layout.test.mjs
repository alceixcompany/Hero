import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {ARENA_BOUNDS,ARENA_FLOOR,clampArena} from '../dist/arena-layout.mjs';
import {positionFor} from '../dist/strategy.mjs';
import {cameraGoal} from '../dist/camera-rig.mjs';
import {avoidCrowding,planApproach} from '../dist/arena-motion.mjs';
test('ten heroes have more starting room and keep their feet at platform height',()=>{
 const positions=[0,1].flatMap(side=>[0,1,3,4,5].map(slot=>positionFor(slot,side)));
 for(const [x,y,z] of positions){assert.ok(Math.abs(x)+1.3<ARENA_FLOOR.width/2);assert.ok(Math.abs(z)+1.3<ARENA_FLOOR.depth/2);assert.ok(Math.abs(x)<ARENA_BOUNDS.x&&Math.abs(z)<ARENA_BOUNDS.z);assert.ok(y===0||y===.65);}
 assert.equal(positionFor(5,0)[2]-positionFor(4,0)[2],4);
 assert.equal(positionFor(3,1)[0]-positionFor(0,1)[0],3.75);
});
test('heroes can actually use the added floor instead of hitting the old invisible boundary',()=>{
 assert.deepEqual(avoidCrowding([9,5.5],[],'a'),[9,5.5]);
 const a={id:'a',x:9,z:5.5,radius:.65,alive:true},t={id:'t',x:8,z:5,radius:.65,alive:true},route=planApproach(a,t,[a,t]);
 assert.ok(route.x>7.7||route.z>4.7);assert.ok(Math.abs(route.x)<=ARENA_BOUNDS.x&&Math.abs(route.z)<=ARENA_BOUNDS.z);
 assert.deepEqual(clampArena(100,-100),[ARENA_BOUNDS.x,-ARENA_BOUNDS.z]);
});
test('expanded floor and tall hero bodies fit wide and overhead views on narrow and desktop screens',()=>{
 for(const aspect of [.35,.6,1,1.25,1.8,2.4])for(const mode of ['wide','overhead']){
  const goal=cameraGoal(mode,aspect),camera=new THREE.PerspectiveCamera(40,aspect,.1,150);camera.position.fromArray(goal.position);camera.lookAt(new THREE.Vector3(...goal.look));camera.updateMatrixWorld();
  for(const x of [-ARENA_BOUNDS.x-.4,ARENA_BOUNDS.x+.4])for(const z of [-ARENA_BOUNDS.z,ARENA_BOUNDS.z])for(const y of [0,3.25]){
   const p=new THREE.Vector3(x,y,z).project(camera);assert.ok(Math.abs(p.x)<1&&Math.abs(p.y)<1&&p.z<1,`${mode} ${aspect}: hero outside frame`);
  }
 }
});
