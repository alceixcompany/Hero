import test from 'node:test';import assert from 'node:assert/strict';
import {newGame,createBattle,battleStep,battleCommand,hero} from '../dist/engine.mjs';
import {metrics,grantShield,absorbShield,battleHighlights} from '../dist/battle-highlights.mjs';
import {defaultPlan} from '../dist/strategy.mjs';
const setup=(teams,strategy=false)=>{const g=newGame();g.luck=0;g.players.forEach((p,i)=>p.team=teams[i]);if(strategy)g.plans=teams.map(t=>defaultPlan(t,hero));const b=createBattle(g,()=>.5);b.round=1;return {g,b};};
const strike=(b,f)=>{b.queue=[f];return battleStep(b);};
test('area finishing hit records actual HP loss, collateral KOs and only one final strike',()=>{
 const {b}=setup([['thor'],['widow','rocket']]);const [thor,widow,rocket]=b.fighters.flat();widow.hp=1;rocket.hp=2;thor.actions=2;
 const e=strike(b,thor);assert.equal(b.done,true);assert.equal(e.finisher,true);assert.equal(e.hits.reduce((n,h)=>n+h.damage,0),3);assert.equal(thor.metrics.damage,3);assert.equal(thor.metrics.knockouts,2);assert.deepEqual(e.defeated,['widow','rocket']);assert.equal(battleStep(b),null);
 const h=battleHighlights(b);assert.equal(h.damage.id,'thor');assert.equal(h.turning,e);assert.equal(h.protection,null);
});
test('an intermediate KO and a forty-round decision do not trigger finishing slow motion',()=>{
 const {b}=setup([['ironman'],['widow','hulk']]);const [ironman,widow]=b.fighters.flat();widow.hp=1;let e=strike(b,ironman);assert.equal(e.finisher,false);assert.equal(b.done,false);
 b.round=40;e=strike(b,ironman);assert.equal(b.decision,true);assert.equal(e.finisher,false);
});
test('team shields credit their creator only when consumed, while player barriers have no hero attribution',()=>{
 const {b}=setup([['captain','strange'],['rocket']]);const [captain,strange,rocket]=b.fighters.flat();captain.actions=2;strike(b,captain);
 assert.equal(strange.shield,15);assert.equal(captain.metrics.protection,0);
 b.control[1].focus='strange';const hit=strike(b,rocket);assert.equal(hit.absorbed,15);assert.equal(captain.metrics.protection,15);assert.equal(strange.metrics.protection,0);
 b.control[0].energy=100;b.control[0].commandAt=-10;assert.ok(battleCommand(b,0,'barrier'));strike(b,rocket);assert.equal(captain.metrics.protection,15);
 assert.equal(battleHighlights(b).protection.id,'captain');
});
test('adjacent guard contribution is tracked without counting damage beyond remaining health',()=>{
 const {b}=setup([['ironman'],['captain','strange']],true);const [ironman,captain,strange]=b.fighters.flat();captain.slot=0;captain.role='protect';strange.slot=1;strange.hp=2;captain.hp=3;b.control[0].focus='strange';
 const before=captain.hp+strange.hp,e=strike(b,ironman);assert.equal(e.guard.id,'captain');assert.equal(ironman.metrics.damage,before-captain.hp-strange.hp);assert.ok(captain.metrics.protection>0);assert.equal(e.finisher,true);
});
test('mixed shield sources persist and old battle shields remain unattributed',()=>{
 const {b}=setup([['captain','strange'],['rocket']]);const [captain,strange]=b.fighters.flat();strange.shield=5;grantShield(strange,15,captain.id);grantShield(strange,22);const restored=JSON.parse(JSON.stringify(b));const s=restored.fighters[0][1],c=restored.fighters[0][0];
 assert.equal(absorbShield(restored,s,30),30);assert.equal(c.metrics.protection,15);assert.equal(s.shield,12);assert.deepEqual(s.shieldSources,[{id:null,amount:12}]);
 assert.equal(absorbShield(restored,s,50),12);assert.equal(c.metrics.protection,15);assert.deepEqual(s.shieldSources,[]);
 delete c.metrics;assert.equal(metrics(c).damage,0);
});
test('battle highlights never consume randomness, prefer decisive KOs and survive a JSON roundtrip',()=>{
 const {b}=setup([['thor'],['widow','rocket']]);const [thor,widow]=b.fighters.flat();widow.hp=1;strike(b,thor);while(!b.done)battleStep(b);
 b.rng=()=>{throw Error('results must not consume RNG');};const summary=battleHighlights(b),restored=JSON.parse(JSON.stringify(b));assert.deepEqual(battleHighlights(restored),JSON.parse(JSON.stringify(summary)));assert.equal(summary.turning.defeated.length,1);assert.ok(summary.damage.damage>0);
});
test('turning point ranks winner eliminations first, then actual damage, without favoring a losing-side spectacle',()=>{
 const {b}=setup([['thor'],['widow','rocket']]);b.winner=0;
 const event=(side,damage,defeated)=>({side,hits:[{damage}],defeated});const two=event(0,10,['widow','rocket']),one=event(0,900,['widow']),loss=event(1,2000,['thor','captain','strange']);b.events=[one,two,loss];assert.equal(battleHighlights(b).turning,two);
 const tie=event(0,11,['widow','rocket']);b.events.push(tie);assert.equal(battleHighlights(b).turning,tie);
});
