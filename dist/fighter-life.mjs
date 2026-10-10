// Elimination belongs to a battle, not to a render or animation event.
export function syncFighterLife(actor,hp,event,newBattle=false){
 if(newBattle){actor.eliminated=false;actor.fallingStarted=false;actor.pendingDeathEvent=null;actor.dead=0;actor.model?.reset();}
 if(!actor.eliminated&&hp<=0){actor.eliminated=true;actor.pendingDeathEvent=event;}
 actor.hp=actor.eliminated?0:hp;
}
export function shouldFall(actor,action,progress){
 if(actor.eliminated&&!(actor.pendingDeathEvent&&actor.pendingDeathEvent===action?.event&&progress<.48))actor.fallingStarted=true;
 return !!actor.fallingStarted;
}
