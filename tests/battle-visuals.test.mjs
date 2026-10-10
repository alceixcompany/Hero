import test from 'node:test';import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {climaxEffects} from '../dist/climax-effects.mjs';
import {createBattleWear} from '../dist/character-wear.mjs';
import {loadCharacter} from '../dist/character-models.mjs';
import {GLTFLoader} from '../dist/vendor/addons/loaders/GLTFLoader.js';
import {readFile} from 'node:fs/promises';
globalThis.ProgressEvent??=class{constructor(type,props){this.type=type;Object.assign(this,props);}};
const getAsset=async name=>{const b=await readFile(new URL('../dist/assets/characters/'+name+'.glb',import.meta.url));return new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');};
test('armor damage persists through healing, respects pause/reduced motion and stops emitting on death',()=>{
 const rig=new THREE.Group(),wear=createBattleWear({id:'ironman',rig,phase:0},new THREE.Texture());wear.update({dt:.1,active:true,ratio:.2,dead:false});
 const scar=wear.root.children.find(n=>n.isMesh),spark=wear.root.children.find(n=>n.isLine),opacity=scar.material.opacity,pos=spark.position.clone();assert.ok(opacity>0&&spark.visible);
 for(let i=0;i<100;i++)wear.update({dt:.05,active:false,ratio:1,dead:false});assert.equal(scar.material.opacity,opacity);assert.ok(spark.position.equals(pos));assert.equal(spark.visible,false);
 wear.update({dt:.01,active:true,ratio:.2,dead:false,reduced:true});assert.equal(spark.visible,false);wear.update({dt:.01,active:true,ratio:0,dead:true});assert.equal(spark.visible,false);assert.equal(scar.material.opacity,opacity);wear.reset();wear.update({dt:0,active:false,ratio:1,dead:false});assert.equal(scar.material.opacity,0);wear.dispose();assert.equal(rig.children.length,0);
});
test('climax visuals are bounded, finite, reduced-motion aware and clean up every preparation/release cycle',()=>{
 for(const kind of ['storm','arsenal','chaos'])for(const reduced of [false,true]){
  const env=new THREE.Group(),fx=climaxEffects(env,{kind,color:'#aabbff',glow:new THREE.Texture(),reduced}),size=fx.root.children.length;assert.ok(size<=26);
  for(const phase of ['charge','release'])for(let i=0;i<=100;i++){fx.update({phase,p:i/100,clock:4,attacker:new THREE.Vector3(-2,0,0),target:new THREE.Vector3(2,0,-3),cancelled:false});assert.equal(fx.root.children.length,size);fx.root.traverse(n=>{assert.ok([...n.position.toArray(),...n.rotation.toArray().slice(0,3),...n.scale.toArray()].every(Number.isFinite));if(n.material)assert.ok(n.material.opacity>=0&&n.material.opacity<=1);});}
  fx.update({phase:'charge',p:.7,clock:4,attacker:new THREE.Vector3(),target:new THREE.Vector3(2,0,0),cancelled:true});assert.ok(fx.root.children.filter(n=>n.isLine).every(n=>n.material.opacity<.1));fx.dispose();assert.equal(env.children.length,0);
 }
});
test('wounded skeletons blend blocks, counters and held climax poses without rotation accumulation or revived corpses',async()=>{
 for(const id of ['hulk','spiderman','ironman','thor','wanda']){
  const model=await loadCharacter(id,{getAsset});
  const event=['hulk','spiderman'].includes(id)?{sequence:{contact:.72},dodge:true}:{type:'charge'};
  for(const role of ['attacker','target'])for(const p of [.1,.3,.45,.6,.8,1])for(let i=0;i<5;i++){model.update({dt:1/60,event,role,progress:p,health:.2});model.object.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(model.object);assert.ok([...box.min.toArray(),...box.max.toArray()].every(Number.isFinite));assert.ok(box.max.y-box.min.y<6);}
  for(let i=0;i<120;i++)model.update({dt:1/60,playing:false,event,role:'attacker',progress:.45,health:.2});const pose=model.bones.get('spine_03').quaternion.clone();for(let i=0;i<300;i++)model.update({dt:1/60,playing:false,event,role:'attacker',progress:.45,health:.2});assert.ok(model.bones.get('spine_03').quaternion.angleTo(pose)<.00001);
  for(let i=0;i<200;i++)model.update({dt:1/60,dead:true,event,role:'attacker',progress:1,health:0});model.object.updateMatrixWorld(true);assert.ok(model.bones.get('Head').getWorldPosition(new THREE.Vector3()).y<.5);model.dispose();
 }
});
