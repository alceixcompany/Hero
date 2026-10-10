const id=()=>Array.from(crypto.getRandomValues(new Uint8Array(16)),n=>n.toString(16).padStart(2,'0')).join('');
export class HttpRoomSocket extends EventTarget{
 static transport='http';
 constructor(url,{fetcher=(...args)=>fetch(...args)}={}){
  super();const endpoint=new URL('/api/room',url);endpoint.protocol=endpoint.protocol==='wss:'?'https:':endpoint.protocol==='ws:'?'http:':endpoint.protocol;
  this.url=endpoint.href;this.fetcher=fetcher;this.connection=id();this.readyState=0;this.rev=-1;this.chain=Promise.resolve();this.pollMs=1500;
  queueMicrotask(()=>{if(this.readyState===0){this.readyState=1;this.dispatchEvent(new Event('open'));}});
 }
 emit(message){const event=new Event('message');event.data=JSON.stringify(message);this.dispatchEvent(event);}
 send(text){
  if(this.readyState!==1)return;
  const message=JSON.parse(text);
  if(['create','join','resume'].includes(message.type)){this.auth=message;this.enqueue({type:'hello'});}
  else this.enqueue(message);
 }
 enqueue(message){
  clearTimeout(this.timer);
  this.chain=this.chain.then(async()=>{
   if(this.readyState!==1||!this.auth)return;
   clearTimeout(this.timer);
   this.controller=new AbortController();const timeout=setTimeout(()=>this.controller?.abort(),4500);
   try{
    const response=await this.fetcher(this.url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({auth:this.auth,connection:this.connection,message}),signal:this.controller.signal});
    const data=await response.json();if(!Array.isArray(data.messages)||data.messages.some(m=>m.code==='unavailable'))throw Error('Unavailable');
    for(const msg of data.messages){
     if(this.readyState!==1)break;
     if(msg.type==='welcome')this.auth={...this.auth,type:'resume',code:msg.code};
     if(msg.type==='state'){this.rev=Math.max(this.rev,msg.rev);this.pollMs=msg.status==='lobby'?1500:650;}
     this.emit(msg);
    }
    if(this.readyState===1){clearTimeout(this.timer);this.timer=setTimeout(()=>this.enqueue({type:'sync',rev:this.rev}),this.pollMs);}
   }catch{if(this.readyState===1){this.dispatchEvent(new Event('error'));this.close();}}
   finally{clearTimeout(timeout);this.controller=null;}
  });
 }
 close(){
  if(this.readyState===3)return;this.readyState=3;clearTimeout(this.timer);this.controller?.abort();
  if(this.auth?.type==='resume')void this.fetcher(this.url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({auth:this.auth,connection:this.connection,message:{type:'disconnect'}}),keepalive:true}).catch(()=>{});
  this.dispatchEvent(new Event('close'));
 }
}
