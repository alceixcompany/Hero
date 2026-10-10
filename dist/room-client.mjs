const SESSION_KEY='nexus-room-v1';
const token=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),n=>n.toString(16).padStart(2,'0')).join('');
export class RoomClient{
 constructor({onState,onStatus,onError,onLeft,storage=sessionStorage,Socket=WebSocket}={}){
  Object.assign(this,{onState,onStatus,onError,onLeft,storage,Socket});this.status='idle';this.snapshot=null;this.pending=null;this.retry=0;this.stopped=true;
  try{this.session=JSON.parse(storage.getItem(SESSION_KEY));if(!this.session?.token||!this.session.type)this.session=null;}catch{this.session=null;}
 }
 setStatus(s){this.status=s;this.onStatus?.(s);}
 remember(){try{this.storage.setItem(SESSION_KEY,JSON.stringify(this.session));}catch{this.onError?.('Bu tarayıcı oturumu saklayamıyor. Sayfayı yenilersen oyuncuna geri dönemeyebilirsin.');}}
 begin(type,name,code){this.stop();this.session={type,name,code:code?.trim().toUpperCase(),token:token()};this.snapshot=null;this.remember();this.stopped=false;this.connect();}
 restore(){if(this.session){this.stopped=false;this.connect();return true;}return false;}
 connect(){
  if(this.stopped)return;clearTimeout(this.retryTimer);this.setStatus('connecting');
  const ws=this.ws=new this.Socket(`${location.protocol==='https:'?'wss:':'ws:'}//${location.host}/ws`);
  let welcomed=false;const timer=setTimeout(()=>{if(ws===this.ws&&this.status!=='connected')ws.close();},12000);
  ws.addEventListener('open',()=>{if(ws!==this.ws)return;ws.send(JSON.stringify(this.session));});
  ws.addEventListener('message',event=>{
   if(ws!==this.ws)return;let msg;try{msg=JSON.parse(event.data);}catch{return;}
   if(msg.type==='welcome'){welcomed=true;this.session={...this.session,type:'resume',code:msg.code};this.remember();this.retry=0;clearTimeout(timer);}
   if(msg.type==='state'){
    welcomed=true;clearTimeout(timer);if(this.snapshot&&msg.rev<this.snapshot.rev)return;
    this.snapshot=msg;this.setStatus('connected');this.onState?.(msg);
   }else if(msg.type==='ack'){if(msg.id===this.pending){this.pending=null;clearTimeout(this.pendingTimer);this.onStatus?.(this.status);}}
   else if(msg.type==='left'){this.clear();this.onLeft?.();}
   else if(msg.type==='error'){
    if(msg.id===this.pending){this.pending=null;clearTimeout(this.pendingTimer);}
    this.onError?.(msg.message);
    if(msg.code==='storage'){this.stop();this.setStatus('failed');}
    else if(msg.code==='replaced'){this.stop();this.setStatus('replaced');}
    else if(!welcomed){this.stop();if(['missing','session'].includes(msg.code)){this.clear();this.onLeft?.();}else this.setStatus('failed');}
   }
  });
  ws.addEventListener('error',()=>{});
  ws.addEventListener('close',()=>{
   clearTimeout(timer);if(ws!==this.ws||this.stopped)return;
   this.pending=null;clearTimeout(this.pendingTimer);this.setStatus('reconnecting');
   this.retryTimer=setTimeout(()=>this.connect(),Math.min(8000,700*2**Math.min(this.retry++,4))+Math.random()*300);
  });
 }
 action(action,data={}){
  if(this.status!=='connected'||this.ws?.readyState!==1||!this.snapshot){this.onError?.('Bağlantının geri gelmesini bekle.');return false;}
  if(this.pending)return false;
  const id=token().slice(0,32);this.pending=id;this.ws.send(JSON.stringify({type:'action',id,rev:this.snapshot.rev,action,data}));
  this.pendingTimer=setTimeout(()=>{if(this.pending===id){this.pending=null;this.ws?.send(JSON.stringify({type:'sync'}));this.onError?.('Yanıt gecikti. Güncel durum alınıyor; teklif otomatik tekrarlanmadı.');this.onStatus?.(this.status);}},5000);
  this.onStatus?.(this.status);return true;
 }
 stop(){this.stopped=true;clearTimeout(this.retryTimer);clearTimeout(this.pendingTimer);this.pending=null;if(this.ws){const ws=this.ws;this.ws=null;ws.close();}}
 clear(){this.stop();this.session=null;this.snapshot=null;try{this.storage.removeItem(SESSION_KEY);}catch{}this.setStatus('idle');}
}
