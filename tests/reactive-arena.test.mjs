import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {createTerrain,damageTerrain,coverAt,hasCover,duelState} from '../dist/battle-terrain.mjs';
import {newGame,createBattle,battleStep,hero,HEROES} from '../dist/engine.mjs';
import {signatureFor,signaturePose} from '../dist/hero-signatures.mjs';
import {EnvironmentReactions} from '../dist/environment-reactions.mjs';
import {CameraRig,cameraGoal} from '../dist/camera-rig.mjs';
function fixture(){const g=newGame();g.luck=0;g.players[0].team=['wanda'];g.players[1].team=['hulk'];g.plans=[[{id:'wanda',slot:1,role:'assault'}],[{id:'hulk',slot:0,role:'assault'}]];const b=createBattle(g,()=>.9);b.fighters.flat().forEach(f=>f.hp=f.maxHp=1000);return b;}
const attack=b=>{b.queue=[b.fighters[0][0]];return battleStep(b);};
test('cover breaks after the contact and only following ranged hits lose defense, without extra RNG',()=>{
 const intact=fixture(),broken=fixture();coverAt(broken,1,0).hp=0;
 const a=attack(intact),c=attack(broken);assert.ok(a.damage<c.damage);assert.ok(a.strategy.includes('Siper −%20'));
 coverAt(intact,1,0).hp=1;intact.fighters[0][0].actions=0;const breaker=attack(intact);assert.equal(breaker.damage,a.damage);assert.equal(coverAt(intact,1,0).hp,0);assert.equal(breaker.terrain[0].broken,true);
 intact.fighters[0][0].actions=0;assert.equal(attack(intact).damage,c.damage);assert.deepEqual(createTerrain(),fixture().terrain);
 let calls=0;const b=fixture();b.rng=()=>{calls++;return .9;};attack(b);const count=calls;calls=0;coverAt(b,1,0).hp=0;attack(b);assert.equal(calls,count);
});
test('cover damage includes shield/protector/area hits, never escapes bounds or grows back and old rooms are supported',()=>{
 const b=fixture(),e={attacker:'hulk',side:0,dodge:true,special:true,hits:[{id:'hulk',damage:200,absorbed:10}]};const old=structuredClone(b.terrain);assert.deepEqual(damageTerrain(b,e,hero),[]);assert.deepEqual(b.terrain,old);
 e.dodge=false;const changes=damageTerrain(b,e,hero);assert.equal(changes[0].before,72);assert.equal(changes[0].damage,72);assert.equal(changes[0].hp,0);assert.equal(hasCover(b,b.fighters[1][0]),false);assert.deepEqual(damageTerrain(b,e,hero),[]);
 delete b.terrain;assert.equal(hasCover(b,b.fighters[1][0]),true);e.hits[0]={id:'hulk',damage:0,absorbed:20};damageTerrain(b,e,hero);assert.equal(coverAt(b,1,0).hp,48);
 const copy=JSON.parse(JSON.stringify(b));assert.deepEqual(copy.terrain,b.terrain);assert.equal(hasCover(copy,copy.fighters[1][0]),true);
});
test('a broken attacking cover removes its attack restriction without gaining platform bonuses',()=>{
 const a=fixture(),b=fixture();for(const battle of [a,b]){battle.fighters[0][0].slot=0;battle.fighters[1][0].slot=1;}coverAt(b,0,0).hp=0;const open=fixture();open.fighters[0][0].slot=0;open.fighters[1][0].slot=1;open.strategy=false;
 assert.ok(attack(a).damage<attack(b).damage);const expected=attack(open).damage;
 b.fighters[0][0].actions=0;const hit=attack(b);assert.equal(hit.damage,Math.round(expected*1.08));
});
test('duel requires one living hero per team and never reopens a completed match',()=>{
 const b=fixture();assert.deepEqual(duelState(b),{ids:['wanda','hulk']});b.fighters[0].push({...b.fighters[0][0],id:'thor'});assert.equal(duelState(b),null);b.fighters[0][1].hp=0;assert.ok(duelState(b));b.done=true;assert.equal(duelState(b),null);b.done=false;b.fighters[1][0].hp=0;assert.equal(duelState(b),null);b.fighters[1][0].displayHp=1;assert.ok(duelState(b,f=>f.displayHp??f.hp),'visual contact must determine duel timing');
});
test('duel camera is stable between attacks, smoothly bounded and honors wide/reduced settings',()=>{
 const duel={center:[0,1.5,-3.2],span:5.2},rig=new CameraRig();rig.update(cameraGoal('follow',1.8),0);
 for(const aspect of [.6,1.8]){const a=cameraGoal('follow',aspect,[-5,1,3],{duel,time:1}),b=cameraGoal('follow',aspect,[5,1,-3],{duel,time:50});assert.deepEqual(a,b);assert.ok(a.position[2]>a.look[2]);if(aspect===1.8)assert.ok(a.position[2]<18.2);}
 let before=[...rig.position];for(let i=0;i<180;i++){const next=rig.update(cameraGoal('follow',1.8,null,{duel}),1/60);assert.ok(Math.hypot(...next.position.map((v,j)=>v-before[j]))<=.100001);before=[...next.position];}
 for(const opts of [{reduced:true},{}])assert.deepEqual(cameraGoal('wide',1.8,null,{...opts,duel}),cameraGoal('wide',1.8,null,opts));assert.deepEqual(cameraGoal('follow',1.8,null,{duel,reduced:true}),cameraGoal('follow',1.8,null,{reduced:true}));
});
test('all thirty heroes have bounded individual poses and heavy/agile/mystic cadences differ',()=>{
 assert.equal(signatureFor('hulk').family,'heavy');assert.equal(signatureFor('spiderman').family,'agile');assert.equal(signatureFor('wanda').family,'mystic');assert.ok(signatureFor('hulk').cadence<signatureFor('wanda').cadence&&signatureFor('wanda').cadence<signatureFor('spiderman').cadence);
 for(const h of HEROES)for(let i=0;i<=100;i++)for(const special of [true,false]){const pose=signaturePose(h.id,{time:i/20,progress:i/100,role:'attacker',special});assert.ok(pose.length);assert.ok(pose.every(([bone,axis,n])=>typeof bone==='string'&&['x','y','z'].includes(axis)&&Number.isFinite(n)&&Math.abs(n)<2.1));}
 assert.notDeepEqual(signaturePose('hulk',{role:'attacker',progress:.2,special:true}),signaturePose('wanda',{role:'attacker',progress:.2,special:true}));
});
test('environment waits for visual contact, restores persistent destruction, freezes paused FX and caps allocations',()=>{
 const env=new THREE.Group(),intact=new THREE.Group(),props=new Map([['cover',{side:1,slot:0,intact,parent:env,x:1.75,z:-3.2}]]);env.add(intact);const fx=new EnvironmentReactions(env,{props,glow:new THREE.Texture(),map:'city'}),b=fixture();const e={attacker:'hulk',target:'hulk',side:0,round:1,special:true,terrain:[{side:1,slot:0,before:72,hp:0,broken:true}]};b.events.push(e);coverAt(b,1,0).hp=0;
 fx.sync(b,e);assert.equal(intact.visible,true);fx.impact(e,b,new THREE.Vector3(2.6,0,-3.2));assert.equal(intact.visible,false);assert.equal(fx.marks.children.length,1);assert.equal(props.get('cover').rubble.visible,true);const t=fx.time;fx.update(.1,false);assert.equal(fx.time,t);fx.impact(e,b,new THREE.Vector3());assert.equal(fx.bursts.length,1);
 for(let i=0;i<30;i++){const next={...e,round:i+2};b.events.push(next);fx.impact(next,b,new THREE.Vector3());}assert.equal(fx.marks.children.length,14);assert.equal(fx.bursts.length,4);fx.update(2,true);assert.equal(fx.bursts.length,0);
 for(let i=0;i<20;i++)b.events.push({...e,attacker:'winter',special:false,terrain:[]});const restored=JSON.parse(JSON.stringify(b));fx.sync(restored,null,true);assert.equal(intact.visible,false);assert.equal(fx.marks.children.length,14);assert.equal(fx.bursts.length,0);fx.sync(fixture());assert.equal(intact.visible,true);assert.equal(props.get('cover').rubble.visible,false);assert.equal(fx.marks.children.length,0);fx.dispose();
});

test('lightning and dust freeze while paused and reduced motion avoids flash/particles',()=>{
 const b=fixture(),e={attacker:'thor',target:'hulk',side:0,round:1,special:true,terrain:[]};b.events.push(e);
 for(const reduced of [false,true]){const env=new THREE.Group(),fx=new EnvironmentReactions(env,{props:new Map(),glow:new THREE.Texture(),map:'asgard',reduced});fx.sync(b,e);fx.impact(e,b,new THREE.Vector3());const energy=fx.flashEnergy;fx.update(.1,false);assert.equal(fx.flashEnergy,energy);if(reduced){assert.equal(fx.bursts.length,0);assert.equal(energy,0);}else{assert.equal(fx.bursts[0].bolts.length,3);assert.equal(energy,5);fx.update(.1,true);assert.ok(fx.flashEnergy<5);}fx.dispose();}
});

test('missed polling frames catch up permanent cracks without replaying old particles',()=>{
 const b=fixture(),fx=new EnvironmentReactions(new THREE.Group(),{props:new Map(),glow:new THREE.Texture(),map:'city'});fx.sync(b);
 const first={attacker:'hulk',target:'hulk',side:0,round:1,special:true,terrain:[]},pending={...first,attacker:'wanda',special:false};b.events.push(first,pending);fx.sync(b,pending);assert.equal(fx.marks.children.length,1);assert.equal(fx.bursts.length,0);fx.sync(b,pending);assert.equal(fx.marks.children.length,1);fx.dispose();
});
