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
