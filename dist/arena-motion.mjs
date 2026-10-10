import {impactAt} from './battle-presentation.mjs';
import {clampArena} from './arena-layout.mjs';
import {cinematicProgress,exchangeDuration} from './combat-choreography.mjs';
export function advanceExchange(action,dt,playing){
 if(!action)return 1;
 if(playing||action.finishWhilePaused)action.elapsed+=Math.max(0,Math.min(.05,dt));
 const progress=Math.min(1,action.elapsed/action.duration);return action.event?.finisher&&!action.reduced?cinematicProgress(progress,impactAt(action.event)):progress;
}

export function retimeExchange(action,speed,reduced=false){
 if(!action)return;
 const progress=Math.min(1,action.elapsed/action.duration);
 action.duration=exchangeDuration(speed,reduced,action.event?.finisher,action.event);
 action.elapsed=progress*action.duration;
}

export const smoothStep=n=>{const x=Math.max(0,Math.min(1,n));return x*x*(3-2*x);};
// One continuous journey with a short planted contact, then a deliberate recovery.
export function exchangeMotion(progress,{flight=false,ranged=false,id='',special=false,reduced=false,flank=false,encounter='',targetLift=0}={}){
 const p=Math.max(0,Math.min(1,progress)),approach=smoothStep((p-(id==='hulk'?.19:id==='spiderman'?.1:.15))/(id==='hulk'?.26:id==='spiderman'?.32:.3)),recovery=smoothStep((p-.6)/.4),envelope=Math.sin(Math.PI*p);
 const diving=encounter==='aerial',travel=ranged&&!diving?0:approach*(1-recovery),recoil=p<.48?0:Math.sin(Math.PI*Math.min(1,(p-.48)/.52))**2;
 const baseLift=reduced?0:diving?Math.sin(Math.PI*approach)*(1-recovery)*2.25+recovery*(1-recovery)*1.4:id==='spiderman'&&!ranged?Math.sin(Math.PI*travel)*1.45:id==='hulk'&&special?Math.sin(Math.PI*travel)*.85:flight?envelope*(ranged?.3:.65):0;
 const lift=!flight&&!ranged?Math.max(baseLift,Math.max(0,targetLift)*travel):baseLift;
 return {travel,lift,bank:diving&&!reduced?Math.sin(Math.PI*travel)*.48:flight&&!reduced?envelope*(ranged?.12:.2):0,recoil,dodge:recoil*1.05,arc:(!ranged||diving)&&!reduced?Math.sin(Math.PI*travel)*(flank?1.2:id==='spiderman'?.85:id==='hulk'?.12:.28):0};
}
const bounded=clampArena;
function separationAngle(a,b){const pair=[a,b].sort().join(':');let hash=0;for(const c of pair)hash=(hash*31+c.charCodeAt(0))>>>0;return (hash%360)*Math.PI/180+(a.localeCompare(b)>0?Math.PI:0);}
export function avoidCrowding(position,others,id,dt=1/60,radius=.65){
 let pushX=0,pushZ=0;
 for(const other of others){if(other.id===id||!other.alive)continue;const dx=position[0]-other.x,dz=position[1]-other.z,d=Math.hypot(dx,dz),gap=radius+(other.radius??.65)+.35;if(d<gap){const a=d>.001?Math.atan2(dz,dx):separationAngle(id,other.id);pushX+=Math.cos(a)*(gap-d);pushZ+=Math.sin(a)*(gap-d);}}
 const length=Math.hypot(pushX,pushZ),step=Math.max(0,Math.min(.05,dt)),scale=length?Math.min(-Math.expm1(-step*5),1.7*step/length):0;
 return bounded(position[0]+pushX*scale,position[1]+pushZ*scale);
}

// Reserve a distinct contact point, then choose a curved route around bystanders.
// This planner is presentation only: it consumes no combat randomness.
export function planApproach(attacker,target,others){
 const preferred=Math.atan2(attacker.z-target.z,attacker.x-target.x),reach=(attacker.radius??.65)+(target.radius??.65)+.35;
 const blockers=others.filter(o=>o.alive&&o.id!==attacker.id&&o.id!==target.id);
 let best;
 for(let i=0;i<48;i++){
  const angle=preferred+i*Math.PI*2/48,[x,z]=bounded(target.x+Math.cos(angle)*reach,target.z+Math.sin(angle)*reach);
  const contact=Math.hypot(x-target.x,z-target.z),turn=Math.abs(Math.atan2(Math.sin(angle-preferred),Math.cos(angle-preferred)));
  let score=turn*.2+Math.hypot(x-attacker.x,z-attacker.z)*.025+Math.max(0,reach-contact)*100;
  for(const o of blockers){const gap=(attacker.radius??.65)+(o.radius??.65)+.4;score+=Math.max(0,gap-Math.hypot(x-o.x,z-o.z))**2*100;}
  if(!best||score<best.score)best={x,z,score};
 }
 const dx=best.x-attacker.x,dz=best.z-attacker.z,length=Math.hypot(dx,dz),nx=length?-dz/length:0,nz=length?dx/length:0;
 let route={arc:0,score:Infinity};
 for(const arc of [0,.9,-.9,1.7,-1.7]){
  let score=Math.abs(arc)*.15;
  for(let s=1;s<12;s++){const t=s/12,[x,z]=bounded(attacker.x+dx*t+nx*arc*Math.sin(Math.PI*t),attacker.z+dz*t+nz*arc*Math.sin(Math.PI*t));for(const o of blockers)score+=Math.max(0,(attacker.radius??.65)+(o.radius??.65)+.25-Math.hypot(x-o.x,z-o.z))**2*12;}
  if(score<route.score)route={arc,score};
 }
 return {x:best.x,z:best.z,arc:route.arc,normal:[nx,nz]};
}

export function approachPoint(from,to,travel,route={arc:0,normal:[0,0]}){
 const t=Math.max(0,Math.min(1,travel)),bend=route.arc*Math.sin(Math.PI*t);
 if(t===0)return bounded(...from);if(t===1)return bounded(...to);
 return bounded(from[0]+(to[0]-from[0])*t+route.normal[0]*bend,from[1]+(to[1]-from[1])*t+route.normal[1]*bend);
}

// Screen-space labels are packed independently of fighter positions and combat RNG.
export function packLabels(items,{width,height,top=.23,bottom=.66}={}){
 const placed=[],clampTo=(v,a,b)=>Math.max(a,Math.min(b,v));
 for(const item of [...items].sort((a,b)=>a.y-b.y||a.x-b.x||a.id.localeCompare(b.id))){
  const w=item.width||80,h=item.height||39;
  const candidates=[0,-1,1,-2,2,-3,3].flatMap(step=>[0,-1,1].map(lane=>({x:clampTo(item.x+lane*(w+8),w/2+8,width-w/2-8),y:clampTo(item.y+step*(h+6),height*top+h,height*bottom)})));
  const overlaps=p=>placed.filter(q=>Math.abs(p.x-q.x)<(w+q.width)/2+4&&Math.abs(p.y-q.y)<(h+q.height)/2+5).length;
  const best=candidates.reduce((best,p)=>overlaps(p)<overlaps(best)?p:best,candidates[0]);
  placed.push({...item,...best,width:w,height:h});
 }
 return placed;
}
