export const MARVEL_TRACK={id:'QtxeJ703w18',title:'The Avengers · Alan Silvestri',url:'https://www.youtube.com/watch?v=QtxeJ703w18'};
let api;
function youtubeAPI(){
 if(globalThis.YT?.Player)return Promise.resolve(globalThis.YT);
 return api??=new Promise((resolve,reject)=>{
  const previous=globalThis.onYouTubeIframeAPIReady;
  globalThis.onYouTubeIframeAPIReady=()=>{previous?.();resolve(globalThis.YT);};
  const script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';script.onerror=()=>{api=null;reject(Error('YouTube yüklenemedi'));};document.head.append(script);
  setTimeout(()=>{if(!globalThis.YT?.Player){api=null;reject(Error('YouTube bağlantısı zaman aşımına uğradı'));}},15000);
 });
}
export class Soundtrack{
 constructor({audio,onState=()=>{}}){this.audio=audio;this.onState=onState;this.generation=0;this.status='Arena ritmi';}
 emit(status){this.status=status;this.onState(status);}
 sync(){
  const {enabled,music}=this.audio.settings,active=enabled&&music>0&&this.audio.scene!=='silent';
  if(this.media){this.media.volume=music;if(active&&!this.userPaused)this.media.play().catch(()=>this.emit('Müziği başlatmak için tekrar tıkla'));else this.media.pause();}
  if(this.player&&this.ready){this.player.setVolume(Math.round(music*100));if(active&&this.requested&&!this.userPaused)this.player.playVideo();else this.player.pauseVideo();}
 }
 async marvel(host){
  this.stop();const generation=this.generation;this.requested=true;this.userPaused=false;this.audio.setExternalMusic(true);this.emit('Avengers teması yükleniyor…');
  try{
   const YT=await youtubeAPI();if(generation!==this.generation)return;
   this.player=new YT.Player(host,{width:'100%',height:200,videoId:MARVEL_TRACK.id,playerVars:{playsinline:1,origin:location.origin,loop:1,playlist:MARVEL_TRACK.id},events:{
    onReady:e=>{if(generation!==this.generation){e.target.destroy();return;}this.ready=true;this.sync();this.emit('Avengers · hafif arka plan');},
    onStateChange:e=>{if(generation!==this.generation)return;if(e.data===1){this.userPaused=false;this.emit('Avengers çalıyor');}else if(e.data===2){if(this.audio.scene!=='silent'&&this.audio.settings.enabled&&this.audio.settings.music>0)this.userPaused=true;this.emit('Avengers duraklatıldı');}},
    onAutoplayBlocked:()=>{if(generation===this.generation)this.emit('Oynatıcıdaki ▶ düğmesine tıkla');},
    onError:()=>{if(generation!==this.generation)return;this.requested=false;this.audio.setExternalMusic(false);this.emit('YouTube burada açılamadı. Müzik dosyası seçebilirsin.');}
   }});
  }catch{if(generation===this.generation){this.audio.setExternalMusic(false);this.emit('YouTube yüklenemedi. Müzik dosyası seçebilirsin.');}}
 }
 local(file,{createAudio=()=>new Audio(),createURL=f=>URL.createObjectURL(f),revokeURL=u=>URL.revokeObjectURL(u)}={}){
  this.stop();const generation=this.generation;this.userPaused=false;this.revokeURL=revokeURL;this.url=createURL(file);this.media=createAudio();this.media.src=this.url;this.media.loop=true;this.audio.setExternalMusic(true);this.emit(file.name);
  this.media.onplay=()=>{if(generation===this.generation){this.userPaused=false;this.emit(file.name+' · çalıyor');}};
  this.media.onpause=()=>{if(generation!==this.generation)return;if(this.audio.scene!=='silent'&&this.audio.settings.enabled&&this.audio.settings.music>0)this.userPaused=true;this.emit(file.name+' · duraklatıldı');};
  this.media.onerror=()=>{if(generation===this.generation){this.stop();this.emit('Bu ses dosyası oynatılamadı. MP3, WAV veya OGG seç.');}};this.sync();
 }
 stop(){this.generation++;this.player?.destroy();this.player=null;this.ready=false;this.requested=false;if(this.media){this.media.pause();this.media.removeAttribute('src');this.media.load();this.media=null;}if(this.url){this.revokeURL(this.url);this.url=null;}this.audio.setExternalMusic(false);this.emit('Arena ritmi');}
}
