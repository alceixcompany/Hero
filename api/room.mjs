import {redisSettings,RedisRest} from '../hosting/redis-rest.mjs';
import {RoomService} from '../hosting/room-service.mjs';

export function createRoomHandler({settingsFor=redisSettings,serviceFor=settings=>new RoomService({redis:new RedisRest(settings),key:settings.key})}={}){return async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('X-Content-Type-Options','nosniff');
 const send=(status,data)=>{res.statusCode=status;res.end(JSON.stringify(data));};
 let settings;try{settings=settingsFor();}catch{return send(503,{messages:[{type:'error',code:'storage',message:'Çevrimiçi oda kaydı şu anda kullanılamıyor.'}]});}
 if(req.method==='GET')return send(200,{configured:!!settings,transport:'http'});
 if(req.method!=='POST'){res.setHeader('Allow','GET, POST');return send(405,{error:'Method not allowed'});}
 if(!settings)return send(503,{messages:[{type:'error',code:'storage',message:'Çevrimiçi odalar henüz etkinleştirilmedi. Yayın sahibi Vercel Storage üzerinden Upstash Redis bağlantısını tamamlamalı.'}]});
 try{
  const origin=new URL(req.headers.origin);if(origin.host!==req.headers.host||!['http:','https:'].includes(origin.protocol))throw Error();
 }catch{return send(403,{error:'Origin not allowed'});}
 if(!req.headers['content-type']?.startsWith('application/json'))return send(415,{error:'JSON required'});
 try{
  const body=typeof req.body==='string'?JSON.parse(req.body):Buffer.isBuffer(req.body)?JSON.parse(req.body.toString()):req.body;
  if(Buffer.byteLength(JSON.stringify(body)||'')>4096)return send(413,{error:'Request too large'});
  const ip=String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0].trim();
  const service=serviceFor(settings);
  return send(200,await service.request(body,ip));
 }catch(e){
  const known=['invalid','rate','busy','capacity'].includes(e.code);
  return send(known?e.code==='rate'?429:400:503,{messages:[{type:'error',code:known?e.code:e.code==='storage'?'storage':'unavailable',message:known?e.message:'Oda kaydı şu anda kullanılamıyor. Bağlantı daha sonra yeniden denenebilir.'}]});
 }
};}
export default createRoomHandler();
