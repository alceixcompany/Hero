import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {GLTFLoader} from '../dist/vendor/addons/loaders/GLTFLoader.js';
import {Box3,Vector3} from '../dist/vendor/three.module.js';
import {HEROES} from '../dist/engine.mjs';
import {CHARACTER_PROFILES} from '../dist/character-profiles.mjs';
import {loadCharacter} from '../dist/character-models.mjs';

globalThis.ProgressEvent??=class{constructor(type,props){this.type=type;Object.assign(this,props);}};
const assets=new Map();
const getAsset=name=>{
 if(!assets.has(name))assets.set(name,(async()=>{
  const bytes=await readFile(new URL('../dist/assets/characters/'+name+'.glb',import.meta.url));
  return new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 })());
 return assets.get(name);
};

test('every hero loads a complete independently animated skeleton with equipment and finite combat poses',async()=>{
 assert.deepEqual(Object.keys(CHARACTER_PROFILES).sort(),HEROES.map(h=>h.id).sort());
 const silhouettes=new Set();
 for(const h of HEROES){
  const model=await loadCharacter(h.id,{getAsset}),p=model.profile;silhouettes.add([p.base,p.height,p.width,p.gear].join('|'));
  assert.equal(model.bones.size,65,h.name);assert.ok(model.clipNames.includes(p.attack));
  let meshes=0;model.object.traverse(n=>{if(n.isSkinnedMesh){meshes++;assert.ok(n.geometry.getAttribute('skinWeight'));assert.ok(n.geometry.getAttribute('color'));assert.equal(n.skeleton.bones.length,65);}});assert.ok(meshes>=3,h.name);
  for(const role of ['attacker','target'])for(const progress of [.1,.35,.6,.9]){
   model.update({dt:.016,playing:true,event:{attacker:h.id,special:false,dodge:role==='target'},role,progress});model.object.updateMatrixWorld(true);
   const bounds=new Box3().setFromObject(model.object);assert.ok([...bounds.min.toArray(),...bounds.max.toArray()].every(Number.isFinite),h.name+' '+role+' '+progress);
   assert.ok(bounds.max.y-bounds.min.y<6,h.name+' distorted pose');
  }
  model.dispose();
 }
 assert.equal(silhouettes.size,30);
});

test('a preview cannot animate or dispose the independent skeleton of an arena fighter',async()=>{
 const a=await loadCharacter('thor',{getAsset}),b=await loadCharacter('thor',{getAsset});
 assert.notEqual(a.bones.get('Head'),b.bones.get('Head'));const before=b.bones.get('hand_r').quaternion.clone();
 a.update({dt:.1,event:{attacker:'thor'},role:'attacker',progress:.55});assert.ok(b.bones.get('hand_r').quaternion.equals(before));
 a.dispose();b.update({dt:.016,moving:.3});b.object.updateMatrixWorld(true);assert.ok(Number.isFinite(new Box3().setFromObject(b.object).max.y));b.dispose();
});

test('an eliminated hero stays in its death pose during subsequent attacks',async()=>{
 const model=await loadCharacter('ironman',{getAsset});
 for(let i=0;i<180;i++)model.update({dt:1/60,dead:true});
 const before=model.bones.get('pelvis').quaternion.clone();
 model.update({dt:1/60,dead:true,event:{attacker:'thor',special:true},progress:.1});
 assert.ok(model.bones.get('pelvis').quaternion.angleTo(before)<.001);
 for(let i=0;i<180;i++)model.update({dt:1/60,dead:false,moving:.5,event:{attacker:'thor'},role:'target',progress:.2});
 model.object.updateMatrixWorld(true);assert.ok(model.bones.get('Head').getWorldPosition(new Vector3()).y<.5,'late events cannot stand up a corpse');
 assert.ok(model.bones.get('pelvis').quaternion.angleTo(before)<.001);
 model.reset();for(let i=0;i<90;i++)model.update({dt:1/60});
 assert.ok(model.bones.get('pelvis').quaternion.angleTo(before)>.01);model.dispose();
});
test('all thirty skeletons stay grounded after hit, flight, pause and later attack animations',async()=>{
 for(const h of HEROES){
  const m=await loadCharacter(h.id,{getAsset});const fatal={attacker:'thor'};
  for(let i=0;i<30;i++)m.update({dt:1/60,event:fatal,role:'target',progress:i/60,flight:h.flight});
  for(let i=0;i<180;i++)m.update({dt:1/60,dead:true,event:fatal,role:'target',progress:.5+i/360,flight:h.flight});
  for(let hit=0;hit<3;hit++)for(let i=0;i<60;i++){
   m.update({dt:1/60,playing:hit!==1,dead:false,event:{},role:hit%2?'attacker':'target',progress:i/60,moving:.5,flight:h.flight});
   m.object.updateMatrixWorld(true);assert.ok(m.bones.get('Head').getWorldPosition(new Vector3()).y<.5,h.name+' must remain down');
  }m.dispose();
 }
});
test('flight posture does not accumulate joint rotation while idle or paused',async()=>{
 const m=await loadCharacter('ironman',{getAsset});m.update({dt:1/60,playing:false,flight:true});const first=m.bones.get('thigh_l').quaternion.clone();
 for(let i=0;i<600;i++)m.update({dt:1/60,playing:false,flight:true});assert.ok(m.bones.get('thigh_l').quaternion.angleTo(first)<.00001);
 for(let i=0;i<120;i++)m.update({dt:1/60,playing:false,flight:false});assert.ok(m.bones.get('thigh_l').quaternion.angleTo(first)<.2);m.dispose();
});

import {encounterFor} from '../dist/combat-choreography.mjs';
test('character exchanges, defensive poses and individual victories stay finite and never lift a corpse',async()=>{
 for(const h of HEROES){const m=await loadCharacter(h.id,{getAsset}),encounter=encounterFor(h),event={attacker:h.id,special:false,dodge:false};
  for(const role of ['attacker','target'])for(const progress of [.2,.33,.42,.48,.6,.9]){m.update({dt:.016,event,encounter,role,progress,flight:h.flight});m.object.updateMatrixWorld(true);const bounds=new Box3().setFromObject(m.object);assert.ok([...bounds.min.toArray(),...bounds.max.toArray()].every(Number.isFinite),h.name);assert.ok(bounds.max.y-bounds.min.y<6,h.name+' exchange pose');}
  for(let i=0;i<90;i++)m.update({dt:1/60,victory:true,victoryProgress:i/90,flight:h.flight});m.object.updateMatrixWorld(true);assert.ok(Number.isFinite(new Box3().setFromObject(m.object).max.y));
  for(let i=0;i<180;i++)m.update({dt:1/60,dead:true,victory:true,victoryProgress:1});m.object.updateMatrixWorld(true);assert.ok(m.bones.get('Head').getWorldPosition(new Vector3()).y<.5,h.name+' victory cannot revive a corpse');m.dispose();
 }
});
test('overlapping flight and victory overlays restore the original joints without accumulated rotation',async()=>{
 const m=await loadCharacter('thor',{getAsset});for(let i=0;i<120;i++)m.update({dt:1/60,playing:false,flight:true,victory:true,victoryProgress:1});const pose=m.bones.get('spine_03').quaternion.clone();
 for(let i=0;i<600;i++)m.update({dt:1/60,playing:false,flight:true,victory:true,victoryProgress:1});assert.ok(m.bones.get('spine_03').quaternion.angleTo(pose)<.00001);m.dispose();
});
