import {createHash} from 'node:crypto';
import {RoomStore,reviveBattle} from '../rooms.mjs';
import {READ_SCRIPT,COMMIT_SCRIPT} from './redis-rest.mjs';

export const PRESENCE_MS=15000;
const error=(message,code='invalid')=>Object.assign(Error(message),{code});
const hash=value=>createHash('sha256').update(value).digest('hex');
const validToken=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);

export class RoomService{
 constructor({redis,key,now=Date.now,wait=ms=>new Promise(r=>setTimeout(r,ms))}){Object.assign(this,{redis,key,now,wait});}
 async request(body,ip='unknown'){
  if(!body||!validToken(body.auth?.token)||!/^[a-f0-9]{32}$/.test(body.connection||'')||!body.message||!['hello','sync','action','disconnect'].includes(body.message.type))throw error('İstek geçersiz.');
  const rate=hash(String(ip)).slice(0,24),hello=body.message.type==='hello';
  const read=await this.redis.command(['EVAL',READ_SCRIPT,3,this.key,this.key+':rate:'+rate,this.key+':hello:'+rate,hello?'hello':'poll']);
  if(read[0]==='rate')throw error('Çok fazla istek. Bir dakika sonra tekrar dene.','rate');
  let raw=read[1];
  for(let attempt=0;attempt<8;attempt++){
   if(attempt)raw=await this.redis.command(['GET',this.key])||'';
   let time=this.now(),dirty=false;
   const store=new RoomStore({file:null,now:()=>time,maxRooms:20,onChange:()=>{dirty=true;}});
   if(raw){const data=JSON.parse(raw);if(data.version!==2||!Array.isArray(data.rooms))throw error('Oda kaydı kullanılamıyor.','storage');for(const r of data.rooms){reviveBattle(r);store.rooms.set(r.code,r);}}
   // HTTP heartbeats replace persistent socket presence; expiry freezes clocks.
   const requestTime=time;
   for(const r of store.rooms.values())for(let side=0;side<2;side++){
    const slot=r.slots[side];if(slot?.connected&&requestTime-slot.lastSeen>=PRESENCE_MS){time=slot.lastSeen+PRESENCE_MS;store.connected(r,side,false);}
   }
   time=requestTime;
   const before=store.rooms.size;store.tick();if(store.rooms.size!==before)dirty=true;
   const messages=[];let binding;
   try{
    const {auth,message,connection}=body;
    if(hello){
     binding=auth.type==='create'?store.create(auth.name,auth.token):auth.type==='join'?store.join(auth.code,auth.name,auth.token):auth.type==='resume'?store.resume(auth.code,auth.token):null;
     if(!binding)throw error('Bir odaya katıl.');
    }else{if(auth.type!=='resume')throw error('Oturum geçersiz.','session');binding=store.resume(auth.code,auth.token);}
    const {room:r,side}=binding,slot=r.slots[side];
    if(hello){slot.httpConnection=connection;dirty=true;messages.push({type:'welcome',code:r.code,side});}
    else if(slot.httpConnection!==connection)throw error('Oyuncun başka bir sekmede açıldı. Bu sekme izlemeyi bıraktı.','replaced');
    if(message.type==='disconnect'){
     store.connected(r,side,false);
    }else{
     if(!slot.connected)store.connected(r,side,true);
     if(time-slot.lastSeen>=3000){slot.lastSeen=time;dirty=true;}
     if(message.type==='action'){
      const result=store.apply(r,side,message);messages.push({type:'ack',id:message.id,...result});
      if(result.left)messages.push({type:'left'});
     }
    }
   }catch(e){messages.push({type:'error',id:body.message.id,code:e.code||'invalid',message:e.message});}
   if(binding&&body.message.type!=='disconnect'&&!messages.some(m=>m.type==='left'||m.code==='replaced')){
    const {room:r,side}=binding;
    if(hello||body.message.type==='action'||body.message.rev!==r.rev)messages.push(store.snapshot(r,side));
   }
   if(!dirty)return {messages};
   const next=JSON.stringify({version:2,rooms:[...store.rooms.values()]});
   if(Buffer.byteLength(next)>3*1024*1024)throw error('Sunucu dolu. Daha sonra tekrar dene.','capacity');
   if(await this.redis.command(['EVAL',COMMIT_SCRIPT,1,this.key,raw,next])===1)return {messages};
   await this.wait(15+Math.random()*40);
  }
  throw error('Oyun çok hızlı güncellendi. Güncel duruma göre tekrar dene.','busy');
 }
}
