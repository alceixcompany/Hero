import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {networkInterfaces} from 'node:os';
import {WebSocketServer,WebSocket} from 'ws';
import {RoomStore} from './rooms.mjs';
const types={'.html':'text/html; charset=utf-8','.css':'text/css','.mjs':'text/javascript','.js':'text/javascript','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.glb':'model/gltf-binary','.json':'application/json'};
export function createGameServer({dataFile=process.env.ROOM_DATA_FILE||resolve('.data/rooms.json'),root=resolve('dist'),allowedOrigins=(process.env.ALLOWED_ORIGINS||'').split(',').filter(Boolean),now=Date.now}={}){
 const clients=new Map(),connections=new Set(),attempts=new Map();let storageFailed=false;
 const send=(ws,msg)=>{if(ws.readyState===WebSocket.OPEN){if(ws.bufferedAmount>512*1024)return ws.close(1013,'Yavaş bağlantı');ws.send(JSON.stringify(msg));}};
 const broadcast=r=>{for(const ws of clients.get(r.code)?.values()??[])if(r.slots[ws.side])send(ws,store.snapshot(r,ws.side));};
 const store=new RoomStore({file:dataFile,now,onChange:broadcast});
 const server=http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
  try{
   const url=new URL(req.url,'http://localhost');
   if(url.pathname==='/api/health'){res.writeHead(storageFailed?503:200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({ok:!storageFailed}));return;}
   if(url.pathname==='/api/network'){
    const port=server.address()?.port;const lan=Object.values(networkInterfaces()).flat().filter(x=>x&&x.family==='IPv4'&&!x.internal).map(x=>`http://${x.address}:${port}`);
    res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({publicUrl:process.env.PUBLIC_URL||null,lan}));return;
   }
   const path=resolve(root,'.'+decodeURIComponent(url.pathname));
   if(!path.startsWith(root+'/')&&path!==root){res.writeHead(403);res.end();return;}
   const file=path===root?root+'/index.html':path,body=await readFile(file);
   res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(req.method==='HEAD'?undefined:body);
  }catch{res.writeHead(404);res.end('Bulunamadı');}
 });
 const wss=new WebSocketServer({noServer:true,maxPayload:4096,perMessageDeflate:false});
 server.on('upgrade',(req,socket,head)=>{
  let permitted=false;
  try{const origin=new URL(req.headers.origin);permitted=allowedOrigins.length?allowedOrigins.includes(origin.origin):origin.host===req.headers.host&&['http:','https:'].includes(origin.protocol);}catch{}
  if(!permitted||req.url!=='/ws'||storageFailed||connections.size>=600){socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');socket.destroy();return;}
  const ip=req.socket.remoteAddress,key='open:'+ip,bucket=attempts.get(key)||{count:0,at:now()};
  if(now()-bucket.at>60000){bucket.count=0;bucket.at=now();}bucket.count++;attempts.set(key,bucket);
  if(bucket.count>40||[...connections].filter(ws=>ws.ip===ip).length>=12){socket.write('HTTP/1.1 429 Too Many Requests\r\nConnection: close\r\n\r\n');socket.destroy();return;}
  wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,req));
 });
 wss.on('connection',(ws,req)=>{
  ws.ip=req.socket.remoteAddress;ws.alive=true;connections.add(ws);let count=0,windowAt=now();
  const helloTimeout=setTimeout(()=>{if(!ws.room)ws.close(1008,'Oturum bekleniyor');},10000);helloTimeout.unref();
  ws.on('error',()=>{});ws.on('pong',()=>ws.alive=true);
  ws.on('message',(raw,binary)=>{
   let msg;
   try{
    if(storageFailed)throw Object.assign(Error('Sunucu kaydı kullanılamıyor. Daha sonra tekrar dene.'),{code:'storage'});
    if(binary)throw Error('İstek geçersiz.');
    if(now()-windowAt>=1000){count=0;windowAt=now();}
    if(++count>12){ws.close(1008,'Çok fazla istek');return;}
    msg=JSON.parse(raw.toString());if(!msg||typeof msg!=='object'||Array.isArray(msg))throw Error('İstek geçersiz.');
    if(!ws.room){
     const k='hello:'+ws.ip,b=attempts.get(k)||{count:0,at:now()};if(now()-b.at>60000){b.count=0;b.at=now();}if(++b.count>20)throw Error('Çok fazla katılma denemesi. Bir dakika bekle.');attempts.set(k,b);
     const binding=msg.type==='create'?store.create(msg.name,msg.token):msg.type==='join'?store.join(msg.code,msg.name,msg.token):msg.type==='resume'?store.resume(msg.code,msg.token):null;
     if(!binding)throw Error('Bir odaya katıl.');
     clearTimeout(helloTimeout);ws.room=binding.room;ws.side=binding.side;
     const roomClients=clients.get(ws.room.code)||new Map(),old=roomClients.get(ws.side);roomClients.set(ws.side,ws);clients.set(ws.room.code,roomClients);
     if(old&&old!==ws){send(old,{type:'error',code:'replaced',message:'Oyuncun başka bir sekmede açıldı. Bu sekme izlemeyi bıraktı.'});old.close(4001,'Yeni oturum');}
     send(ws,{type:'welcome',code:ws.room.code,side:ws.side});store.connected(ws.room,ws.side,true);
    }else if(msg.type==='action'){
     const result=store.apply(ws.room,ws.side,msg);send(ws,{type:'ack',id:msg.id,...result});
     if(result.duplicate)send(ws,store.snapshot(ws.room,ws.side));
     if(result.left){send(ws,{type:'left'});ws.close(1000,'Ayrıldı');}
    }else if(msg.type==='sync')send(ws,store.snapshot(ws.room,ws.side));
    else throw Error('İstek geçersiz.');
   }catch(e){
    if(e.code&&['ENOSPC','EACCES','EIO','EROFS'].includes(e.code)){storageFailed=true;console.error('Room persistence unavailable:',e.code);}
    send(ws,{type:'error',id:msg?.id,code:storageFailed?'storage':e.code||'invalid',message:storageFailed?'Oda kaydedilemiyor. Oyun güvenlik için durduruldu.':e.message});
    if(ws.room&&!storageFailed)send(ws,store.snapshot(ws.room,ws.side));
   }
  });
  ws.on('close',()=>{
   clearTimeout(helloTimeout);connections.delete(ws);
   if(ws.room&&clients.get(ws.room.code)?.get(ws.side)===ws){clients.get(ws.room.code).delete(ws.side);if(!clients.get(ws.room.code).size)clients.delete(ws.room.code);if(!storageFailed){try{store.connected(ws.room,ws.side,false);}catch{storageFailed=true;}}}
  });
 });
 const tick=setInterval(()=>{if(!storageFailed){try{store.tick();}catch(e){storageFailed=true;console.error('Room persistence unavailable:',e.code||'write');}}},200);tick.unref();
 const heartbeat=setInterval(()=>{
  for(const ws of connections){if(!ws.alive){ws.terminate();continue;}ws.alive=false;ws.ping();}
  for(const [key,b] of attempts)if(now()-b.at>120000)attempts.delete(key);
 },15000);heartbeat.unref();
 const close=async()=>{clearInterval(tick);clearInterval(heartbeat);for(const ws of connections)ws.terminate();await new Promise(resolve=>wss.close(resolve));await new Promise(resolve=>server.close(resolve));};
 return {server,store,close};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const service=createGameServer(),port=Number(process.env.PORT||5173),host=process.env.HOST||'0.0.0.0';
 service.server.listen(port,host,()=>{console.log(`Local: http://127.0.0.1:${port}`);for(const x of Object.values(networkInterfaces()).flat())if(x?.family==='IPv4'&&!x.internal)console.log(`Aynı Wi-Fi: http://${x.address}:${port}`);});
 let stopping=false;for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>{if(stopping)return;stopping=true;void service.close().then(()=>process.exit(0));});
}
