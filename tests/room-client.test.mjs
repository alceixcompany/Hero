import test from 'node:test';
import assert from 'node:assert/strict';
import {RoomClient,roomSocketUrl} from '../dist/room-client.mjs';
class Socket extends EventTarget{
 static all=[];
 constructor(url){super();this.url=url;this.readyState=0;this.sent=[];Socket.all.push(this);}
 open(){this.readyState=1;this.dispatchEvent(new Event('open'));}
 send(s){this.sent.push(JSON.parse(s));}
 message(data){const e=new Event('message');e.data=JSON.stringify(data);this.dispatchEvent(e);}
 close(){this.readyState=3;this.dispatchEvent(new Event('close'));}
}
const storage=()=>{const values=new Map();return {getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};};
test('room client keeps auth out of URLs, ignores old state, blocks duplicate clicks and clears sessions on leaving',()=>{
 const old=globalThis.location;globalThis.location={protocol:'http:',host:'192.168.1.2:5173'};
 let state,errors=[];const memory=storage(),client=new RoomClient({storage:memory,Socket,onState:s=>state=s,onError:e=>errors.push(e)});
 try{
  client.begin('create','A');const ws=client.ws;assert.equal(ws.url,'ws://192.168.1.2:5173/ws');ws.open();const hello=ws.sent[0];assert.match(hello.token,/^[a-f0-9]{64}$/);assert.ok(!ws.url.includes(hello.token));
  ws.message({type:'welcome',code:'ABC234',side:0});ws.message({type:'state',code:'ABC234',rev:4,side:0});assert.equal(client.status,'connected');assert.equal(client.session.type,'resume');
  ws.message({type:'state',rev:3});assert.equal(state.rev,4);assert.equal(client.action('bid',{amount:2}),true);const request=ws.sent.at(-1);assert.equal(request.rev,4);assert.match(request.id,/^[a-f0-9]{32}$/);
  assert.equal(client.action('bid',{amount:3}),false);assert.equal(ws.sent.length,2);ws.message({type:'ack',id:request.id});assert.equal(client.pending,null);
  ws.message({type:'left'});assert.equal(client.session,null);assert.equal(client.status,'idle');assert.equal(memory.getItem('nexus-room-v1'),null);
 }finally{client.stop();globalThis.location=old;}
});
test('room resume keeps the original token; replacement and storage failures stop reconnect attempts',()=>{
 const old=globalThis.location;globalThis.location={protocol:'https:',host:'hero.example'};
 const memory=storage();const first=new RoomClient({storage:memory,Socket});let client;
 try{
  first.begin('join','B','abc234');let ws=first.ws;ws.open();const auth=ws.sent[0].token;ws.message({type:'welcome',code:'ABC234',side:1});first.stop();
  client=new RoomClient({storage:memory,Socket});assert.equal(client.restore(),true);ws=client.ws;ws.open();assert.equal(ws.url,'wss://hero.example/ws');assert.equal(ws.sent[0].type,'resume');assert.equal(ws.sent[0].token,auth);
  ws.message({type:'welcome',code:'ABC234',side:1});ws.message({type:'state',rev:9,side:1});ws.message({type:'error',code:'replaced',message:'replaced'});assert.equal(client.stopped,true);assert.equal(client.status,'replaced');assert.equal(client.ws,null);
  client.restore();ws=client.ws;ws.open();ws.message({type:'welcome',code:'ABC234',side:1});ws.message({type:'error',code:'storage',message:'disk failure'});assert.equal(client.stopped,true);assert.equal(client.status,'failed');
 }finally{first.stop();client?.stop();globalThis.location=old;}
});
test('static hosting uses the configured secure room server and isolates its player credentials',()=>{
 const old=globalThis.location;globalThis.location={protocol:'https:',host:'hero.vercel.app'};
 const memory=storage(),first=new RoomClient({storage:memory,Socket,serverOrigin:'https://rooms.example'});let resumed,other;
 try{
  first.begin('create','A');const ws=first.ws;assert.equal(ws.url,'wss://rooms.example/ws');ws.open();const auth=ws.sent[0].token;ws.message({type:'welcome',code:'ABC234',side:0});first.stop();
  resumed=new RoomClient({storage:memory,Socket,serverOrigin:'https://rooms.example'});assert.equal(resumed.restore(),true);resumed.ws.open();assert.equal(resumed.ws.sent[0].token,auth);
  other=new RoomClient({storage:memory,Socket,serverOrigin:'https://different.example'});assert.equal(other.restore(),false);assert.equal(other.session,null);
  assert.throws(()=>roomSocketUrl('http://rooms.example'),/HTTPS/);
 }finally{first.stop();resumed?.stop();other?.stop();globalThis.location=old;}
});
test('an unconfigured static deployment never opens or endlessly retries a missing WebSocket endpoint',()=>{
 const old=globalThis.location;globalThis.location={protocol:'https:',host:'hero.vercel.app'};
 const memory=storage();memory.setItem('nexus-room-v1',JSON.stringify({type:'resume',token:'a'.repeat(64),code:'ABC234'}));
 const errors=[],count=Socket.all.length,client=new RoomClient({storage:memory,Socket,serverOrigin:null,onError:e=>errors.push(e)});
 try{assert.equal(client.restore(),false);assert.equal(client.begin('create','A'),false);assert.equal(Socket.all.length,count);assert.equal(client.session,null);assert.equal(client.stopped,true);assert.match(errors[0],/oda sunucusu/);}
 finally{client.stop();globalThis.location=old;}
});
