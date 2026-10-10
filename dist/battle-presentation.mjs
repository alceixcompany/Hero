const clamp=n=>Math.max(0,Math.min(1,n));
export function healthBehaviour(id,ratio=1){
 const health=clamp(Number.isFinite(ratio)?ratio:1),alive=health>0,fatigue=alive?clamp((.65-health)/.5):0;
 const armor=['ironman','warmachine','panther','antman','wasp','vision','falcon'].includes(id);
 return {health,fatigue,critical:alive&&health<=.3,rage:id==='hulk'&&alive?clamp((.8-health)/.6):0,armor,wear:alive&&armor?clamp((.75-health)/.6):0,landing:alive?fatigue*.23:0,label:!alive?'':id==='hulk'&&health<.5?'ÖFKE ARTIYOR':armor&&health<=.3?'ZIRH KRİTİK':health<=.3?'KRİTİK CAN':health<.55?'YARALI':''};
}
export const impactAt=e=>e?.type==='charge'?2:e?.sequence?.contact??.48;
export function usesSequence(h,e={}){return h.combat==='melee'&&!h.flight&&!(e.special&&['captain','spiderman'].includes(h.id));}
export function combatSequence(h,e){return usesSequence(h,e)?{contact:.72,beats:[{at:.29,kind:'block'},{at:.47,kind:'parry'},{at:.72,kind:e.dodge?'evade':'strike'}]}:null;}
export function sequencePhase(p,e){if(e?.type==='charge')return 'ZİRVE HAZIRLIĞI';if(!e?.sequence)return p<.2?'HAZIRLANIYOR':p<.48?'YAKLAŞIYOR':'DARBE';return p<.2?'YAKLAŞIYOR':p<.36?'BLOK':p<.55?'KARŞILIK':p<.72?'SON VURUŞ':e.dodge?'KAÇIŞ':'DARBE';}
export function sequenceMotion(progress,{id='',reduced=false,dodge=false,targetLift=0}={}){
 const p=clamp(progress),ease=n=>{const x=clamp(n);return x*x*(3-2*x);},travel=ease(p/.22),end=ease((p-.8)/.2);
 const agile=id==='spiderman',windup=Math.sin(Math.PI*clamp((p-.55)/.17)),reaction=Math.sin(Math.PI*clamp((p-.72)/.28));
 return {travel:travel*(1-end*.18),lift:reduced?targetLift*travel*(1-end):targetLift*travel*(1-end)+(agile?Math.sin(Math.PI*clamp(p/.28))*.95+windup*.55:0),bank:0,recoil:reaction**2,dodge:dodge?ease((p-.62)/.22)*1.05:0,arc:reduced?0:agile?Math.sin(Math.PI*travel)*.6+Math.sin(p*Math.PI*2)*.32:Math.sin(p*Math.PI)*.08,pressure:windup*.12};
}
export function sequenceClip(p,role,id,dodge=false){
 const blade=['gamora','deadpool'].includes(id);
 if(role==='target'){
  if(p>.72)return {name:dodge?'Roll':'Hit_Chest',phase:clamp((p-.72)/.28)};
  if(p>.37&&p<.54)return {name:'Punch_Jab',phase:clamp((p-.37)/.17)};
  return {name:'Idle_Loop',phase:0,block:p>.2};
 }
 if(p<.19)return {name:'Jog_Fwd_Loop',phase:p*3};
 if(p<.37)return {name:blade?'Sword_Attack':'Punch_Jab',phase:clamp((p-.19)/.18)};
 if(p<.55)return {name:'Idle_Loop',phase:0,block:true};
 return {name:blade?'Sword_Attack':'Punch_Cross',phase:clamp((p-.55)/.3)};
}
