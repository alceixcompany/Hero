import test from 'node:test';
import assert from 'node:assert/strict';
import {HttpRoomSocket} from '../dist/http-room-socket.mjs';
import {RoomClient} from '../dist/room-client.mjs';
import {RoomService} from '../hosting/room-service.mjs';
import {MemoryRedis} from './helpers/vercel-fixture.mjs';
const memory=()=>{const map=new Map();return {getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};};
const until=async(predicate)=>{for(let i=0;i<200;i++){if(predicate())return;await new Promise(r=>setTimeout(r,5));}throw Error('Client timed out');};

test('HTTP clients create/join, restore after a lost bid response and never replay that bid',async()=>{
 const old=globalThis.location;globalThis.location={protocol:'https:',host:'hero.vercel.app'};
 const redis=new MemoryRedis(),calls=[];let loseBid=false;
 const fetcher=async(url,options)=>{
  assert.equal(url,'https://hero.vercel.app/api/room');const body=JSON.parse(options.body);calls.push(body);
  const result=await new RoomService({redis,key:'test',wait:async()=>{}}).request(body);
  if(loseBid&&body.message.action==='bid'){loseBid=false;throw Error('Lost response');}
  return {json:async()=>result};
 };
 class Socket extends HttpRoomSocket{constructor(url){super(url,{fetcher});}}
 const ma=memory(),a=new RoomClient({Socket,storage:ma}),b=new RoomClient({Socket,storage:memory()});let resumed;
 try{
  a.begin('create','A');await until(()=>a.snapshot);b.begin('join','B',a.session.code);await until(()=>b.snapshot);
  a.ws.send(JSON.stringify({type:'sync',rev:-1}));await until(()=>a.snapshot.slots[1]?.connected);
  const act=async(p,action,data)=>{assert.equal(p.action(action,data),true);await until(()=>!p.pending);};
  const sync=async(p,rev)=>{p.ws.send(JSON.stringify({type:'sync',rev:-1}));await until(()=>p.snapshot.rev>=rev);};
  await act(a,'ready');await sync(b,a.snapshot.rev);await act(b,'ready');await sync(a,b.snapshot.rev);await act(a,'launch');await sync(b,a.snapshot.rev);
  const auth=a.session.token;loseBid=true;a.action('bid',{amount:2});await until(()=>a.status==='reconnecting');a.stop();
  resumed=new RoomClient({Socket,storage:ma});resumed.restore();await until(()=>resumed.snapshot);
  assert.equal(resumed.session.token,auth);assert.equal(resumed.snapshot.game.bid,2);assert.equal(calls.filter(c=>c.message.action==='bid').length,1);
  await sync(b,resumed.snapshot.rev);await act(b,'pass');await sync(resumed,b.snapshot.rev);assert.equal(resumed.snapshot.game.players[0].coins,18);
  assert.ok(calls.every(c=>!new URL('https://hero.vercel.app/api/room').search.includes(c.auth.token)));
 }finally{a.stop();b.stop();resumed?.stop();globalThis.location=old;}
});
test('browser fetch is invoked without a socket receiver and transient storage errors trigger reconnect',async()=>{
 const previousFetch=globalThis.fetch,old=globalThis.location;globalThis.location={protocol:'https:',host:'hero.vercel.app'};
 let calls=0;globalThis.fetch=async function(){assert.ok(this===undefined||this===globalThis,'Window.fetch must not receive a socket as this');calls++;return {json:async()=>({messages:[{type:'error',code:'unavailable'}]})};};
 const client=new RoomClient({Socket:HttpRoomSocket,storage:memory()});
 try{client.begin('create','A');await until(()=>client.status==='reconnecting');assert.equal(calls,1);assert.equal(client.session.type,'create');assert.equal(client.stopped,false);}
 finally{client.stop();globalThis.fetch=previousFetch;globalThis.location=old;}
});
