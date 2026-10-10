const MAGIC=new Set(['strange','wanda','loki','jean','magneto','professor']);
const FLYING=new Set(['ironman','thor','marvel','storm','wasp','vision','falcon','warmachine']);
const BLADES=new Set(['gamora','deadpool','wolverine','daredevil']);
export function encounterFor(h,event={}){
 if(MAGIC.has(h.id))return 'magic';
 if(FLYING.has(h.id))return 'aerial';
 if(h.combat==='melee'&&!(event.special&&['captain','spiderman'].includes(h.id)))return BLADES.has(h.id)?'blade':'brawl';
 return 'ranged';
}
export const ENCOUNTER_LABELS={magic:'BÜYÜ ÇEMBERİ',aerial:'HAVA DALIŞI',blade:'KESKİN KARŞILAŞMA',brawl:'YAKIN DÖVÜŞ',ranged:'ODAKLI ATIŞ'};
export function exchangeDuration(speed=1,reduced=false,finisher=false,event=null){return event?.type==='charge'?4:reduced?.25:finisher?3.3/Math.sqrt(speed):event?.climax&&!event.climax.cancelled?3.5/speed:event?.sequence?3.45/speed:1.65/speed;}
// Monotone Hermite timing: ease into slow motion around contact, ease out to recovery.
// Position, impact, corpse latch and skeletal clips all use the same clock.
export function cinematicProgress(u,contact=.48){
 const knots=[[0,0,1.3],[.28,contact-.1,1],[.68,contact+.1,.65],[1,1,1.3]];
 u=Math.max(0,Math.min(1,u));let i=0;while(i<2&&u>knots[i+1][0])i++;
 const [x,y,m]=knots[i],[end,v,n]=knots[i+1],w=end-x,t=(u-x)/w;
 return (2*t**3-3*t**2+1)*y+(t**3-2*t**2+t)*w*m+(-2*t**3+3*t**2)*v+(t**3-t**2)*w*n;
}
export function meleeClip(p,style,id){
 if(style==='blade')return {name:id==='wolverine'||id==='daredevil'?'Punch_Jab':'Sword_Attack',phase:p<.39?Math.max(0,Math.min(1,(p-.25)/.14)):Math.max(0,Math.min(1,(p-.39)/.18))};
 return {name:p<.39?'Punch_Jab':'Punch_Cross',phase:p<.39?Math.max(0,Math.min(1,(p-.25)/.14)):Math.max(0,Math.min(1,(p-.39)/.18))};
}

export function battleDelay(event,speed=1){return event?.type==='charge'?4000:Math.max(3600/speed,exchangeDuration(speed,false,event?.finisher,event)*1000+200/speed);}
