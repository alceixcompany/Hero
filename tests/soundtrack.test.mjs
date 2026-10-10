import test from 'node:test';import assert from 'node:assert/strict';import {Soundtrack} from '../dist/soundtrack.mjs';
test('selected music uses low volume, follows pause/mute, and releases previous files',()=>{
 const audio={settings:{enabled:true,music:.12},scene:'arena',setExternalMusic(v){this.externalMusic=v;}};
 const s=new Soundtrack({audio});let played=0,paused=0,revoked=[];const media=()=>({play(){played++;return Promise.resolve();},pause(){paused++;},removeAttribute(){},load(){}});
 const options={createAudio:media,createURL:f=>'blob:'+f.name,revokeURL:u=>revoked.push(u)};
 s.local({name:'Avengers.mp3'},options);assert.equal(s.media.volume,.12);assert.equal(s.media.loop,true);assert.equal(audio.externalMusic,true);assert.equal(played,1);
 audio.scene='silent';s.sync();assert.equal(paused,1);audio.scene='arena';audio.settings.enabled=false;s.sync();assert.equal(paused,2);
 audio.settings.enabled=true;audio.settings.music=.06;s.sync();assert.equal(played,2);assert.equal(s.media.volume,.06);
 s.local({name:'second.mp3'},options);assert.deepEqual(revoked,['blob:Avengers.mp3']);s.stop();assert.deepEqual(revoked,['blob:Avengers.mp3','blob:second.mp3']);assert.equal(audio.externalMusic,false);assert.equal(s.media,null);
});
test('the official player follows game pause/mute and does not restart a user-paused track',()=>{
 const audio={settings:{enabled:true,music:.12},scene:'arena'},s=new Soundtrack({audio});let play=0,pause=0,volume;
 s.player={setVolume:v=>volume=v,playVideo:()=>play++,pauseVideo:()=>pause++};s.ready=true;s.requested=true;s.sync();assert.equal(volume,12);assert.equal(play,1);
 audio.scene='silent';s.sync();assert.equal(pause,1);audio.scene='arena';s.userPaused=true;s.sync();assert.equal(play,1);
});
