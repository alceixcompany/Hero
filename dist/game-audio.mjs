// Original effects and fallback rhythm; official/local tracks use a separate player.
export const DEFAULT_AUDIO={enabled:true,effects:.65,music:.12};
export function soundFamily(id){
 if(['ironman','warmachine','vision','marvel','cyclops','wasp','antman'].includes(id))return 'energy';
 if(['thor','storm'].includes(id))return 'thunder';
 if(['wanda','strange','jean','magneto','loki','professor'].includes(id))return 'magic';
 if(['hawkeye','widow','punisher','rocket'].includes(id))return 'shot';
 if(['deadpool','gamora','wolverine'].includes(id))return 'blade';
 if(id==='spiderman')return 'web';if(id==='captain')return 'shield';return 'punch';
}
export class GameAudio{
 constructor({storage=null,contextFactory=null,onState=()=>{}}={}){
  this.storage=storage;this.contextFactory=contextFactory;this.onState=onState;this.settings={...DEFAULT_AUDIO};
  try{const s=JSON.parse(storage?.getItem('nexus-audio-v1')??'null');if(s){this.settings.enabled=typeof s.enabled==='boolean'?s.enabled:true;for(const k of ['effects','music'])if(Number.isFinite(s[k]))this.settings[k]=Math.max(0,Math.min(1,s[k]));}}catch{}
  this.scene='silent';this.beat=0;this.nextBeat=0;this.timer=null;
 }
 get status(){return !this.settings.enabled?'Ses kapalı':this.ctx?.state==='running'?'Ses hazır · kulaklık önerilir':this.failure?'Ses bu tarayıcıda açılamadı':'İlk tıklamayla ses başlar';}
 async unlock(){
  if(!this.settings.enabled)return;
  try{
   if(!this.ctx){
    const C=globalThis.AudioContext??globalThis.webkitAudioContext;this.ctx=this.contextFactory?this.contextFactory():new C();
    this.master=this.ctx.createGain();this.musicBus=this.ctx.createGain();this.fxBus=this.ctx.createGain();const limiter=this.ctx.createDynamicsCompressor();limiter.threshold.value=-12;limiter.ratio.value=8;
    this.musicBus.connect(limiter);this.fxBus.connect(limiter);limiter.connect(this.master);this.master.connect(this.ctx.destination);
    this.noiseBuffer=this.ctx.createBuffer(1,this.ctx.sampleRate,this.ctx.sampleRate);const d=this.noiseBuffer.getChannelData(0);let seed=941;
    for(let i=0;i<d.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;d[i]=seed/2147483648-1;}
    this.applyVolumes();
   }
   if(this.ctx.state==='suspended')await this.ctx.resume();this.onState(this.status);this.scheduleMusic();
  }catch{this.failure=true;this.onState(this.status);}
 }
 setSettings(patch){
  if(typeof patch.enabled==='boolean')this.settings.enabled=patch.enabled;
  for(const key of ['effects','music'])if(Number.isFinite(patch[key]))this.settings[key]=Math.max(0,Math.min(1,patch[key]));
  try{this.storage?.setItem('nexus-audio-v1',JSON.stringify(this.settings));}catch{}
  this.applyVolumes();if(!this.settings.enabled||!this.settings.music)this.stopMusic();if(this.settings.enabled){void this.unlock();this.scheduleMusic();}this.onState(this.status);
 }
 applyVolumes(){if(!this.ctx)return;const t=this.ctx.currentTime;this.master.gain.setTargetAtTime(this.settings.enabled?.8:0,t,.035);this.musicBus.gain.setTargetAtTime(this.scene==='silent'?0:this.externalMusic?this.tension?this.settings.music*.45:0:this.settings.music*(this.tension?1.25:1),t,.07);this.fxBus.gain.setTargetAtTime(this.settings.effects,t,.035);}
 setTension(active){active=!!active;if(active===this.tension)return;this.tension=active;this.stopMusic();this.applyVolumes();this.scheduleMusic();}
 setExternalMusic(active){this.externalMusic=active;this.stopMusic();this.applyVolumes();this.scheduleMusic();}
 setScene(scene){if(scene===this.scene)return;this.scene=scene;this.stopMusic();this.applyVolumes();this.scheduleMusic();}
 stopMusic(){clearInterval(this.timer);this.timer=null;this.nextBeat=0;}
 scheduleMusic(){
  if(this.externalMusic&&!this.tension||this.timer||this.scene==='silent'||!this.settings.enabled||!this.settings.music||this.ctx?.state!=='running')return;
  const schedule=()=>{if(this.ctx.state!=='running')return;const now=this.ctx.currentTime;if(this.nextBeat<now)this.nextBeat=now+.03;
   while(this.nextBeat<now+.15){this.musicBeat(this.nextBeat,this.beat++);this.nextBeat+=this.scene==='arena'?this.tension?.22:.28:.42;}
  };schedule();this.timer=setInterval(schedule,100);
 }
 note(freq,duration,volume=.2,type='sine',time=this.ctx.currentTime,bus=this.fxBus,pan=0,to=freq){
  const ctx=this.ctx,osc=ctx.createOscillator(),gain=ctx.createGain();osc.type=type;osc.frequency.setValueAtTime(freq,time);osc.frequency.exponentialRampToValueAtTime(Math.max(12,to),time+duration);
  gain.gain.setValueAtTime(.0001,time);gain.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),time+.012);gain.gain.exponentialRampToValueAtTime(.0001,time+duration);
  osc.connect(gain);let stereo;if(ctx.createStereoPanner){stereo=ctx.createStereoPanner();stereo.pan.value=pan;gain.connect(stereo);stereo.connect(bus);}else gain.connect(bus);
  osc.onended=()=>{osc.disconnect();gain.disconnect();stereo?.disconnect();};osc.start(time);osc.stop(time+duration+.025);
 }
 noise(duration,volume,frequency,time=this.ctx.currentTime,pan=0,bus=this.fxBus,type='lowpass'){
  const ctx=this.ctx,source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();source.buffer=this.noiseBuffer;filter.type=type;filter.frequency.value=frequency;
  gain.gain.setValueAtTime(.0001,time);gain.gain.exponentialRampToValueAtTime(volume,time+.008);gain.gain.exponentialRampToValueAtTime(.0001,time+duration);source.connect(filter);filter.connect(gain);
  let stereo;if(ctx.createStereoPanner){stereo=ctx.createStereoPanner();stereo.pan.value=pan;gain.connect(stereo);stereo.connect(bus);}else gain.connect(bus);
  source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();stereo?.disconnect();};source.start(time);source.stop(time+duration+.025);
 }
 musicBeat(t,beat){
  const roots=[55,65.406,48.999,58.27],root=roots[Math.floor(beat/16)%4],pattern=[1,1.5,2,2.4,2,1.5,3,2.4];
  if(this.externalMusic){if(this.tension)this.tensionBeat(t,beat,root);return;}
  this.note(root*pattern[beat%8],.5,.085,'triangle',t,this.musicBus,Math.sin(beat)*.25);
  if(beat%8===0){this.note(root,.9,.13,'sine',t,this.musicBus);this.note(root*3,1.2,.035,'sine',t,this.musicBus);}
  if(this.tension&&this.scene==='arena')this.tensionBeat(t,beat,root);
  if(this.scene==='arena'){if(beat%4===0)this.note(95,.14,.15,'sine',t,this.musicBus,0,35);if(beat%4===2)this.noise(.1,.045,1800,t,0,this.musicBus,'bandpass');if(beat%2)this.noise(.035,.012,8000,t,0,this.musicBus,'highpass');}
 }
 tensionBeat(t,beat,root){
  if(beat%2===0)this.note(80,.2,.11,'sine',t,this.musicBus,0,32);
  if(beat%4===2)this.noise(.13,.055,900,t,0,this.musicBus,'bandpass');
  if(beat%8===0)this.note(root,.8,.1,'triangle',t,this.musicBus,0,root*.9);
 }
 ready(){return this.settings.enabled&&this.settings.effects>0&&this.ctx?.state==='running';}
 ui(kind='click'){
  if(!this.ready())return;const t=this.ctx.currentTime;
  if(kind==='sale'){[440,554.37,659.25].forEach((f,i)=>this.note(f,.2,.065,'triangle',t+i*.07));}
  else if(kind==='bid'){this.note(660,.11,.07,'sine',t,undefined,0,880);}
  else this.note(420,.065,.035,'sine',t,undefined,0,560);
 }
 attack(event){
  if(!this.ready())return;const t=this.ctx.currentTime,pan=event.side===0?-.3:.3,family=soundFamily(event.attacker);
  this.noise(.12,.07,family==='blade'?4600:2200,t,pan,undefined,'highpass');
  if(event.combo)[330,440,660].forEach((f,i)=>this.note(f,.25,.09,'triangle',t+i*.07,undefined,pan));
 }
 impact(event){
  if(!this.ready())return;const t=this.ctx.currentTime,pan=event.side===0?.3:-.3,family=soundFamily(event.attacker),strength=event.crit||event.special||event.combo?1.3:1;
  if(event.dodge){this.noise(.2,.12,3200,t,pan,undefined,'highpass');this.note(600,.16,.025,'sine',t,undefined,pan,240);return;}
  if(family==='energy'){this.note(920,.25,.12*strength,'sawtooth',t,undefined,pan,65);this.noise(.16,.11,1800,t,pan);}
  else if(family==='thunder'){this.noise(.6,.25*strength,900,t,pan);this.note(110,.38,.18,'sine',t,undefined,pan,30);}
  else if(family==='magic'){[220,330,554].forEach((f,i)=>this.note(f,.4,.075,'sine',t+i*.025,undefined,pan,f*.7));this.noise(.3,.08,2200,t,pan,undefined,'bandpass');}
  else if(family==='shot'){for(let i=0;i<(event.special?3:1);i++){this.noise(.12,.24,2800,t+i*.045,pan);this.note(130,.09,.13,'triangle',t+i*.045,undefined,pan,45);}}
  else if(family==='blade'){this.noise(.18,.18,4700,t,pan,undefined,'highpass');this.note(850,.16,.05,'triangle',t,undefined,pan,280);}
  else if(family==='web'){this.noise(.1,.17,3800,t,pan,undefined,'bandpass');this.note(420,.16,.05,'sine',t,undefined,pan,90);}
  else if(family==='shield'){[680,1130,1620].forEach(f=>this.note(f,.23,.045,'triangle',t,undefined,pan));this.noise(.08,.13,1500,t,pan);}
  else{this.note(110,.19,.2*strength,'sine',t,undefined,pan,35);this.noise(.13,.19,650,t,pan);}
  if(event.terrain?.some(c=>c.broken)){this.noise(.55,.16,1300,t,pan);this.note(75,.45,.14,'sine',t,undefined,pan,28);}
  if(event.finisher){this.note(65,.8,.12,'sine',t,undefined,0,28);[220,330,440].forEach((f,i)=>this.note(f,.55,.035,'triangle',t+.18+i*.09));}
  if(event.absorbed){this.note(1100,.26,.08,'sine',t,undefined,pan,500);}
  if(event.combo){this.note(82,.35,.22,'sine',t,undefined,0,35);this.note(660,.33,.075,'triangle',t+.08,undefined,0,1320);}
  if(event.defeated?.length||event.knockout){this.note(190,.45,.1,'triangle',t+.06,undefined,pan,42);}
 }
 command(id,side){if(!this.ready())return;const t=this.ctx.currentTime,pan=side===0?-.3:.3;const notes=id==='rally'?[330,440,660]:id==='barrier'?[660,880,990]:[130,196,262];notes.forEach((f,i)=>this.note(f,.35,.08,'triangle',t+i*.07,undefined,pan));}
 result(draw=false){if(!this.ready())return;const t=this.ctx.currentTime;for(const [i,f] of (draw?[330,392,330]:[261.63,329.63,392,523.25,659.25]).entries())this.note(f,.5,.11,'triangle',t+i*.14);}
}
