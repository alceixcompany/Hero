import {healthBehaviour} from './battle-presentation.mjs';
const clamp=n=>Math.max(0,Math.min(1,n)),ease=n=>{const x=clamp(n);return x*x*(3-2*x);};
const GROUPS={heavy:['hulk','groot'],agile:['spiderman','panther','daredevil','antman','wasp'],feral:['wolverine'],mystic:['wanda','strange','jean','loki','magneto','professor'],soldier:['captain','winter','widow','punisher'],blade:['deadpool','gamora'],storm:['thor','storm'],armor:['ironman','warmachine','vision','marvel','falcon'],marksman:['hawkeye','cyclops','rocket']};
export function signatureFor(id){
 const family=Object.keys(GROUPS).find(k=>GROUPS[k].includes(id))||'soldier';
 const seed=[...id].reduce((n,c)=>n+c.charCodeAt(0),0);
 return {family,cadence:family==='heavy'?.66:family==='agile'?1.38:family==='mystic'?.78:1+(seed%7)*.025,phase:(seed%19)/3,weight:family==='heavy'?1.3:family==='agile'?.8:1};
}
// All poses are additive, bounded and restored before the next skeletal sample.
export function signaturePose(id,{time=0,moving=0,flight=false,role=null,progress=1,special=false,reduced=false,health=1}={}){
 const {family,phase}=signatureFor(id),breath=reduced?0:Math.sin(time*1.8+phase),poses=[];
 const add=(bone,axis,angle)=>poses.push([bone,axis,angle]);
 const condition=healthBehaviour(id,health);
 if(id==='hulk'){add('spine_03','x',condition.rage*.14);add('Head','x',condition.rage*.07);add('upperarm_l','z',-condition.rage*.08);add('upperarm_r','z',condition.rage*.08);}
 else if(id!=='professor'){add('spine_03','x',condition.fatigue*.16);add('Head','x',condition.fatigue*.1);add('upperarm_l','x',condition.fatigue*.09);add('upperarm_r','x',condition.fatigue*.06);}
 const active=role==='attacker'&&progress<1,windup=active?ease(progress/.16)*(1-ease((progress-.3)/.18)):0;
 const strike=active?Math.sin(Math.PI*clamp((progress-.3)/.36)):0;
 if(family==='heavy'){
  add('spine_03','x',.11+breath*.015);add('upperarm_l','z',-.15);add('upperarm_r','z',.15);add('thigh_l','z',-.09);add('thigh_r','z',.09);
  if(active){add('spine_03','x',-.23*windup+.22*strike);add('upperarm_r','x',-(special?1.9:.8)*windup);add('lowerarm_r','x',-.6*windup);if(special){add('upperarm_l','x',-1.9*windup);add('lowerarm_l','x',-.6*windup);}}
 }else if(family==='agile'||family==='feral'){
  const crouch=(id==='spiderman'?.27:family==='feral'?.22:.12)*(flight?.3:1);
  add('spine_03','x',crouch+breath*.02);add('thigh_l','x',-.15);add('thigh_r','x',-.19);add('calf_l','x',.21);add('calf_r','x',.26);add('upperarm_l','z',-.1);add('upperarm_r','z',.1);
  if(active){add('spine_03','z',(id==='spiderman'?.45:.22)*strike);add('upperarm_l','x',-.65*windup);add('lowerarm_l','x',-.55*windup);}
 }else if(family==='mystic'){
  if(id==='professor'){add('Head','y',breath*.045);if(active)add('lowerarm_r','x',-.4*windup);return poses;}
  add('spine_03','x',-.055);add('Head','y',breath*.018);add('upperarm_l','z',-.13);add('upperarm_r','z',.13);
  const spell=active?ease(progress/.16)*(1-ease((progress-.76)/.24)):0;
  add('upperarm_l','x',-.12-(id==='wanda'?.95:.55)*spell);add('upperarm_r','x',-.14-(id==='wanda'?.75:.45)*spell);add('lowerarm_l','x',-.24-.3*spell);add('lowerarm_r','x',-.2-.3*spell);
  add('hand_l','z',breath*.07*(spell||.25));add('hand_r','z',-breath*.07*(spell||.25));
 }else if(family==='storm'){
  add('spine_03','x',-.04);add('upperarm_l','z',-.08);add('upperarm_r','z',.08);
  if(active){add('upperarm_r','x',-(id==='thor'?1.25:.65)*windup);add('spine_03','y',-.2*windup);if(special)add('upperarm_l','x',-.6*windup);}
 }else if(family==='armor'){
  add('upperarm_l','z',-.08);add('upperarm_r','z',.08);add('spine_03','x',flight?.06:-.03);
  if(active){add('upperarm_r','x',-.4*windup);add('lowerarm_r','x',-.3*windup);}
 }else if(family==='blade'){
  add('spine_03','y',id==='deadpool'?.1:-.09);add('lowerarm_r','x',-.18);add('upperarm_l','z',-.1);
  if(active){add('spine_03','y',-.25*windup+.2*strike);add('upperarm_r','x',-.65*windup);}
 }else{
  add('lowerarm_l','x',-.16);add('lowerarm_r','x',-.18);add('spine_03','x',moving>.08?.07:0);
  if(id==='captain')add('upperarm_l','x',-.15);if(active)add('spine_03','y',-.12*windup);
 }
 return poses;
}
