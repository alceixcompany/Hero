const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));

// Shots share a fixed side of the arena. Attacks can gently bias the framing,
// but never trigger a zoom, reverse angle, or snap back between turns.
export function cameraGoal(mode,aspect,focus=null){
 const portrait=aspect<1.25,fit=Math.max(1,.85/Math.max(.2,aspect));
 const close=mode==='close';
 const position=portrait?[0,(close?19:22)*fit,(close?18:21)*fit]:[0,close?9:mode==='follow'?10:10.6,close?14.2:mode==='follow'?16.2:16.8];
 const look=[0,close?1.5:1.2,0];
 if(focus&&mode!=='wide'){
  const weight=portrait?.055:close?.12:.09;
  look[0]=clamp(focus[0]*weight,-.6,.6);
  look[2]=clamp(focus[2]*weight,-.6,.6);
  position[0]=look[0]*.6;
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
