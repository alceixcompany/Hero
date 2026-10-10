const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));

// Shots share a fixed side of the arena. Attacks can gently bias the framing,
// but never trigger a zoom, reverse angle, or snap back between turns.
export function cameraGoal(mode,aspect,focus=null,{time=0,reduced=false,duel=null}={}){
 const portrait=aspect<1.25,fit=Math.max(1,.85/Math.max(.2,aspect));
 if(duel&&!reduced&&mode!=='wide'){
  const [x,y,z]=duel.center,span=Math.max(5,Math.min(13,duel.span)),distance=Math.max(12.5,span*1.45)*fit;
  return {position:[x+3*fit,y+distance*.48,z+distance],look:[x,y,z]};
 }
 const close=mode==='close',orbit=mode==='orbit';
 const position=portrait?[2.2*fit,(close?17.5:19.5)*fit,(close?21:23)*fit]:[close?5.2:4.2,close?8.5:mode==='wide'?12.4:10,close?16.4:mode==='wide'?20:18.2];
 // The orbit is tied to elapsed viewing time, never to a hit or team switch.
 if(!reduced&&(mode==='follow'||orbit)){const angle=Math.sin(time*(orbit?.075:.035))*(orbit?.38:.065),x=position[0],z=position[2];position[0]=x*Math.cos(angle)+z*Math.sin(angle);position[2]=z*Math.cos(angle)-x*Math.sin(angle);}
 const look=[0,close?1.5:1.2,-.4];
 if(focus&&mode!=='wide'){
  const weight=portrait?.055:close?.12:.09;
  look[0]=clamp(focus[0]*weight,-.6,.6);
  look[2]=-.4+clamp(focus[2]*weight,-.6,.6);
  position[0]+=look[0]*.6;
 }
 return {position,look};
}

function follow(current,target,dt,tau,maxSpeed){
 const alpha=-Math.expm1(-dt/tau);
 const delta=target.map((v,i)=>(v-current[i])*alpha);
 const length=Math.hypot(...delta),limit=maxSpeed*dt;
 const scale=length>limit?limit/length:1;
 return current.map((v,i)=>v+delta[i]*scale);
}

export class CameraRig{
 position=null;
 look=null;
 update(goal,dt){
  if(!this.position){this.position=[...goal.position];this.look=[...goal.look];}
  else{
   const step=clamp(Number.isFinite(dt)?dt:0,0,.05);
   this.position=follow(this.position,goal.position,step,.85,6);
   this.look=follow(this.look,goal.look,step,.65,1.2);
  }
  return {position:this.position,look:this.look};
 }
}
