import test from 'node:test';
import assert from 'node:assert/strict';
import {GameAudio,soundFamily} from '../dist/game-audio.mjs';
import {HEROES} from '../dist/engine.mjs';

function audioFixture(){
 const scheduled=[];
 const param=()=>({value:0,setValueAtTime(v,t){assert.ok(Number.isFinite(v)&&Number.isFinite(t));this.value=v;},exponentialRampToValueAtTime(v,t){assert.ok(v>0&&Number.isFinite(v)&&Number.isFinite(t));this.value=v;},setTargetAtTime(v,t,tau){assert.ok(Number.isFinite(v)&&tau>0);this.value=v;}});
 const node=()=>({connect(){},disconnect(){},gain:param(),frequency:param(),pan:param(),threshold:param(),ratio:param(),start(t){assert.ok(Number.isFinite(t)&&t>=0);this.started=t;},stop(t){assert.ok(t>this.started);scheduled.push([this.started,t]);}});
 const ctx={currentTime:1,state:'running',sampleRate:44100,destination:{},createGain:node,createOscillator:node,createBufferSource:node,createBiquadFilter:node,createStereoPanner:node,createDynamicsCompressor:node,createBuffer(ch,n){assert.equal(ch,1);return {getChannelData(){return new Float32Array(n);}};}};
 const audio=new GameAudio({contextFactory:()=>ctx});return {audio,scheduled};
}
test('all character sound families, combos, commands and results schedule valid finite audio envelopes',async()=>{
 const {audio,scheduled}=audioFixture();await audio.unlock();assert.equal(new Set(HEROES.map(h=>soundFamily(h.id))).size,8);
 for(const h of HEROES){const event={attacker:h.id,side:h.index%2,special:true,crit:true,combo:{name:'test'},defeated:['hulk'],absorbed:12};audio.attack(event);audio.attack({...event,type:'charge'});audio.exchangeBeat(event,'block');audio.exchangeBeat(event,'parry');audio.impact(event);audio.impact({...event,dodge:true});}
 for(const id of ['overdrive','barrier','rally','counter'])audio.command(id,0);for(const kind of ['sale','bid','click'])audio.ui(kind);audio.result();assert.ok(scheduled.length>200);
});
test('mute gates effects immediately, silence stops the music loop, and saved volumes are bounded',async()=>{
 const {audio,scheduled}=audioFixture();await audio.unlock();audio.setScene('arena');assert.ok(audio.timer);audio.setScene('silent');assert.equal(audio.timer,null);assert.equal(audio.musicBus.gain.value,0);
 audio.setSettings({enabled:false});const before=scheduled.length;audio.impact({attacker:'ironman',side:0});audio.result();assert.equal(scheduled.length,before);assert.equal(audio.master.gain.value,0);
 const stored=new GameAudio({storage:{getItem:()=>'{"enabled":false,"effects":4,"music":-2}'}});assert.deepEqual(stored.settings,{enabled:false,effects:1,music:0});
});
test('final duel rhythm respects pause, mute and external soundtrack and adds debris sound',async()=>{
 const {audio,scheduled}=audioFixture();await audio.unlock();audio.setScene('arena');audio.setExternalMusic(true);assert.equal(audio.timer,null);audio.setTension(true);assert.ok(audio.timer);assert.equal(audio.musicBus.gain.value,audio.settings.music*.45);const before=scheduled.length;audio.impact({attacker:'hulk',side:0,terrain:[{broken:true}]});assert.ok(scheduled.length>before);
 audio.setScene('silent');assert.equal(audio.timer,null);assert.equal(audio.musicBus.gain.value,0);audio.setScene('arena');assert.ok(audio.timer);audio.setSettings({enabled:false});assert.equal(audio.timer,null);audio.setTension(false);assert.equal(audio.musicBus.gain.value,0);audio.stopMusic();
});
