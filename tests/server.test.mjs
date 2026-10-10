import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {WebSocket} from 'ws';
import {createGameServer} from '../server.mjs';
const token=()=>randomBytes(32).toString('hex');
function peer(url,origin){
 const ws=new WebSocket(url,{origin});const messages=[],waiters=[];let error;
 ws.on('error',e=>{error=e;});
 ws.on('message',raw=>{const msg=JSON.parse(raw);messages.push(msg);for(const waiter of [...waiters])if(waiter.p(msg)){waiters.splice(waiters.indexOf(waiter),1);clearTimeout(waiter.timer);waiter.resolve(msg);}});
 const wait=p=>{const prior=messages.find(p);if(prior)return Promise.resolve(prior);return new Promise((resolve,reject)=>{const waiter={p,resolve,timer:setTimeout(()=>{waiters.splice(waiters.indexOf(waiter),1);reject(error||Error('Message timeout'));},3000)};waiters.push(waiter);});};
 const open=new Promise((resolve,reject)=>{ws.once('open',resolve);ws.once('error',reject);});
 return {ws,messages,wait,open,send:msg=>ws.send(JSON.stringify(msg)),state:()=>messages.filter(m=>m.type==='state').at(-1)};
}
test('real WebSocket peers synchronize, enforce auth/origin/size/turns and resume without double spending',async()=>{
 const app=createGameServer({dataFile:null});await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));const port=app.server.address().port,origin=`http://127.0.0.1:${port}`,url=`ws://127.0.0.1:${port}/ws`,peers=[];
 try{
  assert.equal((await fetch(origin+'/api/health')).status,200);assert.equal((await fetch(origin+'/rooms.mjs')).status,404);assert.equal((await fetch(origin+'/api/network')).status,200);
  const bad=peer(url,'https://unrelated.example');peers.push(bad);await assert.rejects(bad.open,/403/);
  const a=peer(url,origin);peers.push(a);await a.open;const ta=token();a.send({type:'create',name:'A',token:ta});const welcome=await a.wait(m=>m.type==='welcome'),code=welcome.code;await a.wait(m=>m.type==='state');
  const b=peer(url,origin);peers.push(b);await b.open;const tb=token();b.send({type:'join',code,name:'B',token:tb});await b.wait(m=>m.type==='welcome');await b.wait(m=>m.type==='state');await a.wait(m=>m.type==='state'&&m.slots[1]?.connected);
  const c=peer(url,origin);peers.push(c);await c.open;c.send({type:'join',code,name:'C',token:token()});assert.equal((await c.wait(m=>m.type==='error')).code,'full');
  let seq=0;
  const act=async(p,action,data={})=>{const id='action-'+(++seq);p.send({type:'action',id,rev:p.state().rev,action,data});await p.wait(m=>m.type==='ack'&&m.id===id);return id;};
  await act(a,'ready');await b.wait(m=>m.type==='state'&&m.slots[0]?.ready);await act(b,'ready');await a.wait(m=>m.type==='state'&&m.slots[1]?.ready);await act(a,'launch');await b.wait(m=>m.type==='state'&&m.status==='auction');
  assert.equal(a.state().game.pool.filter(Boolean).length,1);assert.deepEqual(a.state().game,b.state().game);
  b.send({type:'action',id:'wrong-turn',rev:b.state().rev,action:'bid',data:{amount:19}});await b.wait(m=>m.type==='error'&&m.id==='wrong-turn');assert.equal(b.state().game.bid,0);
  const bidId=await act(a,'bid',{amount:2});await b.wait(m=>m.type==='state'&&m.game.bid===2);await act(b,'pass');await a.wait(m=>m.type==='state'&&m.game.round===1);assert.equal(a.state().game.players[0].coins,18);
  a.send({type:'action',id:bidId,rev:0,action:'bid',data:{amount:2}});await a.wait(m=>m.type==='ack'&&m.id===bidId&&m.duplicate);assert.equal(a.state().game.players[0].coins,18);
  const beforeDisconnect=a.state().rev;b.ws.close();await a.wait(m=>m.type==='state'&&m.rev>beforeDisconnect&&m.slots[1]&&!m.slots[1].connected);assert.equal(a.state().deadline,0);
  const resumed=peer(url,origin);peers.push(resumed);await resumed.open;resumed.send({type:'resume',code,token:tb});await resumed.wait(m=>m.type==='welcome');await resumed.wait(m=>m.type==='state');await a.wait(m=>m.type==='state'&&m.rev>beforeDisconnect+1&&m.slots[1]?.connected&&m.game.round===1);assert.equal(resumed.state().game.players[0].coins,18);
  const replacement=peer(url,origin);peers.push(replacement);await replacement.open;replacement.send({type:'resume',code,token:tb});await replacement.wait(m=>m.type==='welcome');assert.equal((await resumed.wait(m=>m.type==='error'&&m.code==='replaced')).code,'replaced');
  const fresh=peer(url,origin);peers.push(fresh);await fresh.open;fresh.ws.send('not-json');await fresh.wait(m=>m.type==='error');fresh.ws.send('x'.repeat(5000));await new Promise(resolve=>fresh.ws.once('close',resolve));
 }finally{for(const p of peers)p.ws.terminate();await app.close();}
});
test('an external static frontend can use its allowed room backend while other origins stay blocked',async()=>{
 const frontend='https://hero.vercel.app',app=createGameServer({dataFile:null,allowedOrigins:[frontend]});
 await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));const url=`ws://127.0.0.1:${app.server.address().port}/ws`,peers=[];
 try{
  const a=peer(url,frontend);peers.push(a);await a.open;a.send({type:'create',name:'A',token:token()});const {code}=await a.wait(m=>m.type==='welcome');
  const b=peer(url,frontend);peers.push(b);await b.open;b.send({type:'join',code,name:'B',token:token()});await b.wait(m=>m.type==='welcome');await b.wait(m=>m.type==='state');await a.wait(m=>m.type==='state'&&m.slots[1]?.connected);
  assert.equal(a.state().code,b.state().code);
  const denied=peer(url,'https://another.vercel.app');peers.push(denied);await assert.rejects(denied.open,/403/);
 }finally{for(const p of peers)p.ws.terminate();await app.close();}
});
