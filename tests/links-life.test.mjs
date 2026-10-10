import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,createBattle,battleStep,linkStatus,battleCommand,TEAM_LINKS,teamLinks} from '../dist/engine.mjs';
import {syncFighterLife,shouldFall} from '../dist/fighter-life.mjs';

function fixture(ids=['captain','winter']){const g=newGame();g.luck=0;g.players[0].team=ids;g.players[1].team=['hulk','panther'];const b=createBattle(g,()=>.9);b.fighters[1].forEach(f=>{f.hp=f.maxHp=600;});return b;}
const attack=(b,index=0)=>{b.queue=[b.fighters[0][index]];return battleStep(b);};
test('four shared attacks trigger exactly one combo and spend its charge',()=>{
 const b=fixture(),base=fixture();base.links=[[],[]];
 for(let i=0;i<3;i++){assert.equal(attack(b,i%2).combo,null);attack(base,i%2);assert.equal(linkStatus(b,0)[0].charge,i+1);}
 const e=attack(b,1),ordinary=attack(base,1);assert.equal(e.combo.id,'old-friends');assert.equal(e.combo.partner,'captain');assert.equal(e.damage-ordinary.damage,16);
 assert.ok(b.fighters[0].every(f=>f.shield===12));assert.equal(linkStatus(b,0)[0].charge,0);assert.equal(linkStatus(b,0)[0].uses,1);assert.equal(attack(b).combo,null);
});
test('all seven pair skills affect real combat with capped shields and weaken/splash effects',()=>{
 for(const link of TEAM_LINKS){const b=fixture(link.members);b.links[0][0].charge=3;b.fighters[0].forEach(f=>f.shield=58);const before=b.fighters[1].map(f=>f.hp);const e=attack(b);assert.equal(e.combo.id,link.id);assert.equal(e.combo.bonus,link.effect.damage);
  if(link.effect.shield)assert.ok(b.fighters[0].every(f=>f.shield===60));
  if(link.effect.weaken)assert.equal(b.fighters[1].find(f=>f.id===e.target).weaken,true);
  if(link.effect.splash){const other=b.fighters[1].findIndex(f=>f.id!==e.target);assert.equal(before[other]-b.fighters[1][other].hp,link.effect.splash);}
 }
});
test('opposing teams never form a pair; an eliminated partner stops charging and cannot be revived',()=>{
 assert.equal(teamLinks(['captain']).length,0);const g=newGame();g.players[0].team=['wanda'];g.players[1].team=['vision'];assert.deepEqual(createBattle(g).links,[[],[]]);
 const b=fixture();b.links[0][0].charge=3;b.fighters[0][1].hp=0;const e=attack(b);assert.equal(e.combo,null);assert.equal(linkStatus(b,0)[0].active,false);assert.equal(b.links[0][0].charge,3);b.control[0].energy=100;b.fighters[0][0].hp-=20;battleCommand(b,0,'rally');assert.equal(b.fighters[0][1].hp,0);
});
test('a dodged combo preserves full charge; simultaneous links trigger at most one per attack',()=>{
 const b=fixture(['ironman','spiderman','warmachine']);b.links[0].forEach(l=>l.charge=3);let draws=0;b.rng=()=>[++draws===3?0:.9][0];const missed=attack(b);assert.equal(missed.dodge,true);assert.equal(missed.combo,null);assert.ok(b.links[0].every(l=>l.charge===4));
 b.rng=()=>.9;const e=attack(b);assert.ok(e.combo);assert.equal(b.links[0].filter(l=>l.uses===1).length,1);assert.equal(b.links[0].filter(l=>l.charge===4).length,1);
});
test('elimination latches across rerenders, delayed impacts and new events until explicit rematch',()=>{
 let resets=0;const actor={hp:100,model:{reset(){resets++;}}},hit={attacker:'ironman'};
 syncFighterLife(actor,0,hit);assert.equal(shouldFall(actor,{event:hit},.2),false);assert.equal(shouldFall(actor,{event:hit},.6),true);
 for(const event of [{special:true},null,{combo:true}]){syncFighterLife(actor,100,event);assert.equal(actor.hp,0);assert.equal(shouldFall(actor,event?{event}:null,.1),true);}
 syncFighterLife(actor,100,null,true);assert.equal(actor.hp,100);assert.equal(actor.eliminated,false);assert.equal(resets,1);
});
