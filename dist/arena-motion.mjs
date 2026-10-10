export function advanceExchange(action,dt,playing){
 if(!action)return 1;
 if(playing||action.finishWhilePaused)action.elapsed+=Math.max(0,Math.min(.05,dt));
 return Math.min(1,action.elapsed/action.duration);
}

export function retimeExchange(action,speed,reduced=false){
 if(!action)return;
 const progress=Math.min(1,action.elapsed/action.duration);
 action.duration=reduced?.25:1.65/speed;
 action.elapsed=progress*action.duration;
}

export const smoothStep=n=>{const x=Math.max(0,Math.min(1,n));return x*x*(3-2*x);};
// One continuous journey with a short planted contact, then a deliberate recovery.
export function exchangeMotion(progress,{flight=false,ranged=false,id='',special=false,reduced=false}={}){
 const p=Math.max(0,Math.min(1,progress)),approach=smoothStep((p-.15)/.3),recovery=smoothStep((p-.6)/.4),envelope=Math.sin(Math.PI*p);
 const travel=ranged?0:approach*(1-recovery),recoil=p<.48?0:Math.sin(Math.PI*Math.min(1,(p-.48)/.52))**2;
 const lift=reduced?0:id==='spiderman'&&!ranged?Math.sin(Math.PI*travel)*1.45:id==='hulk'&&special?Math.sin(Math.PI*travel)*.85:flight?envelope*(ranged?.3:.65):0;
 return {travel,lift,bank:flight&&!reduced?envelope*(ranged?.12:.2):0,recoil,dodge:recoil*1.05,arc:!ranged&&!reduced?Math.sin(Math.PI*travel)*.28:0};
}
export function avoidCrowding(position,others,id,dt=1/60){
 let x=position[0],z=position[1];
 for(const other of others){if(other.id===id||!other.alive)continue;const dx=x-other.x,dz=z-other.z,d=Math.hypot(dx,dz);if(d<1.05){const a=d>.001?Math.atan2(dz,dx):id.localeCompare(other.id)>0?0:Math.PI;x+=Math.cos(a)*(1.05-d)*(1-Math.exp(-Math.max(0,dt)*5));z+=Math.sin(a)*(1.05-d)*(1-Math.exp(-Math.max(0,dt)*5));}}
 return [Math.max(-7.7,Math.min(7.7,x)),Math.max(-4.7,Math.min(4.7,z))];
}
