const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));

// Shots share a fixed side of the arena. Attacks can gently bias the framing,
// but never trigger a zoom, reverse angle, or snap back between turns.
export function cameraGoal(mode,aspect,focus=null,{time=0,reduced=false,duel=null,composition=null}={}){
 const portrait=aspect<1.25,fit=Math.max(1,.85/Math.max(.2,aspect));
 if(duel&&!reduced&&['follow','close','orbit'].includes(mode)){
  const [x,y,z]=duel.center,span=Math.max(5,Math.min(13,duel.span)),distance=Math.max(12.5,span*1.45)*fit;
  return {position:[x+3*fit,y+distance*.48,z+distance],look:[x,y,z]};
 }
 const close=mode==='close',orbit=mode==='orbit';
 const position=portrait?[2.2*fit,(close?17.5:19.5)*fit,(close?21:23)*fit]:[close?5.2:4.2,close?8.5:mode==='wide'?12.4:10,close?16.4:mode==='wide'?20:18.2];
 if(mode==='diagonal')position.splice(0,3,...[-13*fit,(portrait?19:11.5)*fit,(portrait?23:18)*fit]);
 if(mode==='overhead')position.splice(0,3,...[0,25*fit,11*fit]);
 if(mode==='follow'&&composition&&!reduced){const shot=SHOTS[composition];if(shot)position.splice(0,3,...[shot[0]*fit,(portrait?Math.max(19.5,shot[1]):shot[1])*fit,(portrait?Math.max(23,shot[2]):shot[2])*fit]);}
 // The orbit is tied to elapsed viewing time, never to a hit or team switch.
 if(!reduced&&(mode==='follow'&&!composition||orbit)){const angle=Math.sin(time*(orbit?.075:.035))*(orbit?.38:.065),x=position[0],z=position[2];position[0]=x*Math.cos(angle)+z*Math.sin(angle);position[2]=z*Math.cos(angle)-x*Math.sin(angle);}
 const look=[0,close?1.5:1.2,-.4];
 if(focus&&mode!=='wide'){
  const weight=portrait?.055:close?.12:.09;
  look[0]=clamp(focus[0]*weight,-.6,.6);
  look[2]=-.4+clamp(focus[2]*weight,-.6,.6);
  position[0]+=look[0]*.6;
 }
 return {position,look};
}

const SHOTS={front:[4.2,10,18.2],left:[-10,12,19],right:[10,12,19],raised:[3,17,20]};
// Compare projected bodies, not team membership. Hold shots long enough for the
// bounded camera rig to settle; a marginal gain never reverses the camera.
export function occlusionScore(fighters,position){
 const [cx,cy,cz]=position,horizontal=Math.hypot(cx,cz),distance=Math.hypot(horizontal,cy),rx=cz/horizontal,rz=-cx/horizontal;
 const projected=fighters.map(f=>{const y=(f.height??2.4)*.5,depth=distance-(cx*f.x+cy*y+cz*f.z)/distance;return {x:(f.x*rx+f.z*rz)/depth,y:(y*horizontal/distance-(f.x*cx+f.z*cz)*cy/(horizontal*distance))/depth,w:((f.radius??.65)*2+.2)/depth,h:(f.height??2.4)/depth};});
 let score=0;for(let i=0;i<projected.length;i++)for(let j=i+1;j<projected.length;j++){const a=projected[i],b=projected[j],w=(a.w+b.w)/2,h=(a.h+b.h)/2;score+=Math.max(0,1-Math.abs(a.x-b.x)/w)*Math.max(0,1-Math.abs(a.y-b.y)/h);}
 return score;
}
export class ShotDirector{
 shot='front';checked=-Infinity;
 update(fighters,time){
  if(!Number.isFinite(time)||time-this.checked<8)return this.shot;
  this.checked=time;if(fighters.length<3)return this.shot;
  const current=occlusionScore(fighters,SHOTS[this.shot]);let best=this.shot,score=current;
  for(const [id,position] of Object.entries(SHOTS)){const candidate=occlusionScore(fighters,position);if(candidate<score){best=id;score=candidate;}}
  if(score+.12<current*.75)this.shot=best;
  return this.shot;
 }
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
