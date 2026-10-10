import {cinematicProgress,exchangeDuration} from './combat-choreography.mjs';
export function advanceExchange(action,dt,playing){
 if(!action)return 1;
 if(playing||action.finishWhilePaused)action.elapsed+=Math.max(0,Math.min(.05,dt));
 const progress=Math.min(1,action.elapsed/action.duration);return action.event?.finisher&&!action.reduced?cinematicProgress(progress):progress;
}

export function retimeExchange(action,speed,reduced=false){
 if(!action)return;
 const progress=Math.min(1,action.elapsed/action.duration);
 action.duration=exchangeDuration(speed,reduced,action.event?.finisher);
 action.elapsed=progress*action.duration;
}

export const smoothStep=n=>{const x=Math.max(0,Math.min(1,n));return x*x*(3-2*x);};
// One continuous journey with a short planted contact, then a deliberate recovery.
export function exchangeMotion(progress,{flight=false,ranged=false,id='',special=false,reduced=false,flank=false,encounter='',targetLift=0}={}){
 const p=Math.max(0,Math.min(1,progress)),approach=smoothStep((p-.15)/.3),recovery=smoothStep((p-.6)/.4),envelope=Math.sin(Math.PI*p);
 const diving=encounter==='aerial',travel=ranged&&!diving?0:approach*(1-recovery),recoil=p<.48?0:Math.sin(Math.PI*Math.min(1,(p-.48)/.52))**2;
 const baseLift=reduced?0:diving?Math.sin(Math.PI*approach)*(1-recovery)*2.25+recovery*(1-recovery)*1.4:id==='spiderman'&&!ranged?Math.sin(Math.PI*travel)*1.45:id==='hulk'&&special?Math.sin(Math.PI*travel)*.85:flight?envelope*(ranged?.3:.65):0;
 const lift=!flight&&!ranged?Math.max(baseLift,Math.max(0,targetLift)*travel):baseLift;
 return {travel,lift,bank:diving&&!reduced?Math.sin(Math.PI*travel)*.48:flight&&!reduced?envelope*(ranged?.12:.2):0,recoil,dodge:recoil*1.05,arc:(!ranged||diving)&&!reduced?Math.sin(Math.PI*travel)*(flank?1.2:.28):0};
}
export function avoidCrowding(position,others,id,dt=1/60){
 let x=position[0],z=position[1];
 for(const other of others){if(other.id===id||!other.alive)continue;const dx=x-other.x,dz=z-other.z,d=Math.hypot(dx,dz);if(d<1.05){const a=d>.001?Math.atan2(dz,dx):id.localeCompare(other.id)>0?0:Math.PI;x+=Math.cos(a)*(1.05-d)*(1-Math.exp(-Math.max(0,dt)*5));z+=Math.sin(a)*(1.05-d)*(1-Math.exp(-Math.max(0,dt)*5));}}
 return [Math.max(-7.7,Math.min(7.7,x)),Math.max(-4.7,Math.min(4.7,z))];
}

// Screen-space labels are packed independently of fighter positions and combat RNG.
export function packLabels(items,{width,height,top=.23,bottom=.66}={}){
 const placed=[],clampTo=(v,a,b)=>Math.max(a,Math.min(b,v));
 for(const item of [...items].sort((a,b)=>a.y-b.y||a.x-b.x||a.id.localeCompare(b.id))){
  const w=item.width||80,h=item.height||39;
  const candidates=[0,-1,1,-2,2,-3,3].map(step=>({x:clampTo(item.x,w/2+8,width-w/2-8),y:clampTo(item.y+step*(h+6),height*top+h,height*bottom)}));
  const overlaps=p=>placed.filter(q=>Math.abs(p.x-q.x)<(w+q.width)/2+4&&Math.abs(p.y-q.y)<(h+q.height)/2+5).length;
  const best=candidates.reduce((best,p)=>overlaps(p)<overlaps(best)?p:best,candidates[0]);
  placed.push({...item,...best,width:w,height:h});
 }
 return placed;
}
