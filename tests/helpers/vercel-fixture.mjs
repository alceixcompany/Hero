import {battleHighlights} from '../../dist/battle-highlights.mjs';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {RoomService,PRESENCE_MS} from '../../hosting/room-service.mjs';
import {READ_SCRIPT,COMMIT_SCRIPT} from '../../hosting/redis-rest.mjs';
export class MemoryRedis{
 constructor(){this.raw='';this.conflicts=0;this.fail=false;}
 async command(args){
  await new Promise(resolve=>setImmediate(resolve));
  if(this.fail)throw Error('Unavailable');
  if(args[0]==='GET')return this.raw||null;
  if(args[1]===READ_SCRIPT)return ['ok',this.raw];
  if(args[1]===COMMIT_SCRIPT){if(this.conflicts-->0||this.raw!==args[4])return 0;this.raw=args[5];return 1;}
  throw Error('Unknown command');
 }
}
export const token=()=>randomBytes(32).toString('hex'),connection=()=>randomBytes(16).toString('hex');
export async function exerciseRooms(redis,key){
 let time=1_000_000;
 const service=()=>new RoomService({redis,key,now:()=>time,wait:async()=>{}});
 const a={auth:{type:'create',name:'A',token:token()},connection:connection()},b={auth:{type:'join',name:'B',token:token()},connection:connection()};
 const request=async(p,message)=>{const result=await service().request({...p,message},'synthetic-test');const welcome=result.messages.find(m=>m.type==='welcome');if(welcome)p.auth={...p.auth,type:'resume',code:welcome.code};const state=result.messages.find(m=>m.type==='state');if(state)p.state=state;return result.messages;};
 const poll=p=>request(p,{type:'sync',rev:-1});
 await request(a,{type:'hello'});b.auth.code=a.auth.code;await request(b,{type:'hello'});await poll(a);
 assert.equal(a.state.code,b.state.code);assert.equal(a.state.slots[1].connected,true);assert.ok(a.state.game.pool.every(x=>x===null));
 // Each call uses a fresh function instance; persisted credentials resume it.
 await request(a,{type:'action',id:'ready-a',rev:a.state.rev,action:'ready'});await poll(b);
 await request(b,{type:'action',id:'ready-b',rev:b.state.rev,action:'ready'});await poll(a);
 await request(a,{type:'action',id:'launch',rev:a.state.rev,action:'launch'});await poll(b);
 assert.equal(a.state.game.pool.filter(Boolean).length,1);
 const rev=a.state.rev;
 const results=await Promise.all([
  request(a,{type:'action',id:'bid-one',rev,action:'bid',data:{amount:2}}),
  request(a,{type:'action',id:'bid-two',rev,action:'bid',data:{amount:3}})
 ]);
 assert.equal(results.flat().filter(m=>m.type==='ack').length,1);assert.equal(results.flat().filter(m=>m.code==='stale').length,1);
 await poll(b);const amount=b.state.game.bid;
 await request(b,{type:'action',id:'sell',rev:b.state.rev,action:'pass'});await poll(a);
 assert.equal(a.state.game.players[0].coins,20-amount);
 const accepted=results.flat().find(m=>m.type==='ack').id;
 const replay=await request(a,{type:'action',id:accepted,rev:0,action:'bid',data:{amount:amount}});
 assert.ok(replay.some(m=>m.type==='ack'&&m.duplicate));assert.equal(a.state.game.players[0].coins,20-amount);
 const sameAuth={auth:a.auth,connection:connection()};await request(sameAuth,{type:'hello'});
 const replaced=await poll(a);assert.ok(replaced.some(m=>m.code==='replaced'));assert.ok(!replaced.some(m=>m.type==='state'));
 const resumed=sameAuth;
 // Presence expiry freezes the shared countdown; reconnect restores it.
 time+=PRESENCE_MS+100;await poll(resumed);assert.equal(resumed.state.slots[1].connected,false);assert.equal(resumed.state.deadline,0);
 await request(b,{type:'hello'});await poll(resumed);assert.ok(resumed.state.deadline>time);
 // Finish the auction using public snapshots only, then verify shared battle RNG.
 let n=0;
 while(resumed.state.status==='auction'){
  const p=resumed.state.game.turn===0?resumed:b;
  await poll(p);await request(p,{type:'action',id:'pass-'+n++,rev:p.state.rev,action:'pass'});await poll(resumed);await poll(b);
 }
 await request(resumed,{type:'action',id:'arena-a',rev:resumed.state.rev,action:'battle-ready'});await poll(b);
 await request(b,{type:'action',id:'arena-b',rev:b.state.rev,action:'battle-ready'});await poll(resumed);
 assert.equal(resumed.state.status,'battle');
 for(let i=0;i<100&&!resumed.state.battle.done;i++){time+=3700;await poll(resumed);await poll(b);assert.deepEqual(resumed.state.battle,b.state.battle);}
 assert.equal(resumed.state.battle.done,true);assert.equal(resumed.state.battle.events.at(-1).finisher,true);
 const highlights=battleHighlights(resumed.state.battle);assert.deepEqual(battleHighlights(b.state.battle),highlights);assert.ok(highlights.damage.damage>0);
 assert.equal(resumed.state.battle.fighters.flat().reduce((n,f)=>n+f.metrics.damage,0),resumed.state.battle.events.flatMap(e=>e.hits).reduce((n,h)=>n+h.damage,0));
 const winner=resumed.state.battle.winner;
 time+=150000;await poll(b);assert.equal(b.state.battle.winner,winner);
 assert.ok(!JSON.stringify(b.state).includes(resumed.auth.token));assert.ok(!JSON.stringify(b.state).includes(resumed.connection));
 return true;
}

